import * as logging from "../../lib/logging";

import type { Format } from "./index";
import { Format as WasmFormat } from "../wasm/";

import * as wasm from "../wasm/types";
import * as hl_wasm from "./types";

import {
    Instr,
    InstrType,
    IntructionParsingContext,
    getWasmBlockSignature,
    getExpressionResultCount,
    getBlockByDepth,
    kInstrUnreachable,
    moreInput,
    peekExpression,
    peekInput,
    popExpression,
    popNonVoidExpression,
    pushExpression,
    readInput
} from "./instruction_helper";

// Consumes a nop instruction, concatenating consecutive
// nops into a single nop + count expression.
const consumeNop = (
    ctx: IntructionParsingContext
) => {
    const prev = peekExpression(ctx);
    if (prev && prev.type === InstrType.Nop) {
        prev.count = 1;
    } else {
        pushExpression(ctx, {
            type: hl_wasm.InstructionType.Nop,
            signature: null,
            count: 1
        });
    }
}

/**
 * Drops any values left on the stack that are not
 * apart of the block's signature.
 * 
 * For context, the following is valid wasm:
 * block i32
 *   i32.const 1
 *   i32.const 2
 *   i32.const 3
 *   return
 * end
 * 
 */
const dropBlockLeftOvers = (
    ctx: IntructionParsingContext,
    block: Instr<InstrType.Block>,
    start: number
) => {
    const resultCount = getExpressionResultCount(block);

    let seenResultsCount = 0;
    let end: number = ctx.valueStack.length;
    if (resultCount !== 0) {
        // 
        // Get the index of the first value that is a result.
        // To do this, we must go backwards.
        // 
        for (let i = ctx.valueStack.length - 1; i >= start; i--) {
            const expr = ctx.valueStack[i];

            // TODO: (0) Assert this should never be more than 1 (0, 1)
            // -Might not be necessary as it nothing on valueStack
            // is a multi result
            if (getExpressionResultCount(expr) === 1) {
                if (seenResultsCount < resultCount) {
                    seenResultsCount++;

                    if (seenResultsCount === resultCount) {
                        end = i;
                        break;
                    }
                }
            }
        }

        // Now copy from start to end into children, dropping everything else
        for (let i = start; i < end; i++) {
            const expr = ctx.valueStack[i];

            if (getExpressionResultCount(expr) === 1) {
                block.children.push({
                    type: hl_wasm.InstructionType.Drop,
                    signature: null,
                    value: expr
                })
            } else {
                block.children.push(expr);
            }
        }

        for (let i = end; i < ctx.valueStack.length; i++) {
            block.children.push(ctx.valueStack[i]);
        }

        ctx.valueStack.length = start;
    }

}



const consumeBlock = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    // See WasmBinaryReader::visitBlock from WebAssembly/binaryen repo
    // for reasoning behind this optimization
    // 
    // TL;DR, LLVM likes to put a lot of consecutive blocks
    // so we will parse them all at once
    const blocks: Instr<InstrType.Block>[] = [];

    // First read the blocks
    while (true) {
        const isLoop = instr.opcode === wasm.Opcode.Loop;
        const signature = getWasmBlockSignature(ctx, instr);
        const block: Instr<InstrType.Block> = {
            type: hl_wasm.InstructionType.Block,
            children: [],
            isLoop,
            signature
        };

        ctx.branchStack.push(block);
        blocks.push(block);

        const peek = peekInput(ctx);
        if (peek === null) {
            // Unexpected end of code
            break;
        }

        if (peek.opcode !== wasm.Opcode.Block) break;

        instr = readInput(ctx);
    }

    // Then read their bodies and close
    let last: Instr<InstrType.Block> | null = null;
    while (blocks.length > 0) {
        const block = blocks.pop()!;

        const start = ctx.valueStack.length;
        if (last !== null) {
            pushExpression(ctx, last);
        }

        last = block;
        consumeExpressions(ctx);

        logging.assert(ctx.valueStack.length >= start, "Value stack underflow during consumeBlock");
        ctx.branchStack.pop();

        dropBlockLeftOvers(ctx, block, start);
    }

    if (last) {
        pushExpression(ctx, last);
    }
}

