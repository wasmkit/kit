import { raw } from "./raw";

import { AbstractFormat } from "./abstract";

interface Format<F extends typeof AbstractFormat> {
    Format: F;
    extract?(fmt: InstanceType<F>): void;
    compile?(fmt: InstanceType<F>): void;
    print?(fmt: InstanceType<F>): any;
}

export default {
    raw: raw as Format<typeof raw.Format>
};