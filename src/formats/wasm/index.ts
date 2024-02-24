import { AbstractFormat } from "../abstract";
import * as wasm from "./types";
import * as read from "../../lib/reader";

import * as logging from "../../lib/logging";
import { BytesView } from "../../lib/binary";
import { readInstructionExpression } from "./instruction";

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
}

const readLimits = (v: BytesView, flags: number = read.vu32(v)): wasm.Limits => {
    const limits: wasm.Limits = {
        min: read.vu32(v)
    }
    if (flags & 1) limits.max = read.vu32(v);

    return limits;
}

const readSignature = (v: BytesView): wasm.FuncSignature => {
    logging.assert(read.u8(v) === 0x60, "Invalid function signature");

    return {
        params: read.vector<wasm.ValueType>(v, read.i8),
        results: read.vector<wasm.ValueType>(v, read.i8)
    }
}

const readTable = (v: BytesView): wasm.TableType => {
    return {
        refType: read.i8(v),
        limits: readLimits(v)
    }
}

const readMemory = (v: BytesView): wasm.MemoryType => {
    return {
        limits: readLimits(v)
    }
}

const readGlobalType = (v: BytesView): wasm.GlobalType => {
    const valueType = read.i8(v);
    const flags = read.vu32(v);

    return {
        valueType,
        mutable: (flags & 1) === 1
    }
}

const readGlobal = (v: BytesView): wasm.Global => {
    return {
        type: readGlobalType(v),
        initialization: readInstructionExpression(v)
    }
}


const readElementSegment = (v: BytesView): wasm.ElementSegment => {
    const modeFlags = read.u8(v) & 0b111;

    const segment = {
        mode: modeFlags & 0b1 ? wasm.ElementSegmentMode.Passive : wasm.ElementSegmentMode.Active,
        type: wasm.RefType.FuncRef,
        initialization: []
    } as wasm.ElementSegment;

    const isAnyRef = !!(modeFlags & 0b100);

    if (segment.mode === wasm.ElementSegmentMode.Passive) {
        if (modeFlags & 0b10) {
            segment.mode = wasm.ElementSegmentMode.Declarative;
        }

        if (isAnyRef) {
            segment.type = read.i8(v);
        } else {
            logging.assert(read.u8(v) === 0, "Expected element kind to be 0");
            segment.type = wasm.RefType.FuncRef;
        }
    } else if (segment.mode === wasm.ElementSegmentMode.Active) {
        if (modeFlags & 0b10) {
            segment.tableIndex = read.vu32(v);
            segment.offset = readInstructionExpression(v);
            
            if (isAnyRef) {
                segment.type = read.i8(v);
            } else {
                logging.assert(read.u8(v) === 0, "Expected element kind to be 0");
                segment.type = wasm.RefType.FuncRef;
            }
        } else {
            segment.tableIndex = 0;
            segment.offset = readInstructionExpression(v);
            segment.type = wasm.RefType.FuncRef;
        }
    }

    if (isAnyRef) {
        segment.initialization = read.vector(v, readInstructionExpression);
    } else {
        segment.initialization = read.vector(v, read.vu32);
    }

    return segment;
}

const readDataSegment = (v: BytesView): wasm.DataSegment => {;
    const flags = read.u8(v);
    const segment = {
        mode: flags & 1 as wasm.DataSegmentMode,
        memoryIndex: flags === 0b10 ? read.vu32(v) : 0
    } as wasm.DataSegment;

    if (segment.mode === wasm.DataSegmentMode.Active) {
        segment.offset = readInstructionExpression(v);
    }

    segment.initialization = read.bytes(v);

    return segment
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
}
