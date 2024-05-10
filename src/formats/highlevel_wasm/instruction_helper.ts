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


export const kInstrUnreachable: hl_wasm.Instruction = {
    type: hl_wasm.InstructionType.Unreachable,
    signature: null
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
    // TODO: Assert stack is not empty)
    let expr = ctx.valueStack.pop()!;

    if (getExpressionResultCount(expr) === 1) return expr;
    // If the top is a void, then we need to squash it
    // with the previous instructions until we find a
    // non-void statement. Effectively guaranteeing
    // proper order of execution.
    const block = {
        type: InstrType.Block,
        isLoop: false,
        signature: { params: [], results: [] },
        children: []
    } as Instr<InstrType.Block>;
    
    do {
        block.children.unshift(expr);

        expr = ctx.valueStack.pop()!;
    } while (getExpressionResultCount(expr) === 0);
    
    // Now the first thing in the block *actually* has a result
    // (block.signature as wasm.FuncSignature).results = expr;

    return expr;
}

export const pushExpression = (
    ctx: IntructionParsingContext,
    expr: Instr
) => {
    // console.log('--push expr ' + expr.type + '--\n' + new Error().stack?.split('\n').slice(1,3).join('\n'))

    if (isMultiResultExpression(expr)) {
        pushMultiResultExpression(ctx, expr);
    } else {
        ctx.valueStack.push(expr);
    }
}


const isMultiResultExpression = (
    expr: Instr
): expr is MultiResultInstruction => {
    const signature = expr.signature;

    if (!signature) return  false;
    if (hl_wasm.isValueType(signature)) return false;

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
        value: expr,
        signature: null,
    });

    for (const local of locals) {
        ctx.valueStack.push({
            type: hl_wasm.InstructionType.Get,
            target: local,
            signature: local.valueType
        });
    }
}


export const getBlockSignature = (
    ctx: IntructionParsingContext,
    instr: wasm.Instruction
): hl_wasm.Signature => {
    if (instr.immediates.valueType === wasm.VoidType) return null;

    // It will never be 0
    if (instr.immediates.valueType) {
        return instr.immediates.valueType;
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
    const signature = instr.signature;

    if (!signature) return 0;
    if (hl_wasm.isValueType(signature)) return 1;

    return signature.results.length;
}
