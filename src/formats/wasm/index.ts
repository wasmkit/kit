import { AbstractFormat } from "../abstract";
import * as wasm from "./types";
import * as read from "../../lib/reader";
import * as write from "../../lib/writer";

import * as logging from "../../lib/logging";
import { BytesView } from "../../lib/binary";
import { readInstructionExpression, writeInstructionExpression } from "./instruction";

export class Format extends AbstractFormat {
    public signatures: wasm.FuncSignature[] = [];
    public tables: wasm.TableType[] = [];
    public memories: wasm.MemoryType[] = [];
    public globals: wasm.Global[] = [];
    public elements: wasm.ElementSegment[] = [];
    public datas: wasm.DataSegment[] = [];
    public start?: number;
    public imports: wasm.Import[] = [];
    public exports: wasm.Export[] = [];
    public functions: wasm.Function[] = [];
}

const readLimits = (v: BytesView, flags: number = read.vu32(v)): wasm.Limits => {
    const limits: wasm.Limits = {
        min: read.vu32(v)
    }
    if (flags & 1) limits.max = read.vu32(v);

    return limits;
}

const writeLimits = (v: BytesView, limits: wasm.Limits): void => {
    const hasMax = Number.isInteger(limits.max);

    const flags = hasMax ? 1 : 0;

    write.vu32(v, flags);
    write.vu32(v, limits.min);

    if (hasMax) write.vu32(v, limits.max!);
}



const readSignature = (v: BytesView): wasm.FuncSignature => {
    logging.assert(read.u8(v) === 0x60, "Invalid function signature");

    return {
        params: read.vector<wasm.ValueType>(v, read.i8),
        results: read.vector<wasm.ValueType>(v, read.i8)
    }
}

const writeSignature = (v: BytesView, sig: wasm.FuncSignature): void => {
    write.u8(v, 0x60);
    write.vector(v, sig.params, write.i8);
    write.vector(v, sig.results, write.i8);
}



const readTable = (v: BytesView): wasm.TableType => {
    return {
        refType: read.i8(v),
        limits: readLimits(v)
    }
}

const writeTable = (v: BytesView, table: wasm.TableType): void => {
    write.i8(v, table.refType);
    writeLimits(v, table.limits);
}



const readMemory = (v: BytesView): wasm.MemoryType => {
    return {
        limits: readLimits(v)
    }
}

const writeMemory = (v: BytesView, memory: wasm.MemoryType): void => {
    writeLimits(v, memory.limits);
}



const readGlobalType = (v: BytesView): wasm.GlobalType => {
    const valueType = read.i8(v);
    const flags = read.vu32(v);

    return {
        valueType,
        mutable: (flags & 1) === 1
    }
}

const writeGlobalType = (v: BytesView, type: wasm.GlobalType): void => {
    write.i8(v, type.valueType);
    write.vu32(v, type.mutable ? 1 : 0);
}



const readGlobal = (v: BytesView): wasm.Global => {
    return {
        type: readGlobalType(v),
        initialization: readInstructionExpression(v)
    }
}

const writeGlobal = (v: BytesView, global: wasm.Global): void => {
    writeGlobalType(v, global.type);
    writeInstructionExpression(v, global.initialization);
}



