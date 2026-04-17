/* tslint:disable */
/* eslint-disable */
/**
 * Rectangle differences for JavaScript serialization.
 */
export interface JsRectDifferences {
    left: number;
    bottom: number;
    right: number;
    top: number;
}

/**
 * Point for JavaScript serialization.
 */
export interface JsPoint {
    x: number;
    y: number;
}

/**
 * RGB color for JavaScript serialization (values 0.0-1.0).
 */
export interface JsColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Quadrilateral for JavaScript serialization (used in text markup annotations).
 */
export interface JsQuad {
    /**
     * Four corner points: [bottom-left, bottom-right, top-right, top-left]
     */
    points: [JsPoint, JsPoint, JsPoint, JsPoint];
}

/**
 * Link action for JavaScript serialization.
 */
export type JsLinkAction = { actionType: "goTo"; destination: JsDestination } | { actionType: "uri"; uri: string };

/**
 * Markup metadata for JavaScript serialization (author, subject, contents, state).
 */
export interface JsMarkupMetadata {
    author?: string;
    subject?: string;
    contents?: string;
    /**
     * Annotation state (e.g., \"Accepted\", \"Rejected\", \"Completed\", \"Marked\").
     */
    state?: string;
    /**
     * State model (e.g., \"Review\" or \"Marked\").
     */
    stateModel?: string;
    creationDate?: string;
    /**
     * Reply type: \"reply\" or \"group\".
     */
    replyType?: string;
    intent?: string;
    richContents?: string;
}

/**
 * Annotation for JavaScript serialization.
 */
export interface JsAnnotation extends JsAnnotationType {
    /**
     * Bounding rectangle in page coordinates.
     */
    bounds: JsRect;
    /**
     * Reply annotations nested under this annotation.
     * These are comments/replies displayed in comment threads.
     */
    replies?: JsAnnotation[];
    /**
     * Metadata for markup annotations (author, subject, contents, state).
     */
    metadata?: JsMarkupMetadata;
    /**
     * Unique annotation name/identifier (NM field).
     */
    name?: string;
    /**
     * Last modification date (M field).
     */
    modificationDate?: string;
}

/**
 * Annotation type for JavaScript serialization.
 */
export type JsAnnotationType = { type: "link"; action: JsLinkAction } | { type: "highlight"; quads: JsQuad[]; color?: JsColor; opacity?: number } | { type: "underline"; quads: JsQuad[]; color?: JsColor; opacity?: number } | { type: "strikeOut"; quads: JsQuad[]; color?: JsColor; opacity?: number } | { type: "squiggly"; quads: JsQuad[]; color?: JsColor; opacity?: number } | { type: "text"; icon: string; open: boolean; color?: JsColor; opacity?: number } | { type: "freeText"; contents?: string; justification: string; defaultAppearance?: string; color?: JsColor; borderColor?: JsColor; calloutLine?: JsPoint[]; opacity?: number; defaultStyle?: string; lineEnding?: string; rectDifferences?: JsRectDifferences } | { type: "stamp"; name?: string; hasCustomAppearance: boolean; color?: JsColor; opacity?: number } | { type: "line"; start: JsPoint; end: JsPoint; startEnding: string; endEnding: string; color?: JsColor; interiorColor?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; opacity?: number; leaderLength?: number; leaderExtension?: number; leaderOffset?: number; caption?: boolean; captionPosition?: string; captionOffset?: [number, number] } | { type: "square"; color?: JsColor; interiorColor?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; opacity?: number; rectDifferences?: JsRectDifferences } | { type: "circle"; color?: JsColor; interiorColor?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; opacity?: number; rectDifferences?: JsRectDifferences } | { type: "polygon"; vertices: JsPoint[]; color?: JsColor; interiorColor?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; startEnding: string; endEnding: string; opacity?: number } | { type: "polyLine"; vertices: JsPoint[]; color?: JsColor; interiorColor?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; startEnding: string; endEnding: string; opacity?: number } | { type: "ink"; inkList: JsPoint[][]; color?: JsColor; borderWidth?: number; borderStyle: string; dashPattern?: number[]; opacity?: number } | { type: "caret"; symbol: string; color?: JsColor; opacity?: number; rectDifferences?: JsRectDifferences } | { type: "redact"; quads: JsQuad[]; interiorColor?: JsColor; overlayText?: string; justification: string; repeat: boolean; color?: JsColor; opacity?: number; defaultAppearance?: string };

/**
 * Rectangle for JavaScript serialization.
 */
export interface JsRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface JsViewerPreferences {
    layoutMode?: JsViewerLayoutMode;
    scrollMode?: JsViewerScrollMode;
}

