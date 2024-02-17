import { utf8Encode } from "./utf8";

export type BinaryLike = { buffer: ArrayBuffer } | Blob | string | number[];

export const getBytesFromBinary = async (binary: BinaryLike): Promise<Uint8Array> => {
    if (!binary) return new Uint8Array(0);
    if (binary instanceof Uint8Array) return binary;

    const buffer = (binary as Uint8Array)["buffer"];
    if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }

    if (typeof (binary as Blob)["arrayBuffer"] === "function") {
        return new Uint8Array(await (binary as Blob).arrayBuffer());
    }

    if (typeof binary === "string") {
        return getBytesFromBinary(utf8Encode(binary));
    }

    return Uint8Array.from(binary as number[]);
}


export class BytesView {
    public bytes: Uint8Array;
    public at: number;

    public constructor(bytes: Uint8Array, at: number = 0) {
        this.bytes = bytes;
        this.at = at;
    }
}
