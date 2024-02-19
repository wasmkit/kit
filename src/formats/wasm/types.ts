
export enum NumberType {
    I32 = -0x1,
    I64 = -0x2,
    F32 = -0x3,
    F64 = -0x4
}

export enum VectorType {
    V128 = -0x5
}

export enum RefType {
    FuncRef = -0x10,
    ExternRef = -0x11
}

// No way to concat enums
export enum ValueType {
    I32 = -0x1,
    I64 = -0x2,
    F32 = -0x3,
    F64 = -0x4,
    V128 = -0x5,
    FuncRef = -0x10,
    ExternRef = -0x11
}

export type FuncSignature = {
    params: ValueType[];
    results: ValueType[];
}

export type Limits = {
    min: number;
    max?: number;
}

export type MemoryType = {
    limits: Limits;
}

export type TableType = {
    limits: Limits;
    refType: RefType;
}

export type GlobalType = {
    mutable: boolean;
    valueType: ValueType;
}

export const enum ExternalType {
    Function = 0,
    Table = 1,
    Memory = 2,
    Global = 3
}

export type Export = { name: string, type: ExternalType, description: {} } & (
    { type: ExternalType.Function, description: { functionIndex: number } }
  | { type: ExternalType.Table, description: { tableIndex: number } }
  | { type: ExternalType.Memory, description: { memoryIndex: number } }
  | { type: ExternalType.Global, description: { globalIndex: number } }
);

export type FunctionDescription = {
    signatureIndex: number;
}

export type Import = { type: ExternalType, module: string, name: string, description: {} } & (
    { type: ExternalType.Function, description: FunctionDescription }
  | { type: ExternalType.Table, description: { tableType: TableType } }
  | { type: ExternalType.Memory, description: { memoryType: MemoryType } }
  | { type: ExternalType.Global, description: { globalType: GlobalType } }
);

export const enum ElementSegmentMode {
    Active = 0,
    Passive = 1,
    Declarative = 2
}

export const enum ElementKind {
    Ref = 0x00
}

export type ElementSegment = {
    mode: ElementSegmentMode,
    type: RefType,
    initialization: number[] | InstructionExpression[];
} & (
    { mode: ElementSegmentMode.Active, tableIndex: number, offset: InstructionExpression }
  | { mode: ElementSegmentMode.Declarative | ElementSegmentMode.Passive }
)


export const enum DataSegmentMode {
    Active = 0,
    Passive = 1
}


export type DataSegment = { mode: DataSegmentMode, initialization: Uint8Array } & (
    { mode: DataSegmentMode.Passive }
  | { mode: DataSegmentMode.Active, memoryIndex: number, offset: InstructionExpression }
)

export type InstructionExpression = [...Instruction[], {
    opcode: Opcode.End,
    immediates: {}
}];

// TODO: Maybe make this type-smart with an Opcode->Immediate mapping
export type Instruction = {
    opcode: Opcode,
    immediates: Immediates;
}

export type Immediates = {
    valueType?: ValueType;
    refType?: RefType;
    valueTypes?: ValueType[];
    labelIndex?: number;
    labelIndexs?: number[];
    defaultLabelIndex?: number;
    functionIndex?: number;
    typeIndex?: number;
    tableIndex?: number;
    localIndex?: number;
    globalIndex?: number;
    elementIndex?: number;
    fromTableIndex?: number;
    toTableIndex?: number;
    memoryArgument?: {
        offset: number;
        align: number;
    };
    dataIndex?: number;
    value?: number | bigint;
    laneIndex?: number;
    laneIndexs?: number[];
    bytes?: Uint8Array;
}


export enum Opcode {
    Unreachable = 0x00,
    Nop = 0x01,
    Block = 0x02,
    Loop = 0x03,
    If = 0x04,
    Else = 0x05,
    End = 0x0B,
    Br = 0x0C,
    BrIf = 0x0D,
    BrTable = 0x0E,
    Return = 0x0F,
    Call = 0x10,
    CallIndirect = 0x11,