const consumeIf = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const signature = getWasmBlockSignature(ctx, instr);
    const condition = popNonVoidExpression(ctx);

    const ifTrue = getBlock(ctx, signature);
    let ifFalse = null;
    if (ctx.lastDelimiter === wasm.Opcode.Else) {
        ifFalse = getBlock(ctx, signature);
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.If,
        condition,
        signature,
        ifTrue,
        ifFalse
    });
}

const consumeBranch = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const label = getBlockByDepth(ctx, instr.immediates.labelIndex!);
    
     // If the label is a loop, then it has no results
     const resultCount = label.isLoop ? 0 : getExpressionResultCount(label);
    const signature = label.signature

    const isConditional = instr.opcode === wasm.Opcode.BrIf;
    const condition: Instr | null = isConditional ? popNonVoidExpression(ctx) : null;

    const values: Instr[] = [];
    for (let i = 0; i < resultCount; ++i) {
        values.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Br,
        signature: isConditional ? signature : null,
        label,
        value: values,
        condition
    });
}

const consumeSwitch = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const condition = popNonVoidExpression(ctx);
    const defaultLabel = getBlockByDepth(ctx, instr.immediates.defaultLabelIndex!);
    const resultCount = getExpressionResultCount(defaultLabel);

    const labels = [];
    for (const labelIdx of instr.immediates.labelIndexs!) {
        // TODO: (0) Assert this block is the same signature
        // as the default
        labels.push(getBlockByDepth(ctx, labelIdx));
    }

    const values: Instr[] = [];
    for (let i = 0; i < resultCount; ++i) {
        values.push(popNonVoidExpression(ctx));
    }
    
    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Switch,
        signature: null,
        labels,
        defaultLabel,
        value: values,
        condition
    });
}

const consumeReturn = (
    ctx: IntructionParsingContext
) => {
    // TODO: (0) Assert we are in a function
    const scope = ctx.scope!;
    const signature = scope.signature;
    if (!signature) return;

    const values: Instr[] = [];

    for (let i = 0; i < signature.results.length; ++i) {
        values.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Return,
        signature: null,
        value: values
    });
}

const consumeIndirectCall = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const target = popNonVoidExpression(ctx);
    const signature = getWasmBlockSignature(ctx, instr)!;

    const args: Instr[] = [];
    if (signature && !hl_wasm.isValueType(signature)) {
        for (let i = 0; signature && i < signature.params.length; ++i) {
            args.push(popNonVoidExpression(ctx));
        }
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Call,
        target,
        signature,
        arguments: args
    });
}

const consumeCall = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const target = ctx.fmt.getFunction(instr.immediates.functionIndex!);
    const signature = target.signature;

    const args: Instr[] = [];
    for (let i = 0; i < signature.params.length; ++i) {
        args.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Call,
        target,
        signature,
        arguments: args
    });
}

const consumeDrop = (
    ctx: IntructionParsingContext
) => {
    const exprToDrop = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Drop,
        signature: null,
        value: exprToDrop
    });
}

const consumeSelect = (
    ctx: IntructionParsingContext
) => {
    const condition = popNonVoidExpression(ctx);
    const ifTrue = popNonVoidExpression(ctx);
    const ifFalse = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Select,
        signature: ifTrue.signature,
        condition,
        ifTrue,
        ifFalse
    });
}

const consumeGet = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    // TODO: (0) Assert we are in a function
    const scope = ctx.scope!;

    const isGlobal = instr.opcode === wasm.Opcode.GlobalGet;
    const index = isGlobal ? instr.immediates.globalIndex!
        : instr.immediates.localIndex!;

    const target = isGlobal ? ctx.fmt.globals[index] : scope.locals[index];

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Get,
        signature: target.valueType,
        target
    });
}

