import * as logging from "../../lib/logging";

import * as hl_wasm from "./types";

export const doInstructionTraverse = (
    root: hl_wasm.Instruction, cb: (instr: hl_wasm.Instruction) => void
): void => {
    const stack: { instr: hl_wasm.Instruction, index: number }[] = [
        { instr: root, index: 0 }
    ];

    while (stack.length > 0) {
        const state = stack[stack.length - 1];

        switch (state.instr.type) {
            case hl_wasm.InstructionType.Block: {
                if (state.index < state.instr.children.length) {
                    stack.push({
                        instr: state.instr.children[state.index],
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.If: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.ifTrue,
                        index: 0
                    });
                    state.index += 1;
                } else if (state.index === 1 && state.instr.ifFalse) {
                    stack.push({
                        instr: state.instr.ifTrue,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Nop:
            case hl_wasm.InstructionType.Unreachable: {
                cb(state.instr);
                stack.pop();
            } break;

            case hl_wasm.InstructionType.Drop: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Br: {
                if (state.index < state.instr.value.length) {
                    stack.push({
                        instr: state.instr.value[state.index],
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Switch: {
                if (state.index < state.instr.value.length) {
                    stack.push({
                        instr: state.instr.value[state.index],
                        index: 0
                    });
                    state.index += 1;
                } else if (state.index === state.instr.value.length) {
                    stack.push({
                        instr: state.instr.condition,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Call: {
                if (state.index < state.instr.arguments.length) {
                    stack.push({
                        instr: state.instr.arguments[state.index],
                        index: 0
                    });
                    state.index += 1;
                } else if (
                    state.index === state.instr.arguments.length
                    && state.instr.target.hasOwnProperty("type")
                ) {
                    stack.push({
                        instr: state.instr.target as hl_wasm.Instruction,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Get: {
                cb(state.instr);
                stack.pop();
            } break;
            case hl_wasm.InstructionType.Set: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Load: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.address,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Store: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.address,
                        index: 0
                    });
                    state.index += 1;
                } else if (state.index === 1) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Const: {
                cb(state.instr);
                stack.pop();
            } break;
            case hl_wasm.InstructionType.Unary: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Binary: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.left,
                        index: 0
                    });
                    state.index += 1;
                } else if (state.index === 1) {
                    stack.push({
                        instr: state.instr.right,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Select: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.ifTrue,
                        index: 0
                    });
                    state.index += 1;
                } else if (state.index === 1) {
                    stack.push({
                        instr: state.instr.ifFalse,
                        index: 0
                    });
                    state.index += 1;
                }  else if (state.index === 2) {
                    stack.push({
                        instr: state.instr.condition,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Return: {
                if (state.index < state.instr.value.length) {
                    stack.push({
                        instr: state.instr.value[state.index],
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.MemorySize: {
                cb(state.instr);
                stack.pop();
            } break;
            case hl_wasm.InstructionType.MemoryGrow: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.delta,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.Convert: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
            case hl_wasm.InstructionType.MultiSet: {
                if (state.index === 0) {
                    stack.push({
                        instr: state.instr.value,
                        index: 0
                    });
                    state.index += 1;
                } else {
                    cb(state.instr);
                    stack.pop();
                }
            } break;
        }
    }
}