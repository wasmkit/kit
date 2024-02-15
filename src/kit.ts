import { BinaryLike, getBytesFromBinary } from "./lib/binary";
import { AbstractModule, ModuleCtor } from "./module";

import { raw } from "./formats/raw";
import { wasm } from "./formats/wasm";

interface MapByModuleCtor extends Map<ModuleCtor, AbstractModule> {
    get<T extends AbstractModule>(key: ModuleCtor<T>): T;
    set<T extends AbstractModule>(key: ModuleCtor<T>, value: T): this;
}  

export class Kit {
    public static async fromBinary(binary: BinaryLike): Promise<Kit> {
        return Kit.fromBytes(await getBytesFromBinary(binary));
    }

    public static fromBytes(bytes: Uint8Array): Kit {
        return new Kit(bytes);
    }

    public bytes: Uint8Array;
    private _moduleReprs: MapByModuleCtor;
    
    private constructor(bytes: Uint8Array) {
        this.bytes = new Uint8Array(bytes);
        this._moduleReprs = new Map();
    }

    public as<T extends AbstractModule>(Repr: ModuleCtor<T>, options?: any): T {
        if (this._moduleReprs.has(Repr)) {
            return this._moduleReprs.get(Repr);
        }

        const mod = new Repr(this, options);

        this._moduleReprs.set(Repr, mod);

        return mod;
    }

    public raw(): raw.Module { return this.as(raw.Module); }
    public wasm(): wasm.Module { return this.as(wasm.Module); }
}    