const consumeSet = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    // TODO: (0) Assert we are in a function
    const scope = ctx.scope!;

    const isTee = instr.opcode === wasm.Opcode.LocalTee;
    const isGlobal = instr.opcode === wasm.Opcode.GlobalSet;
    const index = isGlobal ? instr.immediates.globalIndex!
        : instr.immediates.localIndex!;

    const target = isGlobal ? ctx.fmt.globals[index] : scope.locals[index];

    const value = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Set,
        signature: null,
        target,
        value
    });
    
    // Although this might mean more instructions
    // and more memory, it makes the IR a simple structure
    // to deal with
    if (isTee) {
        pushExpression(ctx, {
            type: hl_wasm.InstructionType.Get,
            signature: target.valueType,
            target
        });
    }
}

const tryConsumeLoad = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): boolean => {
    let signed: boolean = false;
    let valueType: wasm.ValueType;
    let byteCount: number;
    switch (instr.opcode) {
        case wasm.Opcode.I32Load: {
            signed = true;
            valueType = wasm.ValueType.I32;
            byteCount = 4;
        } break;
        case wasm.Opcode.I64Load: {
            signed = true;
            valueType = wasm.ValueType.I64;
            byteCount = 8;
        } break;
        case wasm.Opcode.F32Load: {
            valueType = wasm.ValueType.F32;
            byteCount = 4;
        } break;
        case wasm.Opcode.F64Load: {
            valueType = wasm.ValueType.F64;
            byteCount = 8;
        } break;
        case wasm.Opcode.I32Load8_S: {
            signed = true;
            valueType = wasm.ValueType.I32;
            byteCount = 1;
        } break;
        case wasm.Opcode.I32Load8_U: {
            valueType = wasm.ValueType.I32;
            byteCount = 1;
        } break;
        case wasm.Opcode.I32Load16_S: {
            signed = true;
            valueType = wasm.ValueType.I32;
            byteCount = 2;
        } break;
        case wasm.Opcode.I32Load16_U: {
            valueType = wasm.ValueType.I32;
            byteCount = 2;
        } break;
        case wasm.Opcode.I64Load8_S: {
            signed = true;
            valueType = wasm.ValueType.I64;
            byteCount = 1;
        } break;
        case wasm.Opcode.I64Load8_U: {
            valueType = wasm.ValueType.I64;
            byteCount = 1;
        } break;
        case wasm.Opcode.I64Load16_S: {
            signed = true;
            valueType = wasm.ValueType.I64;
            byteCount = 2;
        } break;
        case wasm.Opcode.I64Load16_U: {
            valueType = wasm.ValueType.I64;
            byteCount = 2;
        } break;
        case wasm.Opcode.I64Load32_S: {
            signed = true;
            valueType = wasm.ValueType.I64;
            byteCount = 4;
        } break;
        case wasm.Opcode.I64Load32_U: {
            valueType = wasm.ValueType.I64;
            byteCount = 4;
        } break;
        default: return false;
    }

    const { align, offset } = instr.immediates.memoryArgument!;

    const address = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Load,
        signature: valueType,
        address,
        signed,
        byteCount,
        offset,
        align
    });

    return true;
}

const tryConsumeStore = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): boolean => {
    let valueType: wasm.ValueType;
    let byteCount: number;
    switch (instr.opcode) {
        case wasm.Opcode.I32Store: {
            valueType = wasm.ValueType.I32;
            byteCount = 4;
        } break;
        case wasm.Opcode.I32Store8: {
            valueType = wasm.ValueType.I32;
            byteCount = 1;
        } break;
        case wasm.Opcode.I32Store16: {
            valueType = wasm.ValueType.I32;
            byteCount = 2;
        } break;
        case wasm.Opcode.I64Store: {
            valueType = wasm.ValueType.I64;
            byteCount = 8;
        } break;
        case wasm.Opcode.I64Store8: {
            valueType = wasm.ValueType.I64;
            byteCount = 1;
        } break;
        case wasm.Opcode.I64Store16: {
            valueType = wasm.ValueType.I64;
            byteCount = 2;
        } break;
        case wasm.Opcode.I64Store32: {
            valueType = wasm.ValueType.I64;
            byteCount = 4;
        } break;
        case wasm.Opcode.F32Store: {
            valueType = wasm.ValueType.F32;
            byteCount = 4;
        } break;
        case wasm.Opcode.F64Store: {
            valueType = wasm.ValueType.F64;
            byteCount = 8;
        } break;

        default: return false;
    }

    const { align, offset } = instr.immediates.memoryArgument!;

    const address = popNonVoidExpression(ctx);
    const value = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Store,
        signature: valueType,
        address,
        byteCount,
        offset,
        align,
        value
    });

    return true;
}

