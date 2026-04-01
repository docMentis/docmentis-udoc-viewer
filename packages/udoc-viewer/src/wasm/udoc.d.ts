/* tslint:disable */
/* eslint-disable */
export type JsViewerLayoutMode = "single-page" | "double-page-odd-right" | "double-page-odd-left";

export type JsViewerScrollMode = "spread" | "continuous";

export interface JsViewerPreferences {
    layoutMode?: JsViewerLayoutMode;
    scrollMode?: JsViewerScrollMode;
}


export type Orientation = "horizontal" | "vertical";
export type SideDirection = "left" | "right" | "up" | "down";
export type CornerDirection = "leftUp" | "rightUp" | "leftDown" | "rightDown";
export type EightDirection = SideDirection | CornerDirection;
export type InOutDirection = "in" | "out";
export type RippleDirection = "center" | CornerDirection;
export type GlitterPattern = "diamond" | "hexagon";
export type ShredPattern = "strip" | "rectangle";
export type MorphOption = "byObject" | "byWord" | "byChar";

export type TransitionEffect =
  // ECMA-376 base effects
  | { type: "blinds"; orientation: Orientation }
  | { type: "checker"; orientation: Orientation }
  | { type: "circle" }
  | { type: "dissolve" }
  | { type: "comb"; orientation: Orientation }
  | { type: "cover"; direction: EightDirection }
  | { type: "cut"; throughBlack: boolean }
  | { type: "diamond" }
  | { type: "fade"; throughBlack: boolean }
  | { type: "newsflash" }
  | { type: "plus" }
  | { type: "pull"; direction: EightDirection }
  | { type: "push"; direction: SideDirection }
  | { type: "random" }
  | { type: "randomBar"; orientation: Orientation }
  | { type: "split"; orientation: Orientation; inOut: InOutDirection }
  | { type: "strips"; direction: CornerDirection }
  | { type: "wedge" }
  | { type: "wheel"; spokes: number }
  | { type: "wipe"; direction: SideDirection }
  | { type: "zoom"; inOut: InOutDirection }
  // PDF-only effects
  | { type: "box"; inOut: InOutDirection }
  | { type: "glitter"; direction: SideDirection; pattern: GlitterPattern }
  | { type: "fly"; direction: SideDirection }
  | { type: "uncover"; direction: EightDirection }
  | { type: "replace" }
  // PPTX 2010+ effects (p14)
  | { type: "vortex"; direction: SideDirection }
  | { type: "switch"; direction: SideDirection }
  | { type: "flip"; direction: SideDirection }
  | { type: "ripple"; direction: RippleDirection }
  | { type: "honeycomb" }
  | { type: "prism"; direction: SideDirection; isContent: boolean; isInverted: boolean }
  | { type: "doors"; orientation: Orientation }
  | { type: "window"; orientation: Orientation }
  | { type: "ferris"; direction: SideDirection }
  | { type: "gallery"; direction: SideDirection }
  | { type: "conveyor"; direction: SideDirection }
  | { type: "pan"; direction: SideDirection }
  | { type: "warp"; inOut: InOutDirection }
  | { type: "flythrough"; inOut: InOutDirection; hasBounce: boolean }
  | { type: "flash" }
  | { type: "shred"; pattern: ShredPattern; inOut: InOutDirection }
  | { type: "reveal"; throughBlack: boolean; direction: SideDirection }
  | { type: "wheelReverse"; spokes: number }
  // PPTX 2015+ effects (p159)
  | { type: "morph"; option: MorphOption };

export interface PageTransition {
  effect: TransitionEffect;
  durationMs?: number;
  advanceOnClick?: boolean;
  advanceAfterMs?: number;
}

export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
  transition?: PageTransition;
}

export type FontSource = "embedded" | "standard" | "googleFonts" | "url" | "local" | { custom: string };

export interface ResolvedFontInfo {
  familyName: string;
  postscriptName?: string;
  source: FontSource;
  bold: boolean;
  italic: boolean;
}

export interface FontUsageEntry {
  /** What the document requested (e.g. "Calibri", bold, italic) */
  spec: { typeface: string; bold: boolean; italic: boolean } | { fontId: string };
  /** Primary resolution result */
  resolved: ResolvedFontInfo;
  /** Additional fonts used via glyph fallback */
  fallbacks: ResolvedFontInfo[];
}


export interface JsLayoutTable {
    width: number;
    height: number;
    columns: JsLayoutTableColumn[];
    rows: JsLayoutTableRow[];
}

export interface JsLayoutTableColumn {
    x: number;
    width: number;
}

export interface JsLayoutTableRow {
    y: number;
    height: number;
    cells: JsLayoutTableCell[];
}