    RefNull = 0xD0,
    RefIsNull = 0xD1,
    RefFunc = 0xD2,

    Drop = 0x1A,
    Select = 0x1B,
    SelectWithType = 0x1C,

    LocalGet = 0x20,
    LocalSet = 0x21,
    LocalTee = 0x22,
    GlobalGet = 0x23,
    GlobalSet = 0x24,

    TableGet = 0x25,
    TableSet = 0x26,
    TableInit = 0xFC_0C,
    ElemDrop = 0xFC_0D,
    TableCopy = 0xFC_0E,
    TableGrow = 0xFC_0F,
    TableSize = 0xFC_10,
    TableFill = 0xFC_11,

    I32Load = 0x28,
    I64Load = 0x29,
    F32Load = 0x2A,
    F64Load = 0x2B,
    I32Load8_S = 0x2C,
    I32Load8_U = 0x2D,
    I32Load16_S = 0x2E,
    I32Load16_U = 0x2F,
    I64Load8_S = 0x30,
    I64Load8_U = 0x31,
    I64Load16_S = 0x32,
    I64Load16_U = 0x33,
    I64Load32_S = 0x34,
    I64Load32_U = 0x35,
    I32Store = 0x36,
    I64Store = 0x37,
    F32Store = 0x38,
    F64Store = 0x39,
    I32Store8 = 0x3A,
    I32Store16 = 0x3B,
    I64Store8 = 0x3C,
    I64Store16 = 0x3D,
    I64Store32 = 0x3E,
    MemorySize = 0x3F,
    MemoryGrow = 0x40,
    MemoryInit = 0xFC_08,
    DataDrop = 0xFC_09,
    MemoryCopy = 0xFC_0A,
    MemoryFill = 0xFC_0B,

    I32Const = 0x41,
    I64Const = 0x42,
    F32Const = 0x43,
    F64Const = 0x44,

    I32Eqz = 0x45,
    I32Eq = 0x46,
    I32Ne = 0x47,
    I32Lt_S = 0x48,
    I32Lt_U = 0x49,
    I32Gt_S = 0x4A,
    I32Gt_U = 0x4B,
    I32Le_S = 0x4C,
    I32Le_U = 0x4D,
    I32Ge_S = 0x4E,
    I32Ge_U = 0x4F,

    I64Eqz = 0x50,
    I64Eq = 0x51,
    I64_ne = 0x52,
    I64Lt_S = 0x53,
    I64Lt_U = 0x54,
    I64Gt_S = 0x55,
    I64Gt_U = 0x56,
    I64Le_S = 0x57,
    I64Le_U = 0x58,
    I64Ge_S = 0x59,
    I64Ge_U = 0x5A,

    F32Eq = 0x5B,
    F32Ne = 0x5C,
    F32Lt = 0x5D,
    F32Gt = 0x5E,
    F32Le = 0x5F,
    F32Ge = 0x60,

    F64Eq = 0x61,
    F64Ne = 0x62,
    F64Lt = 0x63,
    F64Gt = 0x64,
    F64Le = 0x65,
    F64Ge = 0x66,

    I32Clz = 0x67,
    I32Ctz = 0x68,
    I32Popcnt = 0x69,
    I32Add = 0x6A,
    I32Sub = 0x6B,
    I32Mul = 0x6C,
    I32Div_S = 0x6D,
    I32Div_U = 0x6E,
    I32Rem_S = 0x6F,
    I32Rem_U = 0x70,
    I32And = 0x71,
    I32Or = 0x72,
    I32Xor = 0x73,
    I32Shl = 0x74,
    I32Shr_S = 0x75,
    I32Shr_U = 0x76,
    I32Rotl = 0x77,
    I32Rotr = 0x78,

