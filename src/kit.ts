import fmt, { FormatDeclaration } from "./formats/"
import { AbstractFormat } from "./formats/abstract";
import * as raw from "./formats/raw";
import * as wasm from "./formats/wasm";

import { BinaryLike, getBytesFromBinary } from "./lib/binary";
import * as logging from "./lib/logging";

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
    private _formatCache: MapByFormatDeclaration;
    
    private constructor(bytes: Uint8Array) {
        this.bytes = new Uint8Array(bytes);
        this._formatCache = new Map();
    }

    public as<
        T extends FormatDeclaration<F>,
        F extends AbstractFormat
    >(fmtDeclare: T, options?: any): F {
        const Format = fmtDeclare.Format;

        if (this._formatCache.has(fmtDeclare)) {
            return this._formatCache.get(fmtDeclare);
        }

        logging.assert(typeof fmtDeclare.extract === "function", "Provided format is missing `extract` implementation");

        const mod = new Format(this, options);

        fmtDeclare.extract!(mod);

        this._formatCache.set(fmtDeclare, mod);

        return mod;
    }

    public raw(): raw.Format { return this.as(fmt.raw); }
    public wasm(): wasm.Format { return this.as(fmt.wasm); }
}    