const tryConsumeConst = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): boolean => {
    let valueType: wasm.ValueType;
    let value: number | bigint | Uint8Array | hl_wasm.Function | null;
    switch (instr.opcode) {
        case wasm.Opcode.I32Const: {
            valueType = wasm.ValueType.I32;
            value = instr.immediates.value!;
        } break;
        case wasm.Opcode.I64Const: {
            valueType = wasm.ValueType.I64;
            value = instr.immediates.value!;
        } break;
        case wasm.Opcode.F32Const: {
            valueType = wasm.ValueType.F32;
            value = instr.immediates.value!;
        } break;
        case wasm.Opcode.F64Const: {
            valueType = wasm.ValueType.F64;
            value = instr.immediates.value!;
        } break;
        case wasm.Opcode.V128Const: {
            valueType = wasm.ValueType.V128;
            value = instr.immediates.value!;
        } break;
        case wasm.Opcode.RefNull: {
            valueType = wasm.ValueType.FuncRef;
            value = null;
        } break;
        case wasm.Opcode.RefFunc: {
            valueType = wasm.ValueType.FuncRef;
            value = ctx.fmt.functions[instr.immediates.functionIndex!];
        } break;
        default: return false;
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Const,
        signature: valueType,
        value
    } as Instr<InstrType.Const>);

    return true;
}

const tryConsumeUnary = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    let valueType: wasm.ValueType;
    switch (instr.opcode) {
        case wasm.Opcode.F32Abs:
        case wasm.Opcode.F32Ceil:
        case wasm.Opcode.F32Copysign:
        case wasm.Opcode.F32Floor:
        case wasm.Opcode.F32Nearest:
        case wasm.Opcode.F32Neg:
        case wasm.Opcode.F32Sqrt:
        case wasm.Opcode.F32Trunc: {
            valueType = wasm.ValueType.F32;
        } break;
        case wasm.Opcode.F64Abs:
        case wasm.Opcode.F64Ceil:
        case wasm.Opcode.F64Copysign:
        case wasm.Opcode.F64Floor:
        case wasm.Opcode.F64Nearest:
        case wasm.Opcode.F64Neg:
        case wasm.Opcode.F64Sqrt:
        case wasm.Opcode.F64Trunc: {
            valueType = wasm.ValueType.F64;
        } break;
        case wasm.Opcode.I32Clz:
        case wasm.Opcode.I32Ctz:
        case wasm.Opcode.I32Eqz:
        case wasm.Opcode.I32Popcnt: { 
            valueType = wasm.ValueType.I32;
        } break;
        case wasm.Opcode.I64Clz:
        case wasm.Opcode.I64Ctz:
        case wasm.Opcode.I64Eqz:
        case wasm.Opcode.I64Popcnt: {
            valueType = wasm.ValueType.I64;
        } break;
        default: return false;
    }

    const value = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: InstrType.Unary,
        value,
        signature: valueType,
        opcode: instr.opcode
    });

    return true;
}

