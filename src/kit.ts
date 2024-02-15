import { BinaryLike, getBytesFromBinary } from "./lib/binary";
import { Module, ModuleCtor } from "./module";
import { RawModule } from "./modules/raw";
import { WasmModule } from "./modules/wasm";

interface MapByModuleCtor extends Map<ModuleCtor, Module> {
    get<T extends Module>(key: ModuleCtor<T>): T;
    set<T extends Module>(key: ModuleCtor<T>, value: T): this;
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

    public as<T extends Module>(Repr: ModuleCtor<T>, options?: any): T {
        if (this._moduleReprs.has(Repr)) {
            return this._moduleReprs.get(Repr);
        }

        const mod = new Repr(this, options);

        this._moduleReprs.set(Repr, mod);

        return mod;
    }

    public raw(): RawModule { return this.as(RawModule); }
    public wasm(): WasmModule { return this.as(WasmModule); }
}    
