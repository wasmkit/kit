import type { HighlevelFormat } from "./index";
import { WasmFormat as WasmFormat } from "../wasm/";

import * as wasm from "../wasm/types";
import * as hl_wasm from "./types";
import * as logging from "../../lib/logging";

import { InstructionType as InstrType } from "./types";

/**
 * Contains all information relevant / needed
 * to process a given wasm instruction.
 */
export interface IntructionParsingContext {
    /**
     * Keeps track of blocks in the control flow
     * that can be branched out of with br.
     */
    branchStack: Instr<InstrType.Block>[];

    /**
     * All values processed up to this point,
     * this can include void values, as we
     * keep them here for proper ordering.
     */
    valueStack: hl_wasm.Instruction[];

    /**
     * This is unused for now, although in the
     * future it might be linked up to a binaryen-like
     * skipping logic that skips IR processing
     * in unreachable code.
     */
    isUnreachable: boolean;
    
    /**
     * The last delimiter that was processed,
     * is used to know if If's are closed by
     * End or by Else (marking whether continue
     * processing the else block).
     */
    lastDelimiter: wasm.Opcode | null;

    /**
     * The current position in the input instruction
     * stream.
     */
    inputPos: number;

    /**
     * The input instruction stream.
     */
    readonly input: wasm.Instruction[];

    /**
     * The current function scope, if any
     * 
     * (global $g (mut i32) (i32.const 4)) has no
     * scope, as it's not in a function.
     */
    readonly scope: hl_wasm.UnimportedFunction | null;
    
    /**
     * Cached wasm format data.
     */
    readonly wasmFmt: WasmFormat;

    /**
     * Cached hl_wasm format data.
     */
    readonly fmt: HighlevelFormat;
}

// Shorthand aliases of hl_wasm types
export { InstrType };
export type Instr<
    T extends InstrType | null = null
> = T extends InstrType ? hl_wasm.InstructionOfType<T> : hl_wasm.Instruction;

// 
// Given the fact unreachables are common and are similar,
// we just cache all of them into this constant.
// 
export const kInstrUnreachable: hl_wasm.Instruction = {
    type: hl_wasm.InstructionType.Unreachable,
    signature: null
};

// 
// Only these types can have multiple results atm,
// so we use this type simplicity.
// 
export type MultiResultInstruction = (
    Instr<InstrType.Block> |
    Instr<InstrType.If> |
    Instr<InstrType.Call>
) & { signature: Readonly<wasm.FuncSignature> };



export const peekInput = (
    ctx: IntructionParsingContext
): wasm.Instruction | null => {
    return ctx.input[ctx.inputPos] ?? null;
}

export const readInput = (
    ctx: IntructionParsingContext
): wasm.Instruction => {
    logging.assert(moreInput(ctx), "No more input");
    return ctx.input[ctx.inputPos++];
}

export const moreInput = (
    ctx: IntructionParsingContext
): boolean => {
    return ctx.inputPos < ctx.input.length;
}



export const peekExpression = (
    ctx: IntructionParsingContext
): Instr | null => {
    return ctx.valueStack.at(-1) ?? null;
}

export const popExpression = (
    ctx: IntructionParsingContext
): Instr => {
    logging.assert(ctx.valueStack.length > 0, "Value stack is empty");

    return ctx.valueStack.pop()!;
}



export const  popNonVoidExpression = (
    ctx: IntructionParsingContext,
): Instr => {
    let expr = popExpression(ctx);

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
    block.children.unshift(expr);

    if (hl_wasm.isValueType(expr.signature)) {
        block.signature = expr.signature;
    } else if (expr.signature) {
        // Assert it has 1 result (it should only) 
        block.signature = expr.signature.results[0];
    }

    return block;
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
    // TODO: (0) Assert we are in a function
    const scope = ctx.scope!;
    const locals: hl_wasm.LocalVariable[] = [];

    for (const valueType of signature.results)  {
        const local: hl_wasm.LocalVariable = {
            valueType,
            mutable: true,
            isGlobal: false,
            index: scope.locals.length,
            isParameter: false
        };
        ctx.fmt.appendLocal(scope, local);
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



export const getWasmBlockSignature = (
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

export const getBlockByDepth = (
    ctx: IntructionParsingContext,
    depth: number
): Instr<InstrType.Block> => {
    logging.assert(depth < ctx.branchStack.length, "Depth out of bounds");

    return ctx.branchStack.at(-depth - 1)!;
}

export const getExpressionResultCount = (
    instr: Instr
): number => {
    const signature = instr.signature;

    if (!signature) return 0;
    if (hl_wasm.isValueType(signature)) return 1;

    return signature.results.length;
}
