import { Kit } from "../../kit";
import { BytesView } from "../../lib/binary";
import { read } from "../../lib/reader";
import { AbstractFormat } from "../abstract";


enum SectionId {
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

type SectionName = Uncapitalize<Exclude<keyof typeof SectionId, "kMax">>;
type KnownSectionName = Exclude<SectionName, "custom">;
type SectionRecords = Record<KnownSectionName, Uint8Array | null> & { custom: Map<string, Uint8Array> };



const FILE_MAGIC = 0x6D736100;
const FILE_VERSION = 0x1;
interface Metadata {
    magic: typeof FILE_MAGIC;
    version: typeof FILE_VERSION;
}



export namespace raw {

export class Format extends AbstractFormat implements SectionRecords {
    public readonly metadata: Metadata =  {
        magic: FILE_MAGIC,
        version: FILE_VERSION
    };

    public custom: Map<string, Uint8Array> = new Map();
    public signature: Uint8Array | null = null;
    public import: Uint8Array | null = null;
    public function: Uint8Array | null = null;
    public table: Uint8Array | null = null;
    public memory: Uint8Array | null = null;
    public global: Uint8Array | null = null;
    public export: Uint8Array | null = null;
    public start: Uint8Array | null = null;
    public element: Uint8Array | null = null;
    public code: Uint8Array | null = null;
    public data: Uint8Array | null = null;
    public dataCount: Uint8Array | null = null;
}

export const extract = (fmt: Format): void => {
    const { kit } = fmt;
    const v = new BytesView(kit.bytes);

    console.assert(read.u32(v) === FILE_MAGIC, "Invalid file magic");
    console.assert(read.u32(v) === FILE_VERSION, "Invalid file version");

    while (read.isEOF(v) === false) {
        const id = read.u8(v);

        const size = read.vu32(v);

        console.assert(id < SectionId.kMax, "Invalid section id", v.at, id);

        if (id !== 0) {
            const sectionName = SectionId[id].toLowerCase() as KnownSectionName;
            console.assert(fmt[sectionName] === null, "Duplicate section id", v.at, id);

            fmt[sectionName] = read.bytes(v, size);

            continue;
        }

        const end = v.at + size;
        const name = read.string(v);

        // Don't complain about duplicates, but we can warn
        if (fmt.custom.has(name)) {
            console.warn("Duplicate custom section. Disgarding stale data");
            console.warn(fmt.custom.get(name)!);
        }

        fmt.custom.set(name, read.bytes(v, end - v.at));
    }
}

}