const tryConsumeBinary = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    let valueType: wasm.ValueType;
    switch (instr.opcode) {
        case wasm.Opcode.F32Add:
        case wasm.Opcode.F32Div:
        case wasm.Opcode.F32Max:
        case wasm.Opcode.F32Min:
        case wasm.Opcode.F32Mul:
        case wasm.Opcode.F32Sub: {
            valueType = wasm.ValueType.F32;
        } break;
        case wasm.Opcode.F64Add:
        case wasm.Opcode.F64Div:
        case wasm.Opcode.F64Max:
        case wasm.Opcode.F64Min:
        case wasm.Opcode.F64Mul:
        case wasm.Opcode.F64Sub: {
            valueType = wasm.ValueType.F64;
        } break;
        case wasm.Opcode.F32Eq:
        case wasm.Opcode.F32Ge:
        case wasm.Opcode.F32Gt:
        case wasm.Opcode.F32Le:
        case wasm.Opcode.F32Lt:
        case wasm.Opcode.F32Ne:

        case wasm.Opcode.F64Eq:
        case wasm.Opcode.F64Ge:
        case wasm.Opcode.F64Gt:
        case wasm.Opcode.F64Le:
        case wasm.Opcode.F64Lt:
        case wasm.Opcode.F64Ne:

        case wasm.Opcode.I32Eq:
        case wasm.Opcode.I32Ge_S:
        case wasm.Opcode.I32Ge_U:
        case wasm.Opcode.I32Gt_S:
        case wasm.Opcode.I32Gt_U:
        case wasm.Opcode.I32Le_S:
        case wasm.Opcode.I32Le_U:
        case wasm.Opcode.I32Lt_S:
        case wasm.Opcode.I32Lt_U:
        case wasm.Opcode.I32Ne:
                
        case wasm.Opcode.I64Eq:
        case wasm.Opcode.I64Ge_S:
        case wasm.Opcode.I64Ge_U:
        case wasm.Opcode.I64Gt_S:
        case wasm.Opcode.I64Gt_U:
        case wasm.Opcode.I64Le_S:
        case wasm.Opcode.I64Le_U:
        case wasm.Opcode.I64Lt_S:
        case wasm.Opcode.I64Lt_U:
        case wasm.Opcode.I64Ne:

        case wasm.Opcode.I32Add:
        case wasm.Opcode.I32And:
        case wasm.Opcode.I32Mul:
        case wasm.Opcode.I32Or:
        case wasm.Opcode.I32Shl:
        case wasm.Opcode.I32Shr_S:
        case wasm.Opcode.I32Shr_U:
        case wasm.Opcode.I32Sub:
        case wasm.Opcode.I32Rem_S:
        case wasm.Opcode.I32Rem_U:
        case wasm.Opcode.I32Div_S:
        case wasm.Opcode.I32Div_U:
        case wasm.Opcode.I32Rotl:
        case wasm.Opcode.I32Rotr:
        case wasm.Opcode.I32Xor: {
            valueType = wasm.ValueType.I32;
        } break;
        case wasm.Opcode.I64Add:
        case wasm.Opcode.I64And:
        case wasm.Opcode.I64Mul:
        case wasm.Opcode.I64Or:
        case wasm.Opcode.I64Shl:
        case wasm.Opcode.I64Shr_S:
        case wasm.Opcode.I64Shr_U:
        case wasm.Opcode.I64Sub:
        case wasm.Opcode.I64Rem_S:
        case wasm.Opcode.I64Rem_U:
        case wasm.Opcode.I64Div_S:
        case wasm.Opcode.I64Div_U:
        case wasm.Opcode.I64Rotl:
        case wasm.Opcode.I64Rotr:
        case wasm.Opcode.I64Xor: {
            valueType = wasm.ValueType.I64;
        } break;

        default: return false;
    }

    const left = popNonVoidExpression(ctx);
    const right = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: InstrType.Binary,
        left,
        right,
        signature: valueType,
        opcode: instr.opcode
    });

    return true;
}

