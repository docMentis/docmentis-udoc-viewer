/**
 * Low-level client for communicating with the UDoc worker.
 *
 * Provides a Promise-based API for document operations.
 * Also handles render queue, cache, and priority management.
 * This is an internal API - use UDocClient for the public SDK.
 */

import type {
  Composition,
  ComposePick,
  ExtractedFont,
  ExtractedImage,
  FontDescriptor,
  LicenseResult,
  OutlineSection,
  SplitByOutlineResult,
  WorkerRequest,
  WorkerResponse,
} from "./worker.js";

export type { Composition, ComposePick, ExtractedFont, ExtractedImage, FontDescriptor, OutlineSection, SplitByOutlineResult };

export type { LicenseResult };

export interface PageInfo {
  width: number;
  height: number;
  /** Document rotation in degrees (0, 90, 180, or 270) */
  rotation: 0 | 90 | 180 | 270;
}

// =============================================================================
// Render Management Types
// =============================================================================

export type RenderType = "page" | "thumbnail";

export interface RenderRequest {
  docId: string;
  page: number;
  type: RenderType;
  scale: number;
}

export interface RenderResult {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

interface QueuedRequest extends RenderRequest {
  priority: number;
  resolve: (result: RenderResult) => void;
  reject: (error: Error) => void;
}

interface CacheEntry {
  result: RenderResult;
  lastAccess: number;
}

// =============================================================================
// Performance Counter Integration
// =============================================================================

import type { IPerformanceCounter, PerformanceEventType, PerformanceEventContext } from "../performance/index.js";

/**
 * Generate a cache key for render requests.
 * Uses toFixed(4) for scale to normalize floating-point variations.
 * Exported so Spread component can use the same key format.
 */
export function makeRenderKey(docId: string, page: number, type: RenderType, scale: number): string {
  return `${docId}:${page}:${type}:${scale.toFixed(4)}`;
}


export class WorkerClient {
  private worker: Worker;
  private requestId = 0;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  // Render management state - separate caches for page and thumbnail, single queue
  private pageRenderCache = new Map<string, CacheEntry>();
  private thumbnailRenderCache = new Map<string, CacheEntry>();
  private renderQueue: QueuedRequest[] = [];
  private currentRender: { key: string; promise: Promise<RenderResult> } | null = null;
  private maxPageCacheSize = 100;
  private maxThumbnailCacheSize = 500;

  // Separate focus tracking for page and thumbnail boost
  private pageFocus: { docId: string; page: number } | null = null;
  private thumbnailFocus: { docId: string; page: number } | null = null;

  // Performance counter per document (for tracking operations)
  private performanceCounters = new Map<string, IPerformanceCounter>();

  // Page info cache per document (populated by getAllPageInfo, used by getPageInfo)
  private pageInfoCache = new Map<string, PageInfo[]>();

  private constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  /**
   * Create a WorkerClient using the bundled worker.
   * Uses a pattern that vite can statically analyze for proper bundling.
   */
  static create(): WorkerClient {
    // This pattern allows vite to statically analyze and bundle the worker
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    return new WorkerClient(worker);
  }

  /**
   * Create a WorkerClient with a custom worker URL.
   * Use this when hosting worker files at a custom location.
   */
  static createWithUrl(workerUrl: string | URL): WorkerClient {
    const worker = new Worker(workerUrl, { type: "module" });
    return new WorkerClient(worker);
  }

  /**
   * Initialize the WASM module.
   */
  async init(wasmUrl?: string): Promise<void> {
    await this.send({ type: "init", wasmUrl });
  }

  /**
   * Set the license key.
   * @param license - The license key string
   * @param domain - The current domain (from window.location.hostname)
   * @returns License validation result
   */
  async setLicense(license: string, domain: string): Promise<LicenseResult> {
    const response = (await this.send({ type: "setLicense", license, domain })) as {
      result: LicenseResult;
    };
    return response.result;
  }

  /**
   * Get current license status.
   */
  async getLicenseStatus(): Promise<LicenseResult> {
    const response = (await this.send({ type: "getLicenseStatus" })) as {
      result: LicenseResult;
    };
    return response.result;
  }

  /**
   * Load a PDF document.
   * @returns The document ID.
   */
  async loadPdf(bytes: Uint8Array): Promise<string> {
    const response = (await this.send({
      type: "loadPdf",
      id: "", // Not used, will be assigned by worker
      bytes,
    })) as { documentId: string };
    return response.documentId;
  }

