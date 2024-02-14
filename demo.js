const kit = wasmkit(wasm_file);

const raw = kit.raw();
const wasm = kit.wasm(); // or kit.as(WASMModule)
const llvm = kit.as(LLVMModule, { options });

if (LLVMModule.COMPILEABLE) {
    llvm.funcs[0].shadowStack.size += 4;

    llvm.compile();
}