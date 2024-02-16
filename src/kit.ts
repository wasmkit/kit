import { BinaryLike, getBytesFromBinary } from "./lib/binary";

import { raw } from "./formats/raw";
import { wasm } from "./formats/wasm";
import { AbstractFormat, FormatCtor } from "./formats/abstract";

interface MapByFormatCtor extends Map<FormatCtor, AbstractFormat> {
    get<T extends AbstractFormat>(key: FormatCtor<T>): T;
    set<T extends AbstractFormat>(key: FormatCtor<T>, value: T): this;
}

export class Kit {
    public static async fromBinary(binary: BinaryLike): Promise<Kit> {
        return Kit.fromBytes(await getBytesFromBinary(binary));
    }

    public static fromBytes(bytes: Uint8Array): Kit {
        return new Kit(bytes);
    }

    public bytes: Uint8Array;
    private _moduleReprs: MapByFormatCtor;
    
    private constructor(bytes: Uint8Array) {
        this.bytes = new Uint8Array(bytes);
        this._moduleReprs = new Map();
    }

    public as<T extends AbstractFormat>(Repr: FormatCtor<T>, options?: any): T {
        if (this._moduleReprs.has(Repr)) {
            return this._moduleReprs.get(Repr);
        }

        const mod = new Repr(this, options);

        this._moduleReprs.set(Repr, mod);

        return mod;
    }

    public raw(): raw.Format { return this.as(raw.Format); }
    public wasm(): wasm.Format { return this.as(wasm.Format); }
}    