  /**
   * Load an image file.
   * Supports various formats: JPEG, PNG, GIF, BMP, TIFF, WebP, etc.
   * Multi-page TIFF files will create a document with multiple pages.
   * @returns The document ID.
   */
  async loadImage(bytes: Uint8Array): Promise<string> {
    const response = (await this.send({
      type: "loadImage",
      id: "", // Not used, will be assigned by worker
      bytes,
    })) as { documentId: string };
    return response.documentId;
  }

  /**
   * Load a PPTX (PowerPoint) document.
   * @returns The document ID.
   */
  async loadPptx(bytes: Uint8Array): Promise<string> {
    const response = (await this.send({
      type: "loadPptx",
      id: "", // Not used, will be assigned by worker
      bytes,
    })) as { documentId: string };
    return response.documentId;
  }

  /**
   * Unload a PDF document.
   * @returns True if the document was removed.
   */
  async unloadPdf(documentId: string): Promise<boolean> {
    this.pageInfoCache.delete(documentId);
    const response = (await this.send({ type: "unloadPdf", documentId })) as { removed: boolean };
    return response.removed;
  }

  /**
   * Check if a document requires a password to open.
   * @returns True if the document needs authentication.
   */
  async needsPassword(documentId: string): Promise<boolean> {
    const response = (await this.send({ type: "needsPassword", documentId })) as { needsPassword: boolean };
    return response.needsPassword;
  }

  /**
   * Authenticate with a password to unlock an encrypted document.
   * @param documentId - The document ID
   * @param password - The password to try
   * @returns True if authentication succeeded, false if the password was incorrect.
   */
  async authenticate(documentId: string, password: string): Promise<boolean> {
    const response = (await this.send({ type: "authenticate", documentId, password })) as { authenticated: boolean };
    return response.authenticated;
  }

  /**
   * Get the page count of a document.
   * Returns from cache if available.
   */
  async getPageCount(documentId: string): Promise<number> {
    // Check cache first
    const cached = this.pageInfoCache.get(documentId);
    if (cached) {
      return cached.length;
    }

    // Fall back to worker call
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getPageCount");
    try {
      const response = (await this.send({ type: "getPageCount", documentId })) as { pageCount: number };
      if (eventId) counter?.markEnd(eventId);
      return response.pageCount;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get info for a single page.
   * Returns from cache if available (populated by getAllPageInfo).
   */
  async getPageInfo(documentId: string, pageIndex: number): Promise<PageInfo> {
    // Check cache first
    const cached = this.pageInfoCache.get(documentId);
    if (cached && pageIndex < cached.length) {
      return cached[pageIndex];
    }

    // Fall back to worker call
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getPageInfo", { pageIndex });
    try {
      const response = (await this.send({ type: "getPageInfo", documentId, pageIndex })) as PageInfo;
      if (eventId) counter?.markEnd(eventId);
      return { width: response.width, height: response.height, rotation: response.rotation ?? 0 };
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get info for all pages in one call.
   * Results are cached for subsequent calls.
   */
  async getAllPageInfo(documentId: string): Promise<PageInfo[]> {
    // Check cache first
    const cached = this.pageInfoCache.get(documentId);
    if (cached) {
      return cached;
    }

    // Fall back to worker call
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getAllPageInfo");
    try {
      const response = (await this.send({ type: "getAllPageInfo", documentId })) as {
        pages: PageInfo[];
      };
      if (eventId) counter?.markEnd(eventId);
      // Cache for subsequent calls
      this.pageInfoCache.set(documentId, response.pages);
      return response.pages;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get the page layout preference.
   */
  async getPageLayout(documentId: string): Promise<string> {
    const response = (await this.send({ type: "getPageLayout", documentId })) as { layout: string };
    return response.layout;
  }

  /**
   * Get the document outline.
   */
  async getOutline(documentId: string): Promise<unknown[]> {
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getOutline");
    try {
      const response = (await this.send({ type: "getOutline", documentId })) as { outline: unknown[] };
      if (eventId) counter?.markEnd(eventId);
      return response.outline;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get annotations for a specific page.
   */
  async getPageAnnotations(documentId: string, pageIndex: number): Promise<unknown[]> {
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getPageAnnotations", { pageIndex });
    try {
      const response = (await this.send({ type: "getPageAnnotations", documentId, pageIndex })) as {
        annotations: unknown[];
      };
      if (eventId) counter?.markEnd(eventId);
      return response.annotations;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get text content for a specific page (for text selection).
   */
  async getPageText(documentId: string, pageIndex: number): Promise<unknown[]> {
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getPageText", { pageIndex });
    try {
      const response = (await this.send({ type: "getPageText", documentId, pageIndex })) as {
        text: unknown[];
      };
      if (eventId) counter?.markEnd(eventId);
      return response.text;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get all annotations grouped by page.
   */
  async getAllAnnotations(documentId: string): Promise<Record<string, unknown[]>> {
    const counter = this.getCounter(documentId);
    const eventId = counter?.markStart("getAllAnnotations");
    try {
      const response = (await this.send({ type: "getAllAnnotations", documentId })) as {
        annotations: Record<string, unknown[]>;
      };
      if (eventId) counter?.markEnd(eventId);
      return response.annotations;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Compose new PDF documents by cherry-picking pages from source documents.
   *
   * @param compositions - Array of compositions. Each composition is an array of picks
   *   that will form one output document.
   * @param docIds - Array of document IDs to use as sources (order matters for doc indices)
   * @returns Array of new document IDs (one per composition)
   */
  async pdfCompose(compositions: Composition[], docIds: string[]): Promise<string[]> {
    const response = (await this.send({ type: "pdfCompose", compositions, docIds })) as {
      documentIds: string[];
    };
    return response.documentIds;
  }

  /**
   * Split a PDF document by its outline (bookmarks) structure.
   *
   * @param documentId - Document ID to split
   * @param maxLevel - Maximum outline level to consider (1 = top level only)
   * @param splitMidPage - When true, filters page content when sections share a page
   * @returns Object with documentIds and sections
   */
  async pdfSplitByOutline(documentId: string, maxLevel: number, splitMidPage: boolean = false): Promise<SplitByOutlineResult> {
    const response = (await this.send({ type: "pdfSplitByOutline", documentId, maxLevel, splitMidPage })) as {
      result: SplitByOutlineResult;
    };
    return response.result;
  }

  /**
   * Extract all embedded images from a PDF document.
   *
   * @param documentId - Document ID to extract images from
   * @param convertRawToPng - When true, converts raw pixel data to PNG format
   * @returns Array of extracted images with metadata and data
   */
  async pdfExtractImages(documentId: string, convertRawToPng: boolean = false): Promise<ExtractedImage[]> {
    const response = (await this.send({ type: "pdfExtractImages", documentId, convertRawToPng })) as {
      images: ExtractedImage[];
    };
    return response.images;
  }

  /**
   * Extract all embedded fonts from a PDF document.
   *
   * @param documentId - Document ID to extract fonts from
   * @returns Array of extracted fonts with metadata and data
   */
  async pdfExtractFonts(documentId: string): Promise<ExtractedFont[]> {
    const response = (await this.send({ type: "pdfExtractFonts", documentId })) as {
      fonts: ExtractedFont[];
    };
    return response.fonts;
  }

  /**
   * Compress a PDF document.
   *
   * Saves the document with full compression options enabled.
   *
   * @param documentId - Document ID to compress
   * @returns Compressed PDF data
   */
  async pdfCompress(documentId: string): Promise<Uint8Array> {
    const response = (await this.send({ type: "pdfCompress", documentId })) as {
      bytes: Uint8Array;
    };
    return response.bytes;
  }

  /**
   * Decompress a PDF document.
   *
   * Removes all filter encodings from streams, resulting in raw,
   * uncompressed stream data.
   *
   * @param documentId - Document ID to decompress
   * @returns Decompressed PDF data
   */
  async pdfDecompress(documentId: string): Promise<Uint8Array> {
    const response = (await this.send({ type: "pdfDecompress", documentId })) as {
      bytes: Uint8Array;
    };
    return response.bytes;
  }

  /**
   * Get the raw PDF bytes of a document.
   */
  async getBytes(documentId: string): Promise<Uint8Array> {
    const response = (await this.send({ type: "getBytes", documentId })) as { bytes: Uint8Array };
    return response.bytes;
  }

  // ===========================================================================
  // Font Management
  // ===========================================================================

  /**
   * Get all external fonts required by the document.
   *
   * Scans all text content in the document and returns font descriptors
   * for fonts that are not embedded and not standard PDF fonts.
   *
   * @param documentId - Document ID
   * @returns Array of font descriptors
   */
  async getRequiredFonts(documentId: string): Promise<FontDescriptor[]> {
    const response = (await this.send({ type: "getRequiredFonts", documentId })) as {
      fonts: FontDescriptor[];
    };
    return response.fonts;
  }

  /**
   * Register a font from raw bytes.
   *
   * @param documentId - Document ID
   * @param typeface - The typeface name (must match what's in the document)
   * @param bold - Whether this is a bold variant
   * @param italic - Whether this is an italic variant
   * @param bytes - Raw font file data (TTF, OTF, WOFF, or WOFF2)
   */
  async registerFont(
    documentId: string,
    typeface: string,
    bold: boolean,
    italic: boolean,
    bytes: Uint8Array
  ): Promise<void> {
    await this.send({ type: "registerFont", documentId, typeface, bold, italic, bytes });
  }

  /**
   * Check if a font is registered for a document.
   *
   * @param documentId - Document ID
   * @param typeface - The typeface name
   * @param bold - Whether to check for bold variant
   * @param italic - Whether to check for italic variant
   * @returns True if the font is registered
   */
  async hasRegisteredFont(
    documentId: string,
    typeface: string,
    bold: boolean,
    italic: boolean
  ): Promise<boolean> {
    const response = (await this.send({ type: "hasRegisteredFont", documentId, typeface, bold, italic })) as {
      hasFont: boolean;
    };
    return response.hasFont;
  }

  /**
   * Get the number of fonts registered for a document.
   *
   * @param documentId - Document ID
   * @returns Number of registered fonts
   */
  async registeredFontCount(documentId: string): Promise<number> {
    const response = (await this.send({ type: "registeredFontCount", documentId })) as {
      count: number;
    };
    return response.count;
  }

  /**
   * Enable Google Fonts for a document.
   *
   * When enabled, fonts that are not embedded in the document will be
   * automatically fetched from Google Fonts during rendering.
   *
   * This is an alternative to the `getRequiredFonts` + `registerFont` workflow.
   * Instead of scanning all pages upfront, fonts are fetched on-demand as
   * pages are rendered.
   *
   * @param documentId - Document ID
   */
  async enableGoogleFonts(documentId: string): Promise<void> {
    await this.send({ type: "enableGoogleFonts", documentId });
  }

  // ===========================================================================
  // Performance Counter Integration
  // ===========================================================================

  /**
   * Set the performance counter for a document.
   * All operations for this document will be tracked.
   */
  setPerformanceCounter(docId: string, counter: IPerformanceCounter): void {
    this.performanceCounters.set(docId, counter);
  }

  /**
   * Remove the performance counter for a document.
   */
  removePerformanceCounter(docId: string): void {
    this.performanceCounters.delete(docId);
  }

  private getCounter(docId: string): IPerformanceCounter | undefined {
    return this.performanceCounters.get(docId);
  }

  // ===========================================================================
  // Render Management Methods
  // ===========================================================================

  private getCache(type: RenderType): Map<string, CacheEntry> {
    return type === "page" ? this.pageRenderCache : this.thumbnailRenderCache;
  }

  private getMaxCacheSize(type: RenderType): number {
    return type === "page" ? this.maxPageCacheSize : this.maxThumbnailCacheSize;
  }

  /**
   * Request a render. Returns cached result if available,
   * otherwise queues the request.
   *
   * When a new request is queued, it cancels any existing queued requests
   * for the same page index and render type (but not in-flight requests).
   */
  requestRender(req: RenderRequest): Promise<RenderResult> {
    const key = makeRenderKey(req.docId, req.page, req.type, req.scale);
    const cache = this.getCache(req.type);

    // Check cache first
    const cached = cache.get(key);
    if (cached) {
      cached.lastAccess = Date.now();
      return Promise.resolve(cached.result);
    }

    // Check if already in-flight
    if (this.currentRender?.key === key) {
      return this.currentRender.promise;
    }

    // Check if already queued with same parameters
    const queued = this.renderQueue.find(q =>
      q.docId === req.docId && q.page === req.page && q.type === req.type && q.scale === req.scale
    );
    if (queued) {
      return new Promise((resolve, reject) => {
        const originalResolve = queued.resolve;
        const originalReject = queued.reject;
        queued.resolve = (result: RenderResult) => { originalResolve(result); resolve(result); };
        queued.reject = (error: Error) => { originalReject(error); reject(error); };
      });
    }

    // Cancel any existing queued requests for the same page and type (different scale)
    // This ensures we only render the most recent scale for each page
    this.cancelQueuedRequestsForPage(req.docId, req.page, req.type);

    // Queue the request
    return new Promise((resolve, reject) => {
      const queuedReq: QueuedRequest = {
        ...req,
        priority: 0, // Priority is now determined by distance-based sorting
        resolve,
        reject
      };

      this.renderQueue.push(queuedReq);
      this.sortQueue(); // Sort to place request in correct position based on current focus
      this.processRenderQueue();
    });
  }

  /**
   * Cancel queued requests for a specific page (within the same render type).
   * Does not cancel in-flight requests.
   */
  private cancelQueuedRequestsForPage(docId: string, page: number, type: RenderType): void {
    this.renderQueue = this.renderQueue.filter(req => {
      const shouldCancel = req.docId === docId && req.page === page && req.type === type;
      if (shouldCancel) {
        req.reject(new Error("Request cancelled"));
      }
      return !shouldCancel;
    });
  }

  /**
   * Get a cached result without queuing a render.
   */
  getCachedRender(docId: string, page: number, type: RenderType, scale: number): RenderResult | null {
    const key = makeRenderKey(docId, page, type, scale);
    const cache = this.getCache(type);
    const cached = cache.get(key);
    if (cached) {
      cached.lastAccess = Date.now();
      return cached.result;
    }
    return null;
  }

  /**
   * Cancel pending render requests matching criteria.
   * Does not cancel in-flight requests.
   */
  cancelRenders(docId?: string, page?: number, type?: RenderType): void {
    this.renderQueue = this.renderQueue.filter(req => {
      const match =
        (docId === undefined || req.docId === docId) &&
        (page === undefined || req.page === page) &&
        (type === undefined || req.type === type);

      if (match) {
        req.reject(new Error("Request cancelled"));
      }
      return !match;
    });
  }

  /**
   * Invalidate cache entries. Call when document or zoom changes.
   */
  invalidateRenderCache(docId?: string, type?: RenderType): void {
    const invalidateCache = (cache: Map<string, CacheEntry>) => {
      if (docId === undefined) {
        for (const entry of cache.values()) {
          entry.result.bitmap.close();
        }
        cache.clear();
      } else {
        for (const [key, entry] of cache) {
          if (key.startsWith(docId + ":")) {
            entry.result.bitmap.close();
            cache.delete(key);
          }
        }
      }
    };

    if (type === undefined || type === "page") {
      invalidateCache(this.pageRenderCache);
    }
    if (type === undefined || type === "thumbnail") {
      invalidateCache(this.thumbnailRenderCache);
    }
  }

  /**
   * Sort page render requests in the queue by distance to the focused page.
   * Updates the page focus and re-sorts the queue.
   */
  boostPageRenderPriority(docId: string, focusPage: number): void {
    this.pageFocus = { docId, page: focusPage };
    this.sortQueue();
    this.processRenderQueue();
  }

  /**
   * Sort thumbnail render requests in the queue by distance to the focused thumbnail.
   * Updates the thumbnail focus and re-sorts the queue.
   */
  boostThumbnailRenderPriority(docId: string, focusPage: number): void {
    this.thumbnailFocus = { docId, page: focusPage };
    this.sortQueue();
    this.processRenderQueue();
  }

  private static readonly PRERENDER_RANGE = 2; // Prerender pages within ±2 of current

  /**
   * Prerender adjacent pages for smooth page flipping in single spread mode.
   * Queues renders for pages before and after the current page (fire and forget).
   * Boosts current page priority so it renders first during rapid flipping.
   */
  prerenderAdjacentPages(
    docId: string,
    currentPage: number,
    scale: number,
    totalPages: number
  ): void {
    // Boost current page priority - ensures it renders first even during rapid flipping
    this.boostPageRenderPriority(docId, currentPage);

    // Queue adjacent pages for prerendering
    for (let offset = 1; offset <= WorkerClient.PRERENDER_RANGE; offset++) {
      // Prerender next pages
      const nextPage = currentPage + offset;
      if (nextPage >= 1 && nextPage <= totalPages) {
        this.requestRender({
          docId,
          page: nextPage,
          type: "page",
          scale
        }).catch(() => {
          // Ignore errors - prerendering is best-effort
        });
      }

      // Prerender previous pages
      const prevPage = currentPage - offset;
      if (prevPage >= 1 && prevPage <= totalPages) {
        this.requestRender({
          docId,
          page: prevPage,
          type: "page",
          scale
        }).catch(() => {
          // Ignore errors - prerendering is best-effort
        });
      }
    }
  }

  /**
   * Render a page directly, bypassing the cache and queue.
   * Useful for one-off renders that shouldn't affect the normal render flow.
   */
  async forceRender(req: RenderRequest): Promise<RenderResult> {
    const counter = this.getCounter(req.docId);
    const eventType = req.type === "thumbnail" ? "renderThumbnail" as const : "renderPage" as const;
    const pageIndex = req.page - 1;
    const eventId = counter?.markStart(eventType, { pageIndex, scale: req.scale });

    try {
      const pageInfo = await this.getPageInfo(req.docId, pageIndex);
      const width = Math.round(pageInfo.width * req.scale);
      const height = Math.round(pageInfo.height * req.scale);

      // Send render request directly to worker
      const rendered = (await this.send({
        type: "renderPage",
        documentId: req.docId,
        pageIndex,
        width,
        height,
      })) as { rgba: Uint8Array; width: number; height: number };

      const source = rendered.rgba;
      const clamped = source.buffer instanceof ArrayBuffer
        ? new Uint8ClampedArray(source.buffer, source.byteOffset, source.byteLength)
        : new Uint8ClampedArray(source);
      const imageData = new ImageData(clamped, rendered.width, rendered.height);
      const bitmap = await createImageBitmap(imageData);

      const result: RenderResult = {
        bitmap,
        width: bitmap.width,
        height: bitmap.height
      };

      // Note: We intentionally don't add to cache for force renders
      if (eventId) counter?.markEnd(eventId);
      return result;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private static readonly BOOST_RANGE = 5; // Boost pages within ±5 of focus (11 pages total)

  /**
   * Sort requests by boost priority using stored page and thumbnail focuses.
   * Order: boosted pages -> boosted thumbnails -> normal pages -> normal thumbnails.
   * "Boosted" means within BOOST_RANGE of the respective focus.
   * Within each group, sorted by distance to respective focus.
   */
  private sortQueue(): void {
    if (this.renderQueue.length === 0) return;

    const pageFocus = this.pageFocus;
    const thumbnailFocus = this.thumbnailFocus;

    // Categorize requests into 4 groups
    const boostedPages: QueuedRequest[] = [];
    const boostedThumbnails: QueuedRequest[] = [];
    const normalPages: QueuedRequest[] = [];
    const normalThumbnails: QueuedRequest[] = [];

    for (const req of this.renderQueue) {
      if (req.type === "page") {
        const distance = pageFocus && req.docId === pageFocus.docId
          ? Math.abs(req.page - pageFocus.page)
          : Infinity;
        if (distance <= WorkerClient.BOOST_RANGE) {
          boostedPages.push(req);
        } else {
          normalPages.push(req);
        }
      } else {
        const distance = thumbnailFocus && req.docId === thumbnailFocus.docId
          ? Math.abs(req.page - thumbnailFocus.page)
          : Infinity;
        if (distance <= WorkerClient.BOOST_RANGE) {
          boostedThumbnails.push(req);
        } else {
          normalThumbnails.push(req);
        }
      }
    }

    // Sort boosted requests by distance to their respective focus
    if (pageFocus) {
      boostedPages.sort((a, b) => {
        const aDistance = a.docId === pageFocus.docId ? Math.abs(a.page - pageFocus.page) : Infinity;
        const bDistance = b.docId === pageFocus.docId ? Math.abs(b.page - pageFocus.page) : Infinity;
        return aDistance - bDistance;
      });
    }

    if (thumbnailFocus) {
      boostedThumbnails.sort((a, b) => {
        const aDistance = a.docId === thumbnailFocus.docId ? Math.abs(a.page - thumbnailFocus.page) : Infinity;
        const bDistance = b.docId === thumbnailFocus.docId ? Math.abs(b.page - thumbnailFocus.page) : Infinity;
        return aDistance - bDistance;
      });
    }

    // Rebuild queue: boosted pages -> boosted thumbnails -> normal pages -> normal thumbnails
    this.renderQueue = [
      ...boostedPages,
      ...boostedThumbnails,
      ...normalPages,
      ...normalThumbnails
    ];
  }

  /**
   * Clean up render resources.
   */
  destroyRenderResources(): void {
    // Cancel all pending renders
    for (const req of this.renderQueue) {
      req.reject(new Error("WorkerClient destroyed"));
    }
    this.renderQueue = [];

    // Close all cached page bitmaps
    for (const entry of this.pageRenderCache.values()) {
      entry.result.bitmap.close();
    }
    this.pageRenderCache.clear();

    // Close all cached thumbnail bitmaps
    for (const entry of this.thumbnailRenderCache.values()) {
      entry.result.bitmap.close();
    }
    this.thumbnailRenderCache.clear();
  }

  private processRenderQueue(): void {
    // Only one render at a time (WASM is single-threaded)
    if (this.currentRender) return;
    if (this.renderQueue.length === 0) return;

    const req = this.renderQueue.shift();
    if (!req) return;

    const key = makeRenderKey(req.docId, req.page, req.type, req.scale);
    const cache = this.getCache(req.type);

    // Double-check cache (might have been filled while queued)
    const cached = cache.get(key);
    if (cached) {
      cached.lastAccess = Date.now();
      req.resolve(cached.result);
      // Continue processing queue
      this.processRenderQueue();
      return;
    }

    // Start the render
    const promise = this.doRender(req, key);
    this.currentRender = { key, promise };

    promise.finally(() => {
      this.currentRender = null;
      this.processRenderQueue();
    });
  }

  private async doRender(req: QueuedRequest, key: string): Promise<RenderResult> {
    const counter = this.getCounter(req.docId);
    const eventType = req.type === "thumbnail" ? "renderThumbnail" as const : "renderPage" as const;
    const pageIndex = req.page - 1;
    const eventId = counter?.markStart(eventType, { pageIndex, scale: req.scale });

    try {
      const pageInfo = await this.getPageInfo(req.docId, pageIndex);
      const width = Math.round(pageInfo.width * req.scale);
      const height = Math.round(pageInfo.height * req.scale);

      // Send render request directly to worker
      const rendered = (await this.send({
        type: "renderPage",
        documentId: req.docId,
        pageIndex,
        width,
        height,
      })) as { rgba: Uint8Array; width: number; height: number };

      const source = rendered.rgba;
      const clamped = source.buffer instanceof ArrayBuffer
        ? new Uint8ClampedArray(source.buffer, source.byteOffset, source.byteLength)
        : new Uint8ClampedArray(source);
      const imageData = new ImageData(clamped, rendered.width, rendered.height);
      const bitmap = await createImageBitmap(imageData);

      const result: RenderResult = {
        bitmap,
        width: bitmap.width,
        height: bitmap.height
      };

      // Add to cache
      this.addToRenderCache(req.type, key, result);

      if (eventId) counter?.markEnd(eventId);
      req.resolve(result);
      return result;
    } catch (error) {
      if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
      req.reject(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private addToRenderCache(type: RenderType, key: string, result: RenderResult): void {
    const cache = this.getCache(type);
    const maxSize = this.getMaxCacheSize(type);

    // Evict if at capacity
    while (cache.size >= maxSize) {
      this.evictLRU(cache);
    }

    cache.set(key, {
      result,
      lastAccess: Date.now()
    });
  }

  private evictLRU(cache: Map<string, CacheEntry>): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldest = key;
      }
    }

    if (oldest) {
      const entry = cache.get(oldest);
      if (entry) {
        entry.result.bitmap.close();
      }
      cache.delete(oldest);
    }
  }

  /**
   * Terminate the worker.
   */
  terminate(): void {
    this.destroyRenderResources();
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error("Worker terminated"));
    }
    this.pending.clear();
  }

  private send(request: WorkerRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...request, _id: id });
    });
  }

  private handleMessage(event: MessageEvent<WorkerResponse & { _id?: number }>): void {
    const { _id, ...response } = event.data;
    if (_id === undefined) return;

    const pending = this.pending.get(_id);
    if (!pending) return;

    this.pending.delete(_id);

    if (response.success) {
      pending.resolve(response);
    } else {
      pending.reject(new Error((response as { error: string }).error));
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error("Worker error:", event.message);
  }
}
