import { Kit } from "./kit";

export const wasmkit = (file: Uint8Array) => Kit.fromBinary(file);