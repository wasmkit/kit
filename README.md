# kit


## Code guideline notes

All udefined modules in formats/ folder, all other logic in lib/
Tests outside of src/
Types in wasm will be called signatres
`bytes` ALWAYS refers to Uint8Array
`buffer` ALWAYS refer to ArrayBuffer
`binary` may refer BinaryLike (see lib/binary.ts)
ALL private methods or members must be prefixed by a `_`