import * as wasm from "../wasm/types";
import type { Format } from "./index";
import { Format as WasmFormat } from "../wasm/";

import * as hl_wasm from "./types";
import { InstructionType as InstrType } from "./types";
// Aliases
export { InstrType };
export type Instr<
    T extends InstrType | null = null
> = T extends InstrType ? hl_wasm.InstructionOfType<T> : hl_wasm.Instruction;


export type BlockSignature = Readonly<wasm.FuncSignature> | null;
export const kInstrUnreachable: hl_wasm.Instruction = {
    type: hl_wasm.InstructionType.Unreachable
};


export type MultiResultInstruction = (Instr<InstrType.Block>
    | Instr<InstrType.If>
    | Instr<InstrType.Call>) & { signature: Readonly<wasm.FuncSignature> };


export interface IntructionParsingContext {
    breakStack: Instr<InstrType.Block>[];
    valueStack: hl_wasm.Instruction[];
    isUnreachable: boolean;
    lastDelimiter: wasm.Opcode | null;

    inputPos: number;
    readonly input: wasm.InstructionExpression;
    readonly scope: hl_wasm.UnimportedFunction | null;
    readonly wasmFmt: WasmFormat;
    readonly fmt: Format;
}


export const peekInput = (
    ctx: IntructionParsingContext
): wasm.Instruction => {
    return ctx.input[ctx.inputPos] ?? null;
}

export const readInput = (
    ctx: IntructionParsingContext
): wasm.Instruction => {
    return ctx.input[ctx.inputPos++];
}

export const moreInput = (
    ctx: IntructionParsingContext
): boolean => {
    return ctx.inputPos < ctx.input.length;
}



export const peekExpression = (
    ctx: IntructionParsingContext
): Instr => {
    return ctx.valueStack.at(-1)!;
}

export const popExpression = (
    ctx: IntructionParsingContext
): Instr => {
    // TODO: Assert stack is not empty

    return ctx.valueStack.pop()!;
}

export const popNonVoidExpression = (
    ctx: IntructionParsingContext,
): Instr => {
    // Do the blockerizer
    // TODO: Assert stack is not empty

    return ctx.valueStack.pop()!;
}

export const pushExpression = (
    ctx: IntructionParsingContext,
    expr: Instr
) => {
    if (isMultiResultExpression(expr)) {
        pushMultiResultExpression(ctx, expr);
    } else {
        ctx.valueStack.push(expr);
    }
}


const isMultiResultExpression = (
    expr: Instr
): expr is MultiResultInstruction => {
    switch (expr.type) {
        case InstrType.Block:
        case InstrType.If:
        case InstrType.Call: break;

        default: return false;
    }

    const signature = expr.signature;

    if (!signature) return false;

    return signature.results.length > 1;
}

const pushMultiResultExpression = (
    ctx: IntructionParsingContext,
    expr: MultiResultInstruction
) => {
    const signature = expr.signature;
        // TODO: Assert we are in a function
    const scope = ctx.scope!;
    const locals: hl_wasm.LocalVariable[] = [];

    for (const valueType of signature.results)  {
        // TODO: Scope.appendLocal()
        const local: hl_wasm.LocalVariable = {
            valueType,
            mutable: true,
            isGlobal: false,
            index: scope.locals.length
        };
        scope.locals.push(local);
        locals.push(local);
    }

    ctx.valueStack.push({
        type: hl_wasm.InstructionType.MultiSet,
        targets: locals,
        value: expr
    });

    for (const local of locals) {
        ctx.valueStack.push({
            type: hl_wasm.InstructionType.Get,
            target: local
        });
    }
}



const VALUE_TYPE_TO_FUNC_TYPE: Record<
    wasm.ValueType, Readonly<wasm.FuncSignature>
> = Object.values(wasm.ValueType).reduce((acc, type) => {
    if (Number.isInteger(type) === false) return acc;
    acc[type as wasm.ValueType] = {
        params: [],
        results: [type as wasm.ValueType]
    };
    return acc;
}, {} as Record<wasm.ValueType, Readonly<wasm.FuncSignature>>);

export const getBlockSignature = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): BlockSignature => {
    if (instr.immediates.valueType === wasm.VoidType) return null;

    // It will never be 0
    if (instr.immediates.valueType) {
        return VALUE_TYPE_TO_FUNC_TYPE[instr.immediates.valueType];
    }
    
    return ctx.wasmFmt.signatures[instr.immediates.signatureIndex!];
}

export const getLabelByIndex = (
    ctx: IntructionParsingContext,
    index: number
): Instr<InstrType.Block> => {
    return ctx.breakStack[index];
}

export const getExpressionResultCount = (
    instr: Instr
): number => {
    const type = instr.type;

    switch (type) {
        case InstrType.If:
        case InstrType.Call:
        case InstrType.Block: {
            return instr.signature ? instr.signature.results.length : 0;
        } break;
        case InstrType.Load:
        case InstrType.Binary:
        case InstrType.Const:
        case InstrType.MemoryGrow:
        case InstrType.MemorySize:
        case InstrType.Select: // As of now, must be 1
        case InstrType.Unary:
        case InstrType.Get: {
            return 1;
        } break;
        case InstrType.Br:
        case InstrType.Switch:
        case InstrType.MemoryGrow:
        case InstrType.Nop:
        case InstrType.Drop:
        case InstrType.Return:
        case InstrType.Unreachable:
        case InstrType.Set:
        case InstrType.MultiSet:
        case InstrType.Store: {
            return 0;
        } break;
    }
}
