const { build } = require("esbuild");

main();

async function main() {
    await bundle({
        format: "esm",
        dist: "esm"
    });
    await bundle({
        format: "cjs",
        dist: "cjs"
    });
    await bundle({
        format: "iife",
        dist: "browser"
    });
}

async function bundle({ target, format, dist }) {
    await build({
        target,
        format,
        outfile: `./dist/${dist}/bundle.js`,
        bundle: true,
        entryPoints: [ "./src/index.ts" ],
        alias: {
            "wasmkit": "./src",
        }
    })
}