export interface JsLayoutLine {
    y: number;
    width: number;
    height: number;
    spaceBefore: number;
    spaceAfter: number;
    isFirstLineOfPara: boolean;
    isLastLineOfPara: boolean;
    content: JsLayoutLineContent;
}

export type JsLayoutLineContent = ({ type: "runList" } & JsLayoutRunList) | ({ type: "table" } & JsLayoutTable);

export interface JsLayoutRunList {
    baseline: number;
    width: number;
    height: number;
    runs: JsLayoutRun[];
}

export interface JsLayoutGrid {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    columns: JsLayoutGridColumn[];
    rows: JsLayoutGridRow[];
}

export interface JsLayoutParcel {
    x: number;
    y: number;
    width: number;
    height: number;
    lines: JsLayoutLine[];
}

export type JsLayoutRunContent = { type: "glyphs"; text: string; fontSize: number; ascent: number; descent: number; glyphs: JsLayoutGlyph[] } | { type: "space"; advance: number; fontSize: number; ascent: number; descent: number } | { type: "tab"; advance: number; fontSize: number; ascent: number; descent: number } | { type: "paragraphEnd"; advance: number } | { type: "break" } | { type: "inlineDrawing"; width: number; height: number };

export interface JsLayoutPage {
    width: number;
    height: number;
    frames: JsLayoutFrame[];
    grid?: JsLayoutGrid;
}

export interface JsLayoutGridColumn {
    x: number;
    width: number;
}

export interface JsLayoutGlyph {
    x: number;
    y: number;
    advance: number;
    /**
     * Byte offset of this glyph\'s source character relative to the parent run\'s text.
     */
    offset: number;
}

export interface JsTransform {
    scaleX: number;
    skewY: number;
    skewX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
}

export interface JsLayoutRun {
    x: number;
    width: number;
    transform: JsTransform;
    content: JsLayoutRunContent;
}

export interface JsLayoutGridCell {
    colIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    parcel?: JsLayoutParcel;
}

export interface JsLayoutFrame {
    transform: JsTransform;
    parcel?: JsLayoutParcel;
}

export interface JsLayoutTableCell {
    colIndex: number;
    colSpan: number;
    rowSpan: number;
    x: number;
    y: number;
    width: number;
    height: number;
    parcel?: JsLayoutParcel;
}

export interface JsLayoutGridRow {
    y: number;
    height: number;
    cells: JsLayoutGridCell[];
}


