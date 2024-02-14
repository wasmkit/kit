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
}