const readElementSegment = (v: BytesView): wasm.ElementSegment => {
    const modeFlags = read.u8(v) & 0b111;

    const mode = modeFlags & 0b11 as wasm.ElementSegmentMode;

    const maybeNotFuncref = !!(modeFlags & 0b100);

    const segment = {
        mode: mode,
        type: wasm.RefType.FuncRef,
        initialization: []
    } as wasm.ElementSegment;

    if (
        segment.mode === wasm.ElementSegmentMode.Passive ||
        segment.mode === wasm.ElementSegmentMode.Declarative
    ) {
        if (maybeNotFuncref) {
            segment.type = read.i8(v);
        } else {
            logging.assert(read.u8(v) === 0, "Expected element kind to be 0");
            segment.type = wasm.RefType.FuncRef;
        }
    } else if (segment.mode === wasm.ElementSegmentMode.StandardActive) {
        segment.tableIndex = 0;
        segment.offset = readInstructionExpression(v);
        segment.type = wasm.RefType.FuncRef;
    } else if (segment.mode === wasm.ElementSegmentMode.ActiveWithMore) {
        // This should really be an else { ... } but the compiler is not smart
        // enough to figure that out
        segment.tableIndex = read.vu32(v);
        segment.offset = readInstructionExpression(v);
        
        if (maybeNotFuncref) {
            segment.type = read.i8(v);
        } else {
            logging.assert(read.u8(v) === 0, "Expected element kind to be 0");
            segment.type = wasm.RefType.FuncRef;
        }
    } 

    if (maybeNotFuncref) {
        segment.initialization = read.vector(v, readInstructionExpression);
    } else {
        segment.initialization = read.vector(v, read.vu32);
    }

    return segment;
}

const writeElementSegment = (v: BytesView, segment: wasm.ElementSegment): void => {
    const notFuncRef = segment.type !== wasm.RefType.FuncRef;
    const modeFlags = segment.mode | (notFuncRef ? 0b100 : 0);

    write.u8(v, modeFlags);

    if (
        segment.mode === wasm.ElementSegmentMode.Passive ||
        segment.mode === wasm.ElementSegmentMode.Declarative
    ) {
        if (notFuncRef) {
            write.i8(v, segment.type);
        } else {
            write.u8(v, 0);
        }
    } else if (segment.mode === wasm.ElementSegmentMode.StandardActive) {
        writeInstructionExpression(v, segment.offset);
    } else if (segment.mode === wasm.ElementSegmentMode.ActiveWithMore) {
        write.vu32(v, segment.tableIndex);
        writeInstructionExpression(v, segment.offset);

        if (notFuncRef) {
            write.i8(v, segment.type);
        } else {
            write.u8(v, 0);
        }
    }

    if (notFuncRef) {
        write.vector(v, segment.initialization, writeInstructionExpression);
    } else {
        write.vector(v, segment.initialization as number[], write.vu32);
    }

}



const readDataSegment = (v: BytesView): wasm.DataSegment => {;
    const flags = read.u8(v);
    const mode = flags & 0b11 as wasm.DataSegmentMode;
    const segment = {
        mode,
        memoryIndex: mode === wasm.DataSegmentMode.ActiveWithMemoryIndex ? read.vu32(v) : 0
    } as wasm.DataSegment;

    if (segment.mode !== wasm.DataSegmentMode.Passive) {
        segment.offset = readInstructionExpression(v);
    }

    segment.initialization = read.bytes(v);

    return segment
}

const writeDataSegment = (v: BytesView, segment: wasm.DataSegment): void => {
    let flags = segment.mode & 1;

    if (segment.mode !== wasm.DataSegmentMode.Passive) {
        flags |= segment.memoryIndex === 0 ? 0b00 : 0b10;
    }

    write.u8(v, flags);

    if (
        segment.mode !== wasm.DataSegmentMode.Passive
        && (flags & 0b10)
    ) {
        write.vu32(v, segment.memoryIndex!);
    }

    if (segment.mode !== wasm.DataSegmentMode.Passive) {
        writeInstructionExpression(v, segment.offset);
    }

    write.bytes(v, segment.initialization);
}



const readExport = (v: BytesView): wasm.Export => {
    const entry = {
        name: read.string(v),
        type: read.u8(v),
        description: {}
    } as wasm.Export;

    switch (entry.type) {
        case wasm.ExternalType.Function: {
            entry.description.functionIndex = read.vu32(v);
        } break;
        case wasm.ExternalType.Table: {
            entry.description.tableIndex = read.vu32(v);
        } break;
        case wasm.ExternalType.Memory: {
            entry.description.memoryIndex = read.vu32(v);
        } break;
        case wasm.ExternalType.Global: {
            entry.description.globalIndex = read.vu32(v);
        } break;
        default: logging.assert(false, "Unexpected export entry type (" + (entry["type"] ) + ")");
    }

    return entry;
}