    I64Clz = 0x79,
    I64Ctz = 0x7A,
    I64Popcnt = 0x7B,
    I64Add = 0x7C,
    I64Sub = 0x7D,
    I64Mul = 0x7E,
    I64Div_S = 0x7F,
    I64Div_U = 0x80,
    I64Rem_S = 0x81,
    I64Rem_U = 0x82,
    I64And = 0x83,
    I64Or = 0x84,
    I64Xor = 0x85,
    I64Shl = 0x86,
    I64Shr_S = 0x87,
    I64Shr_U = 0x88,
    I64Rotl = 0x89,
    I64Rotr = 0x8A,

    F32Abs = 0x8B,
    F32Neg = 0x8C,
    F32Ceil = 0x8D,
    F32Floor = 0x8E,
    F32Trunc = 0x8F,
    F32Nearest = 0x90,
    F32Sqrt = 0x91,
    F32Add = 0x92,
    F32Sub = 0x93,
    F32Mul = 0x94,
    F32Div = 0x95,
    F32Min = 0x96,
    F32Max = 0x97,
    F32Copysign = 0x98,

    F64Abs = 0x99,
    F64Neg = 0x9A,
    F64Ceil = 0x9B,
    F64Floor = 0x9C,
    F64Trunc = 0x9D,
    F64Nearest = 0x9E,
    F64Sqrt = 0x9F,
    F64Add = 0xA0,
    F64Sub = 0xA1,
    F64Mul = 0xA2,
    F64Div = 0xA3,
    F64Min = 0xA4,
    F64Max = 0xA5,
    F64Copysign = 0xA6,

    I32WrapI64 = 0xA7,
    I32TruncF32_S = 0xA8,
    I32TruncF32_U = 0xA9,
    I32TruncF64_S = 0xAA,
    I32TruncF64_U = 0xAB,
    I64ExtendI32_S = 0xAC,
    I64ExtendI32_U = 0xAD,
    I64TruncF32_S = 0xAE,
    I64TruncF32_U = 0xAF,
    I64TruncF64_S = 0xB0,
    I64TruncF64_U = 0xB1,
    F32ConvertI32_S = 0xB2,
    F32ConvertI32_U = 0xB3,
    F32ConvertI64_S = 0xB4,
    F32ConvertI64_U = 0xB5,
    F32DemoteF64 = 0xB6,
    F64ConvertI32_S = 0xB7,
    F64ConvertI32_U = 0xB8,
    F64ConvertI64_S = 0xB9,
    F64ConvertI64_U = 0xBA,
    F64PromoteF32 = 0xBB,
    I32ReinterpretF32 = 0xBC,
    I64ReinterpretF64 = 0xBD,
    F32ReinterpretF32 = 0xBE,
    F64ReinterpretF64 = 0xBF,

    I32Extend8_S = 0xC0,
    I32Extend16_S = 0xC1,
    I64Extend8_S = 0xC2,
    I64Extend16_S = 0xC3,
    I64Extend32_S = 0xC4,

    I32TruncSatF32_S = 0xFC_00,
    I32TruncSatF32_U = 0xFC_01,
    I32TruncSatF64_S = 0xFC_02,
    I32TruncSatF64_U = 0xFC_03,
    I64TruncSatF32_S = 0xFC_04,
    I64TruncSatF32_U = 0xFC_05,
    I64TruncSatF64_S = 0xFC_06,
    I64TruncSatF64_U = 0xFC_07,

