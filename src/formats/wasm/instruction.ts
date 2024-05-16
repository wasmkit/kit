import * as logging from "../../lib/logging";

import { BytesView } from "../../lib/binary";
import * as read from "../../lib/reader";
import * as write from "../../lib/writer";

import {
    Immediates,
    Instruction,
    Opcode,
    OpcodePrefixes,
    TerminatingEndInstruction
} from "./types";

const KNOWN_OPCODES = Object.values(Opcode).filter(e => typeof e === "number");

export const readInstruction = (v: BytesView): Instruction => {
    let opcode: Opcode = read.u8(v);

    if (OpcodePrefixes.includes(opcode)) opcode = opcode << 8 | read.u8(v);

    const immediates: Immediates = {};

    switch (opcode) {
        case Opcode.Block:
        case Opcode.Loop:
        case Opcode.If: {
            const type = read.vi32(v);

            if (type < 0) immediates.valueType = type;
            else immediates.signatureIndex = type;
        } break;
        case Opcode.Br:
        case Opcode.BrIf: {
            immediates.labelIndex = read.vu32(v);
        } break;
        case Opcode.BrTable: {
            immediates.labelIndexs = read.vector(v, read.vu32);
            immediates.defaultLabelIndex = read.vu32(v);
        } break;
        case Opcode.Call:
        case Opcode.RefFunc: {
            immediates.functionIndex = read.vu32(v);
        } break;
        case Opcode.CallIndirect: {
            immediates.signatureIndex = read.vu32(v);
            immediates.tableIndex = read.vu32(v);
        } break;
        case Opcode.RefNull: {
            immediates.refType = read.vi32(v);
        } break;
        case Opcode.SelectWithType: {
            immediates.valueTypes = read.vector(v, read.vi32);
        } break;
        case Opcode.LocalGet:
        case Opcode.LocalSet:
        case Opcode.LocalTee: {
            immediates.localIndex = read.vu32(v);
        } break;
        case Opcode.GlobalGet:
        case Opcode.GlobalSet: {
            immediates.globalIndex = read.vu32(v);
        } break;
        case Opcode.TableGet:
        case Opcode.TableSet:
        case Opcode.TableGrow:
        case Opcode.TableSize:
        case Opcode.TableFill: {
            immediates.tableIndex = read.vu32(v);
        } break;
        case Opcode.TableInit: {
            immediates.elementIndex = read.vu32(v);
            immediates.tableIndex = read.vu32(v);
        } break;
        case Opcode.TableCopy: {
            immediates.fromTableIndex = read.vu32(v);
            immediates.toTableIndex = read.vu32(v);
        } break;
        case Opcode.ElemDrop: {
            immediates.elementIndex = read.vu32(v);
        } break;
        case Opcode.I32Load:
        case Opcode.I64Load:
        case Opcode.F32Load:
        case Opcode.F64Load:
        case Opcode.I32Load8_S:
        case Opcode.I32Load8_U:
        case Opcode.I32Load16_S:
        case Opcode.I32Load16_U:
        case Opcode.I64Load8_S:
        case Opcode.I64Load8_U:
        case Opcode.I64Load16_S:
        case Opcode.I64Load16_U:
        case Opcode.I64Load32_S:
        case Opcode.I64Load32_U:
        case Opcode.I32Store:
        case Opcode.I64Store:
        case Opcode.F32Store:
        case Opcode.F64Store:
        case Opcode.I32Store8:
        case Opcode.I32Store16:
        case Opcode.I64Store8:
        case Opcode.I64Store16:
        case Opcode.I64Store32:
        case Opcode.V128Load:
        case Opcode.V128Load8x8_S:
        case Opcode.V128Load8x8_U:
        case Opcode.V128Load16x4_S:
        case Opcode.V128Load16x4_U:
        case Opcode.V128Load32x2_S:
        case Opcode.V128Load32x2_U:
        case Opcode.V128Load8Splat:
        case Opcode.V128Load16Splat:
        case Opcode.V128Load32Splat:
        case Opcode.V128Load64Splat:
        case Opcode.V128Load32Zero:
        case Opcode.V128Load64Zero:
        case Opcode.V128Store: {
            immediates.memoryArgument = {
                align: read.vu32(v),
                offset: read.vu32(v)
            }
        } break;
        case Opcode.V128Load8Lane:
        case Opcode.V128Load16Lane:
        case Opcode.V128Load32Lane:
        case Opcode.V128Load64Lane:
        case Opcode.V128Store8Lane:
        case Opcode.V128Store16Lane:
        case Opcode.V128Store32Lane:
        case Opcode.V128Store64Lane: {
            immediates.memoryArgument = {
                align: read.vu32(v),
                offset: read.vu32(v)
            }
            immediates.laneIndex = read.u8(v);
        } break;
        case Opcode.MemorySize:
        case Opcode.MemoryGrow: {
            // Memory Index - not in specification
            read.u8(v);
        } break;
        case Opcode.MemoryInit: {
            immediates.dataIndex = read.vu32(v);
            // Memory Index - not in specification
            read.u8(v);
        } break;
        case Opcode.DataDrop: {
            immediates.dataIndex = read.vu32(v);
        } break;
        case Opcode.MemoryCopy: {
            // Memory Index - not in specification
            read.u8(v); // from
            read.u8(v); // to
        } break;
        case Opcode.MemoryFill: {
            read.u8(v);
        } break;
        case Opcode.I32Const: {
            immediates.value = read.vi32(v);
        } break;
        case Opcode.I64Const: {
            immediates.value = read.vi64(v);
        } break;
        case Opcode.F32Const: {
            immediates.value = read.f32(v);
        } break;
        case Opcode.F64Const: {
            immediates.value = read.f64(v);
        } break;
        case Opcode.V128Const: {
            immediates.bytes = new Uint8Array(read.bytes(v, 16).buffer);
        } break;
        case Opcode.I8x16ExtractLane_S:
        case Opcode.I8x16ExtractLane_U:
        case Opcode.I8x16ReplaceLane:
        case Opcode.I16x8ExtractLane_S:
        case Opcode.I16x8ExtractLane_U:
        case Opcode.I16x8ReplaceLane:
        case Opcode.I32x4ExtractLane:
        case Opcode.I32x4ReplaceLane:
        case Opcode.I64x2ExtractLane:
        case Opcode.I64x2ReplaceLane:
        case Opcode.F32x4ExtractLane:
        case Opcode.F32x4ReplaceLane:
        case Opcode.F64x2ExtractLane:
        case Opcode.F64x2ReplaceLane: {
            immediates.laneIndex = read.u8(v);
        } break;
        case Opcode.I8x16Shuffle: {
            immediates.laneIndexs = Array.from(read.bytes(v, 16));
        } break;
        default: {
            logging.assert(KNOWN_OPCODES.includes(opcode), "Unknown opcode " + opcode);
        } break;
    }

    return {
        opcode,
        immediates
    }
}

