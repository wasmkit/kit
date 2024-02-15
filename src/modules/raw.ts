import { Kit } from "../kit";
import { ByteReader } from "../lib/reader";
import { Module } from "../module";

export enum RawSectionIds {
    custom =        0,
    signature =     1,
    import =        2,
    function =      3,
    table =         4,
    memory =        5,
    global =        6,
    export =        7,
    start =         8,
    element =       9,
    code =          10,
    data =          11,
    dataCount =     12,


    kMax
}

export type RawSectionNames = Exclude<keyof typeof RawSectionIds, "kMax">;

type RawKnownSectionNames = Exclude<RawSectionNames, "custom">;

type RawSections = Record<
    RawKnownSectionNames, Uint8Array | null
> & { custom: Map<string, Uint8Array> }

const FILE_MAGIC = 0x6D736100;
const FILE_VERSION = 0x1;

interface RawMetadata {
    magic: typeof FILE_MAGIC;
    version: typeof FILE_VERSION;
}

export class RawModule extends Module {
    public readonly sections: RawSections;
    public readonly metadata: RawMetadata;

    private _extract(): void {
        const r = new ByteReader(this.kit.bytes);

        this.assert(r.u32() === FILE_MAGIC, "Invalid file magic");
        this.assert(r.u32() === FILE_VERSION, "Invalid file version");

        while (r.isEOF() === false) {
            const id = r.u8();
            const size = r.vu32();

            console.log(id, size);

            this.assert(id < RawSectionIds.kMax, "Invalid section id", r.at, id);

            if (id !== 0) {
                const name = RawSectionIds[id] as RawKnownSectionNames;

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

    public constructor(kit: Kit) {
        super(kit);
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

        this._extract();
    }
}