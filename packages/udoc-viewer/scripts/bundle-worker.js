/**
 * Bundle the worker into a self-contained ESM file.
 *
 * After tsc compiles worker.js, it still contains ES module imports
 * (e.g., `import init from "../wasm/udoc.js"`). These imports only resolve
 * when the consumer's bundler processes them (Vite, Webpack).
 *
 * Bundlers like Angular's esbuild builder and StackBlitz do NOT process
 * `new Worker(new URL(..., import.meta.url))` patterns, so the worker
 * is loaded as-is and the imports fail.
 *
 * This script uses esbuild to inline all JS dependencies into a single
 * self-contained worker file. The WASM binary is still fetched at runtime.
 */

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distWorker = join(__dirname, "../dist/src/worker/worker.js");

await build({
  entryPoints: [distWorker],
  bundle: true,
  format: "esm",
  outfile: distWorker,
  allowOverwrite: true,
});

console.log("Bundled dist/src/worker/worker.js (self-contained)");