export type JsViewerLayoutMode = "single-page" | "double-page-odd-right" | "double-page-odd-left";

export type JsViewerScrollMode = "spread" | "continuous";

/**
 * A pick specification from JavaScript.
 */
export interface JsPick {
    /**
     * Document index (0-based, referring to documents in doc_ids array)
     */
    doc: number;
    /**
     * Page range string (0-based, e.g., \"0-2,4\")
     */
    pages: string;
    /**
     * Optional rotation in degrees (0, 90, 180, or 270)
     */
    rotation: number | undefined;
}

export type JsShredPattern = "strip" | "rectangle";

/**
 * Font spec for JavaScript serialization.
 */
export type JsFontSpec = { typeface: string; bold: boolean; italic: boolean } | { fontId: string };

/**
 * Visibility group info for serialization to JavaScript.
 */
export interface JsVisibilityGroup {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
}

/**
 * Result from pdf_split_by_outline.
 */
export interface JsSplitByOutlineResult {
    documentIds: string[];
    sections: JsOutlineSection[];
}

/**
 * Annotations grouped by page index (as string keys).
 */
export type JsAnnotationsByPage = Record<string, JsAnnotation[]>;

export type JsEightDirection = "left" | "right" | "up" | "down" | "leftUp" | "rightUp" | "leftDown" | "rightDown";

export type JsCornerDirection = "leftUp" | "rightUp" | "leftDown" | "rightDown";

export type JsOrientation = "horizontal" | "vertical";

/**
 * Outline section info for split_by_outline results.
 */
export interface JsOutlineSection {
    title: string;
    index: number;
}

/**
 * Tile position in a 2D page grid.
 */
export interface JsTilePos {
    row: number;
    col: number;
}

/**
 * Font info returned by `parseFontInfo`.
 */
export interface JsParsedFontInfo {
    typeface: string;
    bold: boolean;
    italic: boolean;
}

export type JsInOutDirection = "in" | "out";

export type JsSideDirection = "left" | "right" | "up" | "down";

/**
 * Resolved font info for JavaScript serialization.
 */
export interface JsResolvedFontInfo {
    familyName: string;
    postscriptName?: string;
    source: JsFontSource;
    bold: boolean;
    italic: boolean;
}

/**
 * A simple rectangle for serialization to JavaScript.
 */
export interface JsRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Page transition info for serialization to JavaScript.
 *
 * The `effect` field is a discriminated union tagged by `type`, e.g.:
 * `{ effect: { type: \"fade\", throughBlack: true }, durationMs: 500 }`
 */
export interface JsPageTransition {
    /**
     * The visual transition effect (discriminated union tagged by `type`).
     */
    effect: JsTransitionEffect;
    /**
     * Duration of the transition animation in milliseconds.
     */
    durationMs?: number;
    /**
     * Whether clicking advances to the next page.
     */
    advanceOnClick?: boolean;
    /**
     * Auto-advance after this many milliseconds.
     */
    advanceAfterMs?: number;
}

export type JsMorphOption = "byObject" | "byWord" | "byChar";

/**
 * Extracted image info for JavaScript.
 */
export interface JsExtractedImage {
    name: string;
    format: string;
    width: number | undefined;
    height: number | undefined;
    data: number[];
}

/**
 * Nested `Vec<Vec<T>>` can\'t cross the WASM boundary directly, so we use a
 * transparent Tsify wrapper.
 */
export type JsCompositions = JsPick[][];

/**
 * Font source for JavaScript serialization.
 */
export type JsFontSource = "embedded" | "standard" | "googleFonts" | "url" | "local" | { custom: string };

/**
 * Font registration entry from JavaScript.
 */
export interface JsFontRegistration {
    typeface: string;
    bold: boolean;
    italic: boolean;
    url: string;
}

/**
 * Extracted font info for JavaScript.
 */
export interface JsExtractedFont {
    name: string;
    fontType: string;
    extension: string;
    data: number[];
}

export type JsGlitterPattern = "diamond" | "hexagon";

/**
 * Page info for serialization to JavaScript.
 */
export interface JsPageInfo {
    width: number;
    height: number;
    /**
     * Rotation in degrees (0, 90, 180, or 270)
     */
    rotation: number;
    /**
     * Transition effect metadata (None when no transition is defined).
     */
    transition?: JsPageTransition;
    /**
     * Content area for continuous mode cropping (DOCX body bounds, XLSX grid area).
     * Absent for PDF/PPTX where the full page is the content.
     */
    contentRect?: JsRect;
    /**
     * Tile position in a 2D page grid (XLSX only).
     * Absent for linear formats (PDF, PPTX, DOCX).
     */
    tilePos?: JsTilePos;
}

