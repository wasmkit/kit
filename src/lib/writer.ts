import { BytesView } from "./binary";
import { utf8Encode } from "./utf8";

const convo = new ArrayBuffer(8);
const c_u8 = new Uint8Array(convo);
const c_u32 = new Uint32Array(convo);
const c_f32 = new Float32Array(convo);
const c_f64 = new Float64Array(convo);

const hasSpace = (view: BytesView, amount: number): boolean => {
    return view.at + amount < view.bytes.length;
}

const expand = (
    view: BytesView,
    amount: number = 128
) => {
    const half = view.bytes.length * 0.5;

    if (amount < half) {
        amount = half;
    }

    const newBytes = new Uint8Array(view.at + amount);
    newBytes.set(view.bytes);

    view.bytes = newBytes;
}

export const u8 = (view: BytesView, value: number): void => {
    if (!hasSpace(view, 1)) expand(view);

    view.bytes[view.at++] = value;
}

export const i8 = (view: BytesView, value: number): void => {
    if (!hasSpace(view, 1)) expand(view);

    view.bytes[view.at++] = (value << 25) >>> 25;
}

export const u32 = (view: BytesView, value: number): void => {
    if (!hasSpace(view, 4)) expand(view);

    c_u32[0] = value;
    view.bytes.set(c_u8.subarray(0, 4), view.at);
    view.at += 4;
}

export const vi32 = (view: BytesView, value: number): void => {
    // Should be just to 5, 6 in case
    if (!hasSpace(view, 6)) expand(view);

    while (true) {
        let byte = value & 0x7F;

        value >>= 7;

        // TODO: Optimize
        if ((value === -1 && (byte & 0x40)) || (value === 0 && !(byte & 0x40))) {
            view.bytes[view.at++] = byte;

            break;
        } else {
            view.bytes[view.at++] = byte | 0x80;
        }
    }
}

export const vu32 = (view: BytesView, value: number): void => {
    // Should be just to 5, 6 in case
    if (!hasSpace(view, 6)) expand(view);

    while (true) {
        let byte = value & 0x7F;

        value >>= 7;

        if (value === 0) {
            view.bytes[view.at++] = byte;
            break;
        } else {
            view.bytes[view.at++] = byte | 0x80;
        }
    }
}

export const vi64 = (view: BytesView, value: bigint): void => {
    // Should be just to 9, 10 in case
    if (!hasSpace(view, 10)) expand(view);

    while (true) {
        let byte = Number(value & 0x7Fn);

        value >>= 7n;

        // TODO: Optimize
        if ((value === -1n && (byte & 0x40)) || (value === 0n && !(byte & 0x40))) {
            view.bytes[view.at++] = byte;
            break;
        } else {
            view.bytes[view.at++] = byte | 0x80;
        }
    }
}

export const f32 = (view: BytesView, value: number): void => {
    if (!hasSpace(view, 4)) expand(view);

    c_f32[0] = value;
    view.bytes.set(c_u8.subarray(0, 4), view.at);
    view.at += 4;
}

export const f64 = (view: BytesView, value: number): void => {
    if (!hasSpace(view, 8)) expand(view);

    c_f64[0] = value;
    view.bytes.set(c_u8.subarray(0, 8), view.at);
    view.at += 8;
}

export const string = (view: BytesView, value: string): void => {
    bytes(view, utf8Encode(value));
}

export const bytes = (
    view: BytesView,
    value: Uint8Array,
    writeLength: boolean = true
): void => {

    if (writeLength) vu32(view, value.length);

    if (!hasSpace(view, value.length)) expand(view, value.length);

    view.bytes.set(value, view.at);
    view.at += value.length;
}

export const vector = <T>(
    view: BytesView,
    data: T[],
    doWrite: (view: BytesView, value: T) => void
) => {
    const length = data.length;
    vu32(view, length);
    for (let i = 0; i < length; ++i) doWrite(view, data[i]);
}