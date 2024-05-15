import { Kit } from "../kit";

export type FormatCtor<
    T extends AbstractFormat = AbstractFormat
> = new (kit: Kit, options?: any) => T;

export abstract class AbstractFormat {
    public kit: Kit;
    public options: any;

    public constructor(kit: Kit, options?: any) {
        this.kit = kit;
        this.options = options;
    }
}