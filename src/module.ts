import { Kit } from "./kit";

export type ModuleCtor<
    T extends Module = Module
> = new (kit: Kit, options?: any) => T;

export abstract class Module {
    protected kit: Kit;
    protected options?: any;

    protected constructor(kit: Kit, options?: any) {
        this.kit = kit;
        this.options = options;
    }

    protected assert(statement: boolean, message: string, ...content: any[]): asserts statement is true {
        if (statement === false) this.throw(message, ...content);
    }

    protected throw(message: string, ...content: any[]){
        console.warn(content);
        throw new ModuleError("(" + this["constructor"].name + "): " + message);
    }
}

export class ModuleError extends SyntaxError {}