const writeExport = (v: BytesView, entry: wasm.Export): void => {
    write.string(v, entry.name);
    write.u8(v, entry.type)

    switch (entry.type) {
        case wasm.ExternalType.Function: {
            write.vu32(v, entry.description.functionIndex!);
        } break;
        case wasm.ExternalType.Table: {
            write.vu32(v, entry.description.tableIndex!);
        } break;
        case wasm.ExternalType.Memory: {
            write.vu32(v, entry.description.memoryIndex!);
        } break;
        case wasm.ExternalType.Global: {
            write.vu32(v, entry.description.globalIndex!);
        } break;
        default: logging.assert(false, "Unexpected export entry type (" + (entry["type"] ) + ")");
    }
}



const readImport = (v: BytesView): wasm.Import => {
    const entry = {
        module: read.string(v),
        name: read.string(v),
        type: read.u8(v),
        description: {}
    } as wasm.Import;

    switch (entry.type) {
        case wasm.ExternalType.Function: {
            entry.description.signatureIndex = read.vu32(v);
        } break;
        case wasm.ExternalType.Table: {
            entry.description.tableType = readTable(v);
        } break;
        case wasm.ExternalType.Memory: {
            entry.description.memoryType = readMemory(v);
        } break;
        case wasm.ExternalType.Global: {
            entry.description.globalType = readGlobalType(v);
        } break;
        default: logging.assert(false, "Unexpected export entry type (" + (entry["type"] ) + ")");
    }

    return entry;
}

const writeImport = (v: BytesView, entry: wasm.Import): void => {
    write.string(v, entry.module);
    write.string(v, entry.name);
    write.u8(v, entry.type);

    switch (entry.type) {
        case wasm.ExternalType.Function: {
            write.vu32(v, entry.description.signatureIndex!);
        } break;
        case wasm.ExternalType.Table: {
            writeTable(v, entry.description.tableType!);
        } break;
        case wasm.ExternalType.Memory: {
            writeMemory(v, entry.description.memoryType!);
        } break;
        case wasm.ExternalType.Global: {
            writeGlobalType(v, entry.description.globalType!);
        } break;
        default: logging.assert(false, "Unexpected export entry type (" + (entry["type"] ) + ")");
    }
}



export const extract = (fmt: Format): void => {
    const { kit } = fmt;
    const sections = kit.raw();

    if (sections.signature) {
        fmt.signatures = read.vector(new BytesView(sections.signature), readSignature);
    }
    if (sections.table) {
        fmt.tables = read.vector(new BytesView(sections.table), readTable);
    }
    if (sections.memory) {
        fmt.memories = read.vector(new BytesView(sections.memory), readMemory);
    }
    if (sections.global) {
        fmt.globals = read.vector(new BytesView(sections.global), readGlobal);
    }
    if (sections.element) {
        fmt.elements = read.vector(new BytesView(sections.element), readElementSegment);
    }
    if (sections.data) {
        fmt.datas = read.vector(new BytesView(sections.data), readDataSegment);
    }
    if (sections.start) {
        fmt.start = read.u32(new BytesView(sections.start));
    }
    if (sections.import) {
        fmt.imports = read.vector(new BytesView(sections.import), readImport);
    }
    if (sections.export) {
        fmt.exports = read.vector(new BytesView(sections.export), readExport);
    }

    if (sections.function && sections.code) {
        const signatureIndices = read.vector(new BytesView(sections.function), read.vu32);
        fmt.functions = read.vector<wasm.Function>(new BytesView(sections.code), (v, i) => {
            const fv = new BytesView(read.bytes(v));

            return {
                signatureIndex: signatureIndices[i],
                locals: read.vector<wasm.ValueType[]>(fv, () => {
                    return Array<wasm.ValueType>(read.vu32(fv)).fill(read.i8(fv));
                }).flat(),
                body: readInstructionExpression(fv)
            }
        });
    }
}
