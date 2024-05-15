import { AbstractFormat } from "../abstract";
import { Format as WasmFormat } from "../wasm/";

import * as wasm from "../wasm/types";
import * as hl_wasm from "./types";

import { getInstructionExpression } from "./instruction";

export class Format extends AbstractFormat {
    /**
     * Contains all tables known to the module
     * - This includes imported as well
     */
    public tables: hl_wasm.Table[] = [];

    /**
     * Contains all memories known to the module
     * - This includes imported as well
     */
    public memories: hl_wasm.Memory[] = [];

    /**
     * Contains all globals known to the module
     * - This includes imported as well
     */
    public globals: hl_wasm.Global[] = [];

    /**
     * Contains all globals known to the module
     * - Imported functions have their body set to null
     */
    public functions: hl_wasm.Function[] = [];

    /**
     * Contains all elements segments known to the module
     * - Active segments are listed here as well as their table
     */
    public elements: hl_wasm.ElementSegment[] = [];

    /**
     * Contains all data segments known to the module
     * - Active segments are listed here as well as their memory
     */
    public datas: hl_wasm.DataSegment[] = [];

    /**
     * Contains the start function index, if existant
     */
    public start?: number;



    public getFunction(index: number): hl_wasm.Function {
        return this.functions[index];
    }

    public appendLocal(
        scope: hl_wasm.UnimportedFunction,
        local: hl_wasm.LocalVariable
    ): void {
        scope.locals.push(local);
    }
}


const getElementSegmentInitialization = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmSeg: wasm.ElementSegment
): number[] | hl_wasm.Instruction[] => {
    if (!Array.isArray(wasmSeg.initialization[0])) {
        return wasmSeg.initialization as number[];
    }

    const initialization = [] as hl_wasm.Instruction[];
    for (const expr of wasmSeg.initialization) {
        initialization.push(
            getInstructionExpression(fmt, wasmFmt, null, expr as wasm.Instruction[])
        );
    }

    return initialization;
}

const digestElementSegment = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmSeg: wasm.ElementSegment
): void => {
    // 
    // Only possible variation in Element Segments is
    // whether they're active or not. Active segments
    // refer to a table and are applied on-startup of
    // the wasm.
    // 

    const initialization = getElementSegmentInitialization(
        fmt,
        wasmFmt,
        wasmSeg
    );

    if (
        wasmSeg.mode !== wasm.ElementSegmentMode.ActiveWithMore &&
        wasmSeg.mode !== wasm.ElementSegmentMode.StandardActive
    ) {
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
        table: table,
        offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
        initialization
    };

    (table.activeSegments as hl_wasm.ElementSegment[]).push(seg);
    fmt.elements.push(seg);
}

const digestDataSegment = (
    fmt: Format,
    wasmFmt: WasmFormat,
    wasmSeg: wasm.DataSegment
): void => {
    // 
    // Same as Element Segments, a Data Segment's type
    // only differs in whether they or active or not.
    // 

    if (wasmSeg.mode === wasm.DataSegmentMode.Passive) {
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
        mode: wasm.DataSegmentMode.Active,
        memory: memory,
        offset: getInstructionExpression(fmt, wasmFmt, null, wasmSeg.offset),
        initialization: wasmSeg.initialization
    } as hl_wasm.ActiveDataSegment;

    // To rid us of the readonly
    (memory.activeSegments as hl_wasm.ActiveDataSegment[]).push(seg);
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
    // Apply exported = true to the corresponding
    // function, global, table or memory.
    switch (wasmExport.type) {
        case wasm.ExternalType.Function: {
            const { functionIndex } = wasmExport.description;

            const func = fmt.functions[functionIndex];

            // TypeScript
            if (func.exported = true) {
                func.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Global: {
            const { globalIndex } = wasmExport.description;

            const global = fmt.globals[globalIndex];

            // TypeScript
            if (global.exported = true) {
                global.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Table: {
            const { tableIndex } = wasmExport.description;

            const table = fmt.tables[tableIndex];

            // TypeScript
            if (table.exported = true) {
                table.exportName = wasmExport.name;
            }
        } break;
        case wasm.ExternalType.Memory: {
            const { memoryIndex } = wasmExport.description;

            const mem = fmt.memories[memoryIndex];

            // TypeScript
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
    // 
    // For imports we must create a new entry for
    // each import, to add to the corresponding list
    // of functions, globals, tables or memories.
    // 
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
    // 
    // Construct the new function, but keep the body null.
    // we need to build the functions first before parsing
    // the bodies, as the bodies can reference other
    // functions (in Calls for example)
    // 
    const signature = wasmFmt.signatures[wasmFunction.signatureIndex];

    const paramLocals = signature.params.map<hl_wasm.LocalVariable>((valueType, index) => ({
        index,
        valueType,
        mutable: true,
        isGlobal: false,
        isParameter: true
    }));

    const nonParamLocals = wasmFunction.locals.map<hl_wasm.LocalVariable>((valueType, index) => ({
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
        body: null as any as hl_wasm.Instruction
    } as hl_wasm.Function;

    fmt.functions.push(func);
}

const digestInstructions = (
    fmt: Format,
    wasmFmt: WasmFormat,
    hlFunction: hl_wasm.Function,
    wasmInstructions: wasm.Instruction[]
): void => {
    // 
    // After digestFunction is called on every wasmFmt
    // function we can now parse the instructions.
    // 

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

    const preWasmFunctionCount = fmt.functions.length;

    for (const wasmFunction of wasmFmt.functions) {
        digestFunction(fmt, wasmFmt, wasmFunction);
    }

    for (let i = 0; i < wasmFmt.functions.length; ++i) {
        const wasmFunction = wasmFmt.functions[i];
        const hlFunction = fmt.functions[preWasmFunctionCount + i];

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