/**
 * Font usage entry for JavaScript serialization.
 */
export interface JsFontUsageEntry {
    spec: JsFontSpec;
    resolved: JsResolvedFontInfo;
    fallbacks: JsResolvedFontInfo[];
}

export type JsRippleDirection = "center" | "leftUp" | "rightUp" | "leftDown" | "rightDown";

/**
 * Transition effect as a discriminated union (tagged by `type`).
 */
export type JsTransitionEffect = { type: "blinds"; orientation: JsOrientation } | { type: "checker"; orientation: JsOrientation } | { type: "circle" } | { type: "dissolve" } | { type: "comb"; orientation: JsOrientation } | { type: "cover"; direction: JsEightDirection } | { type: "cut"; throughBlack: boolean } | { type: "diamond" } | { type: "fade"; throughBlack: boolean } | { type: "newsflash" } | { type: "plus" } | { type: "pull"; direction: JsEightDirection } | { type: "push"; direction: JsSideDirection } | { type: "random" } | { type: "randomBar"; orientation: JsOrientation } | { type: "split"; orientation: JsOrientation; inOut: JsInOutDirection } | { type: "strips"; direction: JsCornerDirection } | { type: "wedge" } | { type: "wheel"; spokes: number } | { type: "wipe"; direction: JsSideDirection } | { type: "zoom"; inOut: JsInOutDirection } | { type: "box"; inOut: JsInOutDirection } | { type: "glitter"; direction: JsSideDirection; pattern: JsGlitterPattern } | { type: "fly"; direction: JsSideDirection } | { type: "uncover"; direction: JsEightDirection } | { type: "replace" } | { type: "vortex"; direction: JsSideDirection } | { type: "switch"; direction: JsSideDirection } | { type: "flip"; direction: JsSideDirection } | { type: "ripple"; direction: JsRippleDirection } | { type: "honeycomb" } | { type: "prism"; direction: JsSideDirection; isContent: boolean; isInverted: boolean } | { type: "doors"; orientation: JsOrientation } | { type: "window"; orientation: JsOrientation } | { type: "ferris"; direction: JsSideDirection } | { type: "gallery"; direction: JsSideDirection } | { type: "conveyor"; direction: JsSideDirection } | { type: "pan"; direction: JsSideDirection } | { type: "warp"; inOut: JsInOutDirection } | { type: "flythrough"; inOut: JsInOutDirection; hasBounce: boolean } | { type: "flash" } | { type: "shred"; pattern: JsShredPattern; inOut: JsInOutDirection } | { type: "reveal"; throughBlack: boolean; direction: JsSideDirection } | { type: "wheelReverse"; spokes: number } | { type: "morph"; option: JsMorphOption };

