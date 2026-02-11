/* tslint:disable */
/* eslint-disable */

export class UDoc {
  free(): void;
  [Symbol.dispose](): void;
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
   */
  load_image(bytes: Uint8Array): string;
  /**
   * Get the page count of a document.
   */
  page_count(id: string): number;
  /**
   * Get the document outline (bookmarks/table of contents).
   *
   * Returns an array of outline items, where each item has:
   * - `title`: Display text for the item
   * - `destination`: Optional navigation destination with `pageIndex` and display parameters
   * - `children`: Nested child items
   *
   * Returns an empty array if the document has no outline.
   */
  get_outline(id: string): any;
  /**
   * Check if a feature is enabled by the current license.
   */
  has_feature(feature: string): boolean;
  /**
   * Get the preferred page layout for two-page viewing modes.
   *
   * Returns one of:
   * - `"default"` - Viewer decides based on document type
   * - `"odd-pages-right"` - Odd pages on right (page 1 alone, then 2|3, 4|5...)
   * - `"odd-pages-left"` - Odd pages on left (1|2, 3|4, 5|6...)
   */
  page_layout(id: string): string;
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
   */
  pdf_compose(compositions: any, doc_ids: any): any;
  /**
   * Set the license key.
   *
   * # Arguments
   * * `license_key` - The license key string
   * * `domain` - The current domain (from window.location.hostname)
   *
   * # Returns
   * License validation result as JSON.
   */
  set_license(license_key: string, domain: string): any;
  /**
   * Authenticate with a password to unlock an encrypted document.
   *
   * # Arguments
   * * `id` - Document ID
   * * `password` - Password to try
   *
   * # Returns
   * `true` if authentication succeeded, `false` if the password was incorrect.
   */
  authenticate(id: string, password: string): boolean;
  /**
   * Get all document IDs.
   */
  document_ids(): string[];
  /**
   * Check if a document with the given ID exists.
   */
  has_document(id: string): boolean;
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
   */
  pdf_compress(doc_id: string): Uint8Array;
  /**
   * Get info for all pages in one call.
   *
   * Returns an array of `{width, height, rotation}` objects, one per page.
   * More efficient than calling `page_info` for each page.
   */
  all_page_info(id: string): any;
  /**
   * Get text content for a specific page (for text selection).
   *
   * Returns an array of text runs, each containing:
   * - `text`: Unicode text string
   * - `glyphs`: Positioned glyphs with character mappings
   * - `fontSize`: Font size in points
   * - `transform`: Combined transform matrix
   */
  get_page_text(id: string, page_index: number): any;
  /**
   * Register a font from raw bytes.
   *
   * Use this to register external fonts (e.g., fetched from Google Fonts)
   * so they can be used for document rendering.
   *
   * # Arguments
   * * `id` - Document ID
   * * `typeface` - The typeface name (must match what's in the document)
   * * `bold` - Whether this is a bold variant
   * * `italic` - Whether this is an italic variant
   * * `bytes` - Raw font file data (TTF, OTF, WOFF, or WOFF2)
   *
   * # Example (JavaScript)
   * ```js
   * // Get required fonts
   * const fonts = udoc.getRequiredFonts(docId);
   *
   * // Fetch and register each font
   * for (const font of fonts) {
   *     const url = `https://fonts.googleapis.com/css2?family=${font.typeface}`;
   *     const fontBytes = await fetchFontBytes(url, font.bold, font.italic);
   *     udoc.registerFont(docId, font.typeface, font.bold, font.italic, fontBytes);
   * }
   *
   * // Now render with the registered fonts
   * const pixels = udoc.renderPageToRgba(docId, 0, 800, 600);
   * ```
   */
  registerFont(id: string, typeface: string, bold: boolean, italic: boolean, bytes: Uint8Array): void;
  /**
   * Get current license status.
   */
  license_status(): any;
  /**
   * Check if a document requires a password to open.
   *
   * Returns `true` if the document is encrypted and requires authentication
   * before pages can be loaded or rendered.
   */
  needs_password(id: string): boolean;
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
   */
  pdf_decompress(doc_id: string): Uint8Array;
  /**
   * Remove a document by ID.
   *
   * Returns true if the document was removed, false if it didn't exist.
   */
  remove_document(id: string): boolean;
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
   */
  pdf_extract_fonts(doc_id: string): any;
  /**
   * Get all external fonts required by the document.
   *
   * This scans all text content in loaded pages and returns font descriptors
   * for fonts that are:
   * - Not embedded in the document
   * - Not standard PDF fonts (Helvetica, Times, Courier, etc.)
   *
   * Use this to determine which fonts need to be fetched from external sources
   * (e.g., Google Fonts) before rendering.
   *
   * Note: This only scans pages that have been loaded. Call appropriate loading
   * methods first to ensure the pages you need are scanned.
   *
   * # Arguments
   * * `id` - Document ID
   *
   * # Returns
   * Array of font descriptors: `[{ typeface: "Roboto", bold: false, italic: false }, ...]`
   *
   * # Example (JavaScript)
   * ```js
   * // Load document
   * const docId = udoc.loadPdf(pdfBytes);
   *
   * // Load all pages to scan for fonts
   * const pageCount = udoc.pageCount(docId);
   * for (let i = 0; i < pageCount; i++) {
   *     udoc.renderPageToRgba(docId, i, 1, 1); // Minimal render to load page
   * }
   *
   * // Get required fonts
   * const fonts = udoc.getRequiredFonts(docId);
   * // fonts: [{ typeface: "Roboto", bold: false, italic: false }, ...]
   * ```
   */
  getRequiredFonts(id: string): any;
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
   */
  pdf_extract_images(doc_id: string, convert_raw_to_png: boolean): any;
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
   */
  render_page_to_png(id: string, page_index: number, width: number, height: number): Uint8Array;
  /**
   * Enable Google Fonts for a document.
   *
   * When enabled, fonts that are not embedded in the document will be
   * automatically fetched from Google Fonts during rendering.
   *
   * # Arguments
   * * `id` - Document ID
   *
   * # Example (JavaScript)
   * ```js
   * // Enable Google Fonts for the document
   * udoc.enableGoogleFonts(docId);
   *
   * // Now render pages - fonts will be fetched automatically
   * const pixels = udoc.renderPageToRgba(docId, 0, 800, 600);
   * ```
   */
  enableGoogleFonts(id: string): void;
  /**
   * Get all annotations in the document, grouped by page index.
   *
   * Returns an object mapping page indices (as strings) to arrays of annotations.
   */
  get_all_annotations(id: string): any;
  /**
   * Check if a font is registered for a document.
   *
   * # Arguments
   * * `id` - Document ID
   * * `typeface` - The typeface name
   * * `bold` - Whether to check for bold variant
   * * `italic` - Whether to check for italic variant
   *
   * # Returns
   * `true` if the font is registered, `false` otherwise.
   */
  hasRegisteredFont(id: string, typeface: string, bold: boolean, italic: boolean): boolean;
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
   */
  render_page_to_rgba(id: string, page_index: number, width: number, height: number): Uint8Array;
  /**
   * Get annotations for a specific page.
   *
   * Returns an array of annotation objects for the given page.
   * Uses per-page loading for efficiency (only loads the requested page).
   */
  get_page_annotations(id: string, page_index: number): any;
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
   */
  pdf_split_by_outline(doc_id: string, max_level: number, split_mid_page: boolean): any;
  /**
   * Get the number of fonts registered for a document.
   *
   * # Arguments
   * * `id` - Document ID
   *
   * # Returns
   * The number of registered fonts.
   */
  registeredFontCount(id: string): number;
  /**
   * Create a new document viewer.
   */
  constructor();
  /**
   * Load a PDF document and return its ID.
   *
   * # Arguments
   * * `bytes` - Raw PDF file data
   *
   * # Returns
   * A unique document ID that can be used to reference this document.
   */
  load_pdf(bytes: Uint8Array): string;
  /**
   * Get the raw PDF bytes of a document.
   *
   * Returns the original PDF file data for the document.
   * Returns an error if the document is not a PDF.
   */
  get_bytes(id: string): Uint8Array;
  /**
   * Get a numeric limit from the current license.
   *
   * Returns the limit value if set in the license, otherwise returns the default.
   */
  get_limit(limit_name: string, _default: bigint): bigint;
  /**
   * Load a PPTX (PowerPoint) document and return its ID.
   *
   * # Arguments
   * * `bytes` - Raw PPTX file data
   *
   * # Returns
   * A unique document ID that can be used to reference this document.
   */
  load_pptx(bytes: Uint8Array): string;
  /**
   * Get info for a specific page.
   */
  page_info(id: string, page_index: number): any;
  /**
   * Get the number of documents currently loaded.
   */
  readonly document_count: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_udoc_free: (a: number, b: number) => void;
  readonly udoc_all_page_info: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_authenticate: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly udoc_document_count: (a: number) => number;
  readonly udoc_document_ids: (a: number, b: number) => void;
  readonly udoc_enableGoogleFonts: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_getRequiredFonts: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_get_all_annotations: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_get_bytes: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_get_limit: (a: number, b: number, c: number, d: bigint) => bigint;
  readonly udoc_get_outline: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_get_page_annotations: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly udoc_get_page_text: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly udoc_hasRegisteredFont: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly udoc_has_document: (a: number, b: number, c: number) => number;
  readonly udoc_has_feature: (a: number, b: number, c: number) => number;
  readonly udoc_license_status: (a: number, b: number) => void;
  readonly udoc_load_image: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_load_pdf: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_load_pptx: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_needs_password: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_new: () => number;
  readonly udoc_page_count: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_page_info: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly udoc_page_layout: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_pdf_compose: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_pdf_compress: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_pdf_decompress: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_pdf_extract_fonts: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_pdf_extract_images: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly udoc_pdf_split_by_outline: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly udoc_registerFont: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly udoc_registeredFontCount: (a: number, b: number, c: number, d: number) => void;
  readonly udoc_remove_document: (a: number, b: number, c: number) => number;
  readonly udoc_render_page_to_png: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly udoc_render_page_to_rgba: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly udoc_set_license: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly __wbindgen_export: (a: number, b: number) => number;
  readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export3: (a: number) => void;
  readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
