const convo = new ArrayBuffer(8);
const u8 = new Uint8Array(convo);
const u32 = new Uint32Array(convo);
const f32 = new Float32Array(convo);
const f64 = new Float64Array(convo);
const encoder = new TextEncoder();

export class ByteWriter {
    // Using arrays as byte vectors is usually faster
    private _written: number[] = [];

    public u8(value: number): ByteWriter {
        this._written.push(value & 0xFF);

        return this;
    }

    public i8(value: number): ByteWriter {
        return this.u8(value >>> 0);
    }

    public u32(value: number): ByteWriter {
        u32[0] = value;

        this._written.push(...u8.subarray(0, 4));

        return this;
    }

    public vi32(value: number): ByteWriter {
        // TODO
    }

    public vu32(value: number): ByteWriter {
        // TODO
    }

    public vi64(value: number): ByteWriter {
        // TODO
    }

    public f32(value: number): ByteWriter {
        f32[0] = value;

        this._written.push(...u8.subarray(0, 4));

        return this;
    }

    public f64(value: number): ByteWriter {
        f64[0] = value;

        this._written.push(...u8.subarray(0, 8));

        return this;
    }

    public string(value: string): ByteWriter {
        return this.bytes(encoder.encode(value));
    }

    public bytes(value: Uint8Array): ByteWriter {
        this._written.push(...value);

        return this;
    }

    public vector<ElementType>(elementWriteFunc: (value: ElementType, writer: ByteWriter) => void, values: ElementType[]): ByteWriter {
        this.vu32(values.length);

        for (let i = 0; i < values.length; ++i) elementWriteFunc(values[i], this);

        return this;
    }
}