export interface JsLayoutGlyph {
    x: number;
    y: number;
    advance: number;
    /**
     * Byte offset of this glyph\'s source character relative to the parent run\'s text.
     */
    offset: number;
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

export interface JsLayoutParcel {
    x: number;
    y: number;
    width: number;
    height: number;
    lines: JsLayoutLine[];
}

export interface JsLayoutTableRow {
    y: number;
    height: number;
    cells: JsLayoutTableCell[];
}

export type JsLayoutRunContent = { type: "glyphs"; text: string; fontSize: number; ascent: number; descent: number; glyphs: JsLayoutGlyph[] } | { type: "space"; advance: number; fontSize: number; ascent: number; descent: number } | { type: "tab"; advance: number; fontSize: number; ascent: number; descent: number } | { type: "paragraphEnd"; advance: number } | { type: "break" } | { type: "inlineDrawing"; width: number; height: number };

export type JsLayoutLineContent = ({ type: "runList" } & JsLayoutRunList) | ({ type: "table" } & JsLayoutTable);

export interface JsLayoutTable {
    width: number;
    height: number;
    columns: JsLayoutTableColumn[];
    rows: JsLayoutTableRow[];
}

export interface JsLayoutGridCell {
    colIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    parcel?: JsLayoutParcel;
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

export interface JsLayoutFrame {
    transform: JsTransform;
    parcel?: JsLayoutParcel;
}

export interface JsLayoutTableColumn {
    x: number;
    width: number;
}

export interface JsLayoutRunList {
    baseline: number;
    width: number;
    height: number;
    runs: JsLayoutRun[];
}

export interface JsTransform {
    scaleX: number;
    skewY: number;
    skewX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
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

export interface JsLayoutGridColumn {
    x: number;
    width: number;
}

export interface JsLayoutRun {
    x: number;
    width: number;
    transform: JsTransform;
    content: JsLayoutRunContent;
}

export interface JsLayoutGridRow {
    y: number;
    height: number;
    cells: JsLayoutGridCell[];
}

export interface JsLayoutPage {
    width: number;
    height: number;
    frames: JsLayoutFrame[];
    grid?: JsLayoutGrid;
}

/**
 * Result returned to JavaScript after license validation.
 */
export interface LicenseResult {
    /**
     * Whether the license is valid.
     */
    valid: boolean;
    /**
     * Error message if validation failed.
     */
    error?: string;
    /**
     * Enabled features.
     */
    features: string[];
    /**
     * Numeric limits.
     */
    limits: Record<string, number>;
    /**
     * Organization name.
     */
    organization?: string;
    /**
     * Expiry timestamp (Unix seconds), if set.
     */
    expiresAt?: number;
}

/**
 * Destination for JavaScript serialization.
 */
export interface JsDestination {
    pageIndex: number;
    display: JsDestinationDisplay;
}

/**
 * Destination display parameters for JavaScript serialization.
 */
export type JsDestinationDisplay = { type: "xyz"; left: number | undefined; top: number | undefined; zoom: number | undefined } | { type: "fit" } | { type: "fitH"; top: number | undefined } | { type: "fitV"; left: number | undefined } | { type: "fitR"; left: number; top: number; right: number; bottom: number } | { type: "fitB" } | { type: "fitBH"; top: number | undefined } | { type: "fitBV"; left: number | undefined };

/**
 * Outline item for JavaScript serialization.
 */
export interface JsOutlineItem {
    title: string;
    destination?: JsDestination;
    children: JsOutlineItem[];
    /**
     * Whether this item should be initially collapsed in the viewer.
     */
    initiallyCollapsed: boolean;
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
  get_outline(id: string): JsOutlineItem[];
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
  pdf_compose(compositions: JsCompositions, doc_ids: string[]): string[];
  /**
   * Set the license key.
   *
   * # Arguments
   * * `license_key` - The license key string
   *
   * # Returns
   * License validation result as JSON.
   */
  set_license(license_key: string): LicenseResult;
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
  all_page_info(id: string): JsPageInfo[];
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
  get_font_usage(id: string): JsFontUsageEntry[];
  /**
   * Get current license status.
   */
  license_status(): LicenseResult;
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
  registerFonts(fonts: JsFontRegistration[]): void;
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
  pdf_extract_fonts(doc_id: string): JsExtractedFont[];
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
  pdf_extract_images(doc_id: string, convert_raw_to_png: boolean): JsExtractedImage[];
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
  get_all_annotations(id: string): JsAnnotationsByPage;
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
  get_page_annotations(id: string, page_index: number): JsAnnotation[];
  /**
   * Save annotations back to a PDF document.
   *
   * Takes the current document and a set of annotations (grouped by page),
   * writes them into the PDF's annotation structures, and returns the
   * modified PDF bytes.
   *
   * # Arguments
   * * `doc_id` - Document ID
   * * `annotations_by_page` - Object mapping page indices (as strings) to
   *   arrays of annotation objects. Same schema as returned by
   *   `get_all_annotations`.
   *
   * # Returns
   * The modified PDF file bytes with annotations saved.
   *
   * # Example (JavaScript)
   * ```js
   * const annotations = udoc.get_all_annotations(docId);
   * // ... viewer edits annotations ...
   * const pdfBytes = udoc.pdf_save_annotations(docId, annotations);
   * ```
   */
  pdf_save_annotations(doc_id: string, annotations_by_page: JsAnnotationsByPage): Uint8Array;
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
  pdf_split_by_outline(doc_id: string, max_level: number, split_mid_page: boolean): JsSplitByOutlineResult;
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
  get_visibility_groups(id: string): JsVisibilityGroup[];
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
  page_info(id: string, page_index: number): JsPageInfo;
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
export function parseFontInfo(data: Uint8Array): JsParsedFontInfo;

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
  readonly wasm_license_status: (a: number) => number;
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
  readonly wasm_pdf_compose: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_pdf_compress: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_decompress: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_extract_fonts: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_pdf_extract_images: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_pdf_save_annotations: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_pdf_split_by_outline: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasm_registerFonts: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_remove_document: (a: number, b: number, c: number) => number;
  readonly wasm_render_page_gpu: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly wasm_render_page_to_png: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_render_page_to_rgba: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_set_license: (a: number, b: number, c: number) => number;
  readonly wasm_set_visibility_group_visible: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasm_setup_telemetry: (a: number, b: number, c: number) => void;
  readonly wasm_viewer_preferences: (a: number, b: number, c: number, d: number) => void;
  readonly __wasm_bindgen_func_elem_4169: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_4153: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_22404: (a: number, b: number, c: number, d: number) => void;
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
