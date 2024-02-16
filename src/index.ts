import { Kit } from "./kit";
import fmt from "./formats";

const wasmkit = (file: Uint8Array) => Kit.fromBinary(file);

export { wasmkit, fmt };

// do the global this