export const writeInstruction = (v: BytesView, instr: Instruction): void => {
    let opcode = instr.opcode;

    if (opcode > 0xFF) {
        const prefix = opcode >> 8;
        logging.assert(OpcodePrefixes.includes(prefix), "Invalid opcode prefix");

        write.u8(v, prefix);

        opcode = opcode & 0xFF;
    }

    write.u8(v, opcode);

    switch (opcode) {
        case Opcode.Block:
        case Opcode.Loop:
        case Opcode.If: {
            // It has to have one or the other
            write.vi32(v, instr.immediates.valueType ?? instr.immediates.signatureIndex!);
        } break;
        case Opcode.Br:
        case Opcode.BrIf: {
            write.vu32(v, instr.immediates.labelIndex!);
        } break;
        case Opcode.BrTable: {
            write.vector(v, instr.immediates.labelIndexs!, write.vu32);
            write.vu32(v, instr.immediates.defaultLabelIndex!);
        } break;
        case Opcode.Call:
        case Opcode.RefFunc: {
            write.vu32(v, instr.immediates.functionIndex!);
        } break;
        case Opcode.CallIndirect: {
            write.vu32(v, instr.immediates.signatureIndex!);
            write.vu32(v, instr.immediates.tableIndex!);
        } break;
        case Opcode.RefNull: {
            write.vi32(v, instr.immediates.refType!);
        } break;
        case Opcode.SelectWithType: {
            write.vector(v, instr.immediates.valueTypes!, write.vi32);
        } break;
        case Opcode.LocalGet:
        case Opcode.LocalSet:
        case Opcode.LocalTee: {
            write.vu32(v, instr.immediates.localIndex!);
        } break;
        case Opcode.GlobalGet:
        case Opcode.GlobalSet: {
            write.vu32(v, instr.immediates.globalIndex!);
        } break;
        case Opcode.TableGet:
        case Opcode.TableSet:
        case Opcode.TableGrow:
        case Opcode.TableSize:
        case Opcode.TableFill: {
            write.vu32(v, instr.immediates.tableIndex!);
        } break;
        case Opcode.TableInit: {
            write.vu32(v, instr.immediates.elementIndex!);
            write.vu32(v, instr.immediates.tableIndex!);
        } break;
        case Opcode.TableCopy: {
            write.vu32(v, instr.immediates.fromTableIndex!);
            write.vu32(v, instr.immediates.toTableIndex!);
        } break;
        case Opcode.ElemDrop: {
            write.vu32(v, instr.immediates.elementIndex!);
        } break;
        case Opcode.I32Load:
        case Opcode.I64Load:
        case Opcode.F32Load:
        case Opcode.F64Load:
        case Opcode.I32Load8_S:
        case Opcode.I32Load8_U:
        case Opcode.I32Load16_S:
        case Opcode.I32Load16_U:
        case Opcode.I64Load8_S:
        case Opcode.I64Load8_U:
        case Opcode.I64Load16_S:
        case Opcode.I64Load16_U:
        case Opcode.I64Load32_S:
        case Opcode.I64Load32_U:
        case Opcode.I32Store:
        case Opcode.I64Store:
        case Opcode.F32Store:
        case Opcode.F64Store:
        case Opcode.I32Store8:
        case Opcode.I32Store16:
        case Opcode.I64Store8:
        case Opcode.I64Store16:
        case Opcode.I64Store32:
        case Opcode.V128Load:
        case Opcode.V128Load8x8_S:
        case Opcode.V128Load8x8_U:
        case Opcode.V128Load16x4_S:
        case Opcode.V128Load16x4_U:
        case Opcode.V128Load32x2_S:
        case Opcode.V128Load32x2_U:
        case Opcode.V128Load8Splat:
        case Opcode.V128Load16Splat:
        case Opcode.V128Load32Splat:
        case Opcode.V128Load64Splat:
        case Opcode.V128Load32Zero:
        case Opcode.V128Load64Zero:
        case Opcode.V128Store: {
            const memarg = instr.immediates.memoryArgument!;
            write.vu32(v, memarg.align);
            write.vu32(v, memarg.offset);
        } break;
        case Opcode.V128Load8Lane:
        case Opcode.V128Load16Lane:
        case Opcode.V128Load32Lane:
        case Opcode.V128Load64Lane:
        case Opcode.V128Store8Lane:
        case Opcode.V128Store16Lane:
        case Opcode.V128Store32Lane:
        case Opcode.V128Store64Lane: {
            const memarg = instr.immediates.memoryArgument!;
            write.vu32(v, memarg.align);
            write.vu32(v, memarg.offset);
            write.u8(v, instr.immediates.laneIndex!);
        } break;
        case Opcode.MemorySize:
        case Opcode.MemoryGrow: {
            // Memory Index - not in specification
            write.u8(v, 0);
        } break;
        case Opcode.MemoryInit: {
            write.vu32(v, instr.immediates.dataIndex!);
            // Memory Index - not in specification
            write.u8(v, 0);
        } break;
        case Opcode.DataDrop: {
            write.vu32(v, instr.immediates.dataIndex!);
        } break;
        case Opcode.MemoryCopy: {
            // Memory Index - not in specification
            write.u8(v, 0); // from
            write.u8(v, 0); // to
        } break;
        case Opcode.MemoryFill: {
            // Memory Index - not in specification
            write.u8(v, 0);
        } break;
        case Opcode.I32Const: {
            write.vi32(v, instr.immediates.value! as number);
        } break;
        case Opcode.I64Const: {
            write.vi64(v, instr.immediates.value! as bigint);
        } break;
        case Opcode.F32Const: {
            write.f32(v, instr.immediates.value! as number);
        } break;
        case Opcode.F64Const: {
            write.f64(v, instr.immediates.value! as number);
        } break;
        case Opcode.V128Const: {
            write.bytes(v, new Uint8Array(instr.immediates.bytes!), false);
        } break;
        case Opcode.I8x16ExtractLane_S:
        case Opcode.I8x16ExtractLane_U:
        case Opcode.I8x16ReplaceLane:
        case Opcode.I16x8ExtractLane_S:
        case Opcode.I16x8ExtractLane_U:
        case Opcode.I16x8ReplaceLane:
        case Opcode.I32x4ExtractLane:
        case Opcode.I32x4ReplaceLane:
        case Opcode.I64x2ExtractLane:
        case Opcode.I64x2ReplaceLane:
        case Opcode.F32x4ExtractLane:
        case Opcode.F32x4ReplaceLane:
        case Opcode.F64x2ExtractLane:
        case Opcode.F64x2ReplaceLane: {
            write.u8(v, instr.immediates.laneIndex!);
        } break;
        case Opcode.I8x16Shuffle: {
            write.bytes(v, new Uint8Array(instr.immediates.laneIndexs!), false);
        } break;
        default: {
            logging.assert(KNOWN_OPCODES.includes(opcode), "Unknown opcode " + opcode);
        } break;
    }
}

export const readInstructionExpression = (v: BytesView): Instruction[] => {
    const instructions: Instruction[] = [];
    let depth = 0;

    while (read.isEOF(v) === false) {

        const instruction = readInstruction(v);

        if (depth === 0 && instruction.opcode === Opcode.End) break;

        instructions.push(instruction);

        switch (instruction.opcode) {
            case Opcode.End: {
                // case Opcode.Else:
                depth -= 1;
            } break;
            case Opcode.Block:
            case Opcode.Loop:
            case Opcode.If: {
                // case Opcode.Else:
                depth += 1;
            } break;
        }
    }

    logging.assert(depth === 0, "Unexpected expression end");

    return [...instructions, TerminatingEndInstruction];
}


export const writeInstructionExpression = (
    v: BytesView,
    instructions: Instruction[]
): void => {
    let depth = 0;
    for (const instr of instructions) {
        writeInstruction(v, instr);


        switch (instr.opcode) {
            case Opcode.End: {
                // case Opcode.Else:
                depth -= 1;
            } break;
            case Opcode.Block:
            case Opcode.Loop:
            case Opcode.If: {
                // case Opcode.Else:
                depth += 1;
            } break;
        }
    }

    logging.assert(depth === -1, "Instruction expression not properly terminated");
}