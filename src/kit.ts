import fmt from "./formats/"
import { AbstractFormat, kInvalidateInternal, kIsInvalidInternal } from "./formats/abstract";
import * as raw from "./formats/raw";
import * as wasm from "./formats/wasm";

import { BinaryLike, getBytesFromBinary } from "./lib/binary";
import * as logging from "./lib/logging";

interface MapByFormatDeclaration<
    FF = typeof AbstractFormat
> extends Map<FF, AbstractFormat> {
    get<T extends AbstractFormat>(key: FF): T;
    set<T extends AbstractFormat>(key: FF, value: T): this;
}

export class Kit {
    public static async fromBinary(binary: BinaryLike): Promise<Kit> {
        return Kit.fromBytes(await getBytesFromBinary(binary));
    }

    public static fromBytes(bytes: Uint8Array): Kit {
        return new Kit(bytes);
    }

    public readonly bytes: Uint8Array;
    private _formatCache: MapByFormatDeclaration;
    
    private constructor(bytes: Uint8Array) {
        this._formatCache = new Map();
        this.bytes = new Uint8Array(bytes);
    }

    public loadBytes(bytes: Uint8Array): void {
        // Get rid of the readonly
        (this.bytes as Uint8Array) = new Uint8Array(bytes);

        for (const format of this._formatCache.values()) {
            format[kInvalidateInternal]();
        }

        this._formatCache.clear();
    }
    
    public as<
        FF extends typeof AbstractFormat
    >(Format: FF, options?: any): InstanceType<FF> {
        if (this._formatCache.has(Format)) {
            const f = this._formatCache.get(Format) as InstanceType<FF>;

            // Guaranteed to never be invalid as of now,
            // but for later on, we can support this
            if (f[kIsInvalidInternal]) {
                this._formatCache.delete(Format);
            } else {
                return f;
            }
        }


        const mod = new Format(this, options) as InstanceType<FF>;

        mod.extract();

        this._formatCache.set(Format, mod);

        return mod;
    }

    public raw(): raw.RawFormat { return this.as(fmt.raw); }
    public wasm(): wasm.WasmFormat { return this.as(fmt.wasm); }
}    
