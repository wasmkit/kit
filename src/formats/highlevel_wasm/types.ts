import * as wasm from "../wasm/types";

export type Importable<I = {}, NI = {}> = { imported: boolean } & ({ imported: true, importName: string; importModule: string; } & I) | ({ imported: false } & NI);
export type Exportable = { exported: true; exportName: string; } | { exported: false };
export type Indexable = { index: number };

export type Table = Indexable & {
    size: wasm.Limits;
    refType: wasm.RefType;
    activeSegments: readonly ActiveElementSegment[];
} & Importable & Exportable;

export type Memory = Indexable & {
    size: wasm.Limits;
    activeSegments: readonly ActiveDataSegment[];
} & Importable & Exportable;

export type Variable = Indexable & {
    valueType: wasm.ValueType;
    mutable: boolean;
    isGlobal: boolean;
};

export type LocalVariable = Variable & {
    mutable: true;
    isGlobal: false;
    isParameter: boolean
};

export type GlobalVariable = Variable & {
    isGlobal: true
};

export type Global = Variable & {
    isGlobal: true;
} & Importable<{}, { initialization: Instruction }> & Exportable;

export type Function = Indexable & {
    signature: Readonly<wasm.FuncSignature>;
} & Importable<{}, {
    locals: LocalVariable[];
    body: Instruction;
}> & Exportable;

export type UnimportedFunction = Function & { imported: false };

export type ElementSegment = Indexable & {
    mode: wasm.ElementSegmentMode;
    type: wasm.RefType;
    initialization: number[] | Instruction[];
} & (
    { mode: wasm.ElementSegmentMode.Active, table: Table, offset: Instruction }
  | { mode: wasm.ElementSegmentMode.Declarative | wasm.ElementSegmentMode.Passive }
);

export type ActiveElementSegment = ElementSegment & { mode: wasm.ElementSegmentMode.Active };

export type DataSegment = Indexable & { mode: wasm.DataSegmentMode, initialization: Uint8Array } & (
    { mode: wasm.DataSegmentMode.Passive }
  | { mode: wasm.DataSegmentMode.Active, memory: Memory, offset: Instruction }
);

export type ActiveDataSegment = DataSegment & { mode: wasm.DataSegmentMode.Active };

export enum InstructionType {
    Nop = "Nop",
    Unreachable = "Unreachable",
    Drop = "Drop",
    Block = "Block",
    If = "If",
    Br = "Br",
    Switch = "Switch",
    Call = "Call",
    Get = "Get",
    Set = "Set",
    Load = "Load",
    Store = "Store",
    Const = "Const",
    Unary = "Unary",
    Binary = "Binary",
    Select = "Select",
    Return = "Return",
    MemorySize = "MemorySize",
    MemoryGrow = "MemoryGrow",
    Convert = "Convert",

    MultiSet = "MultiSet"
}

type DeclInstrType<
    C extends InstructionType,
    E extends {} = {}
> = { type: C; } & E; 

export type InstructionOfType<C extends InstructionType> = Instruction & { type: C };

type BlockInstruction = InstructionOfType<InstructionType.Block>;

export enum MemoryType {
    UnsignedInt,
    SignedInt,
    Float
}

export type Signature = Readonly<wasm.FuncSignature> | wasm.ValueType | null;

export const isValueType = (
    signature: Signature
): signature is wasm.ValueType => {
    /** @ts-ignore */
    return signature < 0;
}

export type Instruction = {
    type: InstructionType;
    signature: Signature;
} & (
    DeclInstrType<InstructionType.Unreachable, {}>
  | DeclInstrType<InstructionType.Drop, {
        value: Instruction;
    }>
  | DeclInstrType<InstructionType.Nop, {
        count: number;
    }>
  | DeclInstrType<InstructionType.Block, {
        children: Instruction[];
        isLoop: boolean;
    }>
  | DeclInstrType<InstructionType.If, {
        condition: Instruction;
        ifTrue: BlockInstruction;
        ifFalse: BlockInstruction | null;
    }>
  | DeclInstrType<InstructionType.Br, {
        value: Instruction[];
        condition: Instruction | null;
        label: BlockInstruction;
    }>
  | DeclInstrType<InstructionType.Switch, {
        condition: Instruction;
        value: Instruction[];
        labels: BlockInstruction[];
        defaultLabel: BlockInstruction;
    }>
  | DeclInstrType<InstructionType.Call, {
        // TODO: call.indirect also has a table index
        // immediate.
        target: Function | Instruction;
        arguments: Instruction[];
    }>
  | DeclInstrType<InstructionType.Get, {
        target: Variable;
    }>
  | DeclInstrType<InstructionType.Set, {
        target: Variable;
        value: Instruction;
    }>
  | DeclInstrType<InstructionType.Load, {
        signed: boolean;
        byteCount: number;
        align: number;
        offset: number;
        address: Instruction;
        signature: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Store, {
        byteCount: number;
        align: number;
        offset: number;
        address: Instruction;
        value: Instruction;
        signature: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Const, {
        signature: Omit<wasm.ValueType, wasm.ValueType.ExternRef | wasm.ValueType.V128>;
    } & ({
            signature: wasm.ValueType.I32 | wasm.ValueType.F32 | wasm.ValueType.F64;
            value: number;
        } | {
            signature: wasm.ValueType.I64;
            value: bigint;
        } | {
            signature: wasm.ValueType.FuncRef; // | wasm.ValueType.ExternRef
            value: Function | null;
        }
    )>
  | DeclInstrType<InstructionType.Unary, {
        opcode: wasm.Opcode;
        value: Instruction;
        signature: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Binary, {
        opcode: wasm.Opcode;
        left: Instruction;
        right: Instruction;
        signature: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Select, {
        condition: Instruction;
        ifTrue: Instruction;
        ifFalse: Instruction;
    }>
  | DeclInstrType<InstructionType.Return, {
        value: Instruction[];
    }>
  | DeclInstrType<InstructionType.MemorySize, {}>
  | DeclInstrType<InstructionType.MemoryGrow, {
        delta: Instruction;
    }>
  | DeclInstrType<InstructionType.Convert, {
        opcode: wasm.Opcode;
        value: Instruction;
        signature: wasm.ValueType;
    }>

  | DeclInstrType<InstructionType.MultiSet, {
        targets: Variable[];
        value: Instruction;
    }>


//   | DeclInstrType<InstructionType.V128Load, {
//         byteCount: number;
//         align: number;
//         offset: number;
//         address: Instruction;
//         value: Instruction;
//     }>
//   | DeclInstrType<InstructionType.V128Store, {
//         byteCount: number;
//         align: number;
//         offset: number;
//         address: Instruction;
//         value: Instruction;
//     }>
//   | DeclInstrType<InstructionType.V128Unary, {
//         opcode: wasm.Opcode;
//         value: Instruction;
//     }>
//   | DeclInstrType<InstructionType.V128Binary, {
//         opcode: wasm.Opcode;
//         left: Instruction;
//         right: Instruction;
//     }>
);
