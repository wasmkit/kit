
import { BytesView } from "./binary";
import { utf8Decode } from "./utf8";

const convo = new ArrayBuffer(8);
const c_u8 = new Uint8Array(convo);
const c_u32 = new Uint32Array(convo);
const c_f32 = new Float32Array(convo);
const c_f64 = new Float64Array(convo);

export namespace read {

export const u8 = (view: BytesView): number => view.bytes[view.at++];

export const i8 = (view: BytesView): number => {
    return (u8(view) << 24) >> 24;
}

export const u32 = (view: BytesView): number => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 4));

    return c_u32[0];
}

export const vi32 = (view: BytesView): number => {
    let i = 0;
    let out = 0;
    while (true) {
        const byte = view.bytes[view.at++];

        out |= (byte & 0x7F) << i;
        i += 7;

        if ((0x80 & byte) === 0) {
            if (i < 32 && (byte & 0x40) !== 0) {
                return out | (~0 << i);
            }

            return out;
        }
    }
}

export const vu32 = (view: BytesView): number => {
    let i = 0;
    let out = 0;

    while (view.bytes[view.at] & 0x80) {
        out |= (view.bytes[view.at++] & 0x7F) << i;
        i += 7;
    }
    out |= (view.bytes[view.at++] & 0x7F) << i;

    return out >>> 0;
}

export const vi64 = (view: BytesView): bigint => {
    let i = 0n;
    let out = 0n;
    while (true) {
        const byte = view.bytes[view.at++];

        out |= BigInt(byte & 0x7F) << i;
        i += 7n;

        if ((0x80 & byte) === 0) {
            if (i < 128n && (byte & 0x40) !== 0) {
                return out | (~0n << i);
            }

            return out;
        }
    }
}

export const f32 = (view: BytesView): number => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 4));

    return c_f32[0];
}

export const f64 = (view: BytesView): number => {
    c_u8.set(view.bytes.subarray(view.at, view.at += 8));

    return c_f64[0];
}

export const bytes = (view: BytesView, length = vu32(view)): Uint8Array => {
    return view.bytes.subarray(view.at, view.at += length);
}

export const string = (view: BytesView): string => {
    return utf8Decode(bytes(view));
}

export const isEOF = (view: BytesView): boolean => {
    return view.at >= view.bytes.byteLength;
}

}