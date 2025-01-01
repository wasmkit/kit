"use strict";
(() => {
  // src/lib/logging.ts
  var getStack = (lines) => {
    const err = (new Error().stack || "").split("\n");
    return err.slice(1, 1 + lines).join("\n");
  };
  var warn = (...args) => {
    console.warn(...args);
    console.warn(getStack(1));
  };
  function assert(truth, msg = "Assertion failed") {
    if (truth)
      return;
    throw fatal(msg);
  }
  var fatal = (msg) => {
    return new Error(msg);
  };

  // src/formats/abstract.ts
  var kInvalidateInternal = Symbol("kInvalidate");
  var kIsInvalidInternal = Symbol("kIsInvalidated");
  var AbstractFormat = class {
    kit;
    options;
    constructor(kit, options) {
      this.kit = kit;
      this.options = options;
    }
    extract() {
      throw fatal("Extract not implemented");
    }
    compile() {
      throw fatal("Extract not implemented");
    }
    print(_writer) {
      throw fatal("Extract not implemented");
    }
    // Used by kit.recompile and kit.resetBytes
    [kIsInvalidInternal] = false;
    [kInvalidateInternal]() {
      this[kIsInvalidInternal] = true;
      for (const key in this) {
        try {
          delete this[key];
          Object.defineProperty(this, key, {
            get() {
              throw fatal(`Accessing invalid module's \`${key}\`. Kit has been modified since last access. Please discard this reference and re-extract.`);
            },
            set() {
              throw fatal(`Modifying invalid module's \`${key}\`. Kit has been modified since last access. Please discard this reference and re-extract.`);
            },
            configurable: true
          });
        } catch {
          warn("Failed to invalidate property " + key);
        }
      }
    }
  };

  // src/formats/wasm/types.ts
  var VoidType = -64;
  var Opcode = /* @__PURE__ */ ((Opcode2) => {
    Opcode2[Opcode2["Unreachable"] = 0] = "Unreachable";
    Opcode2[Opcode2["Nop"] = 1] = "Nop";
    Opcode2[Opcode2["Block"] = 2] = "Block";
    Opcode2[Opcode2["Loop"] = 3] = "Loop";
    Opcode2[Opcode2["If"] = 4] = "If";
    Opcode2[Opcode2["Else"] = 5] = "Else";
    Opcode2[Opcode2["End"] = 11] = "End";
    Opcode2[Opcode2["Br"] = 12] = "Br";
    Opcode2[Opcode2["BrIf"] = 13] = "BrIf";
    Opcode2[Opcode2["BrTable"] = 14] = "BrTable";
    Opcode2[Opcode2["Return"] = 15] = "Return";
    Opcode2[Opcode2["Call"] = 16] = "Call";
    Opcode2[Opcode2["CallIndirect"] = 17] = "CallIndirect";
    Opcode2[Opcode2["RefNull"] = 208] = "RefNull";
    Opcode2[Opcode2["RefIsNull"] = 209] = "RefIsNull";
    Opcode2[Opcode2["RefFunc"] = 210] = "RefFunc";
    Opcode2[Opcode2["Drop"] = 26] = "Drop";
    Opcode2[Opcode2["Select"] = 27] = "Select";
    Opcode2[Opcode2["SelectWithType"] = 28] = "SelectWithType";
    Opcode2[Opcode2["LocalGet"] = 32] = "LocalGet";
    Opcode2[Opcode2["LocalSet"] = 33] = "LocalSet";
    Opcode2[Opcode2["LocalTee"] = 34] = "LocalTee";
    Opcode2[Opcode2["GlobalGet"] = 35] = "GlobalGet";
    Opcode2[Opcode2["GlobalSet"] = 36] = "GlobalSet";
    Opcode2[Opcode2["TableGet"] = 37] = "TableGet";
    Opcode2[Opcode2["TableSet"] = 38] = "TableSet";
    Opcode2[Opcode2["TableInit"] = 64524] = "TableInit";
    Opcode2[Opcode2["ElemDrop"] = 64525] = "ElemDrop";
    Opcode2[Opcode2["TableCopy"] = 64526] = "TableCopy";
    Opcode2[Opcode2["TableGrow"] = 64527] = "TableGrow";
    Opcode2[Opcode2["TableSize"] = 64528] = "TableSize";
    Opcode2[Opcode2["TableFill"] = 64529] = "TableFill";
    Opcode2[Opcode2["I32Load"] = 40] = "I32Load";
    Opcode2[Opcode2["I64Load"] = 41] = "I64Load";
    Opcode2[Opcode2["F32Load"] = 42] = "F32Load";
    Opcode2[Opcode2["F64Load"] = 43] = "F64Load";
    Opcode2[Opcode2["I32Load8_S"] = 44] = "I32Load8_S";
    Opcode2[Opcode2["I32Load8_U"] = 45] = "I32Load8_U";
    Opcode2[Opcode2["I32Load16_S"] = 46] = "I32Load16_S";
    Opcode2[Opcode2["I32Load16_U"] = 47] = "I32Load16_U";
    Opcode2[Opcode2["I64Load8_S"] = 48] = "I64Load8_S";
    Opcode2[Opcode2["I64Load8_U"] = 49] = "I64Load8_U";
    Opcode2[Opcode2["I64Load16_S"] = 50] = "I64Load16_S";
    Opcode2[Opcode2["I64Load16_U"] = 51] = "I64Load16_U";
    Opcode2[Opcode2["I64Load32_S"] = 52] = "I64Load32_S";
    Opcode2[Opcode2["I64Load32_U"] = 53] = "I64Load32_U";
    Opcode2[Opcode2["I32Store"] = 54] = "I32Store";
    Opcode2[Opcode2["I64Store"] = 55] = "I64Store";
    Opcode2[Opcode2["F32Store"] = 56] = "F32Store";
    Opcode2[Opcode2["F64Store"] = 57] = "F64Store";
    Opcode2[Opcode2["I32Store8"] = 58] = "I32Store8";
    Opcode2[Opcode2["I32Store16"] = 59] = "I32Store16";
    Opcode2[Opcode2["I64Store8"] = 60] = "I64Store8";
    Opcode2[Opcode2["I64Store16"] = 61] = "I64Store16";
    Opcode2[Opcode2["I64Store32"] = 62] = "I64Store32";
    Opcode2[Opcode2["MemorySize"] = 63] = "MemorySize";
    Opcode2[Opcode2["MemoryGrow"] = 64] = "MemoryGrow";
    Opcode2[Opcode2["MemoryInit"] = 64520] = "MemoryInit";
    Opcode2[Opcode2["DataDrop"] = 64521] = "DataDrop";
    Opcode2[Opcode2["MemoryCopy"] = 64522] = "MemoryCopy";
    Opcode2[Opcode2["MemoryFill"] = 64523] = "MemoryFill";
    Opcode2[Opcode2["I32Const"] = 65] = "I32Const";
    Opcode2[Opcode2["I64Const"] = 66] = "I64Const";
    Opcode2[Opcode2["F32Const"] = 67] = "F32Const";
    Opcode2[Opcode2["F64Const"] = 68] = "F64Const";
    Opcode2[Opcode2["I32Eqz"] = 69] = "I32Eqz";
    Opcode2[Opcode2["I32Eq"] = 70] = "I32Eq";
    Opcode2[Opcode2["I32Ne"] = 71] = "I32Ne";
    Opcode2[Opcode2["I32Lt_S"] = 72] = "I32Lt_S";
    Opcode2[Opcode2["I32Lt_U"] = 73] = "I32Lt_U";
    Opcode2[Opcode2["I32Gt_S"] = 74] = "I32Gt_S";
    Opcode2[Opcode2["I32Gt_U"] = 75] = "I32Gt_U";
    Opcode2[Opcode2["I32Le_S"] = 76] = "I32Le_S";
    Opcode2[Opcode2["I32Le_U"] = 77] = "I32Le_U";
    Opcode2[Opcode2["I32Ge_S"] = 78] = "I32Ge_S";
    Opcode2[Opcode2["I32Ge_U"] = 79] = "I32Ge_U";
    Opcode2[Opcode2["I64Eqz"] = 80] = "I64Eqz";
    Opcode2[Opcode2["I64Eq"] = 81] = "I64Eq";
    Opcode2[Opcode2["I64Ne"] = 82] = "I64Ne";
    Opcode2[Opcode2["I64Lt_S"] = 83] = "I64Lt_S";
    Opcode2[Opcode2["I64Lt_U"] = 84] = "I64Lt_U";
    Opcode2[Opcode2["I64Gt_S"] = 85] = "I64Gt_S";
    Opcode2[Opcode2["I64Gt_U"] = 86] = "I64Gt_U";
    Opcode2[Opcode2["I64Le_S"] = 87] = "I64Le_S";
    Opcode2[Opcode2["I64Le_U"] = 88] = "I64Le_U";
    Opcode2[Opcode2["I64Ge_S"] = 89] = "I64Ge_S";
    Opcode2[Opcode2["I64Ge_U"] = 90] = "I64Ge_U";
    Opcode2[Opcode2["F32Eq"] = 91] = "F32Eq";
    Opcode2[Opcode2["F32Ne"] = 92] = "F32Ne";
    Opcode2[Opcode2["F32Lt"] = 93] = "F32Lt";
    Opcode2[Opcode2["F32Gt"] = 94] = "F32Gt";
    Opcode2[Opcode2["F32Le"] = 95] = "F32Le";
    Opcode2[Opcode2["F32Ge"] = 96] = "F32Ge";
    Opcode2[Opcode2["F64Eq"] = 97] = "F64Eq";
    Opcode2[Opcode2["F64Ne"] = 98] = "F64Ne";
    Opcode2[Opcode2["F64Lt"] = 99] = "F64Lt";
    Opcode2[Opcode2["F64Gt"] = 100] = "F64Gt";
    Opcode2[Opcode2["F64Le"] = 101] = "F64Le";
    Opcode2[Opcode2["F64Ge"] = 102] = "F64Ge";
    Opcode2[Opcode2["I32Clz"] = 103] = "I32Clz";
    Opcode2[Opcode2["I32Ctz"] = 104] = "I32Ctz";
    Opcode2[Opcode2["I32Popcnt"] = 105] = "I32Popcnt";
    Opcode2[Opcode2["I32Add"] = 106] = "I32Add";
    Opcode2[Opcode2["I32Sub"] = 107] = "I32Sub";
    Opcode2[Opcode2["I32Mul"] = 108] = "I32Mul";
    Opcode2[Opcode2["I32Div_S"] = 109] = "I32Div_S";
    Opcode2[Opcode2["I32Div_U"] = 110] = "I32Div_U";
    Opcode2[Opcode2["I32Rem_S"] = 111] = "I32Rem_S";
    Opcode2[Opcode2["I32Rem_U"] = 112] = "I32Rem_U";
    Opcode2[Opcode2["I32And"] = 113] = "I32And";
    Opcode2[Opcode2["I32Or"] = 114] = "I32Or";
    Opcode2[Opcode2["I32Xor"] = 115] = "I32Xor";
    Opcode2[Opcode2["I32Shl"] = 116] = "I32Shl";
    Opcode2[Opcode2["I32Shr_S"] = 117] = "I32Shr_S";
    Opcode2[Opcode2["I32Shr_U"] = 118] = "I32Shr_U";
    Opcode2[Opcode2["I32Rotl"] = 119] = "I32Rotl";
    Opcode2[Opcode2["I32Rotr"] = 120] = "I32Rotr";
    Opcode2[Opcode2["I64Clz"] = 121] = "I64Clz";
    Opcode2[Opcode2["I64Ctz"] = 122] = "I64Ctz";
    Opcode2[Opcode2["I64Popcnt"] = 123] = "I64Popcnt";
    Opcode2[Opcode2["I64Add"] = 124] = "I64Add";
    Opcode2[Opcode2["I64Sub"] = 125] = "I64Sub";
    Opcode2[Opcode2["I64Mul"] = 126] = "I64Mul";
    Opcode2[Opcode2["I64Div_S"] = 127] = "I64Div_S";
    Opcode2[Opcode2["I64Div_U"] = 128] = "I64Div_U";
    Opcode2[Opcode2["I64Rem_S"] = 129] = "I64Rem_S";
    Opcode2[Opcode2["I64Rem_U"] = 130] = "I64Rem_U";
    Opcode2[Opcode2["I64And"] = 131] = "I64And";
    Opcode2[Opcode2["I64Or"] = 132] = "I64Or";
    Opcode2[Opcode2["I64Xor"] = 133] = "I64Xor";
    Opcode2[Opcode2["I64Shl"] = 134] = "I64Shl";
    Opcode2[Opcode2["I64Shr_S"] = 135] = "I64Shr_S";
    Opcode2[Opcode2["I64Shr_U"] = 136] = "I64Shr_U";
    Opcode2[Opcode2["I64Rotl"] = 137] = "I64Rotl";
    Opcode2[Opcode2["I64Rotr"] = 138] = "I64Rotr";
    Opcode2[Opcode2["F32Abs"] = 139] = "F32Abs";
    Opcode2[Opcode2["F32Neg"] = 140] = "F32Neg";
    Opcode2[Opcode2["F32Ceil"] = 141] = "F32Ceil";
    Opcode2[Opcode2["F32Floor"] = 142] = "F32Floor";
    Opcode2[Opcode2["F32Trunc"] = 143] = "F32Trunc";
    Opcode2[Opcode2["F32Nearest"] = 144] = "F32Nearest";
    Opcode2[Opcode2["F32Sqrt"] = 145] = "F32Sqrt";
    Opcode2[Opcode2["F32Add"] = 146] = "F32Add";
    Opcode2[Opcode2["F32Sub"] = 147] = "F32Sub";
    Opcode2[Opcode2["F32Mul"] = 148] = "F32Mul";
    Opcode2[Opcode2["F32Div"] = 149] = "F32Div";
    Opcode2[Opcode2["F32Min"] = 150] = "F32Min";
    Opcode2[Opcode2["F32Max"] = 151] = "F32Max";
    Opcode2[Opcode2["F32Copysign"] = 152] = "F32Copysign";
    Opcode2[Opcode2["F64Abs"] = 153] = "F64Abs";
    Opcode2[Opcode2["F64Neg"] = 154] = "F64Neg";
    Opcode2[Opcode2["F64Ceil"] = 155] = "F64Ceil";
    Opcode2[Opcode2["F64Floor"] = 156] = "F64Floor";
    Opcode2[Opcode2["F64Trunc"] = 157] = "F64Trunc";
    Opcode2[Opcode2["F64Nearest"] = 158] = "F64Nearest";
    Opcode2[Opcode2["F64Sqrt"] = 159] = "F64Sqrt";
    Opcode2[Opcode2["F64Add"] = 160] = "F64Add";
    Opcode2[Opcode2["F64Sub"] = 161] = "F64Sub";
    Opcode2[Opcode2["F64Mul"] = 162] = "F64Mul";
    Opcode2[Opcode2["F64Div"] = 163] = "F64Div";
    Opcode2[Opcode2["F64Min"] = 164] = "F64Min";
    Opcode2[Opcode2["F64Max"] = 165] = "F64Max";
    Opcode2[Opcode2["F64Copysign"] = 166] = "F64Copysign";
    Opcode2[Opcode2["I32WrapI64"] = 167] = "I32WrapI64";
    Opcode2[Opcode2["I32TruncF32_S"] = 168] = "I32TruncF32_S";
    Opcode2[Opcode2["I32TruncF32_U"] = 169] = "I32TruncF32_U";
    Opcode2[Opcode2["I32TruncF64_S"] = 170] = "I32TruncF64_S";
    Opcode2[Opcode2["I32TruncF64_U"] = 171] = "I32TruncF64_U";
    Opcode2[Opcode2["I64ExtendI32_S"] = 172] = "I64ExtendI32_S";
    Opcode2[Opcode2["I64ExtendI32_U"] = 173] = "I64ExtendI32_U";
    Opcode2[Opcode2["I64TruncF32_S"] = 174] = "I64TruncF32_S";
    Opcode2[Opcode2["I64TruncF32_U"] = 175] = "I64TruncF32_U";
    Opcode2[Opcode2["I64TruncF64_S"] = 176] = "I64TruncF64_S";
    Opcode2[Opcode2["I64TruncF64_U"] = 177] = "I64TruncF64_U";
    Opcode2[Opcode2["F32ConvertI32_S"] = 178] = "F32ConvertI32_S";
    Opcode2[Opcode2["F32ConvertI32_U"] = 179] = "F32ConvertI32_U";
    Opcode2[Opcode2["F32ConvertI64_S"] = 180] = "F32ConvertI64_S";
    Opcode2[Opcode2["F32ConvertI64_U"] = 181] = "F32ConvertI64_U";
    Opcode2[Opcode2["F32DemoteF64"] = 182] = "F32DemoteF64";
    Opcode2[Opcode2["F64ConvertI32_S"] = 183] = "F64ConvertI32_S";
    Opcode2[Opcode2["F64ConvertI32_U"] = 184] = "F64ConvertI32_U";
    Opcode2[Opcode2["F64ConvertI64_S"] = 185] = "F64ConvertI64_S";
    Opcode2[Opcode2["F64ConvertI64_U"] = 186] = "F64ConvertI64_U";
    Opcode2[Opcode2["F64PromoteF32"] = 187] = "F64PromoteF32";
    Opcode2[Opcode2["I32ReinterpretF32"] = 188] = "I32ReinterpretF32";
    Opcode2[Opcode2["I64ReinterpretF64"] = 189] = "I64ReinterpretF64";
    Opcode2[Opcode2["F32ReinterpretI32"] = 190] = "F32ReinterpretI32";
    Opcode2[Opcode2["F64ReinterpretI64"] = 191] = "F64ReinterpretI64";
    Opcode2[Opcode2["I32Extend8_S"] = 192] = "I32Extend8_S";
    Opcode2[Opcode2["I32Extend16_S"] = 193] = "I32Extend16_S";
    Opcode2[Opcode2["I64Extend8_S"] = 194] = "I64Extend8_S";
    Opcode2[Opcode2["I64Extend16_S"] = 195] = "I64Extend16_S";
    Opcode2[Opcode2["I64Extend32_S"] = 196] = "I64Extend32_S";
    Opcode2[Opcode2["I32TruncSatF32_S"] = 64512] = "I32TruncSatF32_S";
    Opcode2[Opcode2["I32TruncSatF32_U"] = 64513] = "I32TruncSatF32_U";
    Opcode2[Opcode2["I32TruncSatF64_S"] = 64514] = "I32TruncSatF64_S";
    Opcode2[Opcode2["I32TruncSatF64_U"] = 64515] = "I32TruncSatF64_U";
    Opcode2[Opcode2["I64TruncSatF32_S"] = 64516] = "I64TruncSatF32_S";
    Opcode2[Opcode2["I64TruncSatF32_U"] = 64517] = "I64TruncSatF32_U";
    Opcode2[Opcode2["I64TruncSatF64_S"] = 64518] = "I64TruncSatF64_S";
    Opcode2[Opcode2["I64TruncSatF64_U"] = 64519] = "I64TruncSatF64_U";
    Opcode2[Opcode2["V128Load"] = 64768] = "V128Load";
    Opcode2[Opcode2["V128Load8x8_S"] = 64769] = "V128Load8x8_S";
    Opcode2[Opcode2["V128Load8x8_U"] = 64770] = "V128Load8x8_U";
    Opcode2[Opcode2["V128Load16x4_S"] = 64771] = "V128Load16x4_S";
    Opcode2[Opcode2["V128Load16x4_U"] = 64772] = "V128Load16x4_U";
    Opcode2[Opcode2["V128Load32x2_S"] = 64773] = "V128Load32x2_S";
    Opcode2[Opcode2["V128Load32x2_U"] = 64774] = "V128Load32x2_U";
    Opcode2[Opcode2["V128Load8Splat"] = 64775] = "V128Load8Splat";
    Opcode2[Opcode2["V128Load16Splat"] = 64776] = "V128Load16Splat";
    Opcode2[Opcode2["V128Load32Splat"] = 64777] = "V128Load32Splat";
    Opcode2[Opcode2["V128Load64Splat"] = 64778] = "V128Load64Splat";
    Opcode2[Opcode2["V128Load32Zero"] = 64860] = "V128Load32Zero";
    Opcode2[Opcode2["V128Load64Zero"] = 64861] = "V128Load64Zero";
    Opcode2[Opcode2["V128Store"] = 64779] = "V128Store";
    Opcode2[Opcode2["V128Load8Lane"] = 64852] = "V128Load8Lane";
    Opcode2[Opcode2["V128Load16Lane"] = 64853] = "V128Load16Lane";
    Opcode2[Opcode2["V128Load32Lane"] = 64854] = "V128Load32Lane";
    Opcode2[Opcode2["V128Load64Lane"] = 64855] = "V128Load64Lane";
    Opcode2[Opcode2["V128Store8Lane"] = 64856] = "V128Store8Lane";
    Opcode2[Opcode2["V128Store16Lane"] = 64857] = "V128Store16Lane";
    Opcode2[Opcode2["V128Store32Lane"] = 64858] = "V128Store32Lane";
    Opcode2[Opcode2["V128Store64Lane"] = 64859] = "V128Store64Lane";
    Opcode2[Opcode2["V128Const"] = 64780] = "V128Const";
    Opcode2[Opcode2["I8x16Shuffle"] = 64781] = "I8x16Shuffle";
    Opcode2[Opcode2["I8x16Swizzle"] = 64782] = "I8x16Swizzle";
    Opcode2[Opcode2["I8x16Splat"] = 64783] = "I8x16Splat";
    Opcode2[Opcode2["I16x8Splat"] = 64784] = "I16x8Splat";
    Opcode2[Opcode2["I32x4Splat"] = 64785] = "I32x4Splat";
    Opcode2[Opcode2["I64x2Splat"] = 64786] = "I64x2Splat";
    Opcode2[Opcode2["F32x4Splat"] = 64787] = "F32x4Splat";
    Opcode2[Opcode2["F64x2Splat"] = 64788] = "F64x2Splat";
    Opcode2[Opcode2["I8x16ExtractLane_S"] = 64789] = "I8x16ExtractLane_S";
    Opcode2[Opcode2["I8x16ExtractLane_U"] = 64790] = "I8x16ExtractLane_U";
    Opcode2[Opcode2["I8x16ReplaceLane"] = 64791] = "I8x16ReplaceLane";
    Opcode2[Opcode2["I16x8ExtractLane_S"] = 64792] = "I16x8ExtractLane_S";
    Opcode2[Opcode2["I16x8ExtractLane_U"] = 64793] = "I16x8ExtractLane_U";
    Opcode2[Opcode2["I16x8ReplaceLane"] = 64794] = "I16x8ReplaceLane";
    Opcode2[Opcode2["I32x4ExtractLane"] = 64795] = "I32x4ExtractLane";
    Opcode2[Opcode2["I32x4ReplaceLane"] = 64796] = "I32x4ReplaceLane";
    Opcode2[Opcode2["I64x2ExtractLane"] = 64797] = "I64x2ExtractLane";
    Opcode2[Opcode2["I64x2ReplaceLane"] = 64798] = "I64x2ReplaceLane";
    Opcode2[Opcode2["F32x4ExtractLane"] = 64799] = "F32x4ExtractLane";
    Opcode2[Opcode2["F32x4ReplaceLane"] = 64800] = "F32x4ReplaceLane";
    Opcode2[Opcode2["F64x2ExtractLane"] = 64801] = "F64x2ExtractLane";
    Opcode2[Opcode2["F64x2ReplaceLane"] = 64802] = "F64x2ReplaceLane";
    Opcode2[Opcode2["I8x16Eq"] = 64803] = "I8x16Eq";
    Opcode2[Opcode2["I8x16Ne"] = 64804] = "I8x16Ne";
    Opcode2[Opcode2["I8x16Lt_S"] = 64805] = "I8x16Lt_S";
    Opcode2[Opcode2["I8x16Lt_U"] = 64806] = "I8x16Lt_U";
    Opcode2[Opcode2["I8x16Gt_S"] = 64807] = "I8x16Gt_S";
    Opcode2[Opcode2["I8x16Gt_U"] = 64808] = "I8x16Gt_U";
    Opcode2[Opcode2["I8x16Le_S"] = 64809] = "I8x16Le_S";
    Opcode2[Opcode2["I8x16Le_U"] = 64810] = "I8x16Le_U";
    Opcode2[Opcode2["I8x16Ge_S"] = 64811] = "I8x16Ge_S";
    Opcode2[Opcode2["I8x16Ge_U"] = 64812] = "I8x16Ge_U";
    Opcode2[Opcode2["I16x8Eq"] = 64813] = "I16x8Eq";
    Opcode2[Opcode2["I16x8Ne"] = 64814] = "I16x8Ne";
    Opcode2[Opcode2["I16x8Lt_S"] = 64815] = "I16x8Lt_S";
    Opcode2[Opcode2["I16x8Lt_U"] = 64816] = "I16x8Lt_U";
    Opcode2[Opcode2["I16x8Gt_S"] = 64817] = "I16x8Gt_S";
    Opcode2[Opcode2["I16x8Gt_U"] = 64818] = "I16x8Gt_U";
    Opcode2[Opcode2["I16x8Le_S"] = 64819] = "I16x8Le_S";
    Opcode2[Opcode2["I16x8Le_U"] = 64820] = "I16x8Le_U";
    Opcode2[Opcode2["I16x8Ge_S"] = 64821] = "I16x8Ge_S";
    Opcode2[Opcode2["I16x8Ge_U"] = 64822] = "I16x8Ge_U";
    Opcode2[Opcode2["I32x4Eq"] = 64823] = "I32x4Eq";
    Opcode2[Opcode2["I32x4Ne"] = 64824] = "I32x4Ne";
    Opcode2[Opcode2["I32x4Lt_S"] = 64825] = "I32x4Lt_S";
    Opcode2[Opcode2["I32x4Lt_U"] = 64826] = "I32x4Lt_U";
    Opcode2[Opcode2["I32x4Gt_S"] = 64827] = "I32x4Gt_S";
    Opcode2[Opcode2["I32x4Gt_U"] = 64828] = "I32x4Gt_U";
    Opcode2[Opcode2["I32x4Le_S"] = 64829] = "I32x4Le_S";
    Opcode2[Opcode2["I32x4Le_U"] = 64830] = "I32x4Le_U";
    Opcode2[Opcode2["I32x4Ge_S"] = 64831] = "I32x4Ge_S";
    Opcode2[Opcode2["I32x4Ge_U"] = 64832] = "I32x4Ge_U";
    Opcode2[Opcode2["I64x2Eq"] = 64982] = "I64x2Eq";
    Opcode2[Opcode2["I64x2Ne"] = 64983] = "I64x2Ne";
    Opcode2[Opcode2["I64x2Lt_S"] = 64984] = "I64x2Lt_S";
    Opcode2[Opcode2["I64x2Gt_S"] = 64985] = "I64x2Gt_S";
    Opcode2[Opcode2["I64x2Le_S"] = 64986] = "I64x2Le_S";
    Opcode2[Opcode2["I64x2Ge_S"] = 64987] = "I64x2Ge_S";
    Opcode2[Opcode2["F32x4Eq"] = 64833] = "F32x4Eq";
    Opcode2[Opcode2["F32x4Ne"] = 64834] = "F32x4Ne";
    Opcode2[Opcode2["F32x4Lt"] = 64835] = "F32x4Lt";
    Opcode2[Opcode2["F32x4Gt"] = 64836] = "F32x4Gt";
    Opcode2[Opcode2["F32x4Le"] = 64837] = "F32x4Le";
    Opcode2[Opcode2["F32x4Ge"] = 64838] = "F32x4Ge";
    Opcode2[Opcode2["F64x2Eq"] = 64839] = "F64x2Eq";
    Opcode2[Opcode2["F64x2Ne"] = 64840] = "F64x2Ne";
    Opcode2[Opcode2["F64x2Lt"] = 64841] = "F64x2Lt";
    Opcode2[Opcode2["F64x2Gt"] = 64842] = "F64x2Gt";
    Opcode2[Opcode2["F64x2Le"] = 64843] = "F64x2Le";
    Opcode2[Opcode2["F64x2Ge"] = 64844] = "F64x2Ge";
    Opcode2[Opcode2["V128Not"] = 64845] = "V128Not";
    Opcode2[Opcode2["V128And"] = 64846] = "V128And";
    Opcode2[Opcode2["V128Andnot"] = 64847] = "V128Andnot";
    Opcode2[Opcode2["V128Or"] = 64848] = "V128Or";
    Opcode2[Opcode2["V128Xor"] = 64849] = "V128Xor";
    Opcode2[Opcode2["V128Bitselect"] = 64850] = "V128Bitselect";
    Opcode2[Opcode2["V128AnyTrue"] = 64851] = "V128AnyTrue";
    Opcode2[Opcode2["I8x16Abs"] = 64864] = "I8x16Abs";
    Opcode2[Opcode2["I8x16Neg"] = 64865] = "I8x16Neg";
    Opcode2[Opcode2["I8x16Popcnt"] = 64866] = "I8x16Popcnt";
    Opcode2[Opcode2["I8x16AllTrue"] = 64867] = "I8x16AllTrue";
    Opcode2[Opcode2["I8x16Bitmask"] = 64868] = "I8x16Bitmask";
    Opcode2[Opcode2["I8x16NarrowI16x8_S"] = 64869] = "I8x16NarrowI16x8_S";
    Opcode2[Opcode2["I8x16NarrowI16x8_U"] = 64870] = "I8x16NarrowI16x8_U";
    Opcode2[Opcode2["I8x16Shl"] = 64875] = "I8x16Shl";
    Opcode2[Opcode2["I8x16Shr_S"] = 64876] = "I8x16Shr_S";
    Opcode2[Opcode2["I8x16Shr_U"] = 64877] = "I8x16Shr_U";
    Opcode2[Opcode2["I8x16Add"] = 64878] = "I8x16Add";
    Opcode2[Opcode2["I8x16AddSat_S"] = 64879] = "I8x16AddSat_S";
    Opcode2[Opcode2["I8x16AddSat_U"] = 64880] = "I8x16AddSat_U";
    Opcode2[Opcode2["I8x16Sub"] = 64881] = "I8x16Sub";
    Opcode2[Opcode2["I8x16SubSat_S"] = 64882] = "I8x16SubSat_S";
    Opcode2[Opcode2["I8x16SubSat_U"] = 64883] = "I8x16SubSat_U";
    Opcode2[Opcode2["I8x16Min_S"] = 64886] = "I8x16Min_S";
    Opcode2[Opcode2["I8x16Min_U"] = 64887] = "I8x16Min_U";
    Opcode2[Opcode2["I8x16Max_S"] = 64888] = "I8x16Max_S";
    Opcode2[Opcode2["I8x16Max_U"] = 64889] = "I8x16Max_U";
    Opcode2[Opcode2["I8x16Avgr_U"] = 64891] = "I8x16Avgr_U";
    Opcode2[Opcode2["I16x8ExtaddPairwiseI8x16_S"] = 64892] = "I16x8ExtaddPairwiseI8x16_S";
    Opcode2[Opcode2["I16x8ExtaddPairwiseI8x16_U"] = 64893] = "I16x8ExtaddPairwiseI8x16_U";
    Opcode2[Opcode2["I16x8Abs"] = 64896] = "I16x8Abs";
    Opcode2[Opcode2["I16x8Neg"] = 64897] = "I16x8Neg";
    Opcode2[Opcode2["I16x8Q15mulrSat_S"] = 64898] = "I16x8Q15mulrSat_S";
    Opcode2[Opcode2["I16x8AllTrue"] = 64899] = "I16x8AllTrue";
    Opcode2[Opcode2["I16x8Bitmask"] = 64900] = "I16x8Bitmask";
    Opcode2[Opcode2["I16x8NarrowI32x4_S"] = 64901] = "I16x8NarrowI32x4_S";
    Opcode2[Opcode2["I16x8NarrowI32x4_U"] = 64902] = "I16x8NarrowI32x4_U";
    Opcode2[Opcode2["I16x8ExtendLowI8x16_S"] = 64903] = "I16x8ExtendLowI8x16_S";
    Opcode2[Opcode2["I16x8ExtendHighI8x16_S"] = 64904] = "I16x8ExtendHighI8x16_S";
    Opcode2[Opcode2["I16x8ExtendLowI8x16_U"] = 64905] = "I16x8ExtendLowI8x16_U";
    Opcode2[Opcode2["I16x8ExtendHighI8x16_U"] = 64906] = "I16x8ExtendHighI8x16_U";
    Opcode2[Opcode2["I16x8Shl"] = 64907] = "I16x8Shl";
    Opcode2[Opcode2["I16x8Shr_S"] = 64908] = "I16x8Shr_S";
    Opcode2[Opcode2["I16x8Shr_U"] = 64909] = "I16x8Shr_U";
    Opcode2[Opcode2["I16x8Add"] = 64910] = "I16x8Add";
    Opcode2[Opcode2["I16x8AddSat_S"] = 64911] = "I16x8AddSat_S";
    Opcode2[Opcode2["I16x8AddSat_U"] = 64912] = "I16x8AddSat_U";
    Opcode2[Opcode2["I16x8Sub"] = 64913] = "I16x8Sub";
    Opcode2[Opcode2["I16x8SubSat_S"] = 64914] = "I16x8SubSat_S";
    Opcode2[Opcode2["I16x8SubSat_U"] = 64915] = "I16x8SubSat_U";
    Opcode2[Opcode2["I16x8Mul"] = 64917] = "I16x8Mul";
    Opcode2[Opcode2["I16x8Min_S"] = 64918] = "I16x8Min_S";
    Opcode2[Opcode2["I16x8Min_U"] = 64919] = "I16x8Min_U";
    Opcode2[Opcode2["I16x8Max_S"] = 64920] = "I16x8Max_S";
    Opcode2[Opcode2["I16x8Max_U"] = 64921] = "I16x8Max_U";
    Opcode2[Opcode2["I16x8Avgr_U"] = 64923] = "I16x8Avgr_U";
    Opcode2[Opcode2["I16x8ExtmulLowI8x16_S"] = 64924] = "I16x8ExtmulLowI8x16_S";
    Opcode2[Opcode2["I16x8ExtmulHighI8x16_S"] = 64925] = "I16x8ExtmulHighI8x16_S";
    Opcode2[Opcode2["I16x8ExtmulLowI8x16_U"] = 64926] = "I16x8ExtmulLowI8x16_U";
    Opcode2[Opcode2["I16x8ExtmulHighI8x16_U"] = 64927] = "I16x8ExtmulHighI8x16_U";
    Opcode2[Opcode2["I32x4ExtaddPairwiseI16x8_S"] = 64894] = "I32x4ExtaddPairwiseI16x8_S";
    Opcode2[Opcode2["I32x4ExtaddPairwiseI16x8_U"] = 64895] = "I32x4ExtaddPairwiseI16x8_U";
    Opcode2[Opcode2["I32x4Abs"] = 64928] = "I32x4Abs";
    Opcode2[Opcode2["I32x4Neg"] = 64929] = "I32x4Neg";
    Opcode2[Opcode2["I32x4AllTrue"] = 64931] = "I32x4AllTrue";
    Opcode2[Opcode2["I32x4Bitmask"] = 64932] = "I32x4Bitmask";
    Opcode2[Opcode2["I32x4ExtendLowI16x8_S"] = 64935] = "I32x4ExtendLowI16x8_S";
    Opcode2[Opcode2["I32x4ExtendHighI16x8_S"] = 64936] = "I32x4ExtendHighI16x8_S";
    Opcode2[Opcode2["I32x4ExtendLowI16x8_U"] = 64937] = "I32x4ExtendLowI16x8_U";
    Opcode2[Opcode2["I32x4ExtendHighI16x8_U"] = 64938] = "I32x4ExtendHighI16x8_U";
    Opcode2[Opcode2["I32x4Shl"] = 64939] = "I32x4Shl";
    Opcode2[Opcode2["I32x4Shr_S"] = 64940] = "I32x4Shr_S";
    Opcode2[Opcode2["I32x4Shr_U"] = 64941] = "I32x4Shr_U";
    Opcode2[Opcode2["I32x4Add"] = 64942] = "I32x4Add";
    Opcode2[Opcode2["I32x4Sub"] = 64945] = "I32x4Sub";
    Opcode2[Opcode2["I32x4Mul"] = 64949] = "I32x4Mul";
    Opcode2[Opcode2["I32x4Min_S"] = 64950] = "I32x4Min_S";
    Opcode2[Opcode2["I32x4Min_U"] = 64951] = "I32x4Min_U";
    Opcode2[Opcode2["I32x4Max_S"] = 64952] = "I32x4Max_S";
    Opcode2[Opcode2["I32x4Max_U"] = 64953] = "I32x4Max_U";
    Opcode2[Opcode2["I32x4DotI16x8_S"] = 64954] = "I32x4DotI16x8_S";
    Opcode2[Opcode2["I32x4ExtmulLowI16x8_S"] = 64956] = "I32x4ExtmulLowI16x8_S";
    Opcode2[Opcode2["I32x4ExtmulHighI16x8_S"] = 64957] = "I32x4ExtmulHighI16x8_S";
    Opcode2[Opcode2["I32x4ExtmulLowI16x8_U"] = 64958] = "I32x4ExtmulLowI16x8_U";
    Opcode2[Opcode2["I32x4ExtmulHighI16x8_U"] = 64959] = "I32x4ExtmulHighI16x8_U";
    Opcode2[Opcode2["I64x2Abs"] = 64960] = "I64x2Abs";
    Opcode2[Opcode2["I64x2Neg"] = 64961] = "I64x2Neg";
    Opcode2[Opcode2["I64x2AllTrue"] = 64963] = "I64x2AllTrue";
    Opcode2[Opcode2["I64x2Bitmask"] = 64964] = "I64x2Bitmask";
    Opcode2[Opcode2["I64x2ExtendLowI32x4_S"] = 64967] = "I64x2ExtendLowI32x4_S";
    Opcode2[Opcode2["I64x2ExtendHighI32x4_S"] = 64968] = "I64x2ExtendHighI32x4_S";
    Opcode2[Opcode2["I64x2ExtendLowI32x4_U"] = 64969] = "I64x2ExtendLowI32x4_U";
    Opcode2[Opcode2["I64x2ExtendHighI32x4_U"] = 64970] = "I64x2ExtendHighI32x4_U";
    Opcode2[Opcode2["I64x2Shl"] = 64971] = "I64x2Shl";
    Opcode2[Opcode2["I64x2Shr_S"] = 64972] = "I64x2Shr_S";
    Opcode2[Opcode2["I64x2Shr_U"] = 64973] = "I64x2Shr_U";
    Opcode2[Opcode2["I64x2Add"] = 64974] = "I64x2Add";
    Opcode2[Opcode2["I64x2Sub"] = 64977] = "I64x2Sub";
    Opcode2[Opcode2["I64x2Mul"] = 64981] = "I64x2Mul";
    Opcode2[Opcode2["I64x2ExtmulLowI32x4_S"] = 64988] = "I64x2ExtmulLowI32x4_S";
    Opcode2[Opcode2["I64x2ExtmulHighI32x4_S"] = 64989] = "I64x2ExtmulHighI32x4_S";
    Opcode2[Opcode2["I64x2ExtmulLowI32x4_U"] = 64990] = "I64x2ExtmulLowI32x4_U";
    Opcode2[Opcode2["I64x2ExtmulHighI32x4_U"] = 64991] = "I64x2ExtmulHighI32x4_U";
    Opcode2[Opcode2["F32x4Ceil"] = 64871] = "F32x4Ceil";
    Opcode2[Opcode2["F32x4Floor"] = 64872] = "F32x4Floor";
    Opcode2[Opcode2["F32x4Trunc"] = 64873] = "F32x4Trunc";
    Opcode2[Opcode2["F32x4Nearest"] = 64874] = "F32x4Nearest";
    Opcode2[Opcode2["F32x4Abs"] = 64992] = "F32x4Abs";
    Opcode2[Opcode2["F32x4Neg"] = 64993] = "F32x4Neg";
    Opcode2[Opcode2["F32x4Sqrt"] = 64995] = "F32x4Sqrt";
    Opcode2[Opcode2["F32x4Add"] = 64996] = "F32x4Add";
    Opcode2[Opcode2["F32x4Sub"] = 64997] = "F32x4Sub";
    Opcode2[Opcode2["F32x4Mul"] = 64998] = "F32x4Mul";
    Opcode2[Opcode2["F32x4Div"] = 64999] = "F32x4Div";
    Opcode2[Opcode2["F32x4Min"] = 65e3] = "F32x4Min";
    Opcode2[Opcode2["F32x4Max"] = 65001] = "F32x4Max";
    Opcode2[Opcode2["F32x4Pmin"] = 65002] = "F32x4Pmin";
    Opcode2[Opcode2["F32x4Pmax"] = 65003] = "F32x4Pmax";
    Opcode2[Opcode2["F64x2Ceil"] = 64884] = "F64x2Ceil";
    Opcode2[Opcode2["F64x2Floor"] = 64885] = "F64x2Floor";
    Opcode2[Opcode2["F64x2Trunc"] = 64890] = "F64x2Trunc";
    Opcode2[Opcode2["F64x2Nearest"] = 64916] = "F64x2Nearest";
    Opcode2[Opcode2["F64x2Abs"] = 65004] = "F64x2Abs";
    Opcode2[Opcode2["F64x2Neg"] = 65005] = "F64x2Neg";
    Opcode2[Opcode2["F64x2Sqrt"] = 65007] = "F64x2Sqrt";
    Opcode2[Opcode2["F64x2Add"] = 65008] = "F64x2Add";
    Opcode2[Opcode2["F64x2Sub"] = 65009] = "F64x2Sub";
    Opcode2[Opcode2["F64x2Mul"] = 65010] = "F64x2Mul";
    Opcode2[Opcode2["F64x2Div"] = 65011] = "F64x2Div";
    Opcode2[Opcode2["F64x2Min"] = 65012] = "F64x2Min";
    Opcode2[Opcode2["F64x2Max"] = 65013] = "F64x2Max";
    Opcode2[Opcode2["F64x2Pmin"] = 65014] = "F64x2Pmin";
    Opcode2[Opcode2["F64x2Pmax"] = 65015] = "F64x2Pmax";
    Opcode2[Opcode2["I32x4TruncSatF32x4_S"] = 65016] = "I32x4TruncSatF32x4_S";
    Opcode2[Opcode2["I32x4TruncSatF32x4_U"] = 65017] = "I32x4TruncSatF32x4_U";
    Opcode2[Opcode2["F32x4ConvertI32x4_S"] = 65018] = "F32x4ConvertI32x4_S";
    Opcode2[Opcode2["F32x4ConvertI32x4_U"] = 65019] = "F32x4ConvertI32x4_U";
    Opcode2[Opcode2["I32x4TruncSatF64x2_SZero"] = 65020] = "I32x4TruncSatF64x2_SZero";
    Opcode2[Opcode2["I32x4TruncSatF64x2_UZero"] = 65021] = "I32x4TruncSatF64x2_UZero";
    Opcode2[Opcode2["F64x2ConvertLowI32x4_S"] = 65022] = "F64x2ConvertLowI32x4_S";
    Opcode2[Opcode2["F64x2ConvertLowI32x4_U"] = 65023] = "F64x2ConvertLowI32x4_U";
    Opcode2[Opcode2["F32x4DemoteF64x2Zero"] = 64862] = "F32x4DemoteF64x2Zero";
    Opcode2[Opcode2["F64x2PromoteLowF32x4"] = 64863] = "F64x2PromoteLowF32x4";
    return Opcode2;
  })(Opcode || {});
  var OpcodePrefixes = [252, 253];
  var TerminatingEndInstruction = {
    opcode: 11 /* End */,
    immediates: {}
  };

  // src/formats/highlevel_wasm/types.ts
  var isValueType = (signature) => {
    return signature < 0;
  };

  // src/formats/highlevel_wasm/instruction_helper.ts
  var kInstrUnreachable = {
    type: 1 /* Unreachable */,
    signature: null
  };
  var peekInput = (ctx) => {
    return ctx.input[ctx.inputPos] ?? null;
  };
  var readInput = (ctx) => {
    assert(moreInput(ctx), "No more input");
    return ctx.input[ctx.inputPos++];
  };
  var moreInput = (ctx) => {
    return ctx.inputPos < ctx.input.length;
  };
  var peekExpression = (ctx) => {
    return ctx.valueStack.at(-1) ?? null;
  };
  var popExpression = (ctx) => {
    assert(ctx.valueStack.length > 0, "Value stack is empty");
    return ctx.valueStack.pop();
  };
  var popNonVoidExpression = (ctx) => {
    let expr = popExpression(ctx);
    if (getExpressionResultCount(expr) === 1)
      return expr;
    const block = {
      type: 3 /* Block */,
      isLoop: false,
      signature: { params: [], results: [] },
      children: []
    };
    do {
      block.children.unshift(expr);
      expr = ctx.valueStack.pop();
    } while (getExpressionResultCount(expr) === 0);
    block.children.unshift(expr);
    if (isValueType(expr.signature)) {
      block.signature = expr.signature;
    } else if (expr.signature) {
      block.signature = expr.signature.results[0];
    }
    return block;
  };
  var pushExpression = (ctx, expr) => {
    if (isMultiResultExpression(expr)) {
      pushMultiResultExpression(ctx, expr);
    } else {
      ctx.valueStack.push(expr);
    }
  };
  var isMultiResultExpression = (expr) => {
    const signature = expr.signature;
    if (!signature)
      return false;
    if (isValueType(signature))
      return false;
    return signature.results.length > 1;
  };
  var pushMultiResultExpression = (ctx, expr) => {
    const signature = expr.signature;
    const scope = ctx.scope;
    const locals = [];
    for (const valueType of signature.results) {
      const local = {
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
      type: 20 /* MultiSet */,
      targets: locals,
      value: expr,
      signature: null
    });
    for (const local of locals) {
      ctx.valueStack.push({
        type: 8 /* Get */,
        target: local,
        signature: local.valueType
      });
    }
  };
  var getWasmBlockSignature = (ctx, instr) => {
    if (instr.immediates.valueType === VoidType)
      return null;
    if (instr.immediates.valueType) {
      return instr.immediates.valueType;
    }
    return ctx.wasmFmt.signatures[instr.immediates.signatureIndex];
  };
  var getBlockByDepth = (ctx, depth) => {
    assert(depth < ctx.branchStack.length, "Depth out of bounds");
    return ctx.branchStack.at(-depth - 1);
  };
  var getExpressionResultCount = (instr) => {
    const signature = instr.signature;
    if (!signature)
      return 0;
    if (isValueType(signature))
      return 1;
    return signature.results.length;
  };

  // src/formats/highlevel_wasm/instruction.ts
  var consumeNop = (ctx) => {
    const prev = peekExpression(ctx);
    if (prev && prev.type === 0 /* Nop */) {
      prev.count = 1;
    } else {
      pushExpression(ctx, {
        type: 0 /* Nop */,
        signature: null,
        count: 1
      });
    }
  };
  var dropBlockLeftOvers = (ctx, block, start) => {
    const resultCount = getExpressionResultCount(block);
    let seenResultsCount = 0;
    let end = ctx.valueStack.length;
    for (let i = ctx.valueStack.length - 1; i >= start; i--) {
      const expr = ctx.valueStack[i];
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
    for (let i = start; i < end; i++) {
      const expr = ctx.valueStack[i];
      if (getExpressionResultCount(expr) === 1) {
        block.children.push({
          type: 2 /* Drop */,
          signature: null,
          value: expr
        });
      } else {
        block.children.push(expr);
      }
    }
    for (let i = end; i < ctx.valueStack.length; i++) {
      block.children.push(ctx.valueStack[i]);
    }
    ctx.valueStack.length = start;
  };
  var consumeBlock = (ctx, instr) => {
    const blocks = [];
    while (true) {
      const isLoop = instr.opcode === 3 /* Loop */;
      const signature = getWasmBlockSignature(ctx, instr);
      const block = {
        type: 3 /* Block */,
        children: [],
        isLoop,
        signature
      };
      ctx.branchStack.push(block);
      blocks.push(block);
      const peek = peekInput(ctx);
      if (peek === null) {
        break;
      }
      if (peek.opcode !== 2 /* Block */)
        break;
      instr = readInput(ctx);
    }
    let last = null;
    while (blocks.length > 0) {
      const block = blocks.pop();
      const start = ctx.valueStack.length;
      if (last !== null) {
        pushExpression(ctx, last);
      }
      last = block;
      consumeExpressions(ctx);
      assert(ctx.valueStack.length >= start, "Value stack underflow during consumeBlock");
      ctx.branchStack.pop();
      dropBlockLeftOvers(ctx, block, start);
    }
    if (last) {
      pushExpression(ctx, last);
    }
  };
  var consumeIf = (ctx, instr) => {
    const signature = getWasmBlockSignature(ctx, instr);
    const condition = popNonVoidExpression(ctx);
    const ifTrue = getBlock(ctx, signature);
    let ifFalse = null;
    if (ctx.lastDelimiter === 5 /* Else */) {
      ifFalse = getBlock(ctx, signature);
    }
    pushExpression(ctx, {
      type: 4 /* If */,
      condition,
      signature,
      ifTrue,
      ifFalse
    });
  };
  var consumeBranch = (ctx, instr) => {
    const label = getBlockByDepth(ctx, instr.immediates.labelIndex);
    const resultCount = label.isLoop ? 0 : getExpressionResultCount(label);
    const signature = label.signature;
    const isConditional = instr.opcode === 13 /* BrIf */;
    const condition = isConditional ? popNonVoidExpression(ctx) : null;
    const values = [];
    for (let i = 0; i < resultCount; ++i) {
      values.push(popNonVoidExpression(ctx));
    }
    pushExpression(ctx, {
      type: 5 /* Br */,
      signature: isConditional ? signature : null,
      label,
      value: values,
      condition
    });
  };
  var consumeSwitch = (ctx, instr) => {
    const condition = popNonVoidExpression(ctx);
    const defaultLabel = getBlockByDepth(ctx, instr.immediates.defaultLabelIndex);
    const resultCount = getExpressionResultCount(defaultLabel);
    const labels = [];
    for (const labelIdx of instr.immediates.labelIndexs) {
      labels.push(getBlockByDepth(ctx, labelIdx));
    }
    const values = [];
    for (let i = 0; i < resultCount; ++i) {
      values.push(popNonVoidExpression(ctx));
    }
    pushExpression(ctx, {
      type: 6 /* Switch */,
      signature: null,
      labels,
      defaultLabel,
      value: values,
      condition
    });
  };
  var consumeReturn = (ctx) => {
    const scope = ctx.scope;
    const signature = scope.signature;
    if (!signature)
      return;
    const values = [];
    for (let i = 0; i < signature.results.length; ++i) {
      values.push(popNonVoidExpression(ctx));
    }
    pushExpression(ctx, {
      type: 16 /* Return */,
      signature: null,
      value: values
    });
  };
  var consumeIndirectCall = (ctx, instr) => {
    const target = popNonVoidExpression(ctx);
    const signature = getWasmBlockSignature(ctx, instr);
    const args = [];
    if (signature && !isValueType(signature)) {
      for (let i = 0; signature && i < signature.params.length; ++i) {
        args.push(popNonVoidExpression(ctx));
      }
    }
    pushExpression(ctx, {
      type: 7 /* Call */,
      target,
      signature,
      arguments: args
    });
  };
  var consumeCall = (ctx, instr) => {
    const target = ctx.fmt.getFunction(instr.immediates.functionIndex);
    const signature = target.signature;
    const args = [];
    for (let i = 0; i < signature.params.length; ++i) {
      args.push(popNonVoidExpression(ctx));
    }
    pushExpression(ctx, {
      type: 7 /* Call */,
      target,
      signature,
      arguments: args
    });
  };
  var consumeDrop = (ctx) => {
    const exprToDrop = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 2 /* Drop */,
      signature: null,
      value: exprToDrop
    });
  };
  var consumeSelect = (ctx) => {
    const condition = popNonVoidExpression(ctx);
    const ifTrue = popNonVoidExpression(ctx);
    const ifFalse = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 15 /* Select */,
      signature: ifTrue.signature,
      condition,
      ifTrue,
      ifFalse
    });
  };
  var consumeGet = (ctx, instr) => {
    const scope = ctx.scope;
    const isGlobal = instr.opcode === 35 /* GlobalGet */;
    const index = isGlobal ? instr.immediates.globalIndex : instr.immediates.localIndex;
    const target = isGlobal ? ctx.fmt.globals[index] : scope.locals[index];
    pushExpression(ctx, {
      type: 8 /* Get */,
      signature: target.valueType,
      target
    });
  };
  var consumeSet = (ctx, instr) => {
    const scope = ctx.scope;
    const isTee = instr.opcode === 34 /* LocalTee */;
    const isGlobal = instr.opcode === 36 /* GlobalSet */;
    const index = isGlobal ? instr.immediates.globalIndex : instr.immediates.localIndex;
    const target = isGlobal ? ctx.fmt.globals[index] : scope.locals[index];
    const value = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 9 /* Set */,
      signature: null,
      target,
      value
    });
    if (isTee) {
      pushExpression(ctx, {
        type: 8 /* Get */,
        signature: target.valueType,
        target
      });
    }
  };
  var tryConsumeLoad = (ctx, instr) => {
    let signed = false;
    let valueType;
    let byteCount;
    switch (instr.opcode) {
      case 40 /* I32Load */:
        {
          signed = true;
          valueType = -1 /* I32 */;
          byteCount = 4;
        }
        break;
      case 41 /* I64Load */:
        {
          signed = true;
          valueType = -2 /* I64 */;
          byteCount = 8;
        }
        break;
      case 42 /* F32Load */:
        {
          valueType = -3 /* F32 */;
          byteCount = 4;
        }
        break;
      case 43 /* F64Load */:
        {
          valueType = -4 /* F64 */;
          byteCount = 8;
        }
        break;
      case 44 /* I32Load8_S */:
        {
          signed = true;
          valueType = -1 /* I32 */;
          byteCount = 1;
        }
        break;
      case 45 /* I32Load8_U */:
        {
          valueType = -1 /* I32 */;
          byteCount = 1;
        }
        break;
      case 46 /* I32Load16_S */:
        {
          signed = true;
          valueType = -1 /* I32 */;
          byteCount = 2;
        }
        break;
      case 47 /* I32Load16_U */:
        {
          valueType = -1 /* I32 */;
          byteCount = 2;
        }
        break;
      case 48 /* I64Load8_S */:
        {
          signed = true;
          valueType = -2 /* I64 */;
          byteCount = 1;
        }
        break;
      case 49 /* I64Load8_U */:
        {
          valueType = -2 /* I64 */;
          byteCount = 1;
        }
        break;
      case 50 /* I64Load16_S */:
        {
          signed = true;
          valueType = -2 /* I64 */;
          byteCount = 2;
        }
        break;
      case 51 /* I64Load16_U */:
        {
          valueType = -2 /* I64 */;
          byteCount = 2;
        }
        break;
      case 52 /* I64Load32_S */:
        {
          signed = true;
          valueType = -2 /* I64 */;
          byteCount = 4;
        }
        break;
      case 53 /* I64Load32_U */:
        {
          valueType = -2 /* I64 */;
          byteCount = 4;
        }
        break;
      default:
        return false;
    }
    const { align, offset } = instr.immediates.memoryArgument;
    const address = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 10 /* Load */,
      signature: valueType,
      address,
      signed,
      byteCount,
      offset,
      align
    });
    return true;
  };
  var tryConsumeStore = (ctx, instr) => {
    let valueType;
    let byteCount;
    switch (instr.opcode) {
      case 54 /* I32Store */:
        {
          valueType = -1 /* I32 */;
          byteCount = 4;
        }
        break;
      case 58 /* I32Store8 */:
        {
          valueType = -1 /* I32 */;
          byteCount = 1;
        }
        break;
      case 59 /* I32Store16 */:
        {
          valueType = -1 /* I32 */;
          byteCount = 2;
        }
        break;
      case 55 /* I64Store */:
        {
          valueType = -2 /* I64 */;
          byteCount = 8;
        }
        break;
      case 60 /* I64Store8 */:
        {
          valueType = -2 /* I64 */;
          byteCount = 1;
        }
        break;
      case 61 /* I64Store16 */:
        {
          valueType = -2 /* I64 */;
          byteCount = 2;
        }
        break;
      case 62 /* I64Store32 */:
        {
          valueType = -2 /* I64 */;
          byteCount = 4;
        }
        break;
      case 56 /* F32Store */:
        {
          valueType = -3 /* F32 */;
          byteCount = 4;
        }
        break;
      case 57 /* F64Store */:
        {
          valueType = -4 /* F64 */;
          byteCount = 8;
        }
        break;
      default:
        return false;
    }
    const { align, offset } = instr.immediates.memoryArgument;
    const value = popNonVoidExpression(ctx);
    const address = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 11 /* Store */,
      valueType,
      signature: null,
      address,
      byteCount,
      offset,
      align,
      value
    });
    return true;
  };
  var tryConsumeConst = (ctx, instr) => {
    let valueType;
    let value;
    switch (instr.opcode) {
      case 65 /* I32Const */:
        {
          valueType = -1 /* I32 */;
          value = instr.immediates.value;
        }
        break;
      case 66 /* I64Const */:
        {
          valueType = -2 /* I64 */;
          value = instr.immediates.value;
        }
        break;
      case 67 /* F32Const */:
        {
          valueType = -3 /* F32 */;
          value = instr.immediates.value;
        }
        break;
      case 68 /* F64Const */:
        {
          valueType = -4 /* F64 */;
          value = instr.immediates.value;
        }
        break;
      case 64780 /* V128Const */:
        {
          valueType = -5 /* V128 */;
          value = instr.immediates.value;
        }
        break;
      case 208 /* RefNull */:
        {
          valueType = -16 /* FuncRef */;
          value = null;
        }
        break;
      case 210 /* RefFunc */:
        {
          valueType = -16 /* FuncRef */;
          value = ctx.fmt.functions[instr.immediates.functionIndex];
        }
        break;
      default:
        return false;
    }
    pushExpression(ctx, {
      type: 12 /* Const */,
      signature: valueType,
      value
    });
    return true;
  };
  var tryConsumeUnary = (ctx, instr) => {
    let valueType;
    switch (instr.opcode) {
      case 139 /* F32Abs */:
      case 141 /* F32Ceil */:
      case 152 /* F32Copysign */:
      case 142 /* F32Floor */:
      case 144 /* F32Nearest */:
      case 140 /* F32Neg */:
      case 145 /* F32Sqrt */:
      case 143 /* F32Trunc */:
        {
          valueType = -3 /* F32 */;
        }
        break;
      case 153 /* F64Abs */:
      case 155 /* F64Ceil */:
      case 166 /* F64Copysign */:
      case 156 /* F64Floor */:
      case 158 /* F64Nearest */:
      case 154 /* F64Neg */:
      case 159 /* F64Sqrt */:
      case 157 /* F64Trunc */:
        {
          valueType = -4 /* F64 */;
        }
        break;
      case 103 /* I32Clz */:
      case 104 /* I32Ctz */:
      case 69 /* I32Eqz */:
      case 105 /* I32Popcnt */:
        {
          valueType = -1 /* I32 */;
        }
        break;
      case 121 /* I64Clz */:
      case 122 /* I64Ctz */:
      case 80 /* I64Eqz */:
      case 123 /* I64Popcnt */:
        {
          valueType = -2 /* I64 */;
        }
        break;
      default:
        return false;
    }
    const value = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 13 /* Unary */,
      value,
      signature: valueType,
      opcode: instr.opcode
    });
    return true;
  };
  var tryConsumeBinary = (ctx, instr) => {
    let valueType;
    switch (instr.opcode) {
      case 146 /* F32Add */:
      case 149 /* F32Div */:
      case 151 /* F32Max */:
      case 150 /* F32Min */:
      case 148 /* F32Mul */:
      case 147 /* F32Sub */:
        {
          valueType = -3 /* F32 */;
        }
        break;
      case 160 /* F64Add */:
      case 163 /* F64Div */:
      case 165 /* F64Max */:
      case 164 /* F64Min */:
      case 162 /* F64Mul */:
      case 161 /* F64Sub */:
        {
          valueType = -4 /* F64 */;
        }
        break;
      case 91 /* F32Eq */:
      case 96 /* F32Ge */:
      case 94 /* F32Gt */:
      case 95 /* F32Le */:
      case 93 /* F32Lt */:
      case 92 /* F32Ne */:
      case 97 /* F64Eq */:
      case 102 /* F64Ge */:
      case 100 /* F64Gt */:
      case 101 /* F64Le */:
      case 99 /* F64Lt */:
      case 98 /* F64Ne */:
      case 70 /* I32Eq */:
      case 78 /* I32Ge_S */:
      case 79 /* I32Ge_U */:
      case 74 /* I32Gt_S */:
      case 75 /* I32Gt_U */:
      case 76 /* I32Le_S */:
      case 77 /* I32Le_U */:
      case 72 /* I32Lt_S */:
      case 73 /* I32Lt_U */:
      case 71 /* I32Ne */:
      case 81 /* I64Eq */:
      case 89 /* I64Ge_S */:
      case 90 /* I64Ge_U */:
      case 85 /* I64Gt_S */:
      case 86 /* I64Gt_U */:
      case 87 /* I64Le_S */:
      case 88 /* I64Le_U */:
      case 83 /* I64Lt_S */:
      case 84 /* I64Lt_U */:
      case 82 /* I64Ne */:
      case 106 /* I32Add */:
      case 113 /* I32And */:
      case 108 /* I32Mul */:
      case 114 /* I32Or */:
      case 116 /* I32Shl */:
      case 117 /* I32Shr_S */:
      case 118 /* I32Shr_U */:
      case 107 /* I32Sub */:
      case 111 /* I32Rem_S */:
      case 112 /* I32Rem_U */:
      case 109 /* I32Div_S */:
      case 110 /* I32Div_U */:
      case 119 /* I32Rotl */:
      case 120 /* I32Rotr */:
      case 115 /* I32Xor */:
        {
          valueType = -1 /* I32 */;
        }
        break;
      case 124 /* I64Add */:
      case 131 /* I64And */:
      case 126 /* I64Mul */:
      case 132 /* I64Or */:
      case 134 /* I64Shl */:
      case 135 /* I64Shr_S */:
      case 136 /* I64Shr_U */:
      case 125 /* I64Sub */:
      case 129 /* I64Rem_S */:
      case 130 /* I64Rem_U */:
      case 127 /* I64Div_S */:
      case 128 /* I64Div_U */:
      case 137 /* I64Rotl */:
      case 138 /* I64Rotr */:
      case 133 /* I64Xor */:
        {
          valueType = -2 /* I64 */;
        }
        break;
      default:
        return false;
    }
    const left = popNonVoidExpression(ctx);
    const right = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 14 /* Binary */,
      left,
      right,
      signature: valueType,
      opcode: instr.opcode
    });
    return true;
  };
  var tryConsumeConvert = (ctx, instr) => {
    let valueType;
    switch (instr.opcode) {
      case 192 /* I32Extend8_S */:
      case 193 /* I32Extend16_S */:
      case 64512 /* I32TruncSatF32_S */:
      case 64513 /* I32TruncSatF32_U */:
      case 64514 /* I32TruncSatF64_S */:
      case 64515 /* I32TruncSatF64_U */:
      case 188 /* I32ReinterpretF32 */:
      case 167 /* I32WrapI64 */:
      case 168 /* I32TruncF32_S */:
      case 169 /* I32TruncF32_U */:
      case 170 /* I32TruncF64_S */:
      case 171 /* I32TruncF64_U */:
        {
          valueType = -1 /* I32 */;
        }
        break;
      case 172 /* I64ExtendI32_S */:
      case 173 /* I64ExtendI32_U */:
      case 174 /* I64TruncF32_S */:
      case 175 /* I64TruncF32_U */:
      case 176 /* I64TruncF64_S */:
      case 177 /* I64TruncF64_U */:
      case 189 /* I64ReinterpretF64 */:
      case 194 /* I64Extend8_S */:
      case 195 /* I64Extend16_S */:
      case 196 /* I64Extend32_S */:
      case 64516 /* I64TruncSatF32_S */:
      case 64517 /* I64TruncSatF32_U */:
      case 64518 /* I64TruncSatF64_S */:
      case 64519 /* I64TruncSatF64_U */:
        {
          valueType = -2 /* I64 */;
        }
        break;
      case 178 /* F32ConvertI32_S */:
      case 179 /* F32ConvertI32_U */:
      case 180 /* F32ConvertI64_S */:
      case 181 /* F32ConvertI64_U */:
      case 182 /* F32DemoteF64 */:
      case 190 /* F32ReinterpretI32 */:
        {
          valueType = -3 /* F32 */;
        }
        break;
      case 183 /* F64ConvertI32_S */:
      case 184 /* F64ConvertI32_U */:
      case 185 /* F64ConvertI64_S */:
      case 186 /* F64ConvertI64_U */:
      case 187 /* F64PromoteF32 */:
      case 191 /* F64ReinterpretI64 */:
        {
          valueType = -4 /* F64 */;
        }
        break;
      default:
        return false;
    }
    const value = popNonVoidExpression(ctx);
    pushExpression(ctx, {
      type: 19 /* Convert */,
      signature: valueType,
      opcode: instr.opcode,
      value
    });
    return true;
  };
  var tryConsumeMemory = (ctx, instr) => {
    switch (instr.opcode) {
      case 63 /* MemorySize */:
        {
          pushExpression(ctx, {
            type: 17 /* MemorySize */,
            signature: -1 /* I32 */
          });
        }
        break;
      case 64 /* MemoryGrow */:
        {
          const delta = popNonVoidExpression(ctx);
          pushExpression(ctx, {
            type: 18 /* MemoryGrow */,
            signature: -1 /* I32 */,
            delta
          });
        }
        break;
      default:
        return false;
    }
    return true;
  };
  var getBlock = (ctx, signature) => {
    const block = {
      type: 3 /* Block */,
      children: [],
      isLoop: false,
      signature
    };
    ctx.branchStack.push(block);
    const start = ctx.valueStack.length;
    consumeExpressions(ctx);
    assert(ctx.branchStack.pop() === block, "Unbalanced branch stack during block parsing");
    assert(ctx.valueStack.length >= start, "Value stack underflow during block parsing");
    dropBlockLeftOvers(ctx, block, start);
    return block;
  };
  var consumeExpressions = (ctx) => {
    const wasUnreachable = ctx.isUnreachable;
    while (moreInput(ctx)) {
      const instr = readInput(ctx);
      switch (instr.opcode) {
        case 5 /* Else */:
          break;
        case 11 /* End */:
          break;
        case 0 /* Unreachable */:
          {
            pushExpression(ctx, kInstrUnreachable);
            ctx.isUnreachable = true;
          }
          break;
        case 1 /* Nop */:
          {
            consumeNop(ctx);
          }
          break;
        case 3 /* Loop */:
        case 2 /* Block */:
          {
            consumeBlock(ctx, instr);
          }
          break;
        case 4 /* If */:
          {
            consumeIf(ctx, instr);
          }
          break;
        case 12 /* Br */:
        case 13 /* BrIf */:
          {
            consumeBranch(ctx, instr);
          }
          break;
        case 14 /* BrTable */:
          {
            consumeSwitch(ctx, instr);
          }
          break;
        case 15 /* Return */:
          {
            consumeReturn(ctx);
          }
          break;
        case 16 /* Call */:
          {
            consumeCall(ctx, instr);
          }
          break;
        case 17 /* CallIndirect */:
          {
            consumeIndirectCall(ctx, instr);
          }
          break;
        case 26 /* Drop */:
          {
            consumeDrop(ctx);
          }
          break;
        case 27 /* Select */:
        case 28 /* SelectWithType */:
          {
            consumeSelect(ctx);
          }
          break;
        case 35 /* GlobalGet */:
        case 32 /* LocalGet */:
          {
            consumeGet(ctx, instr);
          }
          break;
        case 36 /* GlobalSet */:
        case 34 /* LocalTee */:
        case 33 /* LocalSet */:
          {
            consumeSet(ctx, instr);
          }
          break;
        default:
          {
            if (tryConsumeLoad(ctx, instr))
              break;
            if (tryConsumeStore(ctx, instr))
              break;
            if (tryConsumeConst(ctx, instr))
              break;
            if (tryConsumeMemory(ctx, instr))
              break;
            if (tryConsumeUnary(ctx, instr))
              break;
            if (tryConsumeBinary(ctx, instr))
              break;
            if (tryConsumeConvert(ctx, instr))
              break;
            throw fatal("Invalid opcode " + instr.opcode);
          }
          break;
      }
      if (instr.opcode === 11 /* End */ || instr.opcode === 5 /* Else */) {
        ctx.lastDelimiter = instr.opcode;
        break;
      }
    }
    ctx.isUnreachable = wasUnreachable;
  };
  var getInstructionExpression = (fmt, wasmFmt, scope, wasmExpr) => {
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
    };
    const block = getBlock(
      ctx,
      scope === null ? null : scope.signature
    );
    ctx.valueStack.length = 0;
    return block;
  };

  // src/formats/highlevel_wasm/instruction_traverse.ts
  var doInstructionTraverse = (root, cb) => {
    const stack = [
      { instr: root, index: 0 }
    ];
    while (stack.length > 0) {
      const state = stack[stack.length - 1];
      switch (state.instr.type) {
        case 3 /* Block */:
          {
            if (state.index < state.instr.children.length) {
              stack.push({
                instr: state.instr.children[state.index],
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 4 /* If */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.ifTrue,
                index: 0
              });
              state.index += 1;
            } else if (state.index === 1 && state.instr.ifFalse) {
              stack.push({
                instr: state.instr.ifTrue,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 0 /* Nop */:
        case 1 /* Unreachable */:
          {
            cb(state.instr);
            stack.pop();
          }
          break;
        case 2 /* Drop */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 5 /* Br */:
          {
            if (state.index < state.instr.value.length) {
              stack.push({
                instr: state.instr.value[state.index],
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 6 /* Switch */:
          {
            if (state.index < state.instr.value.length) {
              stack.push({
                instr: state.instr.value[state.index],
                index: 0
              });
              state.index += 1;
            } else if (state.index === state.instr.value.length) {
              stack.push({
                instr: state.instr.condition,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 7 /* Call */:
          {
            if (state.index < state.instr.arguments.length) {
              stack.push({
                instr: state.instr.arguments[state.index],
                index: 0
              });
              state.index += 1;
            } else if (state.index === state.instr.arguments.length && state.instr.target.hasOwnProperty("type")) {
              stack.push({
                instr: state.instr.target,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 8 /* Get */:
          {
            cb(state.instr);
            stack.pop();
          }
          break;
        case 9 /* Set */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 10 /* Load */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.address,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 11 /* Store */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.address,
                index: 0
              });
              state.index += 1;
            } else if (state.index === 1) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 12 /* Const */:
          {
            cb(state.instr);
            stack.pop();
          }
          break;
        case 13 /* Unary */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 14 /* Binary */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.left,
                index: 0
              });
              state.index += 1;
            } else if (state.index === 1) {
              stack.push({
                instr: state.instr.right,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 15 /* Select */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.ifTrue,
                index: 0
              });
              state.index += 1;
            } else if (state.index === 1) {
              stack.push({
                instr: state.instr.ifFalse,
                index: 0
              });
              state.index += 1;
            } else if (state.index === 2) {
              stack.push({
                instr: state.instr.condition,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 16 /* Return */:
          {
            if (state.index < state.instr.value.length) {
              stack.push({
                instr: state.instr.value[state.index],
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 17 /* MemorySize */:
          {
            cb(state.instr);
            stack.pop();
          }
          break;
        case 18 /* MemoryGrow */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.delta,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 19 /* Convert */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
        case 20 /* MultiSet */:
          {
            if (state.index === 0) {
              stack.push({
                instr: state.instr.value,
                index: 0
              });
              state.index += 1;
            } else {
              cb(state.instr);
              stack.pop();
            }
          }
          break;
      }
    }
  };

  // src/formats/highlevel_wasm/index.ts
  var HighlevelFormat = class extends AbstractFormat {
    /**
     * Contains all tables known to the module
     * - This includes imported as well
     */
    tables = [];
    /**
     * Contains all memories known to the module
     * - This includes imported as well
     */
    memories = [];
    /**
     * Contains all globals known to the module
     * - This includes imported as well
     */
    globals = [];
    /**
     * Contains all globals known to the module
     * - Imported functions have their body set to null
     */
    functions = [];
    importedFunctionCount = 0;
    /**
     * Contains all elements segments known to the module
     * - Active segments are listed here as well as their table
     */
    elements = [];
    /**
     * Contains all data segments known to the module
     * - Active segments are listed here as well as their memory
     */
    datas = [];
    /**
     * Contains the start function index, if existant
     */
    start;
    // Post order
    traverseInstruction(root, cb) {
      doInstructionTraverse(root, cb);
    }
    getFunction(index) {
      return this.functions[index];
    }
    appendLocal(scope, local) {
      scope.locals.push(local);
    }
    extract() {
      const { kit } = this;
      const wasmFmt = kit.wasm();
      this.datas = [];
      this.elements = [];
      this.functions = [];
      this.globals = [];
      this.memories = [];
      this.tables = [];
      this.start = void 0;
      for (const wasmImport of wasmFmt.imports) {
        digestImport(this, wasmFmt, wasmImport);
      }
      for (const wasmMemory of wasmFmt.memories) {
        digestMemory(this, wasmFmt, wasmMemory);
      }
      for (const wasmTable of wasmFmt.tables) {
        digestTable(this, wasmFmt, wasmTable);
      }
      for (const wasmGlobal of wasmFmt.globals) {
        digestGlobal(this, wasmFmt, wasmGlobal);
      }
      this.importedFunctionCount = this.functions.length;
      for (const wasmFunction of wasmFmt.functions) {
        digestFunction(this, wasmFmt, wasmFunction);
      }
      for (let i = 0; i < wasmFmt.functions.length; ++i) {
        const wasmFunction = wasmFmt.functions[i];
        const hlFunction = this.functions[this.importedFunctionCount + i];
        digestInstructions(this, wasmFmt, hlFunction, wasmFunction.body);
      }
      for (const wasmExport of wasmFmt.exports) {
        digestExport(this, wasmFmt, wasmExport);
      }
      for (const wasmSeg of wasmFmt.elements) {
        digestElementSegment(this, wasmFmt, wasmSeg);
      }
      for (const wasmSeg of wasmFmt.datas) {
        digestDataSegment(this, wasmFmt, wasmSeg);
      }
    }
    compile() {
    }
  };
  var getElementSegmentInitialization = (fmt, wasmFmt, wasmSeg) => {
    if (!Array.isArray(wasmSeg.initialization[0])) {
      return wasmSeg.initialization;
    }
    const initialization = [];
    for (const expr of wasmSeg.initialization) {
      initialization.push(
        getInstructionExpression(fmt, wasmFmt, null, expr)
      );
    }
    return initialization;
  };
  var digestElementSegment = (fmt, wasmFmt, wasmSeg) => {
    const initialization = getElementSegmentInitialization(
      fmt,
      wasmFmt,
      wasmSeg
    );
    if (wasmSeg.mode !== 2 /* ActiveWithMore */ && wasmSeg.mode !== 0 /* StandardActive */) {
      fmt.elements.push({
        index: fmt.elements.length,
        mode: wasmSeg.mode,
        type: wasmSeg.type,
        initialization
      });
      return;
    }
    const table = fmt.tables[wasmSeg.tableIndex];
    const seg = {
      index: fmt.elements.length,
      mode: wasmSeg.mode,
      type: wasmSeg.type,
      table,
      offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
      initialization
    };
    table.activeSegments.push(seg);
    fmt.elements.push(seg);
  };
  var digestDataSegment = (fmt, wasmFmt, wasmSeg) => {
    if (wasmSeg.mode === 1 /* Passive */) {
      fmt.datas.push({
        index: fmt.datas.length,
        mode: wasmSeg.mode,
        initialization: wasmSeg.initialization
      });
      return;
    }
    const memory = fmt.memories[wasmSeg.memoryIndex];
    const seg = {
      index: fmt.datas.length,
      mode: 0 /* Active */,
      memory,
      offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
      initialization: wasmSeg.initialization
    };
    memory.activeSegments.push(seg);
    fmt.datas.push(seg);
  };
  var digestGlobal = (fmt, wasmFmt, wasmGlobal) => {
    fmt.globals.push({
      index: fmt.globals.length,
      exported: false,
      imported: false,
      mutable: wasmGlobal.type.mutable,
      valueType: wasmGlobal.type.valueType,
      isGlobal: true,
      initialization: getInstructionExpression(fmt, wasmFmt, null, wasmGlobal.initialization)
    });
  };
  var digestMemory = (fmt, _wasmFmt, memory) => {
    fmt.memories.push({
      index: fmt.memories.length,
      exported: false,
      imported: false,
      size: memory.limits,
      activeSegments: []
    });
  };
  var digestTable = (fmt, _wasmFmt, wasmTable) => {
    fmt.tables.push({
      index: fmt.tables.length,
      exported: false,
      imported: false,
      refType: wasmTable.refType,
      size: wasmTable.limits,
      activeSegments: []
    });
  };
  var digestExport = (fmt, _wasmFmt, wasmExport) => {
    switch (wasmExport.type) {
      case 0 /* Function */:
        {
          const { functionIndex } = wasmExport.description;
          const func = fmt.functions[functionIndex];
          if (func.exported = true) {
            func.exportName = wasmExport.name;
          }
        }
        break;
      case 3 /* Global */:
        {
          const { globalIndex } = wasmExport.description;
          const global = fmt.globals[globalIndex];
          if (global.exported = true) {
            global.exportName = wasmExport.name;
          }
        }
        break;
      case 1 /* Table */:
        {
          const { tableIndex } = wasmExport.description;
          const table = fmt.tables[tableIndex];
          if (table.exported = true) {
            table.exportName = wasmExport.name;
          }
        }
        break;
      case 2 /* Memory */:
        {
          const { memoryIndex } = wasmExport.description;
          const mem = fmt.memories[memoryIndex];
          if (mem.exported = true) {
            mem.exportName = wasmExport.name;
          }
        }
        break;
    }
  };
  var digestImport = (fmt, wasmFmt, wasmImport) => {
    const importData = {
      exported: false,
      imported: true,
      importModule: wasmImport.module,
      importName: wasmImport.name
    };
    switch (wasmImport.type) {
      case 0 /* Function */:
        {
          fmt.functions.push({
            ...importData,
            index: fmt.functions.length,
            signature: wasmFmt.signatures[wasmImport.description.signatureIndex]
          });
        }
        break;
      case 3 /* Global */:
        {
          fmt.globals.push({
            ...importData,
            index: fmt.globals.length,
            mutable: wasmImport.description.globalType.mutable,
            valueType: wasmImport.description.globalType.valueType,
            isGlobal: true
          });
        }
        break;
      case 1 /* Table */:
        {
          fmt.tables.push({
            ...importData,
            index: fmt.tables.length,
            refType: wasmImport.description.tableType.refType,
            size: wasmImport.description.tableType.limits,
            activeSegments: []
          });
        }
        break;
      case 2 /* Memory */:
        {
          fmt.memories.push({
            ...importData,
            index: fmt.memories.length,
            size: wasmImport.description.memoryType.limits,
            activeSegments: []
          });
        }
        break;
    }
  };
  var digestFunction = (fmt, wasmFmt, wasmFunction) => {
    const signature = wasmFmt.signatures[wasmFunction.signatureIndex];
    const paramLocals = signature.params.map((valueType, index) => ({
      index,
      valueType,
      mutable: true,
      isGlobal: false,
      isParameter: true
    }));
    const nonParamLocals = wasmFunction.locals.map((valueType, index) => ({
      index: index + paramLocals.length,
      valueType,
      mutable: true,
      isGlobal: false,
      isParameter: false
    }));
    const func = {
      index: fmt.functions.length,
      imported: false,
      exported: false,
      signature: wasmFmt.signatures[wasmFunction.signatureIndex],
      locals: paramLocals.concat(nonParamLocals),
      body: null
    };
    fmt.functions.push(func);
  };
  var digestInstructions = (fmt, wasmFmt, hlFunction, wasmInstructions) => {
    if (hlFunction.imported)
      return;
    hlFunction.body = getInstructionExpression(
      fmt,
      wasmFmt,
      hlFunction,
      wasmInstructions
    );
  };

  // src/formats/llvm/index.ts
  var LLVMFormat = class extends AbstractFormat {
    extract() {
    }
    compile() {
    }
  };

  // src/lib/utf8.ts
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  var utf8Encode = (str) => {
    return encoder.encode(str);
  };
  var utf8Decode = (bytes3) => {
    return decoder.decode(bytes3);
  };

  // src/lib/binary.ts
  var getBytesFromBinary = async (binary) => {
    if (!binary)
      return new Uint8Array(0);
    if (binary instanceof Uint8Array)
      return binary;
    const buffer = binary["buffer"];
    if (buffer instanceof ArrayBuffer) {
      return new Uint8Array(buffer);
    }
    if (typeof binary["arrayBuffer"] === "function") {
      return new Uint8Array(await binary.arrayBuffer());
    }
    if (typeof binary === "string") {
      return getBytesFromBinary(utf8Encode(binary));
    }
    return Uint8Array.from(binary);
  };
  var BytesView = class {
    bytes;
    at;
    constructor(bytes3 = new Uint8Array(65536), at = 0) {
      this.bytes = bytes3;
      this.at = at;
    }
  };

  // src/lib/reader.ts
  var convo = new ArrayBuffer(8);
  var c_u8 = new Uint8Array(convo);
  var c_u32 = new Uint32Array(convo);
  var c_f32 = new Float32Array(convo);
  var c_f64 = new Float64Array(convo);
  var isEOF = (view) => {
    return view.at >= view.bytes.byteLength;
  };
  var u8 = (view) => view.bytes[view.at++];
  var i7 = (view) => {
    return u8(view) << 25 >> 25;
  };
  var u32 = (view) => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 4));
    return c_u32[0];
  };
  var vi32 = (view) => {
    let i = 0;
    let out = 0;
    while (true) {
      const byte = view.bytes[view.at++];
      out |= (byte & 127) << i;
      i += 7;
      if ((128 & byte) === 0) {
        if (i < 32 && (byte & 64) !== 0) {
          return out | ~0 << i;
        }
        return out;
      }
    }
  };
  var vu32 = (view) => {
    let i = 0;
    let out = 0;
    while (view.bytes[view.at] & 128) {
      out |= (view.bytes[view.at++] & 127) << i;
      i += 7;
    }
    out |= (view.bytes[view.at++] & 127) << i;
    return out >>> 0;
  };
  var vi64 = (view) => {
    let i = 0n;
    let out = 0n;
    while (true) {
      const byte = view.bytes[view.at++];
      out |= BigInt(byte & 127) << i;
      i += 7n;
      if ((128 & byte) === 0) {
        if (i < 128n && (byte & 64) !== 0) {
          return out | ~0n << i;
        }
        return out;
      }
    }
  };
  var f32 = (view) => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 4));
    return c_f32[0];
  };
  var f64 = (view) => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 8));
    return c_f64[0];
  };
  var bytes = (view, length = vu32(view)) => {
    return view.bytes.subarray(view.at, view.at += length);
  };
  var string = (view) => {
    return utf8Decode(bytes(view));
  };
  var vector = (view, doRead) => {
    const length = vu32(view);
    const data = Array(length);
    for (let i = 0; i < length; ++i) {
      data[i] = doRead(view, i);
    }
    return data;
  };

  // src/lib/writer.ts
  var convo2 = new ArrayBuffer(8);
  var c_u82 = new Uint8Array(convo2);
  var c_u322 = new Uint32Array(convo2);
  var c_f322 = new Float32Array(convo2);
  var c_f642 = new Float64Array(convo2);
  var hasSpace = (view, amount) => {
    return view.at + amount < view.bytes.length;
  };
  var expand = (view, amount = 128) => {
    const half = view.bytes.length * 0.5;
    if (amount < half) {
      amount = half;
    }
    const newBytes = new Uint8Array(view.at + amount);
    newBytes.set(view.bytes);
    view.bytes = newBytes;
  };
  var u82 = (view, value) => {
    if (!hasSpace(view, 1))
      expand(view);
    view.bytes[view.at++] = value;
  };
  var i72 = (view, value) => {
    if (!hasSpace(view, 1))
      expand(view);
    view.bytes[view.at++] = value << 25 >>> 25;
  };
  var u322 = (view, value) => {
    if (!hasSpace(view, 4))
      expand(view);
    c_u322[0] = value;
    view.bytes.set(c_u82.subarray(0, 4), view.at);
    view.at += 4;
  };
  var vi322 = (view, value) => {
    if (!hasSpace(view, 6))
      expand(view);
    while (true) {
      let byte = value & 127;
      value >>= 7;
      if (value === -1 && byte & 64 || value === 0 && !(byte & 64)) {
        view.bytes[view.at++] = byte;
        break;
      } else {
        view.bytes[view.at++] = byte | 128;
      }
    }
  };
  var vu322 = (view, value) => {
    if (!hasSpace(view, 6))
      expand(view);
    while (true) {
      let byte = value & 127;
      value >>= 7;
      if (value === 0) {
        view.bytes[view.at++] = byte;
        break;
      } else {
        view.bytes[view.at++] = byte | 128;
      }
    }
  };
  var vi642 = (view, value) => {
    if (!hasSpace(view, 10))
      expand(view);
    while (true) {
      let byte = Number(value & 0x7Fn);
      value >>= 7n;
      if (value === -1n && byte & 64 || value === 0n && !(byte & 64)) {
        view.bytes[view.at++] = byte;
        break;
      } else {
        view.bytes[view.at++] = byte | 128;
      }
    }
  };
  var f322 = (view, value) => {
    if (!hasSpace(view, 4))
      expand(view);
    c_f322[0] = value;
    view.bytes.set(c_u82.subarray(0, 4), view.at);
    view.at += 4;
  };
  var f642 = (view, value) => {
    if (!hasSpace(view, 8))
      expand(view);
    c_f642[0] = value;
    view.bytes.set(c_u82.subarray(0, 8), view.at);
    view.at += 8;
  };
  var string2 = (view, value) => {
    bytes2(view, utf8Encode(value));
  };
  var bytes2 = (view, value, writeLength = true) => {
    if (writeLength)
      vu322(view, value.length);
    if (!hasSpace(view, value.length))
      expand(view, value.length);
    view.bytes.set(value, view.at);
    view.at += value.length;
  };
  var vector2 = (view, data, doWrite) => {
    const length = data.length;
    vu322(view, length);
    for (let i = 0; i < length; ++i)
      doWrite(view, data[i]);
  };

  // src/formats/raw/index.ts
  var FILE_MAGIC = 1836278016;
  var FILE_VERSION = 1;
  var SectionId = /* @__PURE__ */ ((SectionId2) => {
    SectionId2[SectionId2["Custom"] = 0] = "Custom";
    SectionId2[SectionId2["Signature"] = 1] = "Signature";
    SectionId2[SectionId2["Import"] = 2] = "Import";
    SectionId2[SectionId2["Function"] = 3] = "Function";
    SectionId2[SectionId2["Table"] = 4] = "Table";
    SectionId2[SectionId2["Memory"] = 5] = "Memory";
    SectionId2[SectionId2["Global"] = 6] = "Global";
    SectionId2[SectionId2["Export"] = 7] = "Export";
    SectionId2[SectionId2["Start"] = 8] = "Start";
    SectionId2[SectionId2["Element"] = 9] = "Element";
    SectionId2[SectionId2["Code"] = 10] = "Code";
    SectionId2[SectionId2["Data"] = 11] = "Data";
    SectionId2[SectionId2["DataCount"] = 12] = "DataCount";
    SectionId2[SectionId2["kMax"] = 13] = "kMax";
    return SectionId2;
  })(SectionId || {});
  var RawFormat = class extends AbstractFormat {
    metadata = {
      magic: FILE_MAGIC,
      version: FILE_VERSION
    };
    custom = /* @__PURE__ */ new Map();
    signature = null;
    import = null;
    function = null;
    table = null;
    memory = null;
    global = null;
    export = null;
    start = null;
    element = null;
    code = null;
    data = null;
    dataCount = null;
    compile() {
      const { kit } = this;
      const v = new BytesView();
      u322(v, FILE_MAGIC);
      u322(v, FILE_VERSION);
      if (this.signature) {
        u82(v, 1 /* Signature */);
        bytes2(v, this.signature);
      }
      if (this.import) {
        u82(v, 2 /* Import */);
        bytes2(v, this.import);
      }
      if (this.function) {
        u82(v, 3 /* Function */);
        bytes2(v, this.function);
      }
      if (this.table) {
        u82(v, 4 /* Table */);
        bytes2(v, this.table);
      }
      if (this.memory) {
        u82(v, 5 /* Memory */);
        bytes2(v, this.memory);
      }
      if (this.global) {
        u82(v, 6 /* Global */);
        bytes2(v, this.global);
      }
      if (this.export) {
        u82(v, 7 /* Export */);
        bytes2(v, this.export);
      }
      if (this.start) {
        u82(v, 8 /* Start */);
        bytes2(v, this.start);
      }
      if (this.element) {
        u82(v, 9 /* Element */);
        bytes2(v, this.element);
      }
      if (this.code) {
        u82(v, 10 /* Code */);
        bytes2(v, this.code);
      }
      if (this.data) {
        u82(v, 11 /* Data */);
        bytes2(v, this.data);
      }
      if (this.dataCount) {
        u82(v, 12 /* DataCount */);
        bytes2(v, this.dataCount);
      }
      for (const [name, data] of this.custom) {
        u82(v, 0 /* Custom */);
        const v2 = new BytesView();
        string2(v2, name);
        bytes2(v2, data, false);
        bytes2(v, v2.bytes.subarray(0, v2.at));
      }
      kit.loadBytes(v.bytes.subarray(0, v.at));
    }
    extract() {
      const { kit } = this;
      const v = new BytesView(kit.bytes);
      assert(u32(v) === FILE_MAGIC, "Invalid file magic");
      assert(u32(v) === FILE_VERSION, "Invalid file version");
      while (isEOF(v) === false) {
        const id = u8(v);
        const size = vu32(v);
        assert(id < 13 /* kMax */, "Invalid section id");
        if (id !== 0) {
          const sectionName = SectionId[id].toLowerCase();
          assert(this[sectionName] === null, "Duplicate section id");
          this[sectionName] = bytes(v, size);
          continue;
        }
        const end = v.at + size;
        const name = string(v);
        if (this.custom.has(name)) {
          console.warn("Duplicate custom section. Disgarding stale data");
          console.warn(this.custom.get(name));
        }
        this.custom.set(name, bytes(v, end - v.at));
      }
    }
  };

  // src/formats/wasm/instruction.ts
  var KNOWN_OPCODES = Object.values(Opcode).filter((e) => typeof e === "number");
  var readInstruction = (v) => {
    let opcode = u8(v);
    if (OpcodePrefixes.includes(opcode))
      opcode = opcode << 8 | u8(v);
    const immediates = {};
    switch (opcode) {
      case 2 /* Block */:
      case 3 /* Loop */:
      case 4 /* If */:
        {
          const type = vi32(v);
          if (type < 0)
            immediates.valueType = type;
          else
            immediates.signatureIndex = type;
        }
        break;
      case 12 /* Br */:
      case 13 /* BrIf */:
        {
          immediates.labelIndex = vu32(v);
        }
        break;
      case 14 /* BrTable */:
        {
          immediates.labelIndexs = vector(v, vu32);
          immediates.defaultLabelIndex = vu32(v);
        }
        break;
      case 16 /* Call */:
      case 210 /* RefFunc */:
        {
          immediates.functionIndex = vu32(v);
        }
        break;
      case 17 /* CallIndirect */:
        {
          immediates.signatureIndex = vu32(v);
          immediates.tableIndex = vu32(v);
        }
        break;
      case 208 /* RefNull */:
        {
          immediates.refType = vi32(v);
        }
        break;
      case 28 /* SelectWithType */:
        {
          immediates.valueTypes = vector(v, vi32);
        }
        break;
      case 32 /* LocalGet */:
      case 33 /* LocalSet */:
      case 34 /* LocalTee */:
        {
          immediates.localIndex = vu32(v);
        }
        break;
      case 35 /* GlobalGet */:
      case 36 /* GlobalSet */:
        {
          immediates.globalIndex = vu32(v);
        }
        break;
      case 37 /* TableGet */:
      case 38 /* TableSet */:
      case 64527 /* TableGrow */:
      case 64528 /* TableSize */:
      case 64529 /* TableFill */:
        {
          immediates.tableIndex = vu32(v);
        }
        break;
      case 64524 /* TableInit */:
        {
          immediates.elementIndex = vu32(v);
          immediates.tableIndex = vu32(v);
        }
        break;
      case 64526 /* TableCopy */:
        {
          immediates.fromTableIndex = vu32(v);
          immediates.toTableIndex = vu32(v);
        }
        break;
      case 64525 /* ElemDrop */:
        {
          immediates.elementIndex = vu32(v);
        }
        break;
      case 40 /* I32Load */:
      case 41 /* I64Load */:
      case 42 /* F32Load */:
      case 43 /* F64Load */:
      case 44 /* I32Load8_S */:
      case 45 /* I32Load8_U */:
      case 46 /* I32Load16_S */:
      case 47 /* I32Load16_U */:
      case 48 /* I64Load8_S */:
      case 49 /* I64Load8_U */:
      case 50 /* I64Load16_S */:
      case 51 /* I64Load16_U */:
      case 52 /* I64Load32_S */:
      case 53 /* I64Load32_U */:
      case 54 /* I32Store */:
      case 55 /* I64Store */:
      case 56 /* F32Store */:
      case 57 /* F64Store */:
      case 58 /* I32Store8 */:
      case 59 /* I32Store16 */:
      case 60 /* I64Store8 */:
      case 61 /* I64Store16 */:
      case 62 /* I64Store32 */:
      case 64768 /* V128Load */:
      case 64769 /* V128Load8x8_S */:
      case 64770 /* V128Load8x8_U */:
      case 64771 /* V128Load16x4_S */:
      case 64772 /* V128Load16x4_U */:
      case 64773 /* V128Load32x2_S */:
      case 64774 /* V128Load32x2_U */:
      case 64775 /* V128Load8Splat */:
      case 64776 /* V128Load16Splat */:
      case 64777 /* V128Load32Splat */:
      case 64778 /* V128Load64Splat */:
      case 64860 /* V128Load32Zero */:
      case 64861 /* V128Load64Zero */:
      case 64779 /* V128Store */:
        {
          immediates.memoryArgument = {
            align: vu32(v),
            offset: vu32(v)
          };
        }
        break;
      case 64852 /* V128Load8Lane */:
      case 64853 /* V128Load16Lane */:
      case 64854 /* V128Load32Lane */:
      case 64855 /* V128Load64Lane */:
      case 64856 /* V128Store8Lane */:
      case 64857 /* V128Store16Lane */:
      case 64858 /* V128Store32Lane */:
      case 64859 /* V128Store64Lane */:
        {
          immediates.memoryArgument = {
            align: vu32(v),
            offset: vu32(v)
          };
          immediates.laneIndex = u8(v);
        }
        break;
      case 63 /* MemorySize */:
      case 64 /* MemoryGrow */:
        {
          u8(v);
        }
        break;
      case 64520 /* MemoryInit */:
        {
          immediates.dataIndex = vu32(v);
          u8(v);
        }
        break;
      case 64521 /* DataDrop */:
        {
          immediates.dataIndex = vu32(v);
        }
        break;
      case 64522 /* MemoryCopy */:
        {
          u8(v);
          u8(v);
        }
        break;
      case 64523 /* MemoryFill */:
        {
          u8(v);
        }
        break;
      case 65 /* I32Const */:
        {
          immediates.value = vi32(v);
        }
        break;
      case 66 /* I64Const */:
        {
          immediates.value = vi64(v);
        }
        break;
      case 67 /* F32Const */:
        {
          immediates.value = f32(v);
        }
        break;
      case 68 /* F64Const */:
        {
          immediates.value = f64(v);
        }
        break;
      case 64780 /* V128Const */:
        {
          immediates.bytes = new Uint8Array(bytes(v, 16).buffer);
        }
        break;
      case 64789 /* I8x16ExtractLane_S */:
      case 64790 /* I8x16ExtractLane_U */:
      case 64791 /* I8x16ReplaceLane */:
      case 64792 /* I16x8ExtractLane_S */:
      case 64793 /* I16x8ExtractLane_U */:
      case 64794 /* I16x8ReplaceLane */:
      case 64795 /* I32x4ExtractLane */:
      case 64796 /* I32x4ReplaceLane */:
      case 64797 /* I64x2ExtractLane */:
      case 64798 /* I64x2ReplaceLane */:
      case 64799 /* F32x4ExtractLane */:
      case 64800 /* F32x4ReplaceLane */:
      case 64801 /* F64x2ExtractLane */:
      case 64802 /* F64x2ReplaceLane */:
        {
          immediates.laneIndex = u8(v);
        }
        break;
      case 64781 /* I8x16Shuffle */:
        {
          immediates.laneIndexs = Array.from(bytes(v, 16));
        }
        break;
      default:
        {
          assert(KNOWN_OPCODES.includes(opcode), "Unknown opcode " + opcode);
        }
        break;
    }
    return {
      opcode,
      immediates
    };
  };
  var writeInstruction = (v, instr) => {
    let opcode = instr.opcode;
    if (opcode > 255) {
      const prefix = opcode >> 8;
      assert(OpcodePrefixes.includes(prefix), "Invalid opcode prefix");
      u82(v, prefix);
      opcode = opcode & 255;
    }
    u82(v, opcode);
    switch (opcode) {
      case 2 /* Block */:
      case 3 /* Loop */:
      case 4 /* If */:
        {
          vi322(v, instr.immediates.valueType ?? instr.immediates.signatureIndex);
        }
        break;
      case 12 /* Br */:
      case 13 /* BrIf */:
        {
          vu322(v, instr.immediates.labelIndex);
        }
        break;
      case 14 /* BrTable */:
        {
          vector2(v, instr.immediates.labelIndexs, vu322);
          vu322(v, instr.immediates.defaultLabelIndex);
        }
        break;
      case 16 /* Call */:
      case 210 /* RefFunc */:
        {
          vu322(v, instr.immediates.functionIndex);
        }
        break;
      case 17 /* CallIndirect */:
        {
          vu322(v, instr.immediates.signatureIndex);
          vu322(v, instr.immediates.tableIndex);
        }
        break;
      case 208 /* RefNull */:
        {
          vi322(v, instr.immediates.refType);
        }
        break;
      case 28 /* SelectWithType */:
        {
          vector2(v, instr.immediates.valueTypes, vi322);
        }
        break;
      case 32 /* LocalGet */:
      case 33 /* LocalSet */:
      case 34 /* LocalTee */:
        {
          vu322(v, instr.immediates.localIndex);
        }
        break;
      case 35 /* GlobalGet */:
      case 36 /* GlobalSet */:
        {
          vu322(v, instr.immediates.globalIndex);
        }
        break;
      case 37 /* TableGet */:
      case 38 /* TableSet */:
      case 64527 /* TableGrow */:
      case 64528 /* TableSize */:
      case 64529 /* TableFill */:
        {
          vu322(v, instr.immediates.tableIndex);
        }
        break;
      case 64524 /* TableInit */:
        {
          vu322(v, instr.immediates.elementIndex);
          vu322(v, instr.immediates.tableIndex);
        }
        break;
      case 64526 /* TableCopy */:
        {
          vu322(v, instr.immediates.fromTableIndex);
          vu322(v, instr.immediates.toTableIndex);
        }
        break;
      case 64525 /* ElemDrop */:
        {
          vu322(v, instr.immediates.elementIndex);
        }
        break;
      case 40 /* I32Load */:
      case 41 /* I64Load */:
      case 42 /* F32Load */:
      case 43 /* F64Load */:
      case 44 /* I32Load8_S */:
      case 45 /* I32Load8_U */:
      case 46 /* I32Load16_S */:
      case 47 /* I32Load16_U */:
      case 48 /* I64Load8_S */:
      case 49 /* I64Load8_U */:
      case 50 /* I64Load16_S */:
      case 51 /* I64Load16_U */:
      case 52 /* I64Load32_S */:
      case 53 /* I64Load32_U */:
      case 54 /* I32Store */:
      case 55 /* I64Store */:
      case 56 /* F32Store */:
      case 57 /* F64Store */:
      case 58 /* I32Store8 */:
      case 59 /* I32Store16 */:
      case 60 /* I64Store8 */:
      case 61 /* I64Store16 */:
      case 62 /* I64Store32 */:
      case 64768 /* V128Load */:
      case 64769 /* V128Load8x8_S */:
      case 64770 /* V128Load8x8_U */:
      case 64771 /* V128Load16x4_S */:
      case 64772 /* V128Load16x4_U */:
      case 64773 /* V128Load32x2_S */:
      case 64774 /* V128Load32x2_U */:
      case 64775 /* V128Load8Splat */:
      case 64776 /* V128Load16Splat */:
      case 64777 /* V128Load32Splat */:
      case 64778 /* V128Load64Splat */:
      case 64860 /* V128Load32Zero */:
      case 64861 /* V128Load64Zero */:
      case 64779 /* V128Store */:
        {
          const memarg = instr.immediates.memoryArgument;
          vu322(v, memarg.align);
          vu322(v, memarg.offset);
        }
        break;
      case 64852 /* V128Load8Lane */:
      case 64853 /* V128Load16Lane */:
      case 64854 /* V128Load32Lane */:
      case 64855 /* V128Load64Lane */:
      case 64856 /* V128Store8Lane */:
      case 64857 /* V128Store16Lane */:
      case 64858 /* V128Store32Lane */:
      case 64859 /* V128Store64Lane */:
        {
          const memarg = instr.immediates.memoryArgument;
          vu322(v, memarg.align);
          vu322(v, memarg.offset);
          u82(v, instr.immediates.laneIndex);
        }
        break;
      case 63 /* MemorySize */:
      case 64 /* MemoryGrow */:
        {
          u82(v, 0);
        }
        break;
      case 64520 /* MemoryInit */:
        {
          vu322(v, instr.immediates.dataIndex);
          u82(v, 0);
        }
        break;
      case 64521 /* DataDrop */:
        {
          vu322(v, instr.immediates.dataIndex);
        }
        break;
      case 64522 /* MemoryCopy */:
        {
          u82(v, 0);
          u82(v, 0);
        }
        break;
      case 64523 /* MemoryFill */:
        {
          u82(v, 0);
        }
        break;
      case 65 /* I32Const */:
        {
          vi322(v, instr.immediates.value);
        }
        break;
      case 66 /* I64Const */:
        {
          vi642(v, instr.immediates.value);
        }
        break;
      case 67 /* F32Const */:
        {
          f322(v, instr.immediates.value);
        }
        break;
      case 68 /* F64Const */:
        {
          f642(v, instr.immediates.value);
        }
        break;
      case 64780 /* V128Const */:
        {
          bytes2(v, new Uint8Array(instr.immediates.bytes), false);
        }
        break;
      case 64789 /* I8x16ExtractLane_S */:
      case 64790 /* I8x16ExtractLane_U */:
      case 64791 /* I8x16ReplaceLane */:
      case 64792 /* I16x8ExtractLane_S */:
      case 64793 /* I16x8ExtractLane_U */:
      case 64794 /* I16x8ReplaceLane */:
      case 64795 /* I32x4ExtractLane */:
      case 64796 /* I32x4ReplaceLane */:
      case 64797 /* I64x2ExtractLane */:
      case 64798 /* I64x2ReplaceLane */:
      case 64799 /* F32x4ExtractLane */:
      case 64800 /* F32x4ReplaceLane */:
      case 64801 /* F64x2ExtractLane */:
      case 64802 /* F64x2ReplaceLane */:
        {
          u82(v, instr.immediates.laneIndex);
        }
        break;
      case 64781 /* I8x16Shuffle */:
        {
          bytes2(v, new Uint8Array(instr.immediates.laneIndexs), false);
        }
        break;
      default:
        {
          assert(KNOWN_OPCODES.includes(opcode), "Unknown opcode " + opcode);
        }
        break;
    }
  };
  var readInstructionExpression = (v) => {
    const instructions = [];
    let depth = 0;
    while (isEOF(v) === false) {
      const instruction = readInstruction(v);
      if (depth === 0 && instruction.opcode === 11 /* End */)
        break;
      instructions.push(instruction);
      switch (instruction.opcode) {
        case 11 /* End */:
          {
            depth -= 1;
          }
          break;
        case 2 /* Block */:
        case 3 /* Loop */:
        case 4 /* If */:
          {
            depth += 1;
          }
          break;
      }
    }
    assert(depth === 0, "Unexpected expression end");
    return [...instructions, TerminatingEndInstruction];
  };
  var writeInstructionExpression = (v, instructions) => {
    let depth = 0;
    for (const instr of instructions) {
      writeInstruction(v, instr);
      switch (instr.opcode) {
        case 11 /* End */:
          {
            depth -= 1;
          }
          break;
        case 2 /* Block */:
        case 3 /* Loop */:
        case 4 /* If */:
          {
            depth += 1;
          }
          break;
      }
    }
    assert(depth === -1, "Instruction expression not properly terminated");
  };

  // src/formats/wasm/index.ts
  var WasmFormat = class extends AbstractFormat {
    signatures = [];
    tables = [];
    memories = [];
    globals = [];
    elements = [];
    datas = [];
    start;
    imports = [];
    exports = [];
    functions = [];
    extract() {
      const { kit } = this;
      const sections = kit.raw();
      if (sections.signature) {
        this.signatures = vector(new BytesView(sections.signature), readSignature);
      }
      if (sections.table) {
        this.tables = vector(new BytesView(sections.table), readTable);
      }
      if (sections.memory) {
        this.memories = vector(new BytesView(sections.memory), readMemory);
      }
      if (sections.global) {
        this.globals = vector(new BytesView(sections.global), readGlobal);
      }
      if (sections.element) {
        this.elements = vector(new BytesView(sections.element), readElementSegment);
      }
      if (sections.data) {
        this.datas = vector(new BytesView(sections.data), readDataSegment);
      }
      if (sections.start) {
        this.start = vu32(new BytesView(sections.start));
      }
      if (sections.import) {
        this.imports = vector(new BytesView(sections.import), readImport);
      }
      if (sections.export) {
        this.exports = vector(new BytesView(sections.export), readExport);
      }
      if (sections.function && sections.code) {
        const signatureIndices = vector(new BytesView(sections.function), vu32);
        this.functions = vector(new BytesView(sections.code), (v, i) => {
          const fv = new BytesView(bytes(v));
          return {
            signatureIndex: signatureIndices[i],
            locals: vector(fv, () => {
              return Array(vu32(fv)).fill(i7(fv));
            }).flat(),
            body: readInstructionExpression(fv)
          };
        });
      }
    }
    compile() {
      const { kit } = this;
      const raw = kit.raw();
      if (this.signatures.length) {
        const v = new BytesView();
        vector2(v, this.signatures, writeSignature);
        raw.signature = v.bytes.subarray(0, v.at);
      } else
        raw.signature = null;
      if (this.tables.length) {
        const v = new BytesView();
        vector2(v, this.tables, writeTable);
        raw.table = v.bytes.subarray(0, v.at);
      } else
        raw.table = null;
      if (this.memories.length) {
        const v = new BytesView();
        vector2(v, this.memories, writeMemory);
        raw.memory = v.bytes.subarray(0, v.at);
      } else
        raw.memory = null;
      if (this.globals.length) {
        const v = new BytesView();
        vector2(v, this.globals, writeGlobal);
        raw.global = v.bytes.subarray(0, v.at);
      } else
        raw.global = null;
      if (this.elements.length) {
        const v = new BytesView();
        vector2(v, this.elements, writeElementSegment);
        raw.element = v.bytes.subarray(0, v.at);
      } else
        raw.element = null;
      if (this.datas.length) {
        const v = new BytesView();
        vector2(v, this.datas, writeDataSegment);
        raw.data = v.bytes.subarray(0, v.at);
      } else
        raw.data = null;
      if (this.start !== void 0) {
        const v = new BytesView();
        vu322(v, this.start);
        raw.start = v.bytes.subarray(0, v.at);
      } else
        raw.start = null;
      if (this.imports.length) {
        const v = new BytesView();
        vector2(v, this.imports, writeImport);
        raw.import = v.bytes.subarray(0, v.at);
      } else
        raw.import = null;
      if (this.exports.length) {
        const v = new BytesView();
        vector2(v, this.exports, writeExport);
        raw.export = v.bytes.subarray(0, v.at);
      } else
        raw.export = null;
      if (this.functions.length) {
        const sigsV = new BytesView();
        vector2(sigsV, this.functions, (v, func) => {
          vu322(v, func.signatureIndex);
        });
        raw.function = sigsV.bytes.subarray(0, sigsV.at);
        const codesV = new BytesView();
        vector2(codesV, this.functions, (codesV2, func) => {
          const v = new BytesView();
          const localsPacked = [];
          let lastType = null;
          for (const local of func.locals) {
            if (local === lastType) {
              localsPacked[localsPacked.length - 1][1]++;
            } else {
              localsPacked.push([local, 1]);
              lastType = local;
            }
          }
          vector2(v, localsPacked, (v2, [type, count]) => {
            vu322(v2, count);
            i72(v2, type);
          });
          writeInstructionExpression(v, func.body);
          bytes2(codesV2, v.bytes.subarray(0, v.at));
        });
        raw.code = codesV.bytes.subarray(0, codesV.at);
      } else {
        raw.function = null;
        raw.code = null;
      }
      kit.raw().compile();
    }
  };
  var readLimits = (v, flags = vu32(v)) => {
    const limits = {
      min: vu32(v)
    };
    if (flags & 1)
      limits.max = vu32(v);
    return limits;
  };
  var writeLimits = (v, limits) => {
    const hasMax = Number.isInteger(limits.max);
    const flags = hasMax ? 1 : 0;
    vu322(v, flags);
    vu322(v, limits.min);
    if (hasMax)
      vu322(v, limits.max);
  };
  var readSignature = (v) => {
    assert(u8(v) === 96, "Invalid function signature");
    return {
      params: vector(v, i7),
      results: vector(v, i7)
    };
  };
  var writeSignature = (v, sig) => {
    u82(v, 96);
    vector2(v, sig.params, i72);
    vector2(v, sig.results, i72);
  };
  var readTable = (v) => {
    return {
      refType: i7(v),
      limits: readLimits(v)
    };
  };
  var writeTable = (v, table) => {
    i72(v, table.refType);
    writeLimits(v, table.limits);
  };
  var readMemory = (v) => {
    return {
      limits: readLimits(v)
    };
  };
  var writeMemory = (v, memory) => {
    writeLimits(v, memory.limits);
  };
  var readGlobalType = (v) => {
    const valueType = i7(v);
    const flags = vu32(v);
    return {
      valueType,
      mutable: (flags & 1) === 1
    };
  };
  var writeGlobalType = (v, type) => {
    i72(v, type.valueType);
    vu322(v, type.mutable ? 1 : 0);
  };
  var readGlobal = (v) => {
    return {
      type: readGlobalType(v),
      initialization: readInstructionExpression(v)
    };
  };
  var writeGlobal = (v, global) => {
    writeGlobalType(v, global.type);
    writeInstructionExpression(v, global.initialization);
  };
  var readElementSegment = (v) => {
    const modeFlags = u8(v) & 7;
    const mode = modeFlags & 3;
    const maybeNotFuncref = !!(modeFlags & 4);
    const segment = {
      mode,
      type: -16 /* FuncRef */,
      initialization: []
    };
    if (segment.mode === 1 /* Passive */ || segment.mode === 3 /* Declarative */) {
      if (maybeNotFuncref) {
        segment.type = i7(v);
      } else {
        assert(u8(v) === 0, "Expected element kind to be 0");
        segment.type = -16 /* FuncRef */;
      }
    } else if (segment.mode === 0 /* StandardActive */) {
      segment.tableIndex = 0;
      segment.offset = readInstructionExpression(v);
      segment.type = -16 /* FuncRef */;
    } else if (segment.mode === 2 /* ActiveWithMore */) {
      segment.tableIndex = vu32(v);
      segment.offset = readInstructionExpression(v);
      if (maybeNotFuncref) {
        segment.type = i7(v);
      } else {
        assert(u8(v) === 0, "Expected element kind to be 0");
        segment.type = -16 /* FuncRef */;
      }
    }
    if (maybeNotFuncref) {
      segment.initialization = vector(v, readInstructionExpression);
    } else {
      segment.initialization = vector(v, vu32);
    }
    return segment;
  };
  var writeElementSegment = (v, segment) => {
    const notFuncRef = segment.type !== -16 /* FuncRef */;
    const modeFlags = segment.mode | (notFuncRef ? 4 : 0);
    u82(v, modeFlags);
    if (segment.mode === 1 /* Passive */ || segment.mode === 3 /* Declarative */) {
      if (notFuncRef) {
        i72(v, segment.type);
      } else {
        u82(v, 0);
      }
    } else if (segment.mode === 0 /* StandardActive */) {
      writeInstructionExpression(v, segment.offset);
    } else if (segment.mode === 2 /* ActiveWithMore */) {
      vu322(v, segment.tableIndex);
      writeInstructionExpression(v, segment.offset);
      if (notFuncRef) {
        i72(v, segment.type);
      } else {
        u82(v, 0);
      }
    }
    if (notFuncRef) {
      vector2(v, segment.initialization, writeInstructionExpression);
    } else {
      vector2(v, segment.initialization, vu322);
    }
  };
  var readDataSegment = (v) => {
    ;
    const flags = u8(v);
    const mode = flags & 3;
    const segment = {
      mode,
      memoryIndex: mode === 2 /* ActiveWithMemoryIndex */ ? vu32(v) : 0
    };
    if (segment.mode !== 1 /* Passive */) {
      segment.offset = readInstructionExpression(v);
    }
    segment.initialization = bytes(v);
    return segment;
  };
  var writeDataSegment = (v, segment) => {
    let flags = segment.mode & 1;
    if (segment.mode !== 1 /* Passive */) {
      flags |= segment.memoryIndex === 0 ? 0 : 2;
    }
    u82(v, flags);
    if (segment.mode !== 1 /* Passive */ && flags & 2) {
      vu322(v, segment.memoryIndex);
    }
    if (segment.mode !== 1 /* Passive */) {
      writeInstructionExpression(v, segment.offset);
    }
    bytes2(v, segment.initialization);
  };
  var readExport = (v) => {
    const entry = {
      name: string(v),
      type: u8(v),
      description: {}
    };
    switch (entry.type) {
      case 0 /* Function */:
        {
          entry.description.functionIndex = vu32(v);
        }
        break;
      case 1 /* Table */:
        {
          entry.description.tableIndex = vu32(v);
        }
        break;
      case 2 /* Memory */:
        {
          entry.description.memoryIndex = vu32(v);
        }
        break;
      case 3 /* Global */:
        {
          entry.description.globalIndex = vu32(v);
        }
        break;
      default:
        assert(false, "Unexpected export entry type (" + entry["type"] + ")");
    }
    return entry;
  };
  var writeExport = (v, entry) => {
    string2(v, entry.name);
    u82(v, entry.type);
    switch (entry.type) {
      case 0 /* Function */:
        {
          vu322(v, entry.description.functionIndex);
        }
        break;
      case 1 /* Table */:
        {
          vu322(v, entry.description.tableIndex);
        }
        break;
      case 2 /* Memory */:
        {
          vu322(v, entry.description.memoryIndex);
        }
        break;
      case 3 /* Global */:
        {
          vu322(v, entry.description.globalIndex);
        }
        break;
      default:
        assert(false, "Unexpected export entry type (" + entry["type"] + ")");
    }
  };
  var readImport = (v) => {
    const entry = {
      module: string(v),
      name: string(v),
      type: u8(v),
      description: {}
    };
    switch (entry.type) {
      case 0 /* Function */:
        {
          entry.description.signatureIndex = vu32(v);
        }
        break;
      case 1 /* Table */:
        {
          entry.description.tableType = readTable(v);
        }
        break;
      case 2 /* Memory */:
        {
          entry.description.memoryType = readMemory(v);
        }
        break;
      case 3 /* Global */:
        {
          entry.description.globalType = readGlobalType(v);
        }
        break;
      default:
        assert(false, "Unexpected export entry type (" + entry["type"] + ")");
    }
    return entry;
  };
  var writeImport = (v, entry) => {
    string2(v, entry.module);
    string2(v, entry.name);
    u82(v, entry.type);
    switch (entry.type) {
      case 0 /* Function */:
        {
          vu322(v, entry.description.signatureIndex);
        }
        break;
      case 1 /* Table */:
        {
          writeTable(v, entry.description.tableType);
        }
        break;
      case 2 /* Memory */:
        {
          writeMemory(v, entry.description.memoryType);
        }
        break;
      case 3 /* Global */:
        {
          writeGlobalType(v, entry.description.globalType);
        }
        break;
      default:
        assert(false, "Unexpected export entry type (" + entry["type"] + ")");
    }
  };

  // src/formats/index.ts
  var formats_default = {
    raw: RawFormat,
    wasm: WasmFormat,
    highlevel_wasm: HighlevelFormat,
    llvm: LLVMFormat
  };

  // src/kit.ts
  var Kit = class _Kit {
    static async fromBinary(binary) {
      return _Kit.fromBytes(await getBytesFromBinary(binary));
    }
    static fromBytes(bytes3) {
      return new _Kit(bytes3);
    }
    bytes;
    fmt;
    _formatCache;
    constructor(bytes3) {
      this._formatCache = /* @__PURE__ */ new Map();
      this.bytes = new Uint8Array(bytes3);
      this.fmt = formats_default;
    }
    loadBytes(bytes3) {
      this.bytes = new Uint8Array(bytes3);
      for (const format of this._formatCache.values()) {
        format[kInvalidateInternal]();
      }
      this._formatCache.clear();
    }
    as(Format, options) {
      if (this._formatCache.has(Format)) {
        const f = this._formatCache.get(Format);
        if (f[kIsInvalidInternal]) {
          this._formatCache.delete(Format);
        } else {
          return f;
        }
      }
      const mod = new Format(this, options);
      mod.extract();
      this._formatCache.set(Format, mod);
      return mod;
    }
    raw() {
      return this.as(formats_default.raw);
    }
    wasm() {
      return this.as(formats_default.wasm);
    }
  };

  // src/index.ts
  var wasmkit = (file) => Kit.fromBinary(file);
})();