const tryConsumeConvert = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    let valueType: wasm.ValueType;

    switch (instr.opcode) {
        case wasm.Opcode.I32Extend8_S:
        case wasm.Opcode.I32Extend16_S:
        case wasm.Opcode.I32TruncSatF32_S:
        case wasm.Opcode.I32TruncSatF32_U:
        case wasm.Opcode.I32TruncSatF64_S:
        case wasm.Opcode.I32TruncSatF64_U:
        case wasm.Opcode.I32ReinterpretF32:
        case wasm.Opcode.I32WrapI64:
        case wasm.Opcode.I32TruncF32_S:
        case wasm.Opcode.I32TruncF32_U:
        case wasm.Opcode.I32TruncF64_S:
        case wasm.Opcode.I32TruncF64_U: {
            valueType = wasm.ValueType.I32;
        } break;

        case wasm.Opcode.I64ExtendI32_S:
        case wasm.Opcode.I64ExtendI32_U:
        case wasm.Opcode.I64TruncF32_S:
        case wasm.Opcode.I64TruncF32_U:
        case wasm.Opcode.I64TruncF64_S:
        case wasm.Opcode.I64TruncF64_U:
        case wasm.Opcode.I64ReinterpretF64:
        case wasm.Opcode.I64Extend8_S:
        case wasm.Opcode.I64Extend16_S:
        case wasm.Opcode.I64Extend32_S:
        case wasm.Opcode.I64TruncSatF32_S:
        case wasm.Opcode.I64TruncSatF32_U:
        case wasm.Opcode.I64TruncSatF64_S:
        case wasm.Opcode.I64TruncSatF64_U: {
            valueType = wasm.ValueType.I64;
        } break;

        case wasm.Opcode.F32ConvertI32_S:
        case wasm.Opcode.F32ConvertI32_U:
        case wasm.Opcode.F32ConvertI64_S:
        case wasm.Opcode.F32ConvertI64_U:
        case wasm.Opcode.F32DemoteF64:
        case wasm.Opcode.F32ReinterpretI32: {
            valueType = wasm.ValueType.F32;
        } break;

        case wasm.Opcode.F64ConvertI32_S:
        case wasm.Opcode.F64ConvertI32_U:
        case wasm.Opcode.F64ConvertI64_S:
        case wasm.Opcode.F64ConvertI64_U:
        case wasm.Opcode.F64PromoteF32:
        case wasm.Opcode.F64ReinterpretI64: {
            valueType = wasm.ValueType.F64;
        } break;
        default: return false;
    }

    const value = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Convert,
        signature: valueType,
        opcode: instr.opcode,
        value
    });

    return true;
}

const tryConsumeMemory = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    switch (instr.opcode) {
        case wasm.Opcode.MemorySize: {
            pushExpression(ctx, {
                type: hl_wasm.InstructionType.MemorySize,
                signature: wasm.ValueType.I32
            });
        } break;
        case wasm.Opcode.MemoryGrow: {
            const delta = popNonVoidExpression(ctx);

            pushExpression(ctx, {
                type: hl_wasm.InstructionType.MemoryGrow,
                signature: wasm.ValueType.I32,
                delta
            });
        } break;
        default: return false;
    }

    return true;
}



const getBlock = (
    ctx: IntructionParsingContext,
    signature: hl_wasm.Signature | null
) => {
    const block: Instr<InstrType.Block> = {
        type: hl_wasm.InstructionType.Block,
        children: [],
        isLoop: false,
        signature
    };

    ctx.branchStack.push(block);

    const start = ctx.valueStack.length;

    consumeExpressions(ctx);
    
    logging.assert(ctx.branchStack.pop() === block, "Unbalanced branch stack during block parsing")
    logging.assert(ctx.valueStack.length >= start, "Value stack underflow during block parsing")
    dropBlockLeftOvers(ctx, block, start);

    return block;
}



