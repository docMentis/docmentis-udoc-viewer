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
    FontEntry,
    LicenseResult,
    OutlineSection,
    SplitByOutlineResult,
    WorkerRequest,
    WorkerResponse,
} from "./worker.js";

import type {
    Orientation,
    SideDirection,
    CornerDirection,
    EightDirection,
    InOutDirection,
    TransitionEffect,
    PageTransition,
    FontSource,
    ResolvedFontInfo,
    FontUsageEntry,
} from "../wasm/udoc.js";

import { WORKER_INLINE } from "./worker-inline.js";

export type {
    Composition,
    ComposePick,
    ExtractedFont,
    ExtractedImage,
    FontEntry,
    OutlineSection,
    SplitByOutlineResult,
};

export type { LicenseResult };

// Re-export transition types from WASM (single source of truth)
export type {
    Orientation,
    SideDirection,
    CornerDirection,
    EightDirection,
    InOutDirection,
    TransitionEffect,
    PageTransition,
};

// Re-export font usage types from WASM
export type { FontSource, ResolvedFontInfo, FontUsageEntry };

/**
 * Font information extracted from raw font binary data.
 */
export interface FontInfo {
    /** Font typeface/family name (e.g., "Roboto", "Arial") */
    typeface: string;
    /** Whether the font is bold */
    bold: boolean;
    /** Whether the font is italic */
    italic: boolean;
}

export interface PageInfo {
    width: number;
    height: number;
    /** Document rotation in degrees (0, 90, 180, or 270) */
    rotation: 0 | 90 | 180 | 270;
    /** Slide transition (PPTX only) */
    transition?: PageTransition;
}

// =============================================================================
// Render Management Types
// =============================================================================

export type RenderType = "page" | "thumbnail" | "preview";

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
    kind: "render";
    priority: number;
    resolve: (result: RenderResult) => void;
    reject: (error: Error) => void;
}

interface QueuedAnnotationItem {
    kind: "annotation";
    docId: string;
    page: number; // 1-based (matches render convention)
    priority: number;
    resolve: (result: unknown[]) => void;
    reject: (error: Error) => void;
}

interface QueuedTextItem {
    kind: "text";
    docId: string;
    page: number; // 1-based (matches render convention)
    priority: number;
    resolve: (result: unknown[]) => void;
    reject: (error: Error) => void;
}

interface QueuedFontUsageCheck {
    kind: "fontUsageCheck";
    docId: string;
    page: number; // unused, but needed for sortQueue compatibility
    priority: number;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
}

type QueuedWorkItem = QueuedRequest | QueuedAnnotationItem | QueuedTextItem | QueuedFontUsageCheck;

function makeWorkKey(item: QueuedWorkItem): string {
    if (item.kind === "render") {
        return `render:${makeRenderKey(item.docId, item.page, item.type, item.scale)}`;
    }
    if (item.kind === "fontUsageCheck") {
        return `fontUsageCheck:${item.docId}`;
    }
    return `${item.kind}:${item.docId}:${item.page}`;
}

interface CacheEntry {
    result: RenderResult;
    lastAccess: number;
}

// =============================================================================
// Performance Counter Integration
// =============================================================================

