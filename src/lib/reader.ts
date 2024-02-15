const convo = new ArrayBuffer(8);
const u8 = new Uint8Array(convo);
const u32 = new Uint32Array(convo);
const f32 = new Float32Array(convo);
const f64 = new Float64Array(convo);
const decoder: { decode(buffer: Uint8Array): string } = new TextDecoder();


export class ByteReader {
    private _bytes: Uint8Array;
    public at = 0;

    public constructor(bytes: Uint8Array) {
        this._bytes = new Uint8Array(bytes);
    }

    public u8() {
        return this._bytes[this.at++];
    }
    public i8() {
        return (this.u8() << 25) >> 25;
    }
    public u32() {
        u8.set(this._bytes.subarray(this.at, this.at += 4));

        return u32[0];
    }

    public vi32() {
        let i = 0;
        let out = 0;
        while (true) {
            const byte = this._bytes[this.at++];

            out |= (byte & 0x7f) << i;
            i += 7;

            if ((0x80 & byte) === 0) {
                if (i < 32 && (byte & 0x40) !== 0) {
                    return out | (~0 << i);
                }

                return out;
            }
        }
    }

    public vu32() {
        let i = 0;
        let out = 0;

        while (this._bytes[this.at] & 0x80) {
            out |= (this._bytes[this.at++] & 0x7F) << i;
            i += 7;
        }
        out |= (this._bytes[this.at++] & 0x7F) << i;

        return out >>> 0;
    }

    public vi64() {
        let i = 0n;
        let out = 0n;
        while (true) {
            const byte = this._bytes[this.at++];

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

    public f32() {
        u8.set(this._bytes.subarray(this.at, this.at += 4));

        return f32[0];
    }

    public f64() {
        u8.set(this._bytes.subarray(this.at, this.at += 8));

        return f64[0];
    }

    public string() {
        return decoder.decode(this.bytes());
    }

    public bytes(length = this.vu32()) {
        return this._bytes.subarray(this.at, this.at += length);
    }

    public vector<ElementType>(elementReadFunc: () => ElementType, length = this.vu32()): ElementType[] {
        const out = Array(length);

        for (let i = 0; i < length; ++i) out[i] = elementReadFunc.call(this);

        return out;
    }

    public isEOF() {
        return this.at >= this._bytes.byteLength;
    }
}