    V128Load = 0xFD_00,
    V128Load8x8_S = 0xFD_01,
    V128Load8x8_U = 0xFD_02,
    V128Load16x4_S = 0xFD_03,
    V128Load16x4_U = 0xFD_04,
    V128Load32x2_S = 0xFD_05,
    V128Load32x2_U = 0xFD_06,
    V128Load8Splat = 0xFD_07,
    V128Load16Splat = 0xFD_08,
    V128Load32Splat = 0xFD_09,
    V128Load64Splat = 0xFD_0A,
    V128Load32Zero = 0xFD_5C,
    V128Load64Zero = 0xFD_5D,
    V128Store = 0xFD_0B,
    V128Load8Lane = 0xFD_54,
    V128Load16Lane = 0xFD_55,
    V128Load32Lane = 0xFD_56,
    V128Load64Lane = 0xFD_57,
    V128Store8Lane = 0xFD_58,
    V128Store16Lane = 0xFD_59,
    V128Store32Lane = 0xFD_5A,
    V128Store64Lane = 0xFD_5B,
    V128Const = 0xFD_0C,
    I8x16Shuffle = 0xFD_0D,
    I8x16Swizzle = 0xFD_0E,
    I8x16Splat = 0xFD_0F,
    I16x8Splat = 0xFD_10,
    I32x4Splat = 0xFD_11,
    I64x2Splat = 0xFD_12,
    F32x4Splat = 0xFD_13,
    F64x2Splat = 0xFD_14,
    I8x16ExtractLane_S = 0xFD_15,
    I8x16ExtractLane_U = 0xFD_16,
    I8x16ReplaceLane = 0xFD_17,
    I16x8ExtractLane_S = 0xFD_18,
    I16x8ExtractLane_U = 0xFD_19,
    I16x8ReplaceLane = 0xFD_1A,
    I32x4ExtractLane = 0xFD_1B,
    I32x4ReplaceLane = 0xFD_1C,
    I64x2ExtractLane = 0xFD_1D,
    I64x2ReplaceLane = 0xFD_1E,
    F32x4ExtractLane = 0xFD_1F,
    F32x4ReplaceLane = 0xFD_20,
    F64x2ExtractLane = 0xFD_21,
    F64x2ReplaceLane = 0xFD_22,
    I8x16Eq = 0xFD_23,
    I8x16Ne = 0xFD_24,
    I8x16Lt_S = 0xFD_25,
    I8x16Lt_U = 0xFD_26,
    I8x16Gt_S = 0xFD_27,
    I8x16Gt_U = 0xFD_28,
    I8x16Le_S = 0xFD_29,
    I8x16Le_U = 0xFD_2A,
    I8x16Ge_S = 0xFD_2B,
    I8x16Ge_U = 0xFD_2C,
    I16x8Eq = 0xFD_2D,
    I16x8Ne = 0xFD_2E,
    I16x8Lt_S = 0xFD_2F,
    I16x8Lt_U = 0xFD_30,
    I16x8Gt_S = 0xFD_31,
    I16x8Gt_U = 0xFD_32,
    I16x8Le_S = 0xFD_33,
    I16x8Le_U = 0xFD_34,
    I16x8Ge_S = 0xFD_35,
    I16x8Ge_U = 0xFD_36,
    I32x4Eq = 0xFD_37,
    I32x4Ne = 0xFD_38,
    I32x4Lt_S = 0xFD_39,
    I32x4Lt_U = 0xFD_3A,
    I32x4Gt_S = 0xFD_3B,
    I32x4Gt_U = 0xFD_3C,
    I32x4Le_S = 0xFD_3D,
    I32x4Le_U = 0xFD_3E,
    I32x4Ge_S = 0xFD_3F,
    I32x4Ge_U = 0xFD_40,
    I64x2Eq = 0xFD_D6,
    I64x2Ne = 0xFD_D7,
    I64x2Lt_S = 0xFD_D8,
    I64x2Gt_S = 0xFD_D9,
    I64x2Le_S = 0xFD_DA,
    I64x2Ge_S = 0xFD_DB,
    F32x4Eq = 0xFD_41,
    F32x4Ne = 0xFD_42,
    F32x4Lt = 0xFD_43,
    F32x4Gt = 0xFD_44,
    F32x4Le = 0xFD_45,
    F32x4Ge = 0xFD_46,
    F64x2Eq = 0xFD_47,
    F64x2Ne = 0xFD_48,
    F64x2Lt = 0xFD_49,
    F64x2Gt = 0xFD_4A,
    F64x2Le = 0xFD_4B,
    F64x2Ge = 0xFD_4C,
    V128Not = 0xFD_4D,
    V128And = 0xFD_4E,
    V128Andnot = 0xFD_4F,
    V128Or = 0xFD_50,
    V128Xor = 0xFD_51,
    V128Bitselect = 0xFD_52,
    V128AnyTrue = 0xFD_53,
    I8x16Abs = 0xFD_60,
    I8x16Neg = 0xFD_61,
    I8x16Popcnt = 0xFD_62,
    I8x16AllTrue = 0xFD_63,
    I8x16Bitmask = 0xFD_64,
    I8x16NarrowI16x8_S = 0xFD_65,
    I8x16NarrowI16x8_U = 0xFD_66,
    I8x16Shl = 0xFD_6B,
    I8x16Shr_S = 0xFD_6C,
    I8x16Shr_U = 0xFD_6D,
    I8x16Add = 0xFD_6E,
    I8x16AddSat_S = 0xFD_6F,
    I8x16AddSat_U = 0xFD_70,
    I8x16Sub = 0xFD_71,
    I8x16SubSat_S = 0xFD_72,
    I8x16SubSat_U = 0xFD_73,
    I8x16Min_S = 0xFD_76,
    I8x16Min_U = 0xFD_77,
    I8x16Max_S = 0xFD_78,
    I8x16Max_U = 0xFD_79,
    I8x16Avgr_U = 0xFD_7B,
    I16x8ExtaddPairwiseI8x16_S = 0xFD_7C,
    I16x8ExtaddPairwiseI8x16_U = 0xFD_7D,
    I16x8Abs = 0xFD_80,
    I16x8Neg = 0xFD_81,
    I16x8Q15mulrSat_S = 0xFD_82,
    I16x8AllTrue = 0xFD_83,
    I16x8Bitmask = 0xFD_84,
    I16x8NarrowI32x4_S = 0xFD_85,
    I16x8NarrowI32x4_U = 0xFD_86,
    I16x8ExtendLowI8x16_S = 0xFD_87,
    I16x8ExtendHighI8x16_S = 0xFD_88,
    I16x8ExtendLowI8x16_U = 0xFD_89,
    I16x8ExtendHighI8x16_U = 0xFD_8A,
    I16x8Shl = 0xFD_8B,
    I16x8Shr_S = 0xFD_8C,
    I16x8Shr_U = 0xFD_8D,
    I16x8Add = 0xFD_8E,
    I16x8AddSat_S = 0xFD_8F,
    I16x8AddSat_U = 0xFD_90,
    I16x8Sub = 0xFD_91,
    I16x8SubSat_S = 0xFD_92,
    I16x8SubSat_U = 0xFD_93,
    I16x8Mul = 0xFD_95,
    I16x8Min_S = 0xFD_96,
    I16x8Min_U = 0xFD_97,
    I16x8Max_S = 0xFD_98,
    I16x8Max_U = 0xFD_99,
    I16x8Avgr_U = 0xFD_9B,
    I16x8ExtmulLowI8x16_S = 0xFD_9C,
    I16x8ExtmulHighI8x16_S = 0xFD_9D,
    I16x8ExtmulLowI8x16_U = 0xFD_9E,
    I16x8ExtmulHighI8x16_U = 0xFD_9F,
    I32x4ExtaddPairwiseI16x8_S = 0xFD_7E,
    I32x4ExtaddPairwiseI16x8_U = 0xFD_7F,
    I32x4Abs = 0xFD_A0,
    I32x4Neg = 0xFD_A1,
    I32x4AllTrue = 0xFD_A3,
    I32x4Bitmask = 0xFD_A4,
    I32x4ExtendLowI16x8_S = 0xFD_A7,
    I32x4ExtendHighI16x8_S = 0xFD_A8,
    I32x4ExtendLowI16x8_U = 0xFD_A9,
    I32x4ExtendHighI16x8_U = 0xFD_AA,
    I32x4Shl = 0xFD_AB,
    I32x4Shr_S = 0xFD_AC,
    I32x4Shr_U = 0xFD_AD,
    I32x4Add = 0xFD_AE,
    I32x4Sub = 0xFD_B1,
    I32x4Mul = 0xFD_B5,
    I32x4Min_S = 0xFD_B6,
    I32x4Min_U = 0xFD_B7,
    I32x4Max_S = 0xFD_B8,
    I32x4Max_U = 0xFD_B9,
    I32x4DotI16x8_S = 0xFD_BA,
    I32x4ExtmulLowI16x8_S = 0xFD_BC,
    I32x4ExtmulHighI16x8_S = 0xFD_BD,
    I32x4ExtmulLowI16x8_U = 0xFD_BE,
    I32x4ExtmulHighI16x8_U = 0xFD_BF,
    I64x2Abs = 0xFD_C0,
    I64x2Neg = 0xFD_C1,
    I64x2AllTrue = 0xFD_C3,
    I64x2Bitmask = 0xFD_C4,
    I64x2ExtendLowI32x4_S = 0xFD_C7,
    I64x2ExtendHighI32x4_S = 0xFD_C8,
    I64x2ExtendLowI32x4_U = 0xFD_C9,
    I64x2ExtendHighI32x4_U = 0xFD_CA,
    I64x2Shl = 0xFD_CB,
    I64x2Shr_S = 0xFD_CC,
    I64x2Shr_U = 0xFD_CD,
    I64x2Add = 0xFD_CE,
    I64x2Sub = 0xFD_D1,
    I64x2Mul = 0xFD_D5,
    I64x2ExtmulLowI32x4_S = 0xFD_DC,
    I64x2ExtmulHighI32x4_S = 0xFD_DD,
    I64x2ExtmulLowI32x4_U = 0xFD_DE,
    I64x2ExtmulHighI32x4_U = 0xFD_DF,
    F32x4Ceil = 0xFD_67,
    F32x4Floor = 0xFD_68,
    F32x4Trunc = 0xFD_69,
    F32x4Nearest = 0xFD_6A,
    F32x4Abs = 0xFD_E0,
    F32x4Neg = 0xFD_E1,
    F32x4Sqrt = 0xFD_E3,
    F32x4Add = 0xFD_E4,
    F32x4Sub = 0xFD_E5,
    F32x4Mul = 0xFD_E6,
    F32x4Div = 0xFD_E7,
    F32x4Min = 0xFD_E8,
    F32x4Max = 0xFD_E9,
    F32x4Pmin = 0xFD_EA,
    F32x4Pmax = 0xFD_EB,
    F64x2Ceil = 0xFD_74,
    F64x2Floor = 0xFD_75,
    F64x2Trunc = 0xFD_7A,
    F64x2Nearest = 0xFD_94,
    F64x2Abs = 0xFD_EC,
    F64x2Neg = 0xFD_ED,
    F64x2Sqrt = 0xFD_EF,
    F64x2Add = 0xFD_F0,
    F64x2Sub = 0xFD_F1,
    F64x2Mul = 0xFD_F2,
    F64x2Div = 0xFD_F3,
    F64x2Min = 0xFD_F4,
    F64x2Max = 0xFD_F5,
    F64x2Pmin = 0xFD_F6,
    F64x2Pmax = 0xFD_F7,
    I32x4TruncSatF32x4_S = 0xFD_F8,
    I32x4TruncSatF32x4_U = 0xFD_F9,
    F32x4ConvertI32x4_S = 0xFD_FA,
    F32x4ConvertI32x4_U = 0xFD_FB,
    I32x4TruncSatF64x2_SZero = 0xFD_FC,
    I32x4TruncSatF64x2_UZero = 0xFD_FD,
    F64x2ConvertLowI32x4_S = 0xFD_FE,
    F64x2ConvertLowI32x4_U = 0xFD_FF,
    F32x4DemoteF64x2Zero = 0xFD_5E,
    F64x2PromoteLowF32x4 = 0xFD_5F,
}

export const OpcodePrefixes = [0xFC, 0xFD];
