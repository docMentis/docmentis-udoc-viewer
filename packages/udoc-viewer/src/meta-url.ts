// Separate module for import.meta.url-based URL resolution.
// Kept in its own file so environments that don't support import.meta
// (e.g. StackBlitz's turbo_modules) don't choke at parse time.
// This file is only loaded via dynamic import().

let _wasmUrl = new URL("./wasm/udoc_bg.wasm", import.meta.url).href;
if (_wasmUrl.startsWith("/") && typeof globalThis.location !== "undefined") {
  _wasmUrl = globalThis.location.origin + _wasmUrl;
}
export const wasmUrl = _wasmUrl;
