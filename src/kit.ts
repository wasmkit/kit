import { Module, ModuleCtor } from "./module";
import { RawModule } from "./modules/raw";
import { WasmModule } from "./modules/wasm";

interface MapByModuleCtor extends Map<ModuleCtor, Module> {
    get<T extends Module>(key: ModuleCtor<T>): T;
    set<T extends Module>(key: ModuleCtor<T>, value: T): this;
}  

export class Kit {
    public static fromBinary(buffer: Uint8Array): Kit {
        return new Kit(buffer);
    }

    private buffer: Uint8Array;
    private moduleReprs: MapByModuleCtor;
    
    private constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.moduleReprs = new Map();
    }

    public as<T extends Module>(repr: ModuleCtor<T>, options?: any): T {
        if (this.moduleReprs.has(repr)) {
            return this.moduleReprs.get(repr);
        }

        const mod = new repr(this, options);

        this.moduleReprs.set(repr, mod);

        return mod;
    }

    public raw(): RawModule { return this.as(RawModule); }
    public wasm(): WasmModule { return this.as(WasmModule); }
}    
