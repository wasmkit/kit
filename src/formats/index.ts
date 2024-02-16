import { raw } from "./raw";

import { AbstractFormat, FormatCtor } from "./abstract";
import { wasm } from "./wasm";

export interface FormatDeclaration<F extends AbstractFormat> {
    Format: FormatCtor<F>;
    extract?(fmt: F): void;
    compile?(fmt: F): void;
    print?(fmt: F): any;
}

export default {
    raw: raw as FormatDeclaration<raw.Format>,
    wasm: wasm as FormatDeclaration<wasm.Format>
};