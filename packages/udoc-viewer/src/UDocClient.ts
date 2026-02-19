/**
 * UDocClient - SDK entry point for document viewing.
 *
 * Manages the WASM engine and provides document operations.
 */

import { WorkerClient } from "./worker/index.js";
import type {
  LicenseResult,
  Composition,
  ComposePick,
  ExtractedFont,
  ExtractedImage,
  SplitByOutlineResult,
} from "./worker/index.js";
import { UDocViewer } from "./UDocViewer.js";
import type { ScrollMode, LayoutMode, ZoomMode, PanelTab } from "./ui/viewer/state.js";
import type { PerformanceLogCallback } from "./performance/index.js";

/**
 * License information for the client.
 */
export interface LicenseInfo {
  /**
   * Whether the license is valid.
   */
  valid: boolean;

  /**
   * License tier: "free" (no license) or "licensed" (valid license).
   */
  tier: "free" | "licensed";

  /**
   * Enabled feature flags.
   */
  features: string[];

  /**
   * Numeric limits (e.g., max_file_size_mb).
   */
  limits: Record<string, number>;

  /**
   * Organization name from the license.
   */
  organization?: string;

  /**
   * When the license expires (if applicable).
   */
  expiresAt?: Date;

  /**
   * Error message if license validation failed.
   */
  error?: string;
}

/**
 * Options for creating a UDocClient.
 */
export interface ClientOptions {
  /**
   * License key for commercial use.
   * Client runs in trial mode if not provided.
   */
  license?: string;

  /**
   * Base URL for loading worker and WASM files.
   *
   * By default, files are loaded relative to the package location.
   *
   * Expected files at baseUrl:
   * - `{baseUrl}/worker.js`
   * - `{baseUrl}/udoc_bg.wasm`
   */
  baseUrl?: string;

  /**
   * Locale for UI strings and date formatting.
   * @default 'en'
   */
  locale?: string;
}

/**
 * Options for creating a viewer.
 */
export interface ViewerOptions {
  /**
   * Container element or CSS selector.
   * If not provided, viewer runs in headless mode (no UI).
   */
  container?: string | HTMLElement;

  /**
   * Scroll mode for page navigation.
   * @default ScrollMode.Continuous
   */
  scrollMode?: ScrollMode;

  /**
   * Page layout mode.
   * @default LayoutMode.SinglePage
   */
  layoutMode?: LayoutMode;

  /**
   * Zoom mode for automatic scaling.
   * @default ZoomMode.FitSpreadWidth
   */
  zoomMode?: ZoomMode;

  /**
   * Initial zoom level (when zoomMode is Custom).
   * @default 1
   */
  zoom?: number;

  /**
   * Custom zoom steps for zoom in/out.
   * @default DEFAULT_ZOOM_STEPS
   */
  zoomSteps?: readonly number[];

  /**
   * Spacing between pages in pixels.
   * @default 10
   */
  pageSpacing?: number;

  /**
   * Spacing between spreads in pixels.
   * @default 20
   */
  spreadSpacing?: number;

  /**
   * Initially active panel, or null for no panel.
   * @default null
   */
  activePanel?: PanelTab | null;

  /**
   * Target display DPI for rendering.
   * PDF points are 72 DPI; this setting determines the CSS pixel ratio.
   * Most displays use 96 DPI (CSS standard).
   * @default 96
   */
  dpi?: number;

  /**
   * Enable performance tracking for debugging and analytics.
   * When enabled, records timing for all major operations.
   * @default false
   */
  enablePerformanceCounter?: boolean;

  /**
   * Callback for performance log entries.
   * Called for each operation start/end when enablePerformanceCounter is true.
   */
  onPerformanceLog?: PerformanceLogCallback;

  /**
   * Enable Google Fonts for automatic font fetching.
   * When true, fonts not embedded in the document are fetched from Google Fonts
   * on-demand during rendering.
   * @default true
   */
  googleFonts?: boolean;
}

/**
 * A document source can be:
 * - URL string
 * - File object
 * - Raw bytes
 * - An existing viewer (uses its loaded document)
 */
export type DocumentSource = string | File | Uint8Array | UDocViewer;

/**
 * A pick specifies which pages to take from which document.
 */
export interface Pick {
  /**
   * Document source (viewer, URL, File, or bytes).
   */
  doc: DocumentSource;

  /**
   * Page range to pick. Can be:
   * - A string like "0-2,4" (0-based page indices)
   * - A single page index
   * - An array of page indices
   */
  pages: string | number | number[];

  /**
   * Optional rotation to apply to the picked pages.
   * Value in degrees: 0, 90, 180, or 270.
   */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Re-export low-level types for advanced usage.
 */
export type { Composition, ComposePick, ExtractedFont, ExtractedImage, SplitByOutlineResult };

/**
 * SDK entry point for document viewing.
 *
 * Manages the WASM engine, creates viewers, and provides document operations.
 */
export class UDocClient {
  /**
   * SDK version string (replaced at build time).
   */
  static readonly version: string = "__VERSION__";

  private workerClient: WorkerClient;
  private options: ClientOptions;
  private viewers: Set<UDocViewer> = new Set();
  private destroyed = false;
  private licenseInfo: LicenseInfo = {
    valid: true,
    tier: "free",
    features: [],
    limits: {},
  };

  private constructor(workerClient: WorkerClient, options: ClientOptions) {
    this.workerClient = workerClient;
    this.options = options;
  }

  /**
   * Create and initialize a client instance.
   * Loads the WASM engine.
   */
  static async create(options: ClientOptions = {}): Promise<UDocClient> {
    // Create worker client - use custom URL if provided, otherwise use bundled worker
    const workerClient = options.baseUrl
      ? WorkerClient.createWithUrl(new URL("worker.js", options.baseUrl))
      : WorkerClient.create();

    // Initialize WASM in the worker.
    // Try local resolution first (via dynamic import of meta-url.js which uses
    // import.meta.url — works in bundler environments like Vite/Webpack/Turbopack).
    // Falls back to jsDelivr CDN for environments that don't support import.meta
    // (e.g. StackBlitz). Users can always override with baseUrl.
    let wasmUrl: string;
    if (options.baseUrl) {
      wasmUrl = new URL("udoc_bg.wasm", options.baseUrl).href;
    } else {
      try {
        const meta = await import("./meta-url.js");
        wasmUrl = meta.wasmUrl;
      } catch {
        wasmUrl = `https://cdn.jsdelivr.net/npm/@docmentis/udoc-viewer@${UDocClient.version}/dist/src/wasm/udoc_bg.wasm`;
      }
    }
    await workerClient.init(wasmUrl);

    const client = new UDocClient(workerClient, options);

    // Validate license if provided
    if (options.license) {
      const domain = typeof window !== "undefined"
        ? window.location.hostname
        : "localhost";

      const result = await workerClient.setLicense(options.license, domain);
      client.licenseInfo = licenseResultToInfo(result);

      if (!result.valid) {
        console.warn(`[udoc-viewer] License validation failed: ${result.error}`);
      }
    }

    return client;
  }

  /**
   * Get current license information.
   */
  get license(): LicenseInfo {
    return { ...this.licenseInfo };
  }

  /**
   * Check if a feature is available with the current license.
   * @param feature - Feature name (e.g., "merge")
   */
  hasFeature(feature: string): boolean {
    return this.licenseInfo.features.includes(feature);
  }

  /**
   * Create a viewer instance.
   *
   * - With container: Full UI mode
   * - Without container: Headless mode (same API, no UI)
   */
  async createViewer(options: ViewerOptions = {}): Promise<UDocViewer> {
    this.ensureNotDestroyed();

    const viewer = new UDocViewer(this.workerClient, options);
    this.viewers.add(viewer);

    return viewer;
  }

  /**
   * Compose new documents by cherry-picking pages from source documents.
   *
   * This is a powerful method that allows creating new documents by selecting
   * specific pages from multiple source documents in any order. Pages can
   * optionally be rotated during composition.
   *
   * @param compositions - Array of compositions. Each composition creates one output document.
   *   Each composition is an array of picks specifying which pages from which documents.
   * @returns Array of viewers containing the composed documents
   *
   * @example
   * ```ts
   * // Create a document with pages 1-3 from viewer A and page 5 from viewer B
   * const [newDoc] = await client.compose([
   *   [
   *     { doc: viewerA, pages: "1-3" },
   *     { doc: viewerB, pages: "5" }
   *   ]
   * ]);
   *
   * // Create multiple documents at once
   * const [doc1, doc2] = await client.compose([
   *   [{ doc: viewerA, pages: "1" }],           // doc1: page 1 from A
   *   [{ doc: viewerA, pages: "2" }, { doc: viewerB, pages: "1" }]  // doc2: page 2 from A + page 1 from B
   * ]);
   *
   * // Rotate pages during composition
   * const [rotated] = await client.compose([
   *   [
   *     { doc: viewerA, pages: "1", rotation: 90 },   // rotate page 1 by 90 degrees
   *     { doc: viewerA, pages: "2", rotation: 180 }   // rotate page 2 by 180 degrees
   *   ]
   * ]);
   * ```
   */
  async compose(compositions: Pick[][]): Promise<UDocViewer[]> {
    this.ensureNotDestroyed();

    if (compositions.length === 0) {
      throw new Error("At least one composition is required");
    }

    // Collect all unique document sources and load them
    const sourceMap = new Map<DocumentSource, string>(); // source -> docId
    const docIds: string[] = [];

    for (const composition of compositions) {
      for (const pick of composition) {
        if (!sourceMap.has(pick.doc)) {
          const docId = await this.loadSource(pick.doc);
          sourceMap.set(pick.doc, docId);
          docIds.push(docId);
        }
      }
    }

    // Build source index map (source -> index in docIds array)
    const sourceIndexMap = new Map<DocumentSource, number>();
    let index = 0;
    for (const source of sourceMap.keys()) {
      sourceIndexMap.set(source, index++);
    }

    // Convert to low-level format
    const lowLevelCompositions: Composition[] = compositions.map(composition =>
      composition.map(pick => ({
        doc: sourceIndexMap.get(pick.doc)!,
        pages: this.normalizePages(pick.pages),
        rotation: pick.rotation,
      }))
    );

    // Execute compose
    const newDocIds = await this.workerClient.pdfCompose(lowLevelCompositions, docIds);

    // Unload temporary sources that weren't from viewers
    for (const [source, docId] of sourceMap) {
      if (!(source instanceof UDocViewer)) {
        await this.workerClient.unloadPdf(docId);
      }
    }

    // Create viewers for the composed documents
    const viewers: UDocViewer[] = [];
    for (const docId of newDocIds) {
      const viewer = new UDocViewer(this.workerClient, {});
      await viewer.initializeFromDocId(docId);
      this.viewers.add(viewer);
      viewers.push(viewer);
    }

    return viewers;
  }

  /**
   * Split a document by its outline (bookmarks) structure.
   *
   * Creates multiple documents, one for each outline section at the specified level.
   * The original document remains unchanged.
   *
   * @param source - Document source (viewer, URL, File, or bytes)
   * @param options - Split options
   * @param options.maxLevel - Maximum outline level to consider (1 = top level only, default: 1)
   * @param options.splitMidPage - When true, filters page content when sections share a page (default: false)
   * @returns Object with viewers array and sections metadata
   *
   * @example
   * ```ts
   * // Split a document by top-level bookmarks
   * const result = await client.splitByOutline(viewer);
   * console.log(`Split into ${result.viewers.length} documents`);
   * result.sections.forEach((section, i) => {
   *   console.log(`Document ${i}: ${section.title}`);
   * });
   *
   * // Split with mid-page content filtering
   * const result = await client.splitByOutline(viewer, { maxLevel: 2, splitMidPage: true });
   * ```
   */
  async splitByOutline(
    source: DocumentSource,
    options: { maxLevel?: number; splitMidPage?: boolean } = {}
  ): Promise<{ viewers: UDocViewer[]; sections: { title: string; index: number }[] }> {
    this.ensureNotDestroyed();

    const { maxLevel = 1, splitMidPage = false } = options;
    const docId = await this.loadSource(source);
    const isTemporary = !(source instanceof UDocViewer);

    try {
      const result = await this.workerClient.pdfSplitByOutline(docId, maxLevel, splitMidPage);

      // Create viewers for the split documents
      const viewers: UDocViewer[] = [];
      for (const newDocId of result.documentIds) {
        const viewer = new UDocViewer(this.workerClient, {});
        await viewer.initializeFromDocId(newDocId);
        this.viewers.add(viewer);
        viewers.push(viewer);
      }

      return {
        viewers,
        sections: result.sections,
      };
    } finally {
      // Unload temporary source
      if (isTemporary) {
        await this.workerClient.unloadPdf(docId);
      }
    }
  }

  /**
   * Extract all embedded images from a document.
   *
   * @param source - Document source (viewer, URL, File, or bytes)
   * @param options - Extract options
   * @param options.convertRawToPng - When true, converts raw pixel data to PNG format (default: false)
   * @returns Array of extracted images with metadata and data
   *
   * @example
   * ```ts
   * const images = await client.extractImages(viewer);
   * for (const image of images) {
   *   console.log(`${image.name}: ${image.format} (${image.width}x${image.height})`);
   *   // image.data contains the raw image bytes
   * }
   *
   * // Convert raw images to PNG for easier viewing
   * const pngImages = await client.extractImages(viewer, { convertRawToPng: true });
   * ```
   */
  async extractImages(
    source: DocumentSource,
    options: { convertRawToPng?: boolean } = {}
  ): Promise<ExtractedImage[]> {
    this.ensureNotDestroyed();

    const { convertRawToPng = false } = options;
    const docId = await this.loadSource(source);
    const isTemporary = !(source instanceof UDocViewer);

    try {
      return await this.workerClient.pdfExtractImages(docId, convertRawToPng);
    } finally {
      if (isTemporary) {
        await this.workerClient.unloadPdf(docId);
      }
    }
  }

  /**
   * Extract all embedded fonts from a document.
   *
   * @param source - Document source (viewer, URL, File, or bytes)
   * @returns Array of extracted fonts with metadata and data
   *
   * @example
   * ```ts
   * const fonts = await client.extractFonts(viewer);
   * for (const font of fonts) {
   *   console.log(`${font.name}: ${font.fontType} (.${font.extension})`);
   *   // font.data contains the raw font bytes
   * }
   * ```
   */
  async extractFonts(source: DocumentSource): Promise<ExtractedFont[]> {
    this.ensureNotDestroyed();

    const docId = await this.loadSource(source);
    const isTemporary = !(source instanceof UDocViewer);

    try {
      return await this.workerClient.pdfExtractFonts(docId);
    } finally {
      if (isTemporary) {
        await this.workerClient.unloadPdf(docId);
      }
    }
  }

  /**
   * Compress a document.
   *
   * Saves the document with full compression options enabled:
   * - Compress stream data using FlateDecode
   * - Pack objects into compressed object streams (PDF 1.5+)
   * - Use compressed xref streams (PDF 1.5+)
   * - Remove unreferenced objects
   *
   * @param source - Document source (viewer, URL, File, or bytes)
   * @returns Compressed PDF data as Uint8Array
   *
   * @example
   * ```ts
   * const compressedBytes = await client.compress(viewer);
   * // Save to file or download
   * const blob = new Blob([compressedBytes], { type: 'application/pdf' });
   * ```
   */
  async compress(source: DocumentSource): Promise<Uint8Array> {
    this.ensureNotDestroyed();

    const docId = await this.loadSource(source);
    const isTemporary = !(source instanceof UDocViewer);

    try {
      return await this.workerClient.pdfCompress(docId);
    } finally {
      if (isTemporary) {
        await this.workerClient.unloadPdf(docId);
      }
    }
  }

  /**
   * Decompress a document.
   *
   * Removes all filter encodings from streams, resulting in raw,
   * uncompressed stream data. Useful for debugging or inspection.
   *
   * @param source - Document source (viewer, URL, File, or bytes)
   * @returns Decompressed PDF data as Uint8Array
   *
   * @example
   * ```ts
   * const decompressedBytes = await client.decompress(viewer);
   * // Save to file for inspection
   * const blob = new Blob([decompressedBytes], { type: 'application/pdf' });
   * ```
   */
  async decompress(source: DocumentSource): Promise<Uint8Array> {
    this.ensureNotDestroyed();

    const docId = await this.loadSource(source);
    const isTemporary = !(source instanceof UDocViewer);

    try {
      return await this.workerClient.pdfDecompress(docId);
    } finally {
      if (isTemporary) {
        await this.workerClient.unloadPdf(docId);
      }
    }
  }

  /**
   * Load a document source and return its ID.
   * Note: This is only used for PDF operations (compose, split, etc.)
   */
  private async loadSource(source: DocumentSource): Promise<string> {
    if (source instanceof UDocViewer) {
      const docId = (source as unknown as { documentId: string | null }).documentId;
      if (!docId) {
        throw new Error("Viewer has no loaded document");
      }
      return docId;
    }

    let bytes: Uint8Array;
    if (typeof source === "string") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${source}: ${response.statusText}`);
        }
        bytes = new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(`Fetch timed out for ${source}`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    } else if (source instanceof File) {
      bytes = new Uint8Array(await source.arrayBuffer());
    } else {
      bytes = source;
    }

    return this.workerClient.loadPdf(bytes);
  }

  /**
   * Normalize page specification to a string format.
   */
  private normalizePages(pages: string | number | number[]): string {
    if (typeof pages === "string") {
      return pages;
    }
    if (typeof pages === "number") {
      return String(pages);
    }
    return pages.join(",");
  }

  /**
   * Destroy the client and release all resources.
   * All viewers created by this client become invalid.
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;

    // Destroy all viewers
    for (const viewer of this.viewers) {
      viewer.destroy();
    }
    this.viewers.clear();

    // Terminate the worker (also cleans up render resources)
    this.workerClient.terminate();
  }

  /**
   * Get the underlying worker client (for internal use).
   * @internal
   */
  getWorkerClient(): WorkerClient {
    return this.workerClient;
  }

  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error("UDocClient has been destroyed");
    }
  }
}

/**
 * Convert WASM license result to LicenseInfo.
 */
function licenseResultToInfo(result: LicenseResult): LicenseInfo {
  const hasLicensedFeatures = result.features.length > 0 || Object.keys(result.limits).length > 0;
  return {
    valid: result.valid,
    tier: result.valid && hasLicensedFeatures ? "licensed" : "free",
    features: result.features,
    limits: result.limits,
    organization: result.organization,
    expiresAt: result.expiresAt ? new Date(result.expiresAt * 1000) : undefined,
    error: result.error,
  };
}

