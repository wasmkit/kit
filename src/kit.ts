import { BinaryLike, getBytesFromBinary } from "./lib/binary";

import fmt, { FormatDeclaration } from "./formats/"
import { raw } from "./formats/raw";
import { wasm } from "./formats/wasm";
import { AbstractFormat, FormatCtor } from "./formats/abstract";

interface MapByFormatDeclaration<
    D = FormatDeclaration<AbstractFormat>
> extends Map<D, AbstractFormat> {
    get<T extends AbstractFormat>(key: D): T;
    set<T extends AbstractFormat>(key: D, value: T): this;
}

export class Kit {
    public static async fromBinary(binary: BinaryLike): Promise<Kit> {
        return Kit.fromBytes(await getBytesFromBinary(binary));
    }

    public static fromBytes(bytes: Uint8Array): Kit {
        return new Kit(bytes);
    }

    public bytes: Uint8Array;
    private _moduleReprs: MapByFormatDeclaration;
    
    private constructor(bytes: Uint8Array) {
        this.bytes = new Uint8Array(bytes);
        this._moduleReprs = new Map();
    }

    public as<
        T extends FormatDeclaration<F>,
        F extends AbstractFormat
    >(fmtDeclare: T, options?: any): F {
        const Format = fmtDeclare.Format;

        if (this._moduleReprs.has(fmtDeclare)) {
            return this._moduleReprs.get(fmtDeclare);
        }

        const mod = new Format(this, options);

        // TODO: Assert it supports extraction
        fmtDeclare.extract!(mod);

        this._moduleReprs.set(fmtDeclare, mod);

        return mod;
    }

    public raw(): raw.Format { return this.as(fmt.raw); }
    public wasm(): wasm.Format { return this.as(fmt.wasm); }
}    
