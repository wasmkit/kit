import { AbstractFormat } from "../abstract";
import * as wasm from "../wasm/types";
import { Format as WasmFormat } from "../wasm/";
import * as hl_wasm from "./types";
import { getInstructionExpression } from "./instruction";

export class Format extends AbstractFormat {
    public tables: hl_wasm.Table[] = [];
    public memories: hl_wasm.Memory[] = [];
    public globals: hl_wasm.Global[] = [];
    public functions: hl_wasm.Function[] = [];

    public elements: hl_wasm.ElementSegment[] = [];
    public datas: hl_wasm.DataSegment[] = [];

    public start?: number;
}

const digestElementSegment = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmSeg: wasm.ElementSegment
): void => {
    let initialization: number[] | hl_wasm.InstructionExpression[]
    if (Array.isArray(wasmSeg.initialization[0])) {
        initialization = [] as hl_wasm.InstructionExpression[];
        for (const expr of wasmSeg.initialization) {
            initialization.push(
                getInstructionExpression(fmt, wasmFmt, null, expr as wasm.InstructionExpression)
            );
        }
    } else {
        initialization = wasmSeg.initialization as number[];
    }

    let seg: hl_wasm.ElementSegment;

    if (wasmSeg.mode === wasm.ElementSegmentMode.Active) {
        const table = fmt.tables[wasmSeg.tableIndex];

        seg = {
            index: fmt.elements.length,
            mode: wasm.ElementSegmentMode.Active,
            type: wasmSeg.type,
            table: table,
            offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
            initialization
        };

        (table.activeSegments as hl_wasm.ElementSegment[]).push(seg);
    } else {
        seg = {
            index: fmt.elements.length,
            mode: wasmSeg.mode,
            type: wasmSeg.type,
            initialization
        }
    }

    fmt.elements.push(seg);
}

const digestDataSegment = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmSeg: wasm.DataSegment
): void => {
    let seg: hl_wasm.DataSegment;
    if (wasmSeg.mode === wasm.DataSegmentMode.Active) {
        const memory = fmt.memories[wasmSeg.memoryIndex];

        seg = {
            index: fmt.datas.length,
            mode: wasm.DataSegmentMode.Active,
            memory: memory,
            offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
            initialization: wasmSeg.initialization
        };
        // To rid us of the readonly
        (memory.activeSegments as typeof seg[]).push(seg);
    } else {
        seg = {
            index: fmt.datas.length,
            mode: wasmSeg.mode,
            initialization: wasmSeg.initialization
        }
    }

    fmt.datas.push(seg);
}

const digestGlobal = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmGlobal: wasm.Global
): void => {
    fmt.globals.push({
        index: fmt.globals.length,
        exported: false,
        imported: false,
        mutable: wasmGlobal.type.mutable,
        valueType: wasmGlobal.type.valueType,
        isGlobal: true,
        initialization: getInstructionExpression(fmt, wasmFmt, null, wasmGlobal.initialization)
    });
}

const digestMemory = (
    fmt: Format,
    _wasmFmt: WasmFormat,
    memory: wasm.MemoryType
): void => {
    fmt.memories.push({
        index: fmt.memories.length,
        exported: false,
        imported: false,
        size: memory.limits,
        activeSegments: []
    });
}

const digestTable = (
    fmt: Format,
    _wasmFmt: WasmFormat,
    wasmTable: wasm.TableType,
): void => {
    fmt.tables.push({
        index: fmt.tables.length,
        exported: false,
        imported: false,
        refType: wasmTable.refType,
        size: wasmTable.limits,
        activeSegments: []
    });
}

