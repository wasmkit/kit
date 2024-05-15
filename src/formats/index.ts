import { AbstractFormat, FormatCtor } from "./abstract";

import * as raw from "./raw";
import * as wasm from "./wasm";
import * as highlevel_wasm from "./highlevel_wasm";
import * as llvm from "./llvm";
export interface FormatDeclaration<F extends AbstractFormat> {
    Format: FormatCtor<F>;
    extract?(fmt: F): void;
    compile?(fmt: F): void;
    print?(fmt: F): any;
}

export default {
    raw: raw as FormatDeclaration<raw.Format>,
    wasm: wasm as FormatDeclaration<wasm.Format>,
    highlevel_wasm: highlevel_wasm as FormatDeclaration<highlevel_wasm.Format>,
    llvm: llvm as FormatDeclaration<llvm.Format>,
};