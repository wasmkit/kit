import * as wasm from "../wasm/types";
import type { Format } from "./index";
import { Format as WasmFormat } from "../wasm/";

import * as hl_wasm from "./types";
import * as logging from "../../lib/logging";
import { 
    BlockSignature,
    Instr,
    InstrType,
    IntructionParsingContext,
    getBlockSignature,
    getExpressionResultCount,
    getLabelByIndex,
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
            count: 1
        });
    }
}

const dropBlockLeftOvers = (
    ctx: IntructionParsingContext,
    block: Instr<InstrType.Block>,
    start: number
) => {
    const signature = block.signature;
    const resultLength = signature ? signature.results.length : 0;

    // There's a chance a block can have more instructions
    // in its stack than its signature actually allows for
    // 
    // block i32
    //   i32.const 1
    //   i32.const 2
    //   i32.const 3
    //   return
    // end
    // 
    // So we must drop the extra values
    const pointOfReturn = ctx.valueStack.length - resultLength;
    for (let i = start; i < ctx.valueStack.length; i++) {
        let expr = ctx.valueStack[i];

        // TODO: Assert this should never be more than 1 (0, 1)
        // If i >= pointOfReturn, then the following expression
        // is a returned value (and therefore must be kept)
        if (i < pointOfReturn && getExpressionResultCount(expr) === 1) {
            expr = {
                type: hl_wasm.InstructionType.Drop,
                value: expr
            };
        }

        block.children.push(expr);
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
        const signature = getBlockSignature(ctx, instr);
        const block: Instr<InstrType.Block> = {
            type: hl_wasm.InstructionType.Block,
            children: [],
            isLoop,
            signature
        };

        ctx.breakStack.push(block);

        if (!moreInput(ctx)) break;
        if (peekInput(ctx).opcode !== wasm.Opcode.Block) break;

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

        // TODO: Assert the valueStack is no smaller than it was before we started
        ctx.breakStack.pop();

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
    const signature = getBlockSignature(ctx, instr);
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
    const isConditional = instr.opcode === wasm.Opcode.BrIf;
    const label = getLabelByIndex(ctx, instr.immediates.labelIndex!);
    const resultCount = getExpressionResultCount(label);

    const condition: Instr | null = isConditional ? popNonVoidExpression(ctx) : null;

    const values: Instr[] = [];
    for (let i = 0; i < resultCount; ++i) {
        values.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Br,
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
    const defaultLabel = getLabelByIndex(ctx, instr.immediates.defaultLabelIndex!);
    const resultCount = getExpressionResultCount(defaultLabel);

    const labels = [];
    for (const labelIdx of instr.immediates.labelIndexs!) {
        labels.push(getLabelByIndex(ctx, labelIdx));
    }

    const values: Instr[] = [];
    for (let i = 0; i < resultCount; ++i) {
        values.push(popNonVoidExpression(ctx));
    }
    
    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Switch,
        labels,
        defaultLabel,
        value: values,
        condition
    });
}

export const consumeReturn = (
    ctx: IntructionParsingContext
) => {
    // Assert we are in a function
    const scope = ctx.scope!;
    const signature = scope.signature;
    if (!signature) return;

    const values: Instr[] = [];


    for (let i = 0; i < signature.results.length; ++i) {
        values.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Return,
        value: values
    });
}

export const consumeIndirectCall = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const target = popNonVoidExpression(ctx);
    const signature = getBlockSignature(ctx, instr)!;

    const args: Instr[] = [];
    for (let i = 0; signature && i < signature.params.length; ++i) {
        args.push(popNonVoidExpression(ctx));
    }

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Call,
        target,
        signature,
        arguments: args
    });
}

export const consumeCall = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    // TODO: fmt.getFunction
    const target = ctx.fmt.functions[instr.immediates.functionIndex!];
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

export const consumeDrop = (
    ctx: IntructionParsingContext
) => {
    const exprToDrop = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Drop,
        value: exprToDrop
    });
}

export const consumeSelect = (
    ctx: IntructionParsingContext
) => {
    const condition = popNonVoidExpression(ctx);
    const ifTrue = popNonVoidExpression(ctx);
    const ifFalse = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Select,
        condition,
        ifTrue,
        ifFalse
    });
}

export const consumeGet = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const isGlobal = instr.opcode === wasm.Opcode.GlobalGet;
    const index = isGlobal ? instr.immediates.globalIndex!
        : instr.immediates.localIndex!;

    const target = isGlobal ? ctx.fmt.globals[index] : ctx.scope!.locals[index];

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Get,
        target
    });
}