import type { IPerformanceCounter } from "../performance/index.js";

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
    private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

    // Render management state - separate caches for page, thumbnail, and preview; single queue
    private pageRenderCache = new Map<string, CacheEntry>();
    private thumbnailRenderCache = new Map<string, CacheEntry>();
    private previewRenderCache = new Map<string, CacheEntry>();
    private workQueue: QueuedWorkItem[] = [];
    private currentWork: { key: string; promise: Promise<unknown> } | null = null;
    private maxPageCacheSize = 100;
    private maxThumbnailCacheSize = 500;
    private maxPreviewCacheSize = 50;

    // Separate focus tracking for page and thumbnail boost
    private pageFocus: { docId: string; page: number } | null = null;
    private thumbnailFocus: { docId: string; page: number } | null = null;

    // Callbacks notified when render cache is invalidated
    private renderInvalidatedCallbacks = new Set<() => void>();

    // Font usage change detection
    private fontUsageChangedCallbacks = new Set<(docId: string) => void>();
    private lastFontUsageLength = new Map<string, number>();

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
     * Create a WorkerClient using the inline bundled worker.
     * Creates a blob worker from the build-time inlined source code,
     * avoiding import.meta.url for universal bundler compatibility.
     *
     * Falls back to module worker via import.meta.url when WORKER_INLINE
     * is empty (e.g. running from TypeScript source in Vite dev mode).
     */
    static create(): WorkerClient {
        if (WORKER_INLINE) {
            const blob = new Blob([WORKER_INLINE], { type: "text/javascript" });
            const url = URL.createObjectURL(blob);
            const worker = new Worker(url);
            return new WorkerClient(worker);
        }
        // Dev mode fallback: Vite/bundlers can resolve the worker from source
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
    async init(wasmUrl?: string, gpu?: boolean): Promise<void> {
        await this.send({ type: "init", wasmUrl, gpu });
    }

    /**
     * One-time telemetry setup: pass the embedding page's domain and SDK version to WASM.
     */
    async setupTelemetry(domain: string, viewerVersion: string, distinctId: string): Promise<void> {
        await this.send({ type: "setupTelemetry", domain, viewerVersion, distinctId });
    }

    /**
     * Disable telemetry reporting. Requires a license with the "no_telemetry" feature.
     * @returns true if telemetry was disabled, false if the license does not permit it.
     */
    async disableTelemetry(): Promise<boolean> {
        const response = (await this.send({ type: "disableTelemetry" })) as {
            disabled: boolean;
        };
        return response.disabled;
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
    /**
     * Load a document with auto-format detection.
     * The WASM engine inspects the file contents to determine the format.
     * @returns The document ID.
     */
    async loadDocument(bytes: Uint8Array): Promise<string> {
        const response = (await this.send({
            type: "load",
            id: "",
            bytes,
        })) as { documentId: string };
        return response.documentId;
    }

    /**
     * Get the detected format of a loaded document.
     * @returns The format string: "pdf", "docx", "pptx", "xlsx", or "image".
     */
    async getDocumentFormat(documentId: string): Promise<string> {
        const response = (await this.send({
            type: "getDocumentFormat",
            documentId,
        })) as { format: string };
        return response.format;
    }

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
     * Load a DOCX (Word) document.
     * @returns The document ID.
     */
    async loadDocx(bytes: Uint8Array): Promise<string> {
        const response = (await this.send({
            type: "loadDocx",
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
        this.performanceCounters.delete(documentId);
        this.cancelRenders(documentId);
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
        const response = (await this.send({ type: "authenticate", documentId, password })) as {
            authenticated: boolean;
        };
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
            return {
                width: response.width,
                height: response.height,
                rotation: response.rotation ?? 0,
                transition: response.transition,
            };
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
     * Get font usage information for a document.
     */
    async getFontUsage(documentId: string): Promise<unknown[]> {
        const response = (await this.send({ type: "getFontUsage", documentId })) as { entries: unknown[] };
        return response.entries;
    }

    /**
     * Get annotations for a specific page.
     * Routed through the unified work queue so renders take priority.
     */
    async getPageAnnotations(documentId: string, pageIndex: number): Promise<unknown[]> {
        return this.requestAnnotations(documentId, pageIndex);
    }

    /**
     * Get text content for a specific page (for text selection).
     * Routed through the unified work queue so renders take priority.
     */
    async getPageText(documentId: string, pageIndex: number): Promise<unknown[]> {
        return this.requestText(documentId, pageIndex);
    }

    /**
     * Request annotations via the unified work queue.
     * Lower priority than renders — waits for pending renders to complete first.
     */
    requestAnnotations(docId: string, pageIndex: number): Promise<unknown[]> {
        const page = pageIndex + 1; // Convert 0-based to 1-based
        const key = `annotation:${docId}:${page}`;

        // Check if already in-flight
        if (this.currentWork?.key === key) {
            return this.currentWork.promise as Promise<unknown[]>;
        }

        // Check if already queued (dedup)
        const queued = this.workQueue.find(
            (q): q is QueuedAnnotationItem => q.kind === "annotation" && q.docId === docId && q.page === page,
        );
        if (queued) {
            return new Promise((resolve, reject) => {
                const originalResolve = queued.resolve;
                const originalReject = queued.reject;
                queued.resolve = (result: unknown[]) => {
                    originalResolve(result);
                    resolve(result);
                };
                queued.reject = (error: Error) => {
                    originalReject(error);
                    reject(error);
                };
            });
        }

        return new Promise((resolve, reject) => {
            this.workQueue.push({
                kind: "annotation",
                docId,
                page,
                priority: 0,
                resolve: resolve as (r: unknown[]) => void,
                reject,
            });
            this.sortQueue();
            this.processWorkQueue();
        });
    }

    /**
     * Request text content via the unified work queue.
     * Lowest priority — waits for pending renders and annotations to complete first.
     */
    requestText(docId: string, pageIndex: number): Promise<unknown[]> {
        const page = pageIndex + 1; // Convert 0-based to 1-based
        const key = `text:${docId}:${page}`;

        // Check if already in-flight
        if (this.currentWork?.key === key) {
            return this.currentWork.promise as Promise<unknown[]>;
        }

        // Check if already queued (dedup)
        const queued = this.workQueue.find(
            (q): q is QueuedTextItem => q.kind === "text" && q.docId === docId && q.page === page,
        );
        if (queued) {
            return new Promise((resolve, reject) => {
                const originalResolve = queued.resolve;
                const originalReject = queued.reject;
                queued.resolve = (result: unknown[]) => {
                    originalResolve(result);
                    resolve(result);
                };
                queued.reject = (error: Error) => {
                    originalReject(error);
                    reject(error);
                };
            });
        }

        return new Promise((resolve, reject) => {
            this.workQueue.push({
                kind: "text",
                docId,
                page,
                priority: 0,
                resolve: resolve as (r: unknown[]) => void,
                reject,
            });
            this.sortQueue();
            this.processWorkQueue();
        });
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
    async pdfSplitByOutline(
        documentId: string,
        maxLevel: number,
        splitMidPage: boolean = false,
    ): Promise<SplitByOutlineResult> {
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
    /**
     * Parse font information from raw font binary data.
     *
     * @param data - Raw font binary data (e.g., .ttf, .otf, .woff2)
     * @returns Font information including typeface, bold, and italic
     */
    async parseFontInfo(data: Uint8Array): Promise<FontInfo> {
        const response = (await this.send({ type: "parseFontInfo", data })) as {
            info: FontInfo;
        };
        return response.info;
    }

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
     * Register font URLs.
     *
     * The engine fetches fonts on-demand during layout from the provided URLs.
     * Call this before loading documents. Registered fonts take priority over
     * Google Fonts.
     *
     * @param fonts - Array of font entries with typeface, style, and URL
     */
    async registerFonts(fonts: FontEntry[]): Promise<void> {
        await this.send({ type: "registerFonts", fonts });
    }

    /**
     * Enable Google Fonts.
     *
     * When enabled, fonts not embedded in the document are fetched from
     * Google Fonts on-demand during rendering. Google Fonts are resolved
     * after any URL fonts registered via `registerFonts`.
     *
     * Call this before loading documents.
     */
    async enableGoogleFonts(): Promise<void> {
        await this.send({ type: "enableGoogleFonts" });
    }

    // ===========================================================================
    // Visibility Groups
    // ===========================================================================

    /**
     * Get visibility groups for a document.
     */
    async getVisibilityGroups(documentId: string): Promise<unknown[]> {
        const response = (await this.send({ type: "getVisibilityGroups", documentId })) as { groups: unknown[] };
        return response.groups;
    }

    /**
     * Set visibility of a specific group.
     *
     * @returns true if the group was found and updated
     */
    async setVisibilityGroupVisible(documentId: string, groupId: string, visible: boolean): Promise<boolean> {
        const response = (await this.send({ type: "setVisibilityGroupVisible", documentId, groupId, visible })) as {
            updated: boolean;
        };
        return response.updated;
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
        if (type === "page") return this.pageRenderCache;
        if (type === "preview") return this.previewRenderCache;
        return this.thumbnailRenderCache;
    }

    private getMaxCacheSize(type: RenderType): number {
        if (type === "page") return this.maxPageCacheSize;
        if (type === "preview") return this.maxPreviewCacheSize;
        return this.maxThumbnailCacheSize;
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
        if (this.currentWork?.key === key) {
            return this.currentWork.promise as Promise<RenderResult>;
        }

        // Check if already queued with same parameters
        const queued = this.workQueue.find(
            (q): q is QueuedRequest =>
                q.kind === "render" &&
                q.docId === req.docId &&
                q.page === req.page &&
                q.type === req.type &&
                q.scale === req.scale,
        );
        if (queued) {
            return new Promise((resolve, reject) => {
                const originalResolve = queued.resolve;
                const originalReject = queued.reject;
                queued.resolve = (result: RenderResult) => {
                    originalResolve(result);
                    resolve(result);
                };
                queued.reject = (error: Error) => {
                    originalReject(error);
                    reject(error);
                };
            });
        }

        // Cancel any existing queued requests for the same page and type (different scale)
        // This ensures we only render the most recent scale for each page
        this.cancelQueuedRequestsForPage(req.docId, req.page, req.type);

        // Queue the request
        return new Promise((resolve, reject) => {
            const queuedReq: QueuedRequest = {
                kind: "render",
                ...req,
                priority: 0, // Priority is now determined by distance-based sorting
                resolve,
                reject,
            };

            this.workQueue.push(queuedReq);
            this.sortQueue(); // Sort to place request in correct position based on current focus
            this.processWorkQueue();
        });
    }

    /**
     * Cancel queued requests for a specific page (within the same render type).
     * Does not cancel in-flight requests.
     */
    private cancelQueuedRequestsForPage(docId: string, page: number, type: RenderType): void {
        this.workQueue = this.workQueue.filter((item) => {
            if (item.kind !== "render") return true;
            const shouldCancel = item.docId === docId && item.page === page && item.type === type;
            if (shouldCancel) {
                item.reject(new Error("Request cancelled"));
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
        this.workQueue = this.workQueue.filter((item) => {
            if (item.kind !== "render") return true;
            const match =
                (docId === undefined || item.docId === docId) &&
                (page === undefined || item.page === page) &&
                (type === undefined || item.type === type);

            if (match) {
                item.reject(new Error("Request cancelled"));
            }
            return !match;
        });
    }

    /**
     * Invalidate cache entries. Call when document or zoom changes.
     */
    /**
     * Clear cached bitmaps without notifying UI callbacks.
     * Use during document close to avoid triggering re-renders.
     */
    clearRenderCache(docId?: string): void {
        const clear = (cache: Map<string, CacheEntry>) => {
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
        clear(this.pageRenderCache);
        clear(this.thumbnailRenderCache);
        clear(this.previewRenderCache);
    }

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
        if (type === undefined || type === "preview") {
            invalidateCache(this.previewRenderCache);
        }

        for (const cb of this.renderInvalidatedCallbacks) {
            cb();
        }
    }

    /**
     * Subscribe to render cache invalidation events.
     * Returns an unsubscribe function.
     */
    onRenderInvalidated(callback: () => void): () => void {
        this.renderInvalidatedCallbacks.add(callback);
        return () => this.renderInvalidatedCallbacks.delete(callback);
    }

    /**
     * Subscribe to font usage change events.
     * Called when font usage changes after a page render.
     * Returns an unsubscribe function.
     */
    onFontUsageChanged(callback: (docId: string) => void): () => void {
        this.fontUsageChangedCallbacks.add(callback);
        return () => this.fontUsageChangedCallbacks.delete(callback);
    }

    /**
     * Enqueue a font usage check at the end of the work queue.
     * Deduplicates: only one check per docId is queued at a time.
     */
    private scheduleFontUsageCheck(docId: string): void {
        if (this.fontUsageChangedCallbacks.size === 0) return;

        // Already queued for this doc — skip
        const key = `fontUsageCheck:${docId}`;
        if (this.workQueue.some((item) => makeWorkKey(item) === key)) return;

        this.workQueue.push({
            kind: "fontUsageCheck",
            docId,
            page: 0,
            priority: Infinity,
            resolve: () => {},
            reject: () => {},
        });
        // Don't re-sort or kick processWorkQueue here —
        // it will be picked up naturally after the current work finishes.
    }

    private async doFontUsageCheck(item: QueuedFontUsageCheck): Promise<void> {
        try {
            const entries = await this.getFontUsage(item.docId);
            const length = Array.isArray(entries) ? entries.length : 0;
            const previous = this.lastFontUsageLength.get(item.docId);

            if (previous !== length) {
                this.lastFontUsageLength.set(item.docId, length);
                for (const cb of this.fontUsageChangedCallbacks) {
                    cb(item.docId);
                }
            }
            item.resolve(undefined);
        } catch {
            // Font usage query failed (e.g. document unloaded) — ignore
            item.resolve(undefined);
        }
    }

    /**
     * Sort page render requests in the queue by distance to the focused page.
     * Updates the page focus and re-sorts the queue.
     */
    boostPageRenderPriority(docId: string, focusPage: number): void {
        this.pageFocus = { docId, page: focusPage };
        this.sortQueue();
        this.processWorkQueue();
    }

    /**
     * Sort thumbnail render requests in the queue by distance to the focused thumbnail.
     * Updates the thumbnail focus and re-sorts the queue.
     */
    boostThumbnailRenderPriority(docId: string, focusPage: number): void {
        this.thumbnailFocus = { docId, page: focusPage };
        this.sortQueue();
        this.processWorkQueue();
    }

    private static readonly PRERENDER_RANGE = 2; // Prerender pages within ±2 of current

    /**
     * Prerender adjacent pages for smooth page flipping in single spread mode.
     * Queues renders for pages before and after the current page (fire and forget).
     * Boosts current page priority so it renders first during rapid flipping.
     */
    prerenderAdjacentPages(docId: string, currentPage: number, scale: number, totalPages: number): void {
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
                    scale,
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
                    scale,
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
        const eventType = req.type === "thumbnail" ? ("renderThumbnail" as const) : ("renderPage" as const);
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
            const clamped =
                source.buffer instanceof ArrayBuffer
                    ? new Uint8ClampedArray(source.buffer, source.byteOffset, source.byteLength)
                    : new Uint8ClampedArray(source);
            const imageData = new ImageData(clamped, rendered.width, rendered.height);
            const bitmap = await createImageBitmap(imageData);

            const result: RenderResult = {
                bitmap,
                width: bitmap.width,
                height: bitmap.height,
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
     * Sort work queue by priority: page-proximity first, then type within each page.
     *
     * For page-focused items (pages, previews, annotations, text):
     *   Grouped by distance to pageFocus, closest first. Within each page,
     *   ordered: preview → page render → annotation → text.
     *   Boosted pages (within BOOST_RANGE) come before all non-boosted pages.
     *
     * Thumbnails use thumbnailFocus independently and come after all page items.
     */
    private sortQueue(): void {
        if (this.workQueue.length === 0) return;

        const pageFocus = this.pageFocus;
        const thumbnailFocus = this.thumbnailFocus;

        const pageItems: QueuedWorkItem[] = [];
        const thumbnailItems: QueuedWorkItem[] = [];

        for (const item of this.workQueue) {
            if (item.kind === "render" && item.type === "thumbnail") {
                thumbnailItems.push(item);
            } else {
                pageItems.push(item);
            }
        }

        // Sort page items: by distance to focus, then by type within same page
        const typeOrder = (item: QueuedWorkItem): number => {
            if (item.kind === "render" && item.type === "preview") return 0;
            if (item.kind === "render" && item.type === "page") return 1;
            if (item.kind === "annotation") return 2;
            if (item.kind === "text") return 3;
            // fontUsageCheck — always last
            return 4;
        };

        pageItems.sort((a, b) => {
            // fontUsageCheck always sorts last among page items
            const aIsCheck = a.kind === "fontUsageCheck" ? 1 : 0;
            const bIsCheck = b.kind === "fontUsageCheck" ? 1 : 0;
            if (aIsCheck !== bIsCheck) return aIsCheck - bIsCheck;

            const ad = pageFocus && a.docId === pageFocus.docId ? Math.abs(a.page - pageFocus.page) : Infinity;
            const bd = pageFocus && b.docId === pageFocus.docId ? Math.abs(b.page - pageFocus.page) : Infinity;

            // Boosted vs non-boosted
            const aBoosted = ad <= WorkerClient.BOOST_RANGE;
            const bBoosted = bd <= WorkerClient.BOOST_RANGE;
            if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;

            // Same distance → order by type; different distance → closer first
            if (ad !== bd) return ad - bd;
            return typeOrder(a) - typeOrder(b);
        });

        // Sort thumbnails by distance to thumbnail focus
        thumbnailItems.sort((a, b) => {
            const ad =
                thumbnailFocus && a.docId === thumbnailFocus.docId ? Math.abs(a.page - thumbnailFocus.page) : Infinity;
            const bd =
                thumbnailFocus && b.docId === thumbnailFocus.docId ? Math.abs(b.page - thumbnailFocus.page) : Infinity;
            return ad - bd;
        });

        // Page items first, then thumbnails
        this.workQueue = [...pageItems, ...thumbnailItems];
    }

    /**
     * Clean up render resources.
     */
    destroyRenderResources(): void {
        // Cancel all pending renders
        for (const req of this.workQueue) {
            req.reject(new Error("WorkerClient destroyed"));
        }
        this.workQueue = [];

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

        // Close all cached preview bitmaps
        for (const entry of this.previewRenderCache.values()) {
            entry.result.bitmap.close();
        }
        this.previewRenderCache.clear();
    }

    private processWorkQueue(): void {
        // Only one request at a time (WASM is single-threaded)
        if (this.currentWork) return;
        if (this.workQueue.length === 0) return;

        const item = this.workQueue.shift()!;
        const key = makeWorkKey(item);

        let promise: Promise<unknown>;

        if (item.kind === "render") {
            const renderKey = makeRenderKey(item.docId, item.page, item.type, item.scale);
            const cache = this.getCache(item.type);

            // Double-check cache (might have been filled while queued)
            const cached = cache.get(renderKey);
            if (cached) {
                cached.lastAccess = Date.now();
                item.resolve(cached.result);
                // Continue processing queue
                this.processWorkQueue();
                return;
            }

            promise = this.doRender(item, renderKey);
        } else if (item.kind === "annotation") {
            promise = this.doAnnotation(item);
        } else if (item.kind === "text") {
            promise = this.doText(item);
        } else {
            promise = this.doFontUsageCheck(item);
        }

        this.currentWork = { key, promise };
        promise.finally(() => {
            this.currentWork = null;
            this.processWorkQueue();
        });
    }

    private async doRender(req: QueuedRequest, key: string): Promise<RenderResult> {
        const counter = req.type !== "preview" ? this.getCounter(req.docId) : null;
        const eventType = req.type === "thumbnail" ? ("renderThumbnail" as const) : ("renderPage" as const);
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
            const clamped =
                source.buffer instanceof ArrayBuffer
                    ? new Uint8ClampedArray(source.buffer, source.byteOffset, source.byteLength)
                    : new Uint8ClampedArray(source);
            const imageData = new ImageData(clamped, rendered.width, rendered.height);
            const bitmap = await createImageBitmap(imageData);

            const result: RenderResult = {
                bitmap,
                width: bitmap.width,
                height: bitmap.height,
            };

            // Add to cache
            this.addToRenderCache(req.type, key, result);

            if (eventId) counter?.markEnd(eventId);
            req.resolve(result);

            // Check for font usage changes after successful page render (debounced)
            if (req.type === "page") {
                this.scheduleFontUsageCheck(req.docId);
            }

            return result;
        } catch (error) {
            if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
            req.reject(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    private async doAnnotation(item: QueuedAnnotationItem): Promise<unknown[]> {
        const pageIndex = item.page - 1;
        const counter = this.getCounter(item.docId);
        const eventId = counter?.markStart("getPageAnnotations", { pageIndex });
        try {
            const response = (await this.send({
                type: "getPageAnnotations",
                documentId: item.docId,
                pageIndex,
            })) as { annotations: unknown[] };
            if (eventId) counter?.markEnd(eventId);
            item.resolve(response.annotations);
            return response.annotations;
        } catch (error) {
            if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
            item.reject(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    private async doText(item: QueuedTextItem): Promise<unknown[]> {
        const pageIndex = item.page - 1;
        const counter = this.getCounter(item.docId);
        const eventId = counter?.markStart("getPageText", { pageIndex });
        try {
            const response = (await this.send({
                type: "getPageText",
                documentId: item.docId,
                pageIndex,
            })) as { text: unknown[] };
            if (eventId) counter?.markEnd(eventId);
            item.resolve(response.text);
            return response.text;
        } catch (error) {
            if (eventId) counter?.markEnd(eventId, false, (error as Error).message);
            item.reject(error instanceof Error ? error : new Error(String(error)));
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
            lastAccess: Date.now(),
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
