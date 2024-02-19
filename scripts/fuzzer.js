const { execSync, spawn } = require("child_process");
const { join } = require("path");


execSync("npm run build");

const { fmt, wasmkit } = require(join(__dirname, "..", "dist/cjs/bundle.js"));

async function main() {
    const FEED = 5000;
    await doExtract({
        bytes: await makeFuzzWithSize({ feed: FEED }),
        format: "wasm"
    });
    for (let i = 0; i < 100; ++i) {
        try {
            await doExtract({
                bytes: await makeFuzzWithSize({ feed: FEED }),
                format: "wasm"
            });
        } catch (err) {
            console.warn("Fuzzed file attempt failed (fuzzer error) (idx=" + i + "):");
            console.warn("    " + err.trim());
        }
    }
}

async function makeFuzzWithSize({ feed }) {
    const smith = spawn(`wasm-tools`, ["smith"]);
    smith.stdin.write(Buffer.alloc(feed).map(e => Math.random() * (128 - 32) + 32));
    smith.stdin.destroy();
    const bytes = await new Promise((res, rej) => {
        let fuzz = Buffer.alloc(0);
        let stderr = "";

        smith.stdout.on('data', (data) => {
            fuzz = Buffer.concat([fuzz, data]);
        });
        smith.stderr.on('data', (data) => {
            stderr += data;
        })

        smith.on('exit', (code) => {
            if (stderr) return rej(stderr);
            res(fuzz)
        });
        smith.on("error", (error) => {
            stderr = error;
        });
    });

    return bytes;
}

async function doExtract({ bytes, format, doCompile }) {
    if (!doCompile) doCompile = false;

    try {

        const kit = await wasmkit(bytes);

        const mod = kit.as(fmt[format]);

        if (doCompile) {
            kit.compileFrom(fmt[format].compile, mod);
        }

    } catch (err) {
        console.log(bytes);
        throw err;
    }
}

main();