const digestExport = (
    fmt: Format,
    _wasmFmt: WasmFormat,
    wasmExport: wasm.Export
): void => {
    switch (wasmExport.type) {
        case wasm.ExternalType.Function: {
            const { functionIndex } = wasmExport.description;

            const func = fmt.functions[functionIndex];

            if (func.exported = true) {
                func.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Global: {
            const { globalIndex } = wasmExport.description;

            const global = fmt.globals[globalIndex];

            if (global.exported = true) {
                global.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Table: {
            const { tableIndex } = wasmExport.description;

            const table = fmt.tables[tableIndex];

            if (table.exported = true) {
                table.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Memory: {
            const { memoryIndex } = wasmExport.description;

            const mem = fmt.memories[memoryIndex];

            if (mem.exported = true) {
                mem.exportName = wasmExport.name;
            }
        } break;
    }
}

const digestImport = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmImport: wasm.Import
): void => {
    const importData = {
        exported: false as false,
        imported: true as true,
        importModule: wasmImport.module,
        importName: wasmImport.name,
    }

    switch (wasmImport.type) {
        case wasm.ExternalType.Function: {
            fmt.functions.push({
                ...importData,
                index: fmt.functions.length,
                signature: wasmFmt.signatures[wasmImport.description.signatureIndex]
            });
        } break;
        case wasm.ExternalType.Global: {
            fmt.globals.push({
                ...importData,
                index: fmt.globals.length,
                mutable: wasmImport.description.globalType.mutable,
                valueType: wasmImport.description.globalType.valueType,
                isGlobal: true
            });
        } break;
        case wasm.ExternalType.Table: {
            fmt.tables.push({
                ...importData,
                index: fmt.tables.length,
                refType: wasmImport.description.tableType.refType,
                size: wasmImport.description.tableType.limits,
                activeSegments: []
            });
        } break;
        case wasm.ExternalType.Memory: {
            fmt.memories.push({
                ...importData,
                index: fmt.memories.length,
                size: wasmImport.description.memoryType.limits,
                activeSegments: []
            });
        } break;
    }
}

const digestFunction = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmFunction: wasm.Function
) => {
    // Construct the new function, but keep the body null
    // we need to build the functions first before
    // parsing the bodies, as the bodies can rely on previous
    // function's data.
    const func = {
        index: fmt.functions.length,
        imported: false,
        exported: false,
        signature: wasmFmt.signatures[wasmFunction.signatureIndex],
        locals: wasmFunction.locals.map((valueType, index) => ({
            index,
            valueType,
            mutable: true,
            isGlobal: false
        })),
        body: null as any as hl_wasm.Instruction
    } as hl_wasm.Function;

    fmt.functions.push(func);
}

const digestInstructions = (
    fmt: Format,
    wasmFmt: WasmFormat,
    hlFunction: hl_wasm.Function,
    wasmInstructions: wasm.InstructionExpression
): void => {
    if (hlFunction.imported) return;

    hlFunction.body = getInstructionExpression(
        fmt,
        wasmFmt,
        hlFunction,
        wasmInstructions
    );
}

export const extract = (fmt: Format): void => {
    const { kit } = fmt;

    const wasmFmt = kit.wasm();

    fmt.datas = [];
    fmt.elements = [];
    fmt.functions = [];
    fmt.globals = [];
    fmt.memories = [];
    fmt.tables = [];
    fmt.start = undefined;


    for (const wasmImport of wasmFmt.imports) {
        digestImport(fmt, wasmFmt, wasmImport);
    }

    for (const wasmMemory of wasmFmt.memories) {
        digestMemory(fmt, wasmFmt, wasmMemory);
    }

    for (const wasmTable of wasmFmt.tables) {
        digestTable(fmt, wasmFmt, wasmTable);
    }

    for (const wasmGlobal of wasmFmt.globals) {
        digestGlobal(fmt, wasmFmt, wasmGlobal);
    }

    for (const wasmFunction of wasmFmt.functions) {
        digestFunction(fmt, wasmFmt, wasmFunction);
    }

    for (let i = 0; i < wasmFmt.functions.length; ++i) {
        const wasmFunction = wasmFmt.functions[i];
        const hlFunction = fmt.functions[i];

        digestInstructions(fmt, wasmFmt, hlFunction, wasmFunction.body);
    }

    for (const wasmExport of wasmFmt.exports) {
        digestExport(fmt, wasmFmt, wasmExport);
    }
    
    for (const wasmSeg of wasmFmt.elements) {
        digestElementSegment(fmt, wasmFmt, wasmSeg);
    }

    for (const wasmSeg of wasmFmt.datas) {
        digestDataSegment(fmt, wasmFmt, wasmSeg);
    }
}
