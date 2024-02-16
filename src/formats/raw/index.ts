import { Kit } from "../../kit";


export enum SectionId {
    Custom =        0,
    Signature =     1,
    Import =        2,
    Function =      3,
    Table =         4,
    Memory =        5,
    Global =        6,
    Export =        7,
    Start =         8,
    Element =       9,
    Code =          10,
    Data =          11,
    DataCount =     12,


    kMax
}

export type SectionName = Uncapitalize<Exclude<keyof typeof SectionId, "kMax">>;

export type KnownSectionName = Exclude<SectionName, "custom">;

type Sections = Record<KnownSectionName, Uint8Array | null> & { custom: Map<string, Uint8Array> };

const FILE_MAGIC = 0x6D736100;
const FILE_VERSION = 0x1;

interface Metadata {
    magic: typeof FILE_MAGIC;
    version: typeof FILE_VERSION;
}

export class RawFormat {
    public readonly sections: Sections;
    public readonly metadata: Metadata;

    public constructor() {
        this.metadata = {
            magic: FILE_MAGIC,
            version: FILE_VERSION
        }

        this.sections = {
            custom: new Map(),
            signature: null,
            import: null,
            function: null,
            table: null,
            memory: null,
            global: null,
            export: null,
            start: null,
            element: null,
            code: null,
            data: null,
            dataCount: null,
        }
    }

    private _compile(): Uint8Array {
        
    }

    private _extract(): void {
        const r = new ByteReader(this.kit.bytes);

        this.assert(r.u32() === FILE_MAGIC, "Invalid file magic");
        this.assert(r.u32() === FILE_VERSION, "Invalid file version");

        while (r.isEOF() === false) {
            const id = r.u8();
            const size = r.vu32();

            this.assert(id < SectionId.kMax, "Invalid section id", r.at, id);

            if (id !== 0) {
                const name = SectionId[id] as KnownSectionName;

                this.assert(this.sections[name] === null, "Duplicate section id", r.at, id);

                this.sections[name] = r.bytes(size);

                continue;
            }

            const end = r.at + size;
            const name = r.string();

            // Don't complain about duplicates, but we can warn
            if (this.sections.custom.has(name)) {
                console.warn("Duplicate custom section. Disgarding stale data");
                console.warn(this.sections.custom.get(name)!);
            }

            this.sections.custom.set(name, r.bytes(end - r.at));
        }
    }


}

const rawModuleFormat = {

}