import { AbstractFormat } from "../abstract";
import * as wasm from "./types";
import * as read from "../../lib/reader";
import * as write from "../../lib/writer";

import * as logging from "../../lib/logging";
import { BytesView } from "../../lib/binary";
import { readInstructionExpression, writeInstructionExpression } from "./instruction";

export class WasmFormat extends AbstractFormat {
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

    public extract(): void {
        const { kit } = this;
        const sections = kit.raw();
    
        if (sections.signature) {
            this.signatures = read.vector(new BytesView(sections.signature), readSignature);
        }
        if (sections.table) {
            this.tables = read.vector(new BytesView(sections.table), readTable);
        }
        if (sections.memory) {
            this.memories = read.vector(new BytesView(sections.memory), readMemory);
        }
        if (sections.global) {
            this.globals = read.vector(new BytesView(sections.global), readGlobal);
        }
        if (sections.element) {
            this.elements = read.vector(new BytesView(sections.element), readElementSegment);
        }
        if (sections.data) {
            this.datas = read.vector(new BytesView(sections.data), readDataSegment);
        }
        if (sections.start) {
            this.start = read.vu32(new BytesView(sections.start));
        }
        if (sections.import) {
            this.imports = read.vector(new BytesView(sections.import), readImport);
        }
        if (sections.export) {
            this.exports = read.vector(new BytesView(sections.export), readExport);
        }
    
        if (sections.function && sections.code) {
            const signatureIndices = read.vector(new BytesView(sections.function), read.vu32);
            this.functions = read.vector<wasm.Function>(new BytesView(sections.code), (v, i) => {
                const fv = new BytesView(read.bytes(v));
                return {
                    signatureIndex: signatureIndices[i],
                    locals: read.vector(fv, () => {
                        return Array<wasm.ValueType>(read.vu32(fv)).fill(read.i7(fv));
                    }).flat(),
                    body: readInstructionExpression(fv)
                }
            });
        }
    }

    public compile(): void {
        const { kit } = this;
        const raw = kit.raw();
    
        if (this.signatures.length) {
            const v = new BytesView();
            write.vector(v, this.signatures, writeSignature);
            raw.signature = v.bytes.subarray(0, v.at);
        } else raw.signature = null;
    
        if (this.tables.length) {
            const v = new BytesView();
            write.vector(v, this.tables, writeTable);
            raw.table = v.bytes.subarray(0, v.at);
        } else raw.table = null;
    
        if (this.memories.length) {
            const v = new BytesView();
            write.vector(v, this.memories, writeMemory);
            raw.memory = v.bytes.subarray(0, v.at);
        } else raw.memory = null;
    
        if (this.globals.length) {
            const v = new BytesView();
            write.vector(v, this.globals, writeGlobal);
            raw.global = v.bytes.subarray(0, v.at);
        } else raw.global = null;

        if (this.elements.length) {
            const v = new BytesView();
            write.vector(v, this.elements, writeElementSegment);
            raw.element = v.bytes.subarray(0, v.at);
        } else raw.element = null;
    
        if (this.datas.length) {
            const v = new BytesView();
            write.vector(v, this.datas, writeDataSegment);
            raw.data = v.bytes.subarray(0, v.at);
        } else raw.data = null;
    
        if (this.start !== undefined) {
            const v = new BytesView();
            write.vu32(v, this.start);
            raw.start = v.bytes.subarray(0, v.at);
        } else raw.start = null;
    
        if (this.imports.length) {
            const v = new BytesView();
            write.vector(v, this.imports, writeImport);
            raw.import = v.bytes.subarray(0, v.at);
        } else raw.import = null;
    
        if (this.exports.length) {
            const v = new BytesView();
            write.vector(v, this.exports, writeExport);
            raw.export = v.bytes.subarray(0, v.at);
        } else raw.export = null;

        if (this.functions.length) {
            const sigsV = new BytesView();
            write.vector(sigsV, this.functions, (v, func) => {
                write.vu32(v, func.signatureIndex);
            });
            raw.function = sigsV.bytes.subarray(0, sigsV.at);


            const codesV = new BytesView();
            write.vector(codesV, this.functions, (codesV, func) => {
                const v = new BytesView();

                // Pack locals into pairs of type and count
                const localsPacked: [wasm.ValueType, number][] = [];
                let lastType: wasm.ValueType | null = null;
                for (const local of func.locals) {
                    if (local === lastType) {
                        localsPacked[localsPacked.length - 1][1]++;
                    } else {
                        localsPacked.push([local, 1]);
                        lastType = local;
                    }
                }

                write.vector(v, localsPacked, (v, [type, count]) => {
                    write.vu32(v, count);
                    write.i7(v, type);
                });
                writeInstructionExpression(v, func.body);
                write.bytes(codesV, v.bytes.subarray(0, v.at));
            });
            raw.code = codesV.bytes.subarray(0, codesV.at);
        } else {
            raw.function = null;
            raw.code = null;
        }
    
        kit.raw().compile();
    }    
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
        params: read.vector<wasm.ValueType>(v, read.i7),
        results: read.vector<wasm.ValueType>(v, read.i7)
    }
}

const writeSignature = (v: BytesView, sig: wasm.FuncSignature): void => {
    write.u8(v, 0x60);
    write.vector(v, sig.params, write.i7);
    write.vector(v, sig.results, write.i7);
}



const readTable = (v: BytesView): wasm.TableType => {
    return {
        refType: read.i7(v),
        limits: readLimits(v)
    }
}

const writeTable = (v: BytesView, table: wasm.TableType): void => {
    write.i7(v, table.refType);
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
    const valueType = read.i7(v);
    const flags = read.vu32(v);

    return {
        valueType,
        mutable: (flags & 1) === 1
    }
}

const writeGlobalType = (v: BytesView, type: wasm.GlobalType): void => {
    write.i7(v, type.valueType);
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
            segment.type = read.i7(v);
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
            segment.type = read.i7(v);
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
            write.i7(v, segment.type);
        } else {
            write.u8(v, 0);
        }
    } else if (segment.mode === wasm.ElementSegmentMode.StandardActive) {
        writeInstructionExpression(v, segment.offset);
    } else if (segment.mode === wasm.ElementSegmentMode.ActiveWithMore) {
        write.vu32(v, segment.tableIndex);
        writeInstructionExpression(v, segment.offset);

        if (notFuncRef) {
            write.i7(v, segment.type);
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
