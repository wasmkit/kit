import { HighlevelFormat } from "./highlevel_wasm";
import { LLVMFormat } from "./llvm";
import { RawFormat } from "./raw";
import { WasmFormat } from "./wasm";


export default {
    raw: RawFormat,
    wasm: WasmFormat,
    highlevel_wasm: HighlevelFormat,
    llvm: LLVMFormat
};