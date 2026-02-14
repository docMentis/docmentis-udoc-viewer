/**
 * UDocViewer - Document viewer component.
 *
 * Binds to a loaded document and optionally provides UI.
 * Created via `client.createViewer()`.
 */

import type { WorkerClient, PageInfo, RenderType } from "./worker/index.js";
import type { ViewerOptions } from "./UDocClient.js";
import { mountViewerShell, type ViewerShell, type InitialStateOverrides } from "./ui/viewer/shell.js";
import type { Destination, OutlineItem } from "./ui/viewer/navigation.js";
import type { Annotation } from "./ui/viewer/annotation/index.js";
export type { Annotation } from "./ui/viewer/annotation/index.js";
import type { TextRun } from "./ui/viewer/text/index.js";
import { getFormatDefaults, type DocumentFormat, type ViewModeDefaults } from "./ui/viewer/state.js";
import {
  PerformanceCounter,
  NoOpPerformanceCounter,
  type IPerformanceCounter,
} from "./performance/index.js";

/**
 * Options for rendering a page.
 */
export interface RenderOptions {
  /**
   * Scale factor for rendering.
   * 1 = 72 DPI (1 point = 1 pixel)
   * 2 = 144 DPI (retina)
   * @default 1
   */
  scale?: number;

  /**
   * Output format.
   * @default 'image-data'
   */
  format?: "image-data" | "image-bitmap" | "blob" | "data-url";

  /**
   * Image type when format is 'blob' or 'data-url'.
   * @default 'image/png'
   */
  imageType?: "image/png" | "image/jpeg";

  /**
   * JPEG quality (0-1) when imageType is 'image/jpeg'.
   * @default 0.92
   */
  quality?: number;

  /**
   * Include annotations in render.
   * @default true
   */
  annotations?: boolean;

  /**
   * Skip all cache and queue, call worker directly.
   * Useful for one-off renders that shouldn't affect the render queue.
   * @default false
   */
  force?: boolean;

  /**
   * Boost render priority by calling boostRenderPage before rendering.
   * This prioritizes this page and nearby pages in the render queue.
   * @default false
   */
  boost?: boolean;
}

/**
 * Rendered page result.
 */
export type RenderedPage = ImageData | ImageBitmap | Blob | string;

/**
 * Document metadata.
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * Re-export navigation types for public API.
 */
export type {
  Destination,
  DestinationDisplay,
  OutlineItem
} from "./ui/viewer/navigation.js";

/**
 * Download progress information.
 */
export interface DownloadProgress {
  /** Bytes loaded so far. */
  loaded: number;
  /** Total bytes (may be 0 if Content-Length not available). */
  total: number;
  /** Progress percentage 0-100 (null if total unknown). */
  percent: number | null;
}

/**
 * Event map for viewer events.
 */
export interface ViewerEventMap {
  "document:load": { pageCount: number };
  "document:close": Record<string, never>;
  "download:progress": DownloadProgress;
  error: { error: Error; phase: "fetch" | "parse" | "render" };
}

type EventHandler<K extends keyof ViewerEventMap> = (payload: ViewerEventMap[K]) => void;

/**
 * Document viewer component.
 *
 * Supports both UI mode (with container) and headless mode (without container).
 * Use `client.createViewer()` to create instances.
 */
export class UDocViewer {
  private workerClient: WorkerClient;
  private container: HTMLElement | null = null;
  private uiShell: ViewerShell | null = null;
  private documentId: string | null = null;
  private _pageCount = 0;
  private _pageInfo: PageInfo[] = [];
  private destroyed = false;
  private eventHandlers = new Map<keyof ViewerEventMap, Set<EventHandler<keyof ViewerEventMap>>>();
  private _performanceCounter: IPerformanceCounter;
  private googleFontsEnabled: boolean;
  private viewOverrides: ViewModeDefaults;
  private currentFormat: DocumentFormat | null = null;

  /**
   * @internal
   * Use `client.createViewer()` instead.
   */
  constructor(workerClient: WorkerClient, options: ViewerOptions = {}) {
    this.workerClient = workerClient;
    this.googleFontsEnabled = options.googleFonts ?? true;
    this.viewOverrides = this.buildViewModeOverrides(options);

    // Initialize performance counter
    if (options.enablePerformanceCounter) {
      const counter = new PerformanceCounter();
      this._performanceCounter = counter;
      if (options.onPerformanceLog) {
        counter.onLog(options.onPerformanceLog);
      }
    } else {
      this._performanceCounter = new NoOpPerformanceCounter();
    }

    if (options.container) {
      this.container = this.resolveContainer(options.container);
      const overrides = this.buildStateOverrides(options);
      this.uiShell = mountViewerShell(this.container, this.createEngineAdapter(), this.workerClient, overrides);

      // Set up password callback
      this.uiShell.setCallbacks({
        onPasswordSubmit: (password: string) => this.handlePasswordSubmit(password)
      });
    }
  }

  /**
   * Performance counter for tracking operation timings.
   * Only records data when `enablePerformanceCounter` is true.
   */
  get performanceCounter(): IPerformanceCounter {
    return this._performanceCounter;
  }

  private buildStateOverrides(options: ViewerOptions): InitialStateOverrides {
    const overrides: InitialStateOverrides = {};

    if (options.scrollMode !== undefined) overrides.scrollMode = options.scrollMode;
    if (options.layoutMode !== undefined) overrides.layoutMode = options.layoutMode;
    if (options.zoomMode !== undefined) overrides.zoomMode = options.zoomMode;
    if (options.zoom !== undefined) overrides.zoom = options.zoom;
    if (options.zoomSteps !== undefined) overrides.zoomSteps = options.zoomSteps;
    if (options.dpi !== undefined) overrides.dpi = options.dpi;
    if (options.pageSpacing !== undefined) overrides.pageSpacing = options.pageSpacing;
    if (options.spreadSpacing !== undefined) overrides.spreadSpacing = options.spreadSpacing;
    if (options.activePanel !== undefined) overrides.activePanel = options.activePanel;

    return overrides;
  }

  private buildViewModeOverrides(options: ViewerOptions): ViewModeDefaults {
    const overrides: ViewModeDefaults = {};

    if (options.scrollMode !== undefined) overrides.scrollMode = options.scrollMode;
    if (options.layoutMode !== undefined) overrides.layoutMode = options.layoutMode;
    if (options.zoomMode !== undefined) overrides.zoomMode = options.zoomMode;
    if (options.zoom !== undefined) overrides.zoom = options.zoom;
    if (options.pageSpacing !== undefined) overrides.pageSpacing = options.pageSpacing;
    if (options.spreadSpacing !== undefined) overrides.spreadSpacing = options.spreadSpacing;

    return overrides;
  }

  private computeViewDefaults(format: DocumentFormat): ViewModeDefaults {
    return { ...getFormatDefaults(format), ...this.viewOverrides };
  }

  // ===========================================================================
  // Document Loading
  // ===========================================================================

  /**
   * Load a document.
   *
   * @param source - URL string, File object, or raw bytes
   */
  async load(source: string | File | Uint8Array): Promise<void> {
    this.ensureNotDestroyed();

    // Reset performance counter and start timing
    this._performanceCounter.reset();
    this._performanceCounter.setLoadStartTime();

    // Close any existing document
    if (this.documentId) {
      this.close();
    }

    try {
      // Track download phase
      const downloadId = this._performanceCounter.markStart("download");
      const { bytes, filename } = await this.resolveSourceWithFilename(source);
      this._performanceCounter.markEnd(downloadId);

      // Detect format and load appropriately
      const format = detectDocumentFormat(bytes, filename);
      this.currentFormat = format;
      const loadId = this._performanceCounter.markStart(
        format === "image" ? "loadImage" : format === "pptx" ? "loadPptx" : "loadPdf"
      );
      this.documentId =
        format === "image"
          ? await this.workerClient.loadImage(bytes)
          : format === "pptx"
            ? await this.workerClient.loadPptx(bytes)
            : await this.workerClient.loadPdf(bytes);
      this._performanceCounter.markEnd(loadId);

      // Enable Google Fonts if requested
      if (this.googleFontsEnabled) {
        await this.workerClient.enableGoogleFonts(this.documentId);
      }

      // Register performance counter with WorkerClient for this document
      // This enables tracking of all subsequent operations (getPageInfo, render, etc.)
      if (this._performanceCounter.enabled) {
        this.workerClient.setPerformanceCounter(this.documentId, this._performanceCounter);
      }

      // Check if document needs password
      const passwordRequired = await this.workerClient.needsPassword(this.documentId);

      if (passwordRequired) {
        // Document needs password - show dialog and wait for authentication
        if (this.uiShell) {
          this.uiShell.dispatch({
            type: "SET_DOC",
            doc: { id: this.documentId },
            pageCount: 0,
            pageInfos: [],
            viewDefaults: this.computeViewDefaults(format),
          });
          this.uiShell.dispatch({ type: "SET_NEEDS_PASSWORD", needsPassword: true });
        }
        // Don't emit document:load yet - wait for successful authentication
        return;
      }

      // Load all page info upfront (fast operation)
      this._pageInfo = await this.workerClient.getAllPageInfo(this.documentId);
      this._pageCount = this._pageInfo.length;

      if (this.uiShell) {
        const initUiId = this._performanceCounter.markStart("initUiShell");
        this.uiShell.dispatch({
          type: "SET_DOC",
          doc: { id: this.documentId },
          pageCount: this._pageCount,
          pageInfos: this._pageInfo,
          viewDefaults: this.computeViewDefaults(format),
        });
        this._performanceCounter.markEnd(initUiId);
      }

      this.emit("document:load", { pageCount: this._pageCount });
    } catch (error) {
      const phase = error instanceof TypeError ? "fetch" : "parse";
      this.emit("error", { error: error as Error, phase });
      throw error;
    }
  }

  /**
   * Close the current document.
   * Viewer returns to empty state.
   */
  close(): void {
    if (this.documentId) {
      const docId = this.documentId;

      // Remove performance counter for this document
      this.workerClient.removePerformanceCounter(docId);

      // Clean up render cache first (cancel pending, clear cache)
      this.workerClient.cancelRenders(docId);
      this.workerClient.invalidateRenderCache(docId);

      // Unload from WASM worker
      this.workerClient.unloadPdf(docId).catch(() => {
        // Ignore errors during close
      });

      this.documentId = null;
      this._pageCount = 0;
      this._pageInfo = [];
      if (this.uiShell) {
        this.uiShell.dispatch({ type: "CLEAR_DOC" });
      }
      this.emit("document:close", {});
    }
  }

  /**
   * Whether a document is currently loaded.
   */
  get isLoaded(): boolean {
    return this.documentId !== null;
  }

  /**
   * Check if the loaded document requires a password to open.
   * @returns True if the document needs authentication before pages can be accessed.
   */
  async needsPassword(): Promise<boolean> {
    this.ensureLoaded();
    return this.workerClient.needsPassword(this.documentId!);
  }

  /**
   * Authenticate with a password to unlock an encrypted document.
   *
   * After successful authentication, page info is reloaded and the document
   * becomes fully accessible.
   *
   * @param password - The password to try
   * @returns True if authentication succeeded, false if the password was incorrect.
   */
  async authenticate(password: string): Promise<boolean> {
    this.ensureLoaded();

    // Dispatch authenticating state for UI
    if (this.uiShell) {
      this.uiShell.dispatch({ type: "AUTHENTICATE_START" });
    }

    try {
      const success = await this.workerClient.authenticate(this.documentId!, password);

      if (success) {
        // Clear any cached renders from before authentication (they would be invalid)
        this.workerClient.cancelRenders(this.documentId!);
        this.workerClient.invalidateRenderCache(this.documentId!);

        // Enable Google Fonts if requested
        if (this.googleFontsEnabled) {
          await this.workerClient.enableGoogleFonts(this.documentId!);
        }

        // Reload page info after successful authentication
        this._pageInfo = await this.workerClient.getAllPageInfo(this.documentId!);
        this._pageCount = this._pageInfo.length;

        if (this.uiShell) {
          this.uiShell.dispatch({ type: "AUTHENTICATE_SUCCESS" });
          this.uiShell.dispatch({
            type: "SET_DOC",
            doc: { id: this.documentId! },
            pageCount: this._pageCount,
            pageInfos: this._pageInfo,
            viewDefaults: this.currentFormat ? this.computeViewDefaults(this.currentFormat) : undefined,
          });
        }

        this.emit("document:load", { pageCount: this._pageCount });
      } else {
        if (this.uiShell) {
          this.uiShell.dispatch({ type: "AUTHENTICATE_FAILURE", error: "Incorrect password" });
        }
      }

      return success;
    } catch (error) {
      if (this.uiShell) {
        this.uiShell.dispatch({
          type: "AUTHENTICATE_FAILURE",
          error: error instanceof Error ? error.message : "Authentication failed"
        });
      }
      throw error;
    }
  }

  /**
   * Handle password submission from the UI dialog.
   * @internal
   */
  private async handlePasswordSubmit(password: string): Promise<void> {
    try {
      await this.authenticate(password);
    } catch {
      // Error is already dispatched to UI in authenticate()
    }
  }

  // ===========================================================================
  // Document Information
  // ===========================================================================

  /**
   * Total number of pages.
   * Returns 0 if no document is loaded.
   */
  get pageCount(): number {
    return this._pageCount;
  }

  /**
   * Document metadata (title, author, etc.).
   * Returns null if no document is loaded.
   */
  get metadata(): DocumentMetadata | null {
    // TODO: Implement metadata retrieval from WASM
    if (!this.documentId) return null;
    return {};
  }

  /**
   * Get document outline (table of contents / bookmarks).
   */
  async getOutline(): Promise<OutlineItem[]> {
    this.ensureLoaded();
    const raw = await this.workerClient.getOutline(this.documentId!);
    return raw as OutlineItem[];
  }

  /**
   * Get page dimensions in points (1 point = 1/72 inch).
   * @param page - Page index (0-based)
   */
  async getPageInfo(page: number): Promise<PageInfo> {
    this.ensureLoaded();
    if (page < 0 || page >= this._pageCount) {
      throw new Error(`Page index ${page} out of bounds (0-${this._pageCount - 1})`);
    }
    // Return cached info if available
    if (this._pageInfo[page]) {
      return this._pageInfo[page];
    }
    // Fetch from worker if not loaded yet
    const info = await this.workerClient.getPageInfo(this.documentId!, page);
    this._pageInfo[page] = info;
    return info;
  }

  /**
   * Get annotations on a specific page.
   * @param page - Page index (0-based)
   */
  async getPageAnnotations(page: number): Promise<Annotation[]> {
    this.ensureLoaded();
    const raw = await this.workerClient.getPageAnnotations(this.documentId!, page);
    return raw as Annotation[];
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  /**
   * Get the current page number (1-based).
   */
  get currentPage(): number {
    if (this.uiShell) {
      return this.uiShell.getState().page;
    }
    return 1;
  }

  /**
   * Navigate to a specific page.
   * @param page - Page number (1-based)
   */
  goToPage(page: number): void {
    this.ensureNotDestroyed();
    if (!this.uiShell) {
      throw new Error("Navigation requires UI mode (container must be provided)");
    }
    this.uiShell.dispatch({ type: "NAVIGATE_TO_PAGE", page });
  }

  /**
   * Navigate to a destination (page + position + zoom).
   * @param destination - Full destination object with page index and display mode
   */
  goToDestination(destination: Destination): void {
    this.ensureNotDestroyed();
    if (!this.uiShell) {
      throw new Error("Navigation requires UI mode (container must be provided)");
    }
    this.uiShell.dispatch({ type: "NAVIGATE_TO_DESTINATION", destination });
  }

  // ===========================================================================
  // Page Rendering
  // ===========================================================================

  /**
   * Render a page to an image.
   *
   * @param page - Page index (0-based)
   * @param options - Render options (scale, format, etc.)
   */
  async renderPage(page: number, options: RenderOptions = {}): Promise<RenderedPage> {
    return this.renderWithType(page, "page", options);
  }

  /**
   * Render a thumbnail of a page.
   *
   * Similar to renderPage but uses lower priority in the render queue,
   * making it suitable for generating thumbnails without blocking main page renders.
   *
   * @param page - Page index (0-based)
   * @param options - Render options (scale, format, etc.)
   */
  async renderThumbnail(page: number, options: RenderOptions = {}): Promise<RenderedPage> {
    return this.renderWithType(page, "thumbnail", options);
  }

  /**
   * Internal method to render a page with a specific render type.
   */
  private async renderWithType(
    page: number,
    type: RenderType,
    options: RenderOptions = {}
  ): Promise<RenderedPage> {
    this.ensureLoaded();

    const scale = options.scale ?? 1;
    const format = options.format ?? "image-data";
    const force = options.force ?? false;
    const boost = options.boost ?? false;

    const renderRequest = {
      docId: this.documentId!,
      page: page + 1, // Uses 1-based page numbers
      type,
      scale
    };

    let result;
    if (force) {
      // Bypass cache and queue, call worker directly
      result = await this.workerClient.forceRender(renderRequest);
    } else {
      // Boost priority if requested (before queueing the render)
      if (boost) {
        if (type === "page") {
          this.workerClient.boostPageRenderPriority(this.documentId!, page + 1);
        } else {
          this.workerClient.boostThumbnailRenderPriority(this.documentId!, page + 1);
        }
      }

      // Request render through WorkerClient
      // Performance tracking is handled by WorkerClient.doRender()
      result = await this.workerClient.requestRender(renderRequest);
    }

    // Convert ImageBitmap to the requested format
    return this.convertBitmapToFormat(result.bitmap, format, options);
  }

  /**
   * Convert an ImageBitmap to the requested output format.
   */
  private async convertBitmapToFormat(
    bitmap: ImageBitmap,
    format: "image-data" | "image-bitmap" | "blob" | "data-url",
    options: RenderOptions
  ): Promise<RenderedPage> {
    if (format === "image-bitmap") {
      return bitmap;
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);

    if (format === "image-data") {
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    }

    const imageType = options.imageType ?? "image/png";
    const quality = options.quality ?? 0.92;

    if (format === "blob") {
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          imageType,
          quality
        );
      });
    }

    // data-url
    return canvas.toDataURL(imageType, quality);
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  /**
   * Export document as bytes.
   */
  async toBytes(): Promise<Uint8Array> {
    this.ensureLoaded();
    return this.workerClient.getBytes(this.documentId!);
  }

  /**
   * Download document to user's device.
   * @param filename - Filename for download
   */
  async download(filename?: string): Promise<void> {
    const bytes = await this.toBytes();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "document.pdf";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<K extends keyof ViewerEventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler<keyof ViewerEventMap>);

    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof ViewerEventMap>(event: K, handler: EventHandler<K>): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler<keyof ViewerEventMap>);
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Destroy the viewer and release resources.
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    if (this.uiShell) {
      this.uiShell.destroy();
      this.uiShell = null;
    }
    this.close();
    this.eventHandlers.clear();
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  /**
   * Get the document ID (for internal use).
   * @internal
   */
  getDocumentId(): string | null {
    return this.documentId;
  }

  /**
   * Initialize the viewer with an already-loaded document ID.
   * Used by UDocClient.compose() to create viewers for composed documents.
   * @internal
   */
  async initializeFromDocId(docId: string): Promise<void> {
    this.ensureNotDestroyed();
    if (this.documentId) {
      this.close();
    }

    this.documentId = docId;

    // Load all page info upfront (fast operation)
    this._pageInfo = await this.workerClient.getAllPageInfo(docId);
    this._pageCount = this._pageInfo.length;

    if (this.uiShell) {
      this.uiShell.dispatch({
        type: "SET_DOC",
        doc: { id: docId },
        pageCount: this._pageCount,
        pageInfos: this._pageInfo
      });
    }

    this.emit("document:load", { pageCount: this._pageCount });
  }

  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === "string") {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container not found: ${container}`);
      }
      return element as HTMLElement;
    }
    return container;
  }

  private async resolveSourceWithFilename(
    source: string | File | Uint8Array
  ): Promise<{ bytes: Uint8Array; filename?: string }> {
    if (source instanceof Uint8Array) {
      return { bytes: source };
    }

    if (source instanceof File) {
      const buffer = await source.arrayBuffer();
      return { bytes: new Uint8Array(buffer), filename: source.name };
    }

    // URL string - use streaming to report progress
    const bytes = await this.fetchWithProgress(source);
    return { bytes, filename: source };
  }

  private async fetchWithProgress(url: string): Promise<Uint8Array> {
    // Show progress bar immediately before sending the request
    if (this.uiShell) {
      this.uiShell.dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        loaded: 0,
        total: 0,
      });
    }
    this.emit("download:progress", { loaded: 0, total: 0, percent: null });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // If no body or no streaming support, fall back to simple approach
    if (!response.body) {
      const buffer = await response.arrayBuffer();
      // Clear download progress from UI
      if (this.uiShell) {
        this.uiShell.dispatch({ type: "CLEAR_DOWNLOAD_PROGRESS" });
      }
      return new Uint8Array(buffer);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    // Helper to report progress to both event listeners and UI shell
    const reportProgress = (currentLoaded: number) => {
      const progress = {
        loaded: currentLoaded,
        total,
        percent: total > 0 ? Math.round((currentLoaded / total) * 100) : null,
      };
      this.emit("download:progress", progress);
      // Dispatch to UI shell for the loading overlay
      if (this.uiShell) {
        this.uiShell.dispatch({
          type: "SET_DOWNLOAD_PROGRESS",
          loaded: currentLoaded,
          total,
        });
      }
    };

    // Report initial progress with known total (transitions from indeterminate to 0%)
    reportProgress(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;
      reportProgress(loaded);
    }

    // Clear download progress from UI
    if (this.uiShell) {
      this.uiShell.dispatch({ type: "CLEAR_DOWNLOAD_PROGRESS" });
    }

    // Combine chunks into single array
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  private emit<K extends keyof ViewerEventMap>(event: K, payload: ViewerEventMap[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  private createEngineAdapter() {
    return {
      getPageInfo: async (_doc: { id: string }, page: number): Promise<PageInfo> => {
        const pageIndex = Math.max(0, page - 1);
        return this._pageInfo[pageIndex] ?? { width: 0, height: 0 };
      },
      getOutline: async (doc: { id: string }): Promise<OutlineItem[]> => {
        const raw = await this.workerClient.getOutline(doc.id);
        return raw as OutlineItem[];
      },
      getPageAnnotations: async (doc: { id: string }, pageIndex: number): Promise<Annotation[]> => {
        const raw = await this.workerClient.getPageAnnotations(doc.id, pageIndex);
        return raw as Annotation[];
      },
      getPageText: async (doc: { id: string }, pageIndex: number): Promise<TextRun[]> => {
        const raw = await this.workerClient.getPageText(doc.id, pageIndex);
        return raw as TextRun[];
      }
    };
  }

  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error("UDocViewer has been destroyed");
    }
  }

  private ensureLoaded(): void {
    this.ensureNotDestroyed();
    if (!this.documentId) {
      throw new Error("No document loaded");
    }
  }
}

/**
 * Detect document format based on magic bytes and filename.
 * Returns "pdf" for PDF files, "pptx" for PowerPoint files, "image" for supported image formats.
 */
function detectDocumentFormat(bytes: Uint8Array, filename?: string): "pdf" | "pptx" | "image" {
  // Check magic bytes first (most reliable)
  if (bytes.length >= 4) {
    // PDF: %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return "pdf";
    }

    // ZIP signature: PK\x03\x04 (0x504B0304) - PPTX is a ZIP archive
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      // Check filename extension to distinguish OOXML types
      if (filename) {
        const ext = filename.toLowerCase().split(".").pop();
        if (ext === "pptx") {
          return "pptx";
        }
      }
      // Default ZIP to PPTX for now (could add DOCX/XLSX later)
      return "pptx";
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image";
    }

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return "image";
    }

    // GIF: GIF8
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return "image";
    }

    // BMP: BM
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return "image";
    }

    // TIFF: II (little-endian) or MM (big-endian) followed by 42
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
    ) {
      return "image";
    }

    // WebP: RIFF....WEBP
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "image";
    }
  }

  // Fallback to filename extension
  if (filename) {
    const ext = filename.toLowerCase().split(".").pop();

    // PPTX extension
    if (ext === "pptx") {
      return "pptx";
    }

    const imageExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "tiff",
      "tif",
      "webp",
      "ico",
      "pnm",
      "pbm",
      "pgm",
      "ppm",
      "tga",
      "hdr",
      "exr",
      "qoi",
      "ff",
    ];
    if (ext && imageExtensions.includes(ext)) {
      return "image";
    }
  }

  // Default to PDF for unknown formats
  return "pdf";
}
