# kit

Extendable and modular analysis of wasm files. The general concept is to allow the creation of Formats to view and recompile wasm, and let those Formats rely on predefined lower level formats.

I.E given an emscripten wasm file, the user parses with the `emsc` format. The `emsc` format then requests and retrieves LLVM function scope information and Struct information from the `llvm` and `struct_finder` formats. These formats then use data from the Highlevel Web Assembly (`hl_wasm`) format which provides a high level IR for interacting with wasm. Then `hl_wasm` uses data from its lower level sibling `wasm`, which finally gets the most pure sections data from the `raw` format. All these formats compound together into the abstract `emsc` layer.

It will not stop at `emsc`, for ex unity could extend that. Contribution is welcome to create more advanced layers.

Exsample code:

```ts
const kit = wasmkit(wasm_file);

const raw = kit.raw();
const wasm = kit.wasm();
const llvm = kit.as(LLVMModule, { options }); // iirc this has changed a bit since this demo was written

if (LLVMModule.COMPILEABLE) {
    llvm.funcs[0].shadowStack.size += 4;

    llvm.compile();
}
```

## TODO

Before this is fully doable, efforts must be focused on better struct finding algos (will need a Format that disassembles into an SSA view first). For this reason, we are currently at a somewhat unusable state besides basic wasm parsing.

# Language Choice

We wanted something that would be easy for people to contribute to. We wanted something that could easily be integrated to Web as well as backend analysis.

## Speed

The systems explained above parse 100% of the binary, which is slow especially given the fact we have written this in TypeScript. To enhance speed we will allow for selective parsing of only user-requested data, but there is also the possibility of off-thread parsing.

## Maintainability

It could be a struggle to keep this up to date with the possible future wasm standards. For this reason it might be worth looking into using binaryen for the backend to the lower level layers.

## License

Please see `./LICENSE`