export class Wasm {
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
   *
   * # Returns
   * License validation result as JSON.
   */
  set_license(license_key: string): any;
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
   * Returns an array of `PageInfo` objects, one per page.
   * More efficient than calling `page_info` for each page.
   */
  all_page_info(id: string): PageInfo[];
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
   */
  get_font_usage(id: string): any;
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
   */
  registerFonts(fonts: any): void;
  /**
   * Get the format of a loaded document.
   *
   * Returns one of: "pdf", "docx", "pptx", "xlsx", "image".
   */
  document_format(id: string): string;
  /**
   * Get the layout model for a specific page.
   *
   * Returns the hierarchical layout structure (frames, parcels, lines, runs,
   * glyphs, tables, grids) without building the full display list. This is
   * more efficient than `get_page_text` for text selection/search and
   * preserves semantic structure (paragraphs, tables, etc.).
   *
   * All coordinates are in points (1/72 inch). The viewer should scale by
   * `canvasWidth / layoutPage.width` to convert to pixels.
   */
  get_layout_page(id: string, page_index: number): JsLayoutPage;
  /**
   * Remove a document by ID.
   *
   * Returns true if the document was removed, false if it didn't exist.
   */
  remove_document(id: string): boolean;
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
   */
  render_page_gpu(id: string, page_index: number, width: number, height: number): Promise<Uint8Array>;
  /**
   * Set the anonymous distinct ID for telemetry tracking.
   *
   * Call this after `new()` once the ID has been read from localStorage
   * (or generated). Must be called before loading documents so that
   * telemetry events include the correct metadata.
   *
   * # Arguments
   * * `distinct_id` - Anonymous UUID for per-user tracking (persisted in localStorage)
   */
  setup_telemetry(distinct_id: string): void;
  /**
   * Disable telemetry reporting.
   *
   * Only takes effect if the current license includes the `no_telemetry`
   * feature flag. Returns `true` if telemetry was disabled, `false` if the
   * license does not permit it.
   */
  disable_telemetry(): boolean;
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
   * Get viewer preferences embedded in the document.
   *
   * Returns a `JsViewerPreferences` with optional fields:
   * - `layoutMode`: `"single-page"` | `"double-page-odd-right"` | `"double-page-odd-left"`
   * - `scrollMode`: `"spread"` | `"continuous"`
   */
  viewer_preferences(id: string): JsViewerPreferences;
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
  enableGoogleFonts(): void;
  /**
   * Get all annotations in the document, grouped by page index.
   *
   * Returns an object mapping page indices (as strings) to arrays of annotations.
   */
  get_all_annotations(id: string): any;
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
   * Get all visibility groups for a document.
   *
   * Returns an array of objects, each containing:
   * - `id`: Unique identifier string
   * - `name`: Display name for UI
   * - `visible`: Whether the group is currently visible
   *
   * Returns an empty array for documents without visibility groups.
   */
  get_visibility_groups(id: string): any;
  /**
   * Set the visibility of a specific visibility group.
   *
   * # Arguments
   * * `id` - Document ID
   * * `group_id` - Visibility group ID
   * * `visible` - Whether the group should be visible
   *
   * Returns `true` if the group was found and updated, `false` if not found.
   */
  set_visibility_group_visible(id: string, group_id: string, visible: boolean): boolean;
  /**
   * Create a new document viewer.
   *
   * # Arguments
   * * `domain` - Hostname of the embedding page (e.g. from `window.location.hostname`)
   * * `viewer_version` - SDK version string
   */
  constructor(domain: string, viewer_version: string);
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
   */
  load(bytes: Uint8Array): string;
  /**
   * Check whether the GPU render backend is available.
   */
  has_gpu(): boolean;
  /**
   * Initialize the GPU render backend (Vello + WebGPU).
   *
   * This is async because wgpu device initialization requires yielding
   * to the browser event loop. Call this once after construction.
   * Returns `true` if GPU initialization succeeded, `false` if no
   * WebGPU adapter is available (the CPU backend remains usable).
   */
  init_gpu(): Promise<boolean>;
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
   * Get the raw file bytes of a document.
   *
   * Returns the original file data for the document.
   */
  get_bytes(id: string): Uint8Array;
  /**
   * Get a numeric limit from the current license.
   *
   * Returns the limit value if set in the license, otherwise returns the default.
   */
  get_limit(limit_name: string, _default: bigint): bigint;
  /**
   * Load a DOCX document and return its ID.
   *
   * # Arguments
   * * `bytes` - Raw DOCX file data
   *
   * # Returns
   * A unique document ID that can be used to reference this document.
   */
  load_docx(bytes: Uint8Array): string;
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
   * Load an XLSX document and return its ID.
   *
   * # Arguments
   * * `bytes` - Raw XLSX file data
   *
   * # Returns
   * A unique document ID that can be used to reference this document.
   */
  load_xlsx(bytes: Uint8Array): string;
  /**
   * Get info for a specific page.
   */
  page_info(id: string, page_index: number): PageInfo;
  /**
   * Get the number of documents currently loaded.
   */
  readonly document_count: number;
}

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
 */
export function parseFontInfo(data: Uint8Array): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_wasm_free: (a: number, b: number) => void;
  readonly parseFontInfo: (a: number, b: number, c: number) => void;
  readonly wasm_all_page_info: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_authenticate: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasm_disable_telemetry: (a: number) => number;
  readonly wasm_document_count: (a: number) => number;
  readonly wasm_document_format: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_document_ids: (a: number, b: number) => void;
  readonly wasm_enableGoogleFonts: (a: number) => void;
  readonly wasm_get_all_annotations: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_get_bytes: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_get_font_usage: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_get_layout_page: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_get_limit: (a: number, b: number, c: number, d: bigint) => bigint;
  readonly wasm_get_outline: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_get_page_annotations: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_get_visibility_groups: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_has_document: (a: number, b: number, c: number) => number;
  readonly wasm_has_feature: (a: number, b: number, c: number) => number;
  readonly wasm_has_gpu: (a: number) => number;
  readonly wasm_init_gpu: (a: number) => number;
  readonly wasm_license_status: (a: number, b: number) => void;
  readonly wasm_load: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_load_docx: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_load_image: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_load_pdf: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_load_pptx: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_load_xlsx: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_needs_password: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_new: (a: number, b: number, c: number, d: number) => number;
  readonly wasm_page_count: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_page_info: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_pdf_compose: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_compress: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_decompress: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_extract_fonts: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_extract_images: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_pdf_split_by_outline: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasm_registerFonts: (a: number, b: number, c: number) => void;
  readonly wasm_remove_document: (a: number, b: number, c: number) => number;
  readonly wasm_render_page_gpu: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly wasm_render_page_to_png: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_render_page_to_rgba: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_set_license: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_set_visibility_group_visible: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_setup_telemetry: (a: number, b: number, c: number) => void;
  readonly wasm_viewer_preferences: (a: number, b: number, c: number, d: number) => void;
  readonly __wasm_bindgen_func_elem_2703: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_2687: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_16901: (a: number, b: number, c: number, d: number) => void;
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