export const consumeSet = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
) => {
    const isTee = instr.opcode === wasm.Opcode.LocalTee;
    const isGlobal = instr.opcode === wasm.Opcode.GlobalSet;
    const index = isGlobal ? instr.immediates.globalIndex!
        : instr.immediates.localIndex!;

    const target = isGlobal ? ctx.fmt.globals[index] : ctx.scope!.locals[index];

    const value = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Set,
        target,
        value,
        isTee
    });
}

export const tryConsumeLoad = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): boolean => {
    let memoryType: hl_wasm.MemoryType;
    let valueType: wasm.ValueType;
    let byteSize: number;
    switch (instr.opcode) {
        case wasm.Opcode.I32Load: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I32;
            byteSize = 4;
        } break;
        case wasm.Opcode.I64Load: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 8;
        } break;
        case wasm.Opcode.F32Load: {
            memoryType = hl_wasm.MemoryType.Float;
            valueType = wasm.ValueType.F32;
            byteSize = 4;
        } break;
        case wasm.Opcode.F64Load: {
            memoryType = hl_wasm.MemoryType.Float;
            valueType = wasm.ValueType.F64;
            byteSize = 8;
        } break;
        case wasm.Opcode.I32Load8_S: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I32;
            byteSize = 1;
        } break;
        case wasm.Opcode.I32Load8_U: {
            memoryType = hl_wasm.MemoryType.UnsignedInt;
            valueType = wasm.ValueType.I32;
            byteSize = 1;
        } break;
        case wasm.Opcode.I32Load16_S: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I32;
            byteSize = 2;
        } break;
        case wasm.Opcode.I32Load16_U: {
            memoryType = hl_wasm.MemoryType.UnsignedInt;
            valueType = wasm.ValueType.I32;
            byteSize = 2;
        } break;
        case wasm.Opcode.I64Load8_S: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 1;
        } break;
        case wasm.Opcode.I64Load8_U: {
            memoryType = hl_wasm.MemoryType.UnsignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 1;
        } break;
        case wasm.Opcode.I64Load16_S: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 2;
        } break;
        case wasm.Opcode.I64Load16_U: {
            memoryType = hl_wasm.MemoryType.UnsignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 2;
        } break;
        case wasm.Opcode.I64Load32_S: {
            memoryType = hl_wasm.MemoryType.SignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 4;
        } break;
        case wasm.Opcode.I64Load32_U: {
            memoryType = hl_wasm.MemoryType.UnsignedInt;
            valueType = wasm.ValueType.I64;
            byteSize = 4;
        } break;
        default: { return false; }
    }

    const { align, offset } = instr.immediates.memoryArgument!;

    const address = popNonVoidExpression(ctx);

    pushExpression(ctx, {
        type: hl_wasm.InstructionType.Load,
        address,
        memoryType,
        valueType,
        byteSize,
        offset,
        align
    });

    return true;
}



const getBlock = (
    ctx: IntructionParsingContext,
    signature: BlockSignature | null
) => {
    ctx.breakStack.push({
        type: hl_wasm.InstructionType.Block,
        children: [],
        isLoop: false,
        signature
    });

    consumeExpressions(ctx);
    
    // TODO: Assert
    const block = ctx.breakStack.pop()!;

    dropBlockLeftOvers(ctx, block, 0);

    return block;
}

