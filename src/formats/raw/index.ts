import { AbstractFormat } from "../abstract";
import { BytesView } from "../../lib/binary";
import * as read from "../../lib/reader";
import * as write from "../../lib/writer";
import * as logging from "../../lib/logging";

const FILE_MAGIC = 0x6D736100;
const FILE_VERSION = 0x1;

export enum SectionId {
    Custom =        0,
    // alias for Type
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

interface Metadata {
    magic: typeof FILE_MAGIC;
    version: typeof FILE_VERSION;
}

export class RawFormat extends AbstractFormat implements SectionRecords {
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

    public compile(): void {
        const { kit } = this;

        const v = new BytesView();

        write.u32(v, FILE_MAGIC);
        write.u32(v, FILE_VERSION);

        if (this.signature) {
            write.u8(v, SectionId.Signature);
            write.bytes(v, this.signature);
        }

        if (this.import) {
            write.u8(v, SectionId.Import);
            write.bytes(v, this.import);
        }

        if (this.function) {
            write.u8(v, SectionId.Function);
            write.bytes(v, this.function);
        }

        if (this.table) {
            write.u8(v, SectionId.Table);
            write.bytes(v, this.table);
        }

        if (this.memory) {
            write.u8(v, SectionId.Memory);
            write.bytes(v, this.memory);
        }

        if (this.global) {
            write.u8(v, SectionId.Global);
            write.bytes(v, this.global);
        }

        if (this.export) {
            write.u8(v, SectionId.Export);
            write.bytes(v, this.export);
        }

        if (this.start) {
            write.u8(v, SectionId.Start);
            write.bytes(v, this.start);
        }

        if (this.element) {
            write.u8(v, SectionId.Element);
            write.bytes(v, this.element);
        }

        if (this.code) {
            write.u8(v, SectionId.Code);
            write.bytes(v, this.code);
        }

        if (this.data) {
            write.u8(v, SectionId.Data);
            write.bytes(v, this.data);
        }

        if (this.dataCount) {
            write.u8(v, SectionId.DataCount);
            write.bytes(v, this.dataCount);
        }

        for (const [name, data] of this.custom) {
            write.u8(v, SectionId.Custom);

            const v2 = new BytesView();

            write.string(v2, name);
            write.bytes(v2, data, false);

            write.bytes(v, v2.bytes.subarray(0, v2.at));
        }

        kit.loadBytes(v.bytes.subarray(0, v.at)); 
    }

    public extract(): void {
        const { kit } = this;
        const v = new BytesView(kit.bytes);

        logging.assert(read.u32(v) === FILE_MAGIC, "Invalid file magic");
        logging.assert(read.u32(v) === FILE_VERSION, "Invalid file version");

        while (read.isEOF(v) === false) {
            const id = read.u8(v);

            const size = read.vu32(v);

            logging.assert(id < SectionId.kMax, "Invalid section id");

            if (id !== 0) {
                const sectionName = SectionId[id].toLowerCase() as KnownSectionName;
                logging.assert(this[sectionName] === null, "Duplicate section id");

                this[sectionName] = read.bytes(v, size);

                continue;
            }

            const end = v.at + size;
            const name = read.string(v);

            // Don't complain about duplicates, but we can warn
            if (this.custom.has(name)) {
                console.warn("Duplicate custom section. Disgarding stale data");
                console.warn(this.custom.get(name)!);
            }

            this.custom.set(name, read.bytes(v, end - v.at));
        }
    }
}