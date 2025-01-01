import * as logging from "../lib/logging";
import { Kit } from "../kit";

export type FormatCtor<
    T extends AbstractFormat = AbstractFormat
> = new (kit: Kit, options?: any) => T;

export const kInvalidateInternal = Symbol("kInvalidate");
export const kIsInvalidInternal = Symbol("kIsInvalidated");

export class AbstractFormat {
    public kit: Kit;
    public options: any;

    public constructor(kit: Kit, options?: any) {
        this.kit = kit;
        this.options = options;
    }

    public extract(): void {
        throw logging.fatal("Extract not implemented");
    }

    public compile(): void {
        throw logging.fatal("Extract not implemented");
    }

    public print(): string {
        throw logging.fatal("Extract not implemented");
    }




    // Used by kit.recompile and kit.resetBytes
    private [kIsInvalidInternal]: boolean = false;
    private [kInvalidateInternal](): void {
        this[kIsInvalidInternal] = true;

        for (const key in this) {
            try {
                delete (this as any)[key];

                Object.defineProperty(this, key, {
                    get() {
                        throw logging.fatal(`Accessing invalid module's \`${key}\`. ` 
                            + `Kit has been modified since last access. `
                            + `Please discard this reference and re-extract.`);
                    },
                    set() {
                        throw logging.fatal(`Modifying invalid module's \`${key}\`. `
                            + `Kit has been modified since last access. `
                            + `Please discard this reference and re-extract.`);
                    },
                    configurable: true
                });
            } catch {
                logging.warn("Failed to invalidate property " + key);
            }
        }
    }
}