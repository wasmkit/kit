import { utf8Encode } from "./utf8";

export type BinaryLike = { buffer: ArrayBuffer } | Blob | string | number[];

export const getBytesFromBinary = async (binary: BinaryLike): Promise<Uint8Array> => {
    if (binary instanceof Uint8Array) return binary;

    /** @ts-ignore */
    const buffer = binary["buffer"];
    if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }

    if (buffer instanceof Blob) {
        return new Uint8Array(await buffer.arrayBuffer());
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
