import * as wasm from "../wasm/types";

export type Importable<I = {}, NI = {}> = { imported: boolean } & ({ imported: true, importName: string; importModule: string; } & I) | ({ imported: false } & NI);
export type Exportable = { exported: true; exportName: string; } | { exported: false };
export type Indexable = { index: number };

export type InstructionExpression = Instruction;

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
    mutable: true,
    isGlobal: false
};

export type GlobalVariable = Variable & {
    isGlobal: true
};

export type Global = Variable & {
    isGlobal: true;
} & Importable<{}, { initialization: InstructionExpression }> & Exportable;

export type Function = Indexable & {
    signature: Readonly<wasm.FuncSignature>;
} & Importable<{}, {
    locals: LocalVariable[];
    body: InstructionExpression;
}> & Exportable;

export type UnimportedFunction = Function & { imported: false };

export type ElementSegment = Indexable & {
    mode: wasm.ElementSegmentMode;
    type: wasm.RefType;
    initialization: number[] | InstructionExpression[];
} & (
    { mode: wasm.ElementSegmentMode.Active, table: Table, offset: InstructionExpression }
  | { mode: wasm.ElementSegmentMode.Declarative | wasm.ElementSegmentMode.Passive }
);

export type ActiveElementSegment = ElementSegment & { mode: wasm.ElementSegmentMode.Active };

export type DataSegment = Indexable & { mode: wasm.DataSegmentMode, initialization: Uint8Array } & (
    { mode: wasm.DataSegmentMode.Passive }
  | { mode: wasm.DataSegmentMode.Active, memory: Memory, offset: InstructionExpression }
);

export type ActiveDataSegment = DataSegment & { mode: wasm.DataSegmentMode.Active };

export enum InstructionType {
    Nop,
    Unreachable,
    Drop,
    Block,
    If,
    Br,
    Switch,
    Call,
    Get,
    Set,
    Load,
    Store,
    Const,
    Unary,
    Binary,
    Select,
    Return,
    MemorySize,
    MemoryGrow,

    MultiSet
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

export type Instruction = {
    type: InstructionType;
} & (
    DeclInstrType<InstructionType.Unreachable, {}>
  | DeclInstrType<InstructionType.Drop, {
        value: Instruction;
    }>
  | DeclInstrType<InstructionType.Nop, {
        count: number;
    }>
  | DeclInstrType<InstructionType.Block, {
        signature: Readonly<wasm.FuncSignature> | null;
        children: Instruction[];
        isLoop: boolean;
    }>
  | DeclInstrType<InstructionType.If, {
        signature: Readonly<wasm.FuncSignature> | null;
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
        signature: Readonly<wasm.FuncSignature>;
    }>
  | DeclInstrType<InstructionType.Get, {
        target: Variable;
    }>
  | DeclInstrType<InstructionType.Set, {
        target: Variable;
        isTee: boolean;
        value: Instruction;
    }>
  | DeclInstrType<InstructionType.Load, {
        memoryType: MemoryType;
        byteSize: number;
        align: number;
        offset: number;
        address: Instruction;
        valueType: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Store, {
        memoryType: MemoryType;
        byteCount: number;
        align: number;
        offset: number;
        address: Instruction;
        value: Instruction;
        valueType: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Const, {
        valueType: Omit<wasm.ValueType, wasm.ValueType.ExternRef>;
    } & ({
            valueType: wasm.ValueType.I32 | wasm.ValueType.F32 | wasm.ValueType.F64;
            value: number;
        } | {
            valueType: wasm.ValueType.I64;
            value: bigint;
        } | {
            valueType: wasm.ValueType.V128;
            value: Uint8Array;
        } | {
            valueType: wasm.ValueType.FuncRef; // | wasm.ValueType.ExternRef
            value: Function | null;
        }
    )>
  | DeclInstrType<InstructionType.Unary, {
        opcode: wasm.Opcode;
        value: Instruction;
        valueType: wasm.ValueType;
    }>
  | DeclInstrType<InstructionType.Binary, {
        opcode: wasm.Opcode;
        left: Instruction;
        right: Instruction;
        valueType: wasm.ValueType;
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

  | DeclInstrType<InstructionType.MultiSet, {
        targets: Variable[];
        value: Instruction;
    }>
);