const consumeExpressions = (
    ctx: IntructionParsingContext
) => {
    const wasUnreachable = ctx.isUnreachable;

    while (moreInput(ctx)) {
        const instr = readInput(ctx);

        switch (instr.opcode) {
            case wasm.Opcode.Else: {} break;
            case wasm.Opcode.End: {} break;


            // The minute we see an unreachable,
            // all remaining instructions could be invalid 
            // so we just kill it here
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
            case wasm.Opcode.Call:
            case wasm.Opcode.CallIndirect: {
                consumeCall(ctx, instr);
            } break;
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
            case wasm.Opcode.LocalTee: { } break;
            case wasm.Opcode.LocalSet: {
                consumeSet(ctx, instr);
            } break;
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
                // if (tryConsumeConst(ctx, instr)) break;
                // if (tryConsumeTable(ctx, instr)) break;
                // if (tryConsumeMemory(ctx, instr)) break;
                // if (tryConsumeBinary(ctx, instr)) break;
                // if (tryConsumeUnary(ctx, instr)) break;
                // if (tryConsumeReinterp(ctx, instr)) break;
                // if (tryConsumeConvert(ctx, instr)) break;
            } break;

            // case wasm.Opcode.I32Load:
            // case wasm.Opcode.I64Load:
            // case wasm.Opcode.F32Load:
            // case wasm.Opcode.F64Load:
            // case wasm.Opcode.I32Load8_S:
            // case wasm.Opcode.I32Load8_U:
            // case wasm.Opcode.I32Load16_S:
            // case wasm.Opcode.I32Load16_U:
            // case wasm.Opcode.I64Load8_S:
            // case wasm.Opcode.I64Load8_U:
            // case wasm.Opcode.I64Load16_S:
            // case wasm.Opcode.I64Load16_U:
            // case wasm.Opcode.I64Load32_S:
            // case wasm.Opcode.I64Load32_U:
            // case wasm.Opcode.I32Store:
            // case wasm.Opcode.I64Store:
            // case wasm.Opcode.F32Store:
            // case wasm.Opcode.F64Store:
            // case wasm.Opcode.I32Store8:
            // case wasm.Opcode.I32Store16:
            // case wasm.Opcode.I64Store8:
            // case wasm.Opcode.I64Store16:
            // case wasm.Opcode.I64Store32:
            // case wasm.Opcode.MemorySize:
            // case wasm.Opcode.MemoryGrow:
            // case wasm.Opcode.MemoryInit:
            // case wasm.Opcode.DataDrop:
            // case wasm.Opcode.MemoryCopy:
            // case wasm.Opcode.MemoryFill:
            // case wasm.Opcode.I32Const:
            // case wasm.Opcode.I64Const:
            // case wasm.Opcode.F32Const:
            // case wasm.Opcode.F64Const:
            // case wasm.Opcode.I32Eqz: 
            // case wasm.Opcode.I32Eq: 
            // case wasm.Opcode.I32Ne: 
            // case wasm.Opcode.I32Lt_S: 
            // case wasm.Opcode.I32Lt_U: 
            // case wasm.Opcode.I32Gt_S: 
            // case wasm.Opcode.I32Gt_U: 
            // case wasm.Opcode.I32Le_S: 
            // case wasm.Opcode.I32Le_U: 
            // case wasm.Opcode.I32Ge_S: 
            // case wasm.Opcode.I32Ge_U: 
            // case wasm.Opcode.I64Eqz: 
            // case wasm.Opcode.I64Eq: 
            // case wasm.Opcode.I64Ne: 
            // case wasm.Opcode.I64Lt_S: 
            // case wasm.Opcode.I64Lt_U: 
            // case wasm.Opcode.I64Gt_S: 
            // case wasm.Opcode.I64Gt_U: 
            // case wasm.Opcode.I64Le_S: 
            // case wasm.Opcode.I64Le_U: 
            // case wasm.Opcode.I64Ge_S: 
            // case wasm.Opcode.I64Ge_U: 
            // case wasm.Opcode.F32Eq: 
            // case wasm.Opcode.F32Ne: 
            // case wasm.Opcode.F32Lt: 
            // case wasm.Opcode.F32Gt: 
            // case wasm.Opcode.F32Le: 
            // case wasm.Opcode.F32Ge: 
            // case wasm.Opcode.F64Eq: 
            // case wasm.Opcode.F64Ne: 
            // case wasm.Opcode.F64Lt: 
            // case wasm.Opcode.F64Gt: 
            // case wasm.Opcode.F64Le: 
            // case wasm.Opcode.F64Ge: 
            // case wasm.Opcode.I32Clz: 
            // case wasm.Opcode.I32Ctz: 
            // case wasm.Opcode.I32Popcnt: 
            // case wasm.Opcode.I32Add: 
            // case wasm.Opcode.I32Sub: 
            // case wasm.Opcode.I32Mul: 
            // case wasm.Opcode.I32Div_S: 
            // case wasm.Opcode.I32Div_U: 
            // case wasm.Opcode.I32Rem_S: 
            // case wasm.Opcode.I32Rem_U: 
            // case wasm.Opcode.I32And: 
            // case wasm.Opcode.I32Or: 
            // case wasm.Opcode.I32Xor: 
            // case wasm.Opcode.I32Shl: 
            // case wasm.Opcode.I32Shr_S: 
            // case wasm.Opcode.I32Shr_U: 
            // case wasm.Opcode.I32Rotl: 
            // case wasm.Opcode.I32Rotr: 
            // case wasm.Opcode.I64Clz: 
            // case wasm.Opcode.I64Ctz: 
            // case wasm.Opcode.I64Popcnt: 
            // case wasm.Opcode.I64Add: 
            // case wasm.Opcode.I64Sub: 
            // case wasm.Opcode.I64Mul: 
            // case wasm.Opcode.I64Div_S: 
            // case wasm.Opcode.I64Div_U: 
            // case wasm.Opcode.I64Rem_S: 
            // case wasm.Opcode.I64Rem_U: 
            // case wasm.Opcode.I64And: 
            // case wasm.Opcode.I64Or: 
            // case wasm.Opcode.I64Xor: 
            // case wasm.Opcode.I64Shl: 
            // case wasm.Opcode.I64Shr_S: 
            // case wasm.Opcode.I64Shr_U: 
            // case wasm.Opcode.I64Rotl: 
            // case wasm.Opcode.I64Rotr: 
            // case wasm.Opcode.F32Abs: 
            // case wasm.Opcode.F32Neg: 
            // case wasm.Opcode.F32Ceil: 
            // case wasm.Opcode.F32Floor: 
            // case wasm.Opcode.F32Trunc: 
            // case wasm.Opcode.F32Nearest: 
            // case wasm.Opcode.F32Sqrt: 
            // case wasm.Opcode.F32Add: 
            // case wasm.Opcode.F32Sub: 
            // case wasm.Opcode.F32Mul: 
            // case wasm.Opcode.F32Div: 
            // case wasm.Opcode.F32Min: 
            // case wasm.Opcode.F32Max: 
            // case wasm.Opcode.F32Copysign: 
            // case wasm.Opcode.F64Abs: 
            // case wasm.Opcode.F64Neg: 
            // case wasm.Opcode.F64Ceil: 
            // case wasm.Opcode.F64Floor: 
            // case wasm.Opcode.F64Trunc: 
            // case wasm.Opcode.F64Nearest: 
            // case wasm.Opcode.F64Sqrt: 
            // case wasm.Opcode.F64Add: 
            // case wasm.Opcode.F64Sub: 
            // case wasm.Opcode.F64Mul: 
            // case wasm.Opcode.F64Div: 
            // case wasm.Opcode.F64Min: 
            // case wasm.Opcode.F64Max: 
            // case wasm.Opcode.F64Copysign: 
            // case wasm.Opcode.I32WrapI64: 
            // case wasm.Opcode.I32TruncF32_S: 
            // case wasm.Opcode.I32TruncF32_U: 
            // case wasm.Opcode.I32TruncF64_S: 
            // case wasm.Opcode.I32TruncF64_U: 
            // case wasm.Opcode.I64ExtendI32_S: 
            // case wasm.Opcode.I64ExtendI32_U: 
            // case wasm.Opcode.I64TruncF32_S: 
            // case wasm.Opcode.I64TruncF32_U: 
            // case wasm.Opcode.I64TruncF64_S: 
            // case wasm.Opcode.I64TruncF64_U: 
            // case wasm.Opcode.F32ConvertI32_S: 
            // case wasm.Opcode.F32ConvertI32_U: 
            // case wasm.Opcode.F32ConvertI64_S: 
            // case wasm.Opcode.F32ConvertI64_U: 
            // case wasm.Opcode.F32DemoteF64: 
            // case wasm.Opcode.F64ConvertI32_S: 
            // case wasm.Opcode.F64ConvertI32_U: 
            // case wasm.Opcode.F64ConvertI64_S: 
            // case wasm.Opcode.F64ConvertI64_U: 
            // case wasm.Opcode.F64PromoteF32: 
            // case wasm.Opcode.I32ReinterpretF32: 
            // case wasm.Opcode.I64ReinterpretF64: 
            // case wasm.Opcode.F32ReinterpretF32: 
            // case wasm.Opcode.F64ReinterpretF64: 
            // case wasm.Opcode.I32Extend8_S: 
            // case wasm.Opcode.I32Extend16_S: 
            // case wasm.Opcode.I64Extend8_S: 
            // case wasm.Opcode.I64Extend16_S: 
            // case wasm.Opcode.I64Extend32_S: 
            // case wasm.Opcode.I32TruncSatF32_S: 
            // case wasm.Opcode.I32TruncSatF32_U: 
            // case wasm.Opcode.I32TruncSatF64_S: 
            // case wasm.Opcode.I32TruncSatF64_U: 
            // case wasm.Opcode.I64TruncSatF32_S: 
            // case wasm.Opcode.I64TruncSatF32_U: 
            // case wasm.Opcode.I64TruncSatF64_S: 
            // case wasm.Opcode.I64TruncSatF64_U: 
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
    wasmExpr: wasm.InstructionExpression
): Instr => {
    const ctx = {
        breakStack: [],
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
