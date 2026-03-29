let wasm;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(takeObject(mem.getUint32(i, true)));
    }
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

function __wasm_bindgen_func_elem_2633(arg0, arg1, arg2) {
    wasm.__wasm_bindgen_func_elem_2633(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_17344(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_17344(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];

const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];

const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];

const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];

const __wbindgen_enum_GpuTextureAspect = ["all", "stencil-only", "depth-only"];

const __wbindgen_enum_GpuTextureDimension = ["1d", "2d", "3d"];

const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];

const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];

const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];

const __wbindgen_enum_XmlHttpRequestResponseType = ["", "arraybuffer", "blob", "document", "json", "text"];

const WasmFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasm_free(ptr >>> 0, 1));

/**
 * Universal document viewer.
 *
 * Loads, stores, and renders PDF documents. Each document is identified by a unique ID.
 */
export class Wasm {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasm_free(ptr, 0);
    }
    /**
     * Load an image file and return its ID.
     *
     * Supports various image formats: JPEG, PNG, GIF, BMP, TIFF, WebP, etc.
     * Multi-page TIFF files will create a document with multiple pages.
     *
     * # Arguments
     * * `bytes` - Raw image file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load_image(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load_image(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Get the page count of a document.
     * @param {string} id
     * @returns {number}
     */
    page_count(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_page_count(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the document outline (bookmarks/table of contents).
     *
     * Returns an array of outline items, where each item has:
     * - `title`: Display text for the item
     * - `destination`: Optional navigation destination with `pageIndex` and display parameters
     * - `children`: Nested child items
     *
     * Returns an empty array if the document has no outline.
     * @param {string} id
     * @returns {any}
     */
    get_outline(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_outline(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a feature is enabled by the current license.
     * @param {string} feature
     * @returns {boolean}
     */
    has_feature(feature) {
        const ptr0 = passStringToWasm0(feature, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasm_has_feature(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get the preferred page layout for two-page viewing modes.
     *
     * Returns one of:
     * - `"default"` - Viewer decides based on document type
     * - `"odd-pages-right"` - Odd pages on right (page 1 alone, then 2|3, 4|5...)
     * - `"odd-pages-left"` - Odd pages on left (1|2, 3|4, 5|6...)
     * @param {string} id
     * @returns {string}
     */
    page_layout(id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_page_layout(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Compose new PDF documents by cherry-picking pages from source documents.
     *
     * The original documents remain unchanged.
     *
     * # Arguments
     * * `compositions` - Array of compositions. Each composition is an array of picks.
     *   Each pick is `{ doc: docIndex, pages: "0-2,4" }` where `docIndex` is the index
     *   in the `doc_ids` array and `pages` is a page range string (0-based).
     * * `doc_ids` - Array of document IDs to use as sources (order matters for doc indices)
     *
     * # Example
     * ```js
     * // Create two documents: first has pages 0-2 from doc A, second has page 0 from A and 1 from B
     * const newDocIds = udoc.pdf_compose(
     *   [
     *     [{ doc: 0, pages: "0-2" }],
     *     [{ doc: 0, pages: "0" }, { doc: 1, pages: "1" }]
     *   ],
     *   ["doc_0", "doc_1"]
     * );
     * ```
     *
     * # Returns
     * Array of IDs for the newly created documents (one per composition).
     * @param {any} compositions
     * @param {any} doc_ids
     * @returns {any}
     */
    pdf_compose(compositions, doc_ids) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasm_pdf_compose(retptr, this.__wbg_ptr, addHeapObject(compositions), addHeapObject(doc_ids));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the license key.
     *
     * # Arguments
     * * `license_key` - The license key string
     *
     * # Returns
     * License validation result as JSON.
     * @param {string} license_key
     * @returns {any}
     */
    set_license(license_key) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(license_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_set_license(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Authenticate with a password to unlock an encrypted document.
     *
     * # Arguments
     * * `id` - Document ID
     * * `password` - Password to try
     *
     * # Returns
     * `true` if authentication succeeded, `false` if the password was incorrect.
     * @param {string} id
     * @param {string} password
     * @returns {boolean}
     */
    authenticate(id, password) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(password, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasm_authenticate(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all document IDs.
     * @returns {string[]}
     */
    document_ids() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasm_document_ids(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a document with the given ID exists.
     * @param {string} id
     * @returns {boolean}
     */
    has_document(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasm_has_document(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Compress a PDF document.
     *
     * Saves the document with full compression options enabled:
     * - Compress stream data using FlateDecode
     * - Pack objects into compressed object streams (PDF 1.5+)
     * - Use compressed xref streams (PDF 1.5+)
     * - Remove unreferenced objects
     *
     * # Arguments
     * * `doc_id` - Document ID to compress
     *
     * # Returns
     * Compressed PDF data as Uint8Array
     * @param {string} doc_id
     * @returns {Uint8Array}
     */
    pdf_compress(doc_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(doc_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_pdf_compress(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get info for all pages in one call.
     *
     * Returns an array of `PageInfo` objects, one per page.
     * More efficient than calling `page_info` for each page.
     * @param {string} id
     * @returns {PageInfo[]}
     */
    all_page_info(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_all_page_info(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get text content for a specific page (for text selection).
     *
     * Returns an array of text runs, each containing:
     * - `text`: Unicode text string
     * - `glyphs`: Positioned glyphs with character mappings
     * - `fontSize`: Font size in points
     * - `transform`: Combined transform matrix
     * @param {string} id
     * @param {number} page_index
     * @returns {any}
     */
    get_page_text(id, page_index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_page_text(retptr, this.__wbg_ptr, ptr0, len0, page_index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the number of documents currently loaded.
     * @returns {number}
     */
    get document_count() {
        const ret = wasm.wasm_document_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get font usage information for a document.
     *
     * Returns an array of `FontUsageEntry` objects describing how each font
     * spec in the document was resolved, including primary resolution and
     * any glyph-fallback fonts used during text shaping.
     *
     * This information is populated during layout — call after rendering at
     * least one page to get results.
     *
     * # Arguments
     * * `id` - Document ID
     *
     * # Returns
     * `FontUsageEntry[]` — see TypeScript types for shape.
     * @param {string} id
     * @returns {any}
     */
    get_font_usage(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_font_usage(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get current license status.
     * @returns {any}
     */
    license_status() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasm_license_status(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a document requires a password to open.
     *
     * Returns `true` if the document is encrypted and requires authentication
     * before pages can be loaded or rendered.
     * @param {string} id
     * @returns {boolean}
     */
    needs_password(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_needs_password(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Decompress a PDF document.
     *
     * Removes all filter encodings from streams, resulting in raw,
     * uncompressed stream data. Useful for debugging or inspection.
     *
     * # Arguments
     * * `doc_id` - Document ID to decompress
     *
     * # Returns
     * Decompressed PDF data as Uint8Array
     * @param {string} doc_id
     * @returns {Uint8Array}
     */
    pdf_decompress(doc_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(doc_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_pdf_decompress(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Register font URLs.
     *
     * The caller provides a list of all available fonts with their download
     * URLs. During layout, when the engine needs a font, it is fetched from
     * the URL, parsed, and cached for reuse.
     *
     * Call this before loading documents. Registered fonts are automatically
     * applied to every document loaded afterward. URL fonts are always
     * resolved before Google Fonts.
     *
     * # Arguments
     * * `fonts` - Array of font entries: `[{ typeface: "Roboto", bold: false, italic: false, url: "https://..." }, ...]`
     *
     * # Example (JavaScript)
     * ```js
     * // Register available fonts before loading documents
     * udoc.registerFonts([
     *     { typeface: "Roboto", bold: false, italic: false, url: "https://cdn.example.com/Roboto-Regular.woff2" },
     *     { typeface: "Roboto", bold: true, italic: false, url: "https://cdn.example.com/Roboto-Bold.woff2" },
     * ]);
     *
     * // Load and render - fonts are fetched on demand during layout
     * const docId = udoc.loadPptx(pptxBytes);
     * const pixels = udoc.renderPageToRgba(docId, 0, 800, 600);
     * ```
     * @param {any} fonts
     */
    registerFonts(fonts) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasm_registerFonts(retptr, this.__wbg_ptr, addHeapObject(fonts));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the format of a loaded document.
     *
     * Returns one of: "pdf", "docx", "pptx", "xlsx", "image".
     * @param {string} id
     * @returns {string}
     */
    document_format(id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_document_format(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Remove a document by ID.
     *
     * Returns true if the document was removed, false if it didn't exist.
     * @param {string} id
     * @returns {boolean}
     */
    remove_document(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasm_remove_document(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Render a page using the GPU backend (Vello + WebGPU).
     *
     * Returns raw RGBA pixel data in premultiplied alpha format,
     * identical to `render_page_to_rgba` but GPU-accelerated.
     *
     * # Errors
     * Returns an error if the GPU backend is not initialized
     * (call `init_gpu()` first), if the document is not found,
     * or if rendering fails.
     * @param {string} id
     * @param {number} page_index
     * @param {number} width
     * @param {number} height
     * @returns {Promise<Uint8Array>}
     */
    render_page_gpu(id, page_index, width, height) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasm_render_page_gpu(this.__wbg_ptr, ptr0, len0, page_index, width, height);
        return takeObject(ret);
    }
    /**
     * One-time telemetry setup: store the embedding page's domain, SDK version, and anonymous ID.
     *
     * Must be called after `new()` and before loading documents so that
     * telemetry events include the correct metadata.
     *
     * # Arguments
     * * `domain` - Hostname of the embedding page (e.g. from `window.location.hostname`)
     * * `viewer_version` - SDK version string
     * * `distinct_id` - Anonymous UUID for per-user tracking (persisted in localStorage)
     * @param {string} domain
     * @param {string} viewer_version
     * @param {string} distinct_id
     */
    setup_telemetry(domain, viewer_version, distinct_id) {
        const ptr0 = passStringToWasm0(domain, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(viewer_version, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(distinct_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.wasm_setup_telemetry(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    }
    /**
     * Disable telemetry reporting.
     *
     * Only takes effect if the current license includes the `no_telemetry`
     * feature flag. Returns `true` if telemetry was disabled, `false` if the
     * license does not permit it.
     * @returns {boolean}
     */
    disable_telemetry() {
        const ret = wasm.wasm_disable_telemetry(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Extract all embedded fonts from a PDF document.
     *
     * # Arguments
     * * `doc_id` - Document ID to extract fonts from
     *
     * # Returns
     * Array of extracted font objects, each with:
     * - `name`: Font name from the resource dictionary
     * - `fontType`: Font type (Type1, TrueType, etc.)
     * - `extension`: File extension (ttf, cff, t1, etc.)
     * - `data`: Raw font data as Uint8Array
     * @param {string} doc_id
     * @returns {any}
     */
    pdf_extract_fonts(doc_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(doc_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_pdf_extract_fonts(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Extract all embedded images from a PDF document.
     *
     * # Arguments
     * * `doc_id` - Document ID to extract images from
     * * `convert_raw_to_png` - When true, converts raw pixel data to PNG format
     *
     * # Returns
     * Array of extracted image objects, each with:
     * - `name`: Image name from the resource dictionary
     * - `format`: Image format (jpeg, png, jp2, etc.)
     * - `width`: Width in pixels
     * - `height`: Height in pixels
     * - `data`: Raw image data as Uint8Array
     * @param {string} doc_id
     * @param {boolean} convert_raw_to_png
     * @returns {any}
     */
    pdf_extract_images(doc_id, convert_raw_to_png) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(doc_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_pdf_extract_images(retptr, this.__wbg_ptr, ptr0, len0, convert_raw_to_png);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Render a page to PNG bytes.
     *
     * # Arguments
     * * `id` - Document ID
     * * `page_index` - Zero-based page index
     * * `width` - Output width in pixels
     * * `height` - Output height in pixels
     *
     * # Returns
     * PNG-encoded image data as a byte array.
     * @param {string} id
     * @param {number} page_index
     * @param {number} width
     * @param {number} height
     * @returns {Uint8Array}
     */
    render_page_to_png(id, page_index, width, height) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_render_page_to_png(retptr, this.__wbg_ptr, ptr0, len0, page_index, width, height);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Enable Google Fonts.
     *
     * When enabled, fonts that are not embedded in the document will be
     * automatically fetched from Google Fonts during rendering. Google Fonts
     * are resolved after any URL fonts registered via `registerFonts`.
     *
     * Call this before loading documents.
     *
     * # Example (JavaScript)
     * ```js
     * udoc.enableGoogleFonts();
     * const docId = udoc.loadPptx(pptxBytes);
     * const pixels = udoc.renderPageToRgba(docId, 0, 800, 600);
     * ```
     */
    enableGoogleFonts() {
        wasm.wasm_enableGoogleFonts(this.__wbg_ptr);
    }
    /**
     * Get all annotations in the document, grouped by page index.
     *
     * Returns an object mapping page indices (as strings) to arrays of annotations.
     * @param {string} id
     * @returns {any}
     */
    get_all_annotations(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_all_annotations(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Render a page to raw RGBA pixel data.
     *
     * The returned data is in premultiplied alpha format, suitable for
     * use with `ImageData` and canvas rendering.
     *
     * # Arguments
     * * `id` - Document ID
     * * `page_index` - Zero-based page index
     * * `width` - Output width in pixels
     * * `height` - Output height in pixels
     *
     * # Returns
     * Raw RGBA pixel data (width * height * 4 bytes).
     * @param {string} id
     * @param {number} page_index
     * @param {number} width
     * @param {number} height
     * @returns {Uint8Array}
     */
    render_page_to_rgba(id, page_index, width, height) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_render_page_to_rgba(retptr, this.__wbg_ptr, ptr0, len0, page_index, width, height);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get annotations for a specific page.
     *
     * Returns an array of annotation objects for the given page.
     * Uses per-page loading for efficiency (only loads the requested page).
     * @param {string} id
     * @param {number} page_index
     * @returns {any}
     */
    get_page_annotations(id, page_index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_page_annotations(retptr, this.__wbg_ptr, ptr0, len0, page_index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Split a PDF document by its outline (bookmarks) structure.
     *
     * Creates multiple documents, one for each outline section at the specified level.
     *
     * # Arguments
     * * `doc_id` - Document ID to split
     * * `max_level` - Maximum outline level to consider (1 = top level only)
     * * `split_mid_page` - When true, filters page content when sections share a page
     *
     * # Returns
     * Object with:
     * - `documentIds`: Array of IDs for the newly created documents
     * - `sections`: Array of section info objects with `title`, `startPage`, `level`
     * @param {string} doc_id
     * @param {number} max_level
     * @param {boolean} split_mid_page
     * @returns {any}
     */
    pdf_split_by_outline(doc_id, max_level, split_mid_page) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(doc_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_pdf_split_by_outline(retptr, this.__wbg_ptr, ptr0, len0, max_level, split_mid_page);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all visibility groups for a document.
     *
     * Returns an array of objects, each containing:
     * - `id`: Unique identifier string
     * - `name`: Display name for UI
     * - `visible`: Whether the group is currently visible
     *
     * Returns an empty array for documents without visibility groups.
     * @param {string} id
     * @returns {any}
     */
    get_visibility_groups(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_visibility_groups(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the visibility of a specific visibility group.
     *
     * # Arguments
     * * `id` - Document ID
     * * `group_id` - Visibility group ID
     * * `visible` - Whether the group should be visible
     *
     * Returns `true` if the group was found and updated, `false` if not found.
     * @param {string} id
     * @param {string} group_id
     * @param {boolean} visible
     * @returns {boolean}
     */
    set_visibility_group_visible(id, group_id, visible) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(group_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasm_set_visibility_group_visible(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, visible);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a new document viewer.
     */
    constructor() {
        const ret = wasm.wasm_new();
        this.__wbg_ptr = ret >>> 0;
        WasmFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Load a document by auto-detecting its format from the file contents.
     *
     * Inspects magic bytes to determine the format:
     * - `%PDF` → PDF
     * - `PK\x03\x04` (ZIP) → inspects ZIP entries for `word/` (DOCX), `ppt/` (PPTX), or `xl/` (XLSX)
     * - Image magic bytes (JPEG, PNG, GIF, BMP, TIFF, WebP) → Image
     *
     * # Arguments
     * * `bytes` - Raw file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Check whether the GPU render backend is available.
     * @returns {boolean}
     */
    has_gpu() {
        const ret = wasm.wasm_has_gpu(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Initialize the GPU render backend (Vello + WebGPU).
     *
     * This is async because wgpu device initialization requires yielding
     * to the browser event loop. Call this once after construction.
     * Returns `true` if GPU initialization succeeded, `false` if no
     * WebGPU adapter is available (the CPU backend remains usable).
     * @returns {Promise<boolean>}
     */
    init_gpu() {
        const ret = wasm.wasm_init_gpu(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Load a PDF document and return its ID.
     *
     * # Arguments
     * * `bytes` - Raw PDF file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load_pdf(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load_pdf(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Get the raw file bytes of a document.
     *
     * Returns the original file data for the document.
     * @param {string} id
     * @returns {Uint8Array}
     */
    get_bytes(id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_get_bytes(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export4(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get a numeric limit from the current license.
     *
     * Returns the limit value if set in the license, otherwise returns the default.
     * @param {string} limit_name
     * @param {bigint} _default
     * @returns {bigint}
     */
    get_limit(limit_name, _default) {
        const ptr0 = passStringToWasm0(limit_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasm_get_limit(this.__wbg_ptr, ptr0, len0, _default);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Load a DOCX document and return its ID.
     *
     * # Arguments
     * * `bytes` - Raw DOCX file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load_docx(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load_docx(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Load a PPTX (PowerPoint) document and return its ID.
     *
     * # Arguments
     * * `bytes` - Raw PPTX file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load_pptx(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load_pptx(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Load an XLSX document and return its ID.
     *
     * # Arguments
     * * `bytes` - Raw XLSX file data
     *
     * # Returns
     * A unique document ID that can be used to reference this document.
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    load_xlsx(bytes) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_load_xlsx(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Get info for a specific page.
     * @param {string} id
     * @param {number} page_index
     * @returns {PageInfo}
     */
    page_info(id, page_index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasm_page_info(retptr, this.__wbg_ptr, ptr0, len0, page_index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
if (Symbol.dispose) Wasm.prototype[Symbol.dispose] = Wasm.prototype.free;

/**
 * Parse font binary data and return font metadata.
 *
 * Accepts raw font bytes (TTF, OTF, WOFF, WOFF2) and returns the typeface
 * name, bold, and italic flags. Customers can use this to inspect font files,
 * store the metadata alongside the binary in their own database, and later
 * use it to craft entries for `registerFonts`.
 *
 * # Arguments
 * * `data` - Raw font binary data
 *
 * # Returns
 * An object with `{ typeface: string, bold: boolean, italic: boolean }`.
 *
 * # Example (JavaScript)
 * ```js
 * const fontBytes = new Uint8Array(await fetch("Roboto-Bold.woff2").then(r => r.arrayBuffer()));
 * const info = parseFontInfo(fontBytes);
 * // info = { typeface: "Roboto", bold: true, italic: false }
 *
 * // Store info + fontBytes in your database, then later:
 * udoc.registerFonts([
 *     { typeface: info.typeface, bold: info.bold, italic: info.italic, url: "https://..." },
 * ]);
 * ```
 * @param {Uint8Array} data
 * @returns {any}
 */
export function parseFontInfo(data) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.parseFontInfo(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_Number_2d1dcfcf4ec51736 = function(arg0) {
        const ret = Number(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_Window_a4c5a48392f234ba = function(arg0) {
        const ret = getObject(arg0).Window;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_WorkerGlobalScope_2b2b89e1ac952b50 = function(arg0) {
        const ret = getObject(arg0).WorkerGlobalScope;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg___wbindgen_bigint_get_as_i64_6e32f5e6aff02e1d = function(arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_boolean_get_dea25b33882b895b = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? v : undefined;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_in_0d3e1e8f0c669317 = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_bigint_0e1a2e3f55cfae27 = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'bigint';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_function_8d400b8b1af978cd = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_null_dfda7d66506c95b5 = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_ce774f3490692386 = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_string_704ef9c8fc131030 = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_f6b95eab589e0269 = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_jsval_eq_b6101cc9cef1fe36 = function(arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg___wbindgen_jsval_loose_eq_766057600fdd1b0d = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg___wbindgen_number_get_9619185a74197f95 = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_string_get_a2a31e16edf96e42 = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg__wbg_cb_unref_87dfb5aaa0cbcea7 = function(arg0) {
        getObject(arg0)._wbg_cb_unref();
    };
    imports.wbg.__wbg_beginComputePass_304dccb30a4db2cc = function(arg0, arg1) {
        const ret = getObject(arg0).beginComputePass(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_6cb2fecb1f253d71 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_3020136f7a2d6e44 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_abb4ff46ce38be40 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_c8baa5c5e72d274e = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_clearBuffer_b7d0381b50c8f5bb = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).clearBuffer(getObject(arg1), arg2, arg3);
    };
    imports.wbg.__wbg_clearBuffer_e3fa352fcc8ecc67 = function(arg0, arg1, arg2) {
        getObject(arg0).clearBuffer(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_copyBufferToBuffer_38cb6919320bd451 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_copyBufferToBuffer_8db6b1d1ef2bcea4 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4);
    }, arguments) };
    imports.wbg.__wbg_copyTextureToBuffer_21b9dc9b4d87baf0 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyTextureToBuffer(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_copyTextureToTexture_0eb51a215ab2cc31 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyTextureToTexture(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_createBindGroupLayout_3fb59c14aed4b64e = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createBindGroupLayout(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createBindGroup_03f26b8770895116 = function(arg0, arg1) {
        const ret = getObject(arg0).createBindGroup(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createBuffer_76f7598789ecc3d7 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createBuffer(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createCommandEncoder_f8056019328bd192 = function(arg0, arg1) {
        const ret = getObject(arg0).createCommandEncoder(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createComputePipeline_e6192c920efba35b = function(arg0, arg1) {
        const ret = getObject(arg0).createComputePipeline(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createPipelineLayout_5039b0679b6b7f36 = function(arg0, arg1) {
        const ret = getObject(arg0).createPipelineLayout(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createShaderModule_3facfe98356b79a9 = function(arg0, arg1) {
        const ret = getObject(arg0).createShaderModule(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createTexture_49002c91188f6137 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createTexture(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createView_0ce5c82d78f482df = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createView(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_crypto_574e78ad8b13b65f = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_debug_9d0c87ddda3dc485 = function(arg0) {
        console.debug(getObject(arg0));
    };
    imports.wbg.__wbg_dispatchWorkgroupsIndirect_6594fbc416b287d6 = function(arg0, arg1, arg2) {
        getObject(arg0).dispatchWorkgroupsIndirect(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_dispatchWorkgroups_4e59e078119b5bab = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).dispatchWorkgroups(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    };
    imports.wbg.__wbg_done_62ea16af4ce34b24 = function(arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.wbg.__wbg_end_ece2bf3a25678f12 = function(arg0) {
        getObject(arg0).end();
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_error_7bc7d576a6aaf855 = function(arg0) {
        console.error(getObject(arg0));
    };
    imports.wbg.__wbg_fetch_cd0acd3c15ec5b5d = function(arg0) {
        const ret = fetch(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_finish_17a0b297901010d5 = function(arg0) {
        const ret = getObject(arg0).finish();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_finish_ab9e01a922269f3a = function(arg0, arg1) {
        const ret = getObject(arg0).finish(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getDate_b8071ea9fc4f6838 = function(arg0) {
        const ret = getObject(arg0).getDate();
        return ret;
    };
    imports.wbg.__wbg_getFullYear_6ac412e8eee86879 = function(arg0) {
        const ret = getObject(arg0).getFullYear();
        return ret;
    };
    imports.wbg.__wbg_getHours_52eb417ad6e924e8 = function(arg0) {
        const ret = getObject(arg0).getHours();
        return ret;
    };
    imports.wbg.__wbg_getMappedRange_1229810ff58e27ce = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getMappedRange(arg1, arg2);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getMinutes_4097cef8e08622f9 = function(arg0) {
        const ret = getObject(arg0).getMinutes();
        return ret;
    };
    imports.wbg.__wbg_getMonth_48a392071f9e5017 = function(arg0) {
        const ret = getObject(arg0).getMonth();
        return ret;
    };
    imports.wbg.__wbg_getRandomValues_b8f5dbd5f3995a9e = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_getSeconds_d94762aec8103802 = function(arg0) {
        const ret = getObject(arg0).getSeconds();
        return ret;
    };
    imports.wbg.__wbg_get_6b7bd52aca3f9671 = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_af9dab7e9603ea93 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_with_ref_key_1dc361bd10053bfe = function(arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpu_a6bce2913fb8f574 = function(arg0) {
        const ret = getObject(arg0).gpu;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_info_ce6bcc489c22f6f0 = function(arg0) {
        console.info(getObject(arg0));
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_f3320d2419cd0355 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_GpuAdapter_fb230cdccb184887 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUAdapter;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_da54ccc9d3e09434 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_51fd9e6422c0a395 = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_ae7d3f054d55fa16 = function(arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_iterator_27b7c8b35ab3e86b = function() {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_label_cda985b32d44cee0 = function(arg0, arg1) {
        const ret = getObject(arg1).label;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_length_22ac23eaec9d8053 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_length_d45040a40c570362 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_log_1d990106d99dacb7 = function(arg0) {
        console.log(getObject(arg0));
    };
    imports.wbg.__wbg_mapAsync_4a34082bad283ccf = function(arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).mapAsync(arg1 >>> 0, arg2, arg3);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_msCrypto_a61aeb35a24c1329 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_navigator_11b7299bb7886507 = function(arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_navigator_b49edef831236138 = function(arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_0_23cedd11d9b40c9d = function() {
        const ret = new Date();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_3c79b3bb1b32b7d3 = function() { return handleError(function () {
        const ret = new Headers();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_4fe05c96062a8385 = function() { return handleError(function () {
        const ret = new XMLHttpRequest();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_6421f6084cc5bc5a = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_b546ae120718850e = function() {
        const ret = new Map();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_ff12d2b041fb48f1 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wasm_bindgen_func_elem_17344(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_new_from_slice_f9c22b9153b26992 = function(arg0, arg1) {
        const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_no_args_cb138f77cf6151ee = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_with_byte_offset_and_length_d85c3da1fd8df149 = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_with_length_aa5eaf41d35235e5 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_with_str_and_init_c5748f76f5108934 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_next_138a17bbf04e926c = function(arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_3cfe5c0fe2a4cc53 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_node_905d3e251edff8a2 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_now_69d776cd24f5215b = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_open_bfb661c1c2740586 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).open(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), arg5 !== 0);
    }, arguments) };
    imports.wbg.__wbg_process_dc0fbacc7c1c06f7 = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_prototypesetcall_dfe9b766cdc1f1fd = function(arg0, arg1, arg2) {
        Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
    };
    imports.wbg.__wbg_push_7d9be8f38fc13975 = function(arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_9b549dfce8865860 = function(arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_queueMicrotask_fca69f5bfad613a5 = function(arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_queue_39d4f3bda761adef = function(arg0) {
        const ret = getObject(arg0).queue;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_ac0988aba3254290 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_requestAdapter_55d15e6d14e8392c = function(arg0, arg1) {
        const ret = getObject(arg0).requestAdapter(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_requestDevice_66e864eaf1ffbb38 = function(arg0, arg1) {
        const ret = getObject(arg0).requestDevice(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_60cc747a6bc5215a = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_resolve_fd5bfbaa4ce36e1e = function(arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_responseText_7a33f62863958740 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg1).responseText;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments) };
    imports.wbg.__wbg_response_19d1d96c8fc76878 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).response;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_send_3accfe4b9b207011 = function() { return handleError(function (arg0) {
        getObject(arg0).send();
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_250647fe6341e1db = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_92f5fbfaea0311a0 = function(arg0, arg1, arg2) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_setPipeline_95448e1c3bb1e875 = function(arg0, arg1) {
        getObject(arg0).setPipeline(getObject(arg1));
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_425eb8b710d5beee = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_set_781438a03c0c3c81 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_7df433eea03a5c14 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_access_c87a9bdb5c449e6b = function(arg0, arg1) {
        getObject(arg0).access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
    };
    imports.wbg.__wbg_set_array_layer_count_3a8ad1adab3aded1 = function(arg0, arg1) {
        getObject(arg0).arrayLayerCount = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_aspect_4066a62e6528c589 = function(arg0, arg1) {
        getObject(arg0).aspect = __wbindgen_enum_GpuTextureAspect[arg1];
    };
    imports.wbg.__wbg_set_base_array_layer_85c4780859e3e025 = function(arg0, arg1) {
        getObject(arg0).baseArrayLayer = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_base_mip_level_f90525112a282a1d = function(arg0, arg1) {
        getObject(arg0).baseMipLevel = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_bc3a432bdcd60886 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_set_beginning_of_pass_write_index_1175eec9e005d722 = function(arg0, arg1) {
        getObject(arg0).beginningOfPassWriteIndex = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_bind_group_layouts_54f980eb55071c87 = function(arg0, arg1) {
        getObject(arg0).bindGroupLayouts = getObject(arg1);
    };
    imports.wbg.__wbg_set_binding_1ddbf5eebabdc48c = function(arg0, arg1) {
        getObject(arg0).binding = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_binding_5ea4d52c77434dfa = function(arg0, arg1) {
        getObject(arg0).binding = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_body_8e743242d6076a4f = function(arg0, arg1) {
        getObject(arg0).body = getObject(arg1);
    };
    imports.wbg.__wbg_set_buffer_2dac3e64a7099038 = function(arg0, arg1) {
        getObject(arg0).buffer = getObject(arg1);
    };
    imports.wbg.__wbg_set_buffer_489d923366e1f63a = function(arg0, arg1) {
        getObject(arg0).buffer = getObject(arg1);
    };
    imports.wbg.__wbg_set_buffer_a3a7f00fa797e1d1 = function(arg0, arg1) {
        getObject(arg0).buffer = getObject(arg1);
    };
    imports.wbg.__wbg_set_bytes_per_row_61fdc31fb1e978f4 = function(arg0, arg1) {
        getObject(arg0).bytesPerRow = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_bytes_per_row_7eb4ea50ad336975 = function(arg0, arg1) {
        getObject(arg0).bytesPerRow = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_code_e66de35c80aa100f = function(arg0, arg1, arg2) {
        getObject(arg0).code = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_compute_7e84d836a17ec8dc = function(arg0, arg1) {
        getObject(arg0).compute = getObject(arg1);
    };
    imports.wbg.__wbg_set_depth_or_array_layers_57e35a31ded46b97 = function(arg0, arg1) {
        getObject(arg0).depthOrArrayLayers = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_dimension_1e40af745768ac00 = function(arg0, arg1) {
        getObject(arg0).dimension = __wbindgen_enum_GpuTextureDimension[arg1];
    };
    imports.wbg.__wbg_set_dimension_8523a7df804e7839 = function(arg0, arg1) {
        getObject(arg0).dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    };
    imports.wbg.__wbg_set_efaaf145b9377369 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_end_of_pass_write_index_c9e77fba223f5e64 = function(arg0, arg1) {
        getObject(arg0).endOfPassWriteIndex = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_entries_5ebe60dce5e74a0b = function(arg0, arg1) {
        getObject(arg0).entries = getObject(arg1);
    };
    imports.wbg.__wbg_set_entries_9e330e1730f04662 = function(arg0, arg1) {
        getObject(arg0).entries = getObject(arg1);
    };
    imports.wbg.__wbg_set_entry_point_0dd252068a92e7b1 = function(arg0, arg1, arg2) {
        getObject(arg0).entryPoint = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_external_texture_c45a65eda8f1c7e7 = function(arg0, arg1) {
        getObject(arg0).externalTexture = getObject(arg1);
    };
    imports.wbg.__wbg_set_format_071b082598e71ae2 = function(arg0, arg1) {
        getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
    };
    imports.wbg.__wbg_set_format_45c59d08eefdcb12 = function(arg0, arg1) {
        getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
    };
    imports.wbg.__wbg_set_format_726ed8f81a287fdc = function(arg0, arg1) {
        getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
    };
    imports.wbg.__wbg_set_has_dynamic_offset_dcbae080558be467 = function(arg0, arg1) {
        getObject(arg0).hasDynamicOffset = arg1 !== 0;
    };
    imports.wbg.__wbg_set_headers_5671cf088e114d2b = function(arg0, arg1) {
        getObject(arg0).headers = getObject(arg1);
    };
    imports.wbg.__wbg_set_height_28e79506f626af82 = function(arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_label_03ef288b104476b5 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_1183ccaccddf4c32 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_3d8a20f328073061 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_491466139034563c = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_53b47ffdebccf638 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_7ffda3ed69c72b85 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_828e6fe16c83ad61 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_95bae3d54f33d3c6 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_a1c8caea9f6c17d7 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_a3e682ef8c10c947 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_c880c612e67bf9d9 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_label_eb73d9dd282c005a = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_layout_934f9127172b906e = function(arg0, arg1) {
        getObject(arg0).layout = getObject(arg1);
    };
    imports.wbg.__wbg_set_layout_a9aebce493b15bfb = function(arg0, arg1) {
        getObject(arg0).layout = getObject(arg1);
    };
    imports.wbg.__wbg_set_mapped_at_creation_37dd8bbd1a910924 = function(arg0, arg1) {
        getObject(arg0).mappedAtCreation = arg1 !== 0;
    };
    imports.wbg.__wbg_set_method_76c69e41b3570627 = function(arg0, arg1, arg2) {
        getObject(arg0).method = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_min_binding_size_f7d3351b78c71fbc = function(arg0, arg1) {
        getObject(arg0).minBindingSize = arg1;
    };
    imports.wbg.__wbg_set_mip_level_4adfe9f0872d052d = function(arg0, arg1) {
        getObject(arg0).mipLevel = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_mip_level_count_3368440f1c3c34b9 = function(arg0, arg1) {
        getObject(arg0).mipLevelCount = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_mip_level_count_9de96fe0db85420d = function(arg0, arg1) {
        getObject(arg0).mipLevelCount = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_module_0700e7e0b7b4f128 = function(arg0, arg1) {
        getObject(arg0).module = getObject(arg1);
    };
    imports.wbg.__wbg_set_multisampled_dc1cdd807d0170e1 = function(arg0, arg1) {
        getObject(arg0).multisampled = arg1 !== 0;
    };
    imports.wbg.__wbg_set_offset_49dfc93674b6347b = function(arg0, arg1) {
        getObject(arg0).offset = arg1;
    };
    imports.wbg.__wbg_set_offset_51eb43b37f1e9525 = function(arg0, arg1) {
        getObject(arg0).offset = arg1;
    };
    imports.wbg.__wbg_set_offset_a90a41961b1df9b4 = function(arg0, arg1) {
        getObject(arg0).offset = arg1;
    };
    imports.wbg.__wbg_set_origin_154a83d3703121d7 = function(arg0, arg1) {
        getObject(arg0).origin = getObject(arg1);
    };
    imports.wbg.__wbg_set_power_preference_229fffedb859fda8 = function(arg0, arg1) {
        getObject(arg0).powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
    };
    imports.wbg.__wbg_set_query_set_5d767886356c7b79 = function(arg0, arg1) {
        getObject(arg0).querySet = getObject(arg1);
    };
    imports.wbg.__wbg_set_required_features_8135f6ab89e06b58 = function(arg0, arg1) {
        getObject(arg0).requiredFeatures = getObject(arg1);
    };
    imports.wbg.__wbg_set_resource_97233a9ead07e4bc = function(arg0, arg1) {
        getObject(arg0).resource = getObject(arg1);
    };
    imports.wbg.__wbg_set_responseType_df7a5fa93f0dd4be = function(arg0, arg1) {
        getObject(arg0).responseType = __wbindgen_enum_XmlHttpRequestResponseType[arg1];
    };
    imports.wbg.__wbg_set_rows_per_image_b2e56467282d270a = function(arg0, arg1) {
        getObject(arg0).rowsPerImage = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_rows_per_image_ca194ae8c040a0d0 = function(arg0, arg1) {
        getObject(arg0).rowsPerImage = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_sample_count_df26d31cf04a57d8 = function(arg0, arg1) {
        getObject(arg0).sampleCount = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_sample_type_5671a405c6474494 = function(arg0, arg1) {
        getObject(arg0).sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
    };
    imports.wbg.__wbg_set_sampler_43a3dd77c3b0a5ba = function(arg0, arg1) {
        getObject(arg0).sampler = getObject(arg1);
    };
    imports.wbg.__wbg_set_size_1a3d1e3a2e547ec1 = function(arg0, arg1) {
        getObject(arg0).size = getObject(arg1);
    };
    imports.wbg.__wbg_set_size_a45dd219534f95ed = function(arg0, arg1) {
        getObject(arg0).size = arg1;
    };
    imports.wbg.__wbg_set_size_e0576eacd9f11fed = function(arg0, arg1) {
        getObject(arg0).size = arg1;
    };
    imports.wbg.__wbg_set_storage_texture_4853479f6eb61a57 = function(arg0, arg1) {
        getObject(arg0).storageTexture = getObject(arg1);
    };
    imports.wbg.__wbg_set_texture_5f219a723eb7db43 = function(arg0, arg1) {
        getObject(arg0).texture = getObject(arg1);
    };
    imports.wbg.__wbg_set_texture_84c4ac5434a9ddb5 = function(arg0, arg1) {
        getObject(arg0).texture = getObject(arg1);
    };
    imports.wbg.__wbg_set_timestamp_writes_db44391e390948e2 = function(arg0, arg1) {
        getObject(arg0).timestampWrites = getObject(arg1);
    };
    imports.wbg.__wbg_set_type_0a9fcee42b714ba8 = function(arg0, arg1) {
        getObject(arg0).type = __wbindgen_enum_GpuBufferBindingType[arg1];
    };
    imports.wbg.__wbg_set_type_ba111b7f1813a222 = function(arg0, arg1) {
        getObject(arg0).type = __wbindgen_enum_GpuSamplerBindingType[arg1];
    };
    imports.wbg.__wbg_set_usage_0f3970011718ab12 = function(arg0, arg1) {
        getObject(arg0).usage = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_usage_49bed7c9b47e7849 = function(arg0, arg1) {
        getObject(arg0).usage = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_usage_8a5ac4564d826d9d = function(arg0, arg1) {
        getObject(arg0).usage = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_view_dimension_2e3a58d96671f97a = function(arg0, arg1) {
        getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    };
    imports.wbg.__wbg_set_view_dimension_88c1a47ce71f7839 = function(arg0, arg1) {
        getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    };
    imports.wbg.__wbg_set_view_formats_dbd4d0d50ed403ff = function(arg0, arg1) {
        getObject(arg0).viewFormats = getObject(arg1);
    };
    imports.wbg.__wbg_set_visibility_f4f66940005e5c39 = function(arg0, arg1) {
        getObject(arg0).visibility = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_width_64c5783b064042bc = function(arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_x_d5236bf9391eb053 = function(arg0, arg1) {
        getObject(arg0).x = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_y_413262ade3cc0d56 = function(arg0, arg1) {
        getObject(arg0).y = arg1 >>> 0;
    };
    imports.wbg.__wbg_set_z_a136ba9bd16085f0 = function(arg0, arg1) {
        getObject(arg0).z = arg1 >>> 0;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_769e6b65d6557335 = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1 = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_08f5a74c69739274 = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_a8924b26aa92d024 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_status_c547ab1614ba835e = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).status;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_subarray_845f2f5bce7d061a = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_submit_068b03683463d934 = function(arg0, arg1) {
        getObject(arg0).submit(getObject(arg1));
    };
    imports.wbg.__wbg_then_429f7caf1026411d = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_4f95312d68691235 = function(arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_toISOString_eca15cbe422eeea5 = function(arg0) {
        const ret = getObject(arg0).toISOString();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_value_57b7b035e117f7ee = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_c01dfd4722a88165 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_warn_6e567d0d926ff881 = function(arg0) {
        console.warn(getObject(arg0));
    };
    imports.wbg.__wbg_writeBuffer_b479dd5b90cd43eb = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).writeBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_writeTexture_c70826cc2ae8e127 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).writeTexture(getObject(arg1), getObject(arg2), getObject(arg3), getObject(arg4));
    }, arguments) };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
        // Cast intrinsic for `U64 -> Externref`.
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_77bc3e92745e9a35 = function(arg0, arg1) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export4(arg0, arg1 * 1, 1);
        // Cast intrinsic for `Vector(U8) -> Externref`.
        const ret = v0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_9ae0607507abb057 = function(arg0) {
        // Cast intrinsic for `I64 -> Externref`.
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_9d97beea3493d3db = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 212, function: Function { arguments: [Externref], shim_idx: 213, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.__wasm_bindgen_func_elem_2617, __wasm_bindgen_func_elem_2633);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_cb9088102bce6b30 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
        const ret = getArrayU8FromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;



    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('udoc_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