const consumeExpressions = (
    ctx: IntructionParsingContext
) => {
    const wasUnreachable = ctx.isUnreachable;

    while (moreInput(ctx)) {
        const instr = readInput(ctx);

        switch (instr.opcode) {
            case wasm.Opcode.Else: break;
            case wasm.Opcode.End: break;


            // Binaryen likes to kill the IR processing
            // on encountering the Unreachable, under
            // the possiblity that invalid code follows
            // 
            // But this seems unlikely (if even valid)
            case wasm.Opcode.Unreachable: {
                pushExpression(ctx, kInstrUnreachable);
                ctx.isUnreachable = true;
            } break;
            case wasm.Opcode.Nop: {
                consumeNop(ctx);
            } break;
            case wasm.Opcode.Loop: 
            case wasm.Opcode.Block: {
                consumeBlock(ctx, instr);
            } break;
            case wasm.Opcode.If: {
                consumeIf(ctx, instr);
            } break;


            case wasm.Opcode.Br:
            case wasm.Opcode.BrIf: {
                consumeBranch(ctx, instr);
            } break;
            case wasm.Opcode.BrTable: {
                consumeSwitch(ctx, instr);
            } break;
            case wasm.Opcode.Return: {
                consumeReturn(ctx);
            } break;
            case wasm.Opcode.Call: {
                consumeCall(ctx, instr);
            } break;
            case wasm.Opcode.CallIndirect: {
                consumeIndirectCall(ctx, instr);
            } break;
            // TODO:
            // case wasm.Opcode.RefNull: { } break;
            // case wasm.Opcode.RefIsNull: { } break;
            // case wasm.Opcode.RefFunc: { } break;
            case wasm.Opcode.Drop: {
                consumeDrop(ctx);
            } break;
            case wasm.Opcode.Select:
            case wasm.Opcode.SelectWithType: {
                consumeSelect(ctx);
            } break;
            case wasm.Opcode.GlobalGet:
            case wasm.Opcode.LocalGet: {
                consumeGet(ctx, instr);
            } break;
            case wasm.Opcode.GlobalSet:
            case wasm.Opcode.LocalTee:
            case wasm.Opcode.LocalSet: {
                consumeSet(ctx, instr);
            } break;
            // TODO:
            // case wasm.Opcode.TableGet: { } break;
            // case wasm.Opcode.TableSet: { } break;
            // case wasm.Opcode.TableInit: { } break;
            // case wasm.Opcode.ElemDrop: { } break;
            // case wasm.Opcode.TableCopy: { } break;
            // case wasm.Opcode.TableGrow: { } break;
            // case wasm.Opcode.TableSize: { } break;
            // case wasm.Opcode.TableFill: { } break;
            default: {
                if (tryConsumeLoad(ctx, instr)) break;
                if (tryConsumeStore(ctx, instr)) break;
                if (tryConsumeConst(ctx, instr)) break;
                // if (tryConsumeTable(ctx, instr)) break;
                if (tryConsumeMemory(ctx, instr)) break;
                if (tryConsumeUnary(ctx, instr)) break;
                if (tryConsumeBinary(ctx, instr)) break;
                if (tryConsumeConvert(ctx, instr)) break;

                throw logging.fatal('Invalid opcode ' + instr.opcode);
            } break;

            // TODO: SIMD
            // TODO: ATOMICS
            // TODO: BULK MEMORY
            // TODO: EXCEPTIONS
        }
        if (
            instr.opcode === wasm.Opcode.End ||
            instr.opcode === wasm.Opcode.Else
        ) {
            ctx.lastDelimiter = instr.opcode;
            break;
        }
    }

    ctx.isUnreachable = wasUnreachable;
}



export const getInstructionExpression = (
    fmt: Format,
    wasmFmt: WasmFormat,
    scope: hl_wasm.UnimportedFunction | null,
    wasmExpr: wasm.Instruction[]
): Instr => {
    const ctx = {
        branchStack: [],
        valueStack: [],
        isUnreachable: false,
        lastDelimiter: null,

        inputPos: 0,
        input: wasmExpr,
        scope,
        fmt,
        wasmFmt
    } as IntructionParsingContext;

    const block = getBlock(
        ctx,
        scope === null ? null : scope.signature
    );

    ctx.valueStack.length = 0;

    return block;
}
