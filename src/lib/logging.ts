const getStack = (lines: number) => {
    const err = (new Error().stack || "").split("\n");

    return err.slice(1, 1 + lines).join('\n');
}

export const info = (...args: any[]) => {
    console.log(...args);
    console.log(getStack(1));
}

export const warn = (...args: any[]) => {
    console.warn(...args);
    console.warn(getStack(1));
}

export function assert(truth: boolean, msg: string = "Assertion failed"): asserts truth is true {
    if (truth) return;

    throw fatal(msg);
}

export const fatal = (msg: string) => {
    return new Error(msg);
}