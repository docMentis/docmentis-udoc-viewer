/**
 * UDocViewer - Document viewer component.
 *
 * Binds to a loaded document and optionally provides UI.
 * Created via `client.createViewer()`.
 */

import type { WorkerClient, PageInfo, RenderType } from "./worker/index.js";
import type { ViewerOptions } from "./UDocClient.js";
import { mountViewerShell, type ViewerShell, type InitialStateOverrides } from "./ui/viewer/shell.js";
import type { PrintDialogResult, PrintPageRange, PrintQuality } from "./ui/viewer/components/PrintDialog.js";
import type { Destination, OutlineItem } from "./ui/viewer/navigation.js";
import type { Annotation } from "./ui/viewer/annotation/index.js";
export type { Annotation } from "./ui/viewer/annotation/index.js";
import type { TextRun } from "./ui/viewer/text/index.js";
import {
    getFormatDefaults,
    type DocumentFormat,
    type ViewModeDefaults,
    type PanelTab,
    type ScrollMode,
    type LayoutMode,
    type ZoomMode,
    type PageRotation,
    type SpacingMode,
    type ThemeMode,
    type VisibilityGroup,
} from "./ui/viewer/state.js";
import { PerformanceCounter, NoOpPerformanceCounter, type IPerformanceCounter } from "./performance/index.js";

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
export type { Destination, DestinationDisplay, OutlineItem } from "./ui/viewer/navigation.js";

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
 * UI component identifier for visibility events.
 */
export type UIComponent =
    | "toolbar"
    | "floatingToolbar"
    | "leftPanel"
    | "rightPanel"
    | "fullscreen"
    | "download"
    | "print"
    | PanelTab;

/**
 * Event map for viewer events.
 */
export interface ViewerEventMap {
    "document:load": { pageCount: number };
    "document:close": Record<string, never>;
    "download:progress": DownloadProgress;
    error: { error: Error; phase: "fetch" | "parse" | "render" };
    "page:change": { page: number; previousPage: number };
    "ui:visibilityChange": { component: UIComponent; visible: boolean };
    "panel:change": { panel: PanelTab | null; previousPanel: PanelTab | null };
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
    private sourceFilename: string | null = null;
    private storeUnsub: (() => void) | null = null;
    private sdkVersion: string;

    /**
     * @internal
     * Use `client.createViewer()` instead.
     */
    constructor(
        workerClient: WorkerClient,
        options: ViewerOptions = {},
        showAttribution = true,
        sdkVersion = "__VERSION__",
    ) {
        this.workerClient = workerClient;
        this.googleFontsEnabled = options.googleFonts ?? true;
        this.sdkVersion = sdkVersion;
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
            this.uiShell = mountViewerShell(
                this.container,
                this.createEngineAdapter(),
                this.workerClient,
                overrides,
                showAttribution,
            );

            // Set up callbacks for shell events
            this.uiShell.setCallbacks({
                onPasswordSubmit: (password: string) => this.handlePasswordSubmit(password),
                onDownload: () => this.download(),
                onPrint: (options) => this.print(options),
            });

            // Subscribe to store state changes to emit public events
            this.storeUnsub = this.uiShell.store.subscribeEffect((prev, next) => {
                if (prev.page !== next.page) {
                    this.emit("page:change", { page: next.page, previousPage: prev.page });
                }
                if (prev.activePanel !== next.activePanel) {
                    this.emit("panel:change", { panel: next.activePanel, previousPanel: prev.activePanel });
                }
                if (prev.toolbarVisible !== next.toolbarVisible) {
                    this.emit("ui:visibilityChange", { component: "toolbar", visible: next.toolbarVisible });
                }
                if (prev.floatingToolbarVisible !== next.floatingToolbarVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "floatingToolbar",
                        visible: next.floatingToolbarVisible,
                    });
                }
                if (prev.leftPanelVisible !== next.leftPanelVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "leftPanel",
                        visible: next.leftPanelVisible,
                    });
                }
                if (prev.rightPanelVisible !== next.rightPanelVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "rightPanel",
                        visible: next.rightPanelVisible,
                    });
                }
                if (prev.fullscreenButtonVisible !== next.fullscreenButtonVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "fullscreen",
                        visible: next.fullscreenButtonVisible,
                    });
                }
                if (prev.downloadButtonVisible !== next.downloadButtonVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "download",
                        visible: next.downloadButtonVisible,
                    });
                }
                if (prev.printButtonVisible !== next.printButtonVisible) {
                    this.emit("ui:visibilityChange", {
                        component: "print",
                        visible: next.printButtonVisible,
                    });
                }
                if (prev.disabledPanels !== next.disabledPanels) {
                    // Emit events for panels whose disabled state changed
                    const allPanels: PanelTab[] = [
                        "thumbnail",
                        "outline",
                        "bookmarks",
                        "layers",
                        "attachments",
                        "search",
                        "comments",
                    ];
                    for (const panel of allPanels) {
                        const wasDisabled = prev.disabledPanels.has(panel);
                        const isDisabled = next.disabledPanels.has(panel);
                        if (wasDisabled !== isDisabled) {
                            this.emit("ui:visibilityChange", { component: panel, visible: !isDisabled });
                        }
                    }
                }
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
        if (options.thumbnailWidth !== undefined) overrides.thumbnailWidth = options.thumbnailWidth;
        if (options.activePanel !== undefined) overrides.activePanel = options.activePanel;
        if (options.hideToolbar) overrides.toolbarVisible = false;
        if (options.hideFloatingToolbar) overrides.floatingToolbarVisible = false;
        if (options.disableFullscreen) overrides.fullscreenButtonVisible = false;
        if (options.disableDownload) overrides.downloadButtonVisible = false;
        if (options.disablePrint) overrides.printButtonVisible = false;
        if (options.disableLeftPanel) overrides.leftPanelVisible = false;
        if (options.disableRightPanel) overrides.rightPanelVisible = false;
        if (options.theme !== undefined) overrides.theme = options.theme;
        if (options.disableThemeSwitching) overrides.themeSwitchingDisabled = true;
        if (options.disableTextSelection) overrides.textSelectionDisabled = true;
        if (options.pageRotation !== undefined) overrides.pageRotation = options.pageRotation;
        if (options.spacingMode !== undefined) overrides.spacingMode = options.spacingMode;
        if (options.minZoom !== undefined) overrides.minZoom = options.minZoom;
        if (options.maxZoom !== undefined) overrides.maxZoom = options.maxZoom;

        // Collect individually disabled panels into the internal Set
        const disabled: PanelTab[] = [];
        if (options.disableThumbnails) disabled.push("thumbnail");
        if (options.disableOutline) disabled.push("outline");
        if (options.disableBookmarks) disabled.push("bookmarks");
        if (options.disableLayers) disabled.push("layers");
        if (options.disableAttachments) disabled.push("attachments");
        if (options.disableSearch) disabled.push("search");
        if (options.disableComments) disabled.push("comments");
        if (disabled.length > 0) {
            overrides.disabledPanels = new Set(disabled);
        }

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
        if (options.pageRotation !== undefined) overrides.pageRotation = options.pageRotation;
        if (options.spacingMode !== undefined) overrides.spacingMode = options.spacingMode;

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
            this.sourceFilename = filename ?? null;
            this._performanceCounter.markEnd(downloadId);

            // Load document — WASM auto-detects format from file contents
            const loadId = this._performanceCounter.markStart("load");
            this.documentId = await this.workerClient.loadDocument(bytes);
            this._performanceCounter.markEnd(loadId);

            // Get the detected format from WASM for UI defaults
            const format = (await this.workerClient.getDocumentFormat(this.documentId)) as DocumentFormat;
            this.currentFormat = format;

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

            // Clear document state first so UI callbacks from invalidateRenderCache
            // see no active document and skip re-rendering.
            this.documentId = null;
            this._pageCount = 0;
            this._pageInfo = [];
            this.sourceFilename = null;

            // Remove performance counter for this document
            this.workerClient.removePerformanceCounter(docId);

            // Cancel pending renders, clear cached bitmaps, then unload from worker.
            // Use clearRenderCache (no callbacks) instead of invalidateRenderCache
            // to avoid triggering UI re-renders for a document being removed.
            this.workerClient.cancelRenders(docId);
            this.workerClient.clearRenderCache(docId);
            this.workerClient.unloadPdf(docId).catch(() => {
                // Ignore errors during close
            });
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
                    error: error instanceof Error ? error.message : "Authentication failed",
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

    /**
     * Navigate to the next page.
     */
    nextPage(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        const state = this.uiShell!.getState();
        if (state.page < state.pageCount) {
            this.uiShell!.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page + 1 });
        }
    }

    /**
     * Navigate to the previous page.
     */
    previousPage(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        const state = this.uiShell!.getState();
        if (state.page > 1) {
            this.uiShell!.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page - 1 });
        }
    }

    // ===========================================================================
    // Zoom
    // ===========================================================================

    /**
     * Current zoom level (1 = 100%).
     */
    get zoom(): number {
        if (this.uiShell) {
            const state = this.uiShell.getState();
            return state.zoomMode === "custom" ? state.zoom : (state.effectiveZoom ?? state.zoom);
        }
        return 1;
    }

    /**
     * Current zoom mode.
     */
    get zoomMode(): ZoomMode {
        if (this.uiShell) {
            return this.uiShell.getState().zoomMode;
        }
        return "fit-spread-width";
    }

    /**
     * Zoom in to the next zoom step.
     */
    zoomIn(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "ZOOM_IN" });
    }

    /**
     * Zoom out to the previous zoom step.
     */
    zoomOut(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "ZOOM_OUT" });
    }

    /**
     * Set zoom to a specific level (1 = 100%). Switches to custom zoom mode.
     */
    setZoom(zoom: number): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_ZOOM", zoom });
    }

    /**
     * Set zoom mode.
     */
    setZoomMode(mode: ZoomMode): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_ZOOM_MODE", mode });
    }

    // ===========================================================================
    // View Modes
    // ===========================================================================

    /** Current scroll mode. */
    get scrollMode(): ScrollMode {
        return this.uiShell?.getState().scrollMode ?? "continuous";
    }

    /** Current layout mode. */
    get layoutMode(): LayoutMode {
        return this.uiShell?.getState().layoutMode ?? "single-page";
    }

    /** Current page rotation in degrees. */
    get pageRotation(): PageRotation {
        return this.uiShell?.getState().pageRotation ?? 0;
    }

    /** Current spacing mode. */
    get spacingMode(): SpacingMode {
        return this.uiShell?.getState().spacingMode ?? "all";
    }

    /** Whether the viewer is in fullscreen mode. */
    get isFullscreen(): boolean {
        return this.uiShell?.getState().isFullscreen ?? false;
    }

    /**
     * Set scroll mode.
     */
    setScrollMode(mode: ScrollMode): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_SCROLL_MODE", mode });
    }

    /**
     * Set page layout mode.
     */
    setLayoutMode(mode: LayoutMode): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_LAYOUT_MODE", mode });
    }

    /**
     * Set page rotation.
     */
    setPageRotation(rotation: PageRotation): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_PAGE_ROTATION", rotation });
    }

    /**
     * Set spacing mode.
     */
    setSpacingMode(mode: SpacingMode): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_SPACING_MODE", mode });
    }

    /**
     * Enter or exit fullscreen mode.
     */
    setFullscreen(fullscreen: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_FULLSCREEN", isFullscreen: fullscreen });
        // Also toggle the actual browser fullscreen
        const root = this.container?.querySelector(".udoc-viewer-root") as HTMLElement | null;
        if (root) {
            if (fullscreen && !document.fullscreenElement) {
                root.requestFullscreen().catch(() => {});
            } else if (!fullscreen && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    // ===========================================================================
    // UI Component Visibility
    // ===========================================================================

    /**
     * Show or hide the top toolbar.
     */
    setToolbarVisible(visible: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_TOOLBAR_VISIBLE", visible });
    }

    /**
     * Show or hide the floating toolbar (page navigation, zoom, view mode controls).
     */
    setFloatingToolbarVisible(visible: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_FLOATING_TOOLBAR_VISIBLE", visible });
    }

    /**
     * Enable or disable the fullscreen button.
     */
    setFullscreenEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_FULLSCREEN_BUTTON_VISIBLE", visible: enabled });
    }

    /**
     * Enable or disable the download button.
     */
    setDownloadEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_DOWNLOAD_BUTTON_VISIBLE", visible: enabled });
    }

    /**
     * Enable or disable the print button.
     */
    setPrintEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_PRINT_BUTTON_VISIBLE", visible: enabled });
    }

    /** Current theme mode. */
    get theme(): ThemeMode {
        return this.uiShell?.getState().theme ?? "light";
    }

    /**
     * Set the viewer color theme.
     * @param theme - 'light', 'dark', or 'system'
     */
    setTheme(theme: ThemeMode): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_THEME", theme });
    }

    /**
     * Enable or disable the theme toggle button in the toolbar.
     */
    setThemeSwitchingEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_THEME_SWITCHING_DISABLED", disabled: !enabled });
    }

    /**
     * Enable or disable text selection in the viewer.
     */
    setTextSelectionEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_TEXT_SELECTION_DISABLED", disabled: !enabled });
    }

    /**
     * Set the minimum zoom level.
     */
    setMinZoom(zoom: number): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_MIN_ZOOM", zoom });
    }

    /**
     * Set the maximum zoom level.
     */
    setMaxZoom(zoom: number): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_MAX_ZOOM", zoom });
    }

    /**
     * Enable or disable the entire left panel area.
     * When disabled, the left panel is hidden and all left panel tabs are inaccessible.
     */
    setLeftPanelEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_LEFT_PANEL_VISIBLE", visible: enabled });
    }

    /**
     * Enable or disable the entire right panel area.
     * When disabled, the right panel is hidden and all right panel tabs are inaccessible.
     */
    setRightPanelEnabled(enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_RIGHT_PANEL_VISIBLE", visible: enabled });
    }

    /**
     * Enable or disable a specific panel tab.
     * Disabled panels are removed from the UI and cannot be opened.
     * If the panel is currently open and being disabled, it will be closed.
     */
    setPanelEnabled(panel: PanelTab, enabled: boolean): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SET_PANEL_DISABLED", panel, disabled: !enabled });
    }

    /**
     * Open a specific panel.
     * Has no effect if the panel is disabled via `setPanelEnabled()` or a `disable*` option.
     */
    openPanel(panel: PanelTab): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "TOGGLE_PANEL", panel });
        // If it was already open, TOGGLE_PANEL closed it. Re-open.
        if (this.uiShell!.getState().activePanel !== panel) {
            this.uiShell!.dispatch({ type: "TOGGLE_PANEL", panel });
        }
    }

    /**
     * Close the currently open panel.
     */
    closePanel(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "CLOSE_PANEL" });
    }

    // ===========================================================================
    // Search
    // ===========================================================================

    /**
     * Search for text in the document.
     * Opens the search panel and sets the search query.
     *
     * @param query - The text to search for
     * @param options - Search options
     */
    search(query: string, options?: { caseSensitive?: boolean }): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        if (options?.caseSensitive !== undefined) {
            this.uiShell!.dispatch({ type: "SET_SEARCH_CASE_SENSITIVE", caseSensitive: options.caseSensitive });
        }
        this.uiShell!.dispatch({ type: "SET_SEARCH_QUERY", query });
        const state = this.uiShell!.getState();
        if (state.activePanel !== "search") {
            this.uiShell!.dispatch({ type: "TOGGLE_PANEL", panel: "search" });
        }
    }

    /**
     * Navigate to the next search match.
     */
    searchNext(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SEARCH_NEXT" });
    }

    /**
     * Navigate to the previous search match.
     */
    searchPrev(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "SEARCH_PREV" });
    }

    /**
     * Clear the current search query and results.
     */
    clearSearch(): void {
        this.ensureNotDestroyed();
        this.ensureUiMode();
        this.uiShell!.dispatch({ type: "CLEAR_SEARCH" });
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
    private async renderWithType(page: number, type: RenderType, options: RenderOptions = {}): Promise<RenderedPage> {
        this.ensureLoaded();

        const scale = options.scale ?? 1;
        const format = options.format ?? "image-data";
        const force = options.force ?? false;
        const boost = options.boost ?? false;

        const renderRequest = {
            docId: this.documentId!,
            page: page + 1, // Uses 1-based page numbers
            type,
            scale,
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
        options: RenderOptions,
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
                    quality,
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
     * @param filename - Filename for download (defaults to original source filename)
     */
    async download(filename?: string): Promise<void> {
        const bytes = await this.toBytes();
        const mimeType = this.getMimeType();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename ?? this.getDefaultFilename();
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Print the document.
     * Shows the print dialog when called without options (from public API).
     * When called with options (from the dialog), renders selected pages and opens the browser print dialog.
     */
    async print(options?: PrintDialogResult): Promise<void> {
        this.ensureLoaded();

        // If no options provided, show the print dialog
        if (!options) {
            this.uiShell?.dispatch({ type: "SHOW_PRINT_DIALOG" });
            return;
        }

        const pageIndices = this.resolvePageIndices(options.pageRange);
        const isAllPages = pageIndices.length === this._pageCount;

        // For PDF with all pages and standard quality, use native PDF printing (vector quality)
        if (this.currentFormat === "pdf" && isAllPages && options.quality === "standard") {
            await this.printPdfNative();
        } else {
            await this.printRendered(pageIndices, options.quality);
        }
    }

    /**
     * Resolve a PrintPageRange into an array of 0-based page indices.
     * @internal
     */
    private resolvePageIndices(range: PrintPageRange): number[] {
        switch (range.kind) {
            case "all":
                return Array.from({ length: this._pageCount }, (_, i) => i);
            case "current":
                return [this.currentPage - 1];
            case "fromTo": {
                const indices: number[] = [];
                for (let i = range.from - 1; i < range.to; i++) indices.push(i);
                return indices;
            }
            case "custom":
                return range.pages.map((p) => p - 1);
        }
    }

    /**
     * Print PDF by loading original bytes into an iframe — vector quality, no rendering needed.
     * @internal
     */
    private async printPdfNative(): Promise<void> {
        const bytes = await this.toBytes();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        const title = this.getDefaultFilename().replace(/\.[^.]+$/, "");

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        iframe.style.width = "0";
        iframe.style.height = "0";
        document.body.appendChild(iframe);

        iframe.src = blobUrl;

        // Wait for the PDF to load in the iframe
        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve();
        });

        const originalTitle = document.title;
        document.title = title;

        iframe.contentWindow?.print();

        setTimeout(() => {
            document.title = originalTitle;
            URL.revokeObjectURL(blobUrl);
            iframe.remove();
        }, 1000);
    }

    /** Map quality preset to DPI scale factor. */
    private static qualityToDpiScale(quality: PrintQuality): number {
        switch (quality) {
            case "draft":
                return 150 / 72;
            case "standard":
                return 300 / 72;
            case "high":
                return 600 / 72;
        }
    }

    /**
     * Print by rendering selected pages to images.
     * @internal
     */
    private async printRendered(pageIndices: number[], quality: PrintQuality): Promise<void> {
        const totalPages = pageIndices.length;
        // Show progress via store-driven loading overlay
        this.uiShell?.dispatch({ type: "SET_PRINT_PROGRESS", currentPage: 0, totalPages });
        const blobUrls: string[] = [];

        try {
            const scale = UDocViewer.qualityToDpiScale(quality);

            for (let idx = 0; idx < totalPages; idx++) {
                const pageIndex = pageIndices[idx];
                this.uiShell?.dispatch({ type: "SET_PRINT_PROGRESS", currentPage: idx + 1, totalPages });
                const blob = await this.renderPage(pageIndex, {
                    scale,
                    format: "blob",
                    force: true,
                });
                blobUrls.push(URL.createObjectURL(blob as Blob));
            }

            const firstInfo = this._pageInfo[pageIndices[0]];
            const pageWidthIn = (firstInfo.width / 72).toFixed(4);
            const pageHeightIn = (firstInfo.height / 72).toFixed(4);

            let pagesHtml = "";
            for (let idx = 0; idx < totalPages; idx++) {
                const info = this._pageInfo[pageIndices[idx]];
                const widthIn = (info.width / 72).toFixed(4);
                const heightIn = (info.height / 72).toFixed(4);
                pagesHtml +=
                    `<div class="page" style="width:${widthIn}in;height:${heightIn}in;">` +
                    `<img src="${blobUrls[idx]}" style="width:100%;height:100%;">` +
                    `</div>`;
            }

            const title = this.getDefaultFilename().replace(/\.[^.]+$/, "");

            const html = `<!DOCTYPE html>
<html><head><title>${title}</title><style>
@page { size: ${pageWidthIn}in ${pageHeightIn}in; margin: 0; }
* { margin: 0; padding: 0; }
.page { page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }
img { display: block; }
</style></head><body>${pagesHtml}</body></html>`;

            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.left = "-9999px";
            iframe.style.top = "-9999px";
            iframe.style.width = "0";
            iframe.style.height = "0";
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
            if (!iframeDoc) {
                iframe.remove();
                throw new Error("Failed to create print iframe");
            }

            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();

            const images = iframeDoc.querySelectorAll("img");
            await Promise.all(
                Array.from(images).map(
                    (img) =>
                        new Promise<void>((resolve) => {
                            if (img.complete) {
                                resolve();
                            } else {
                                img.onload = () => resolve();
                                img.onerror = () => resolve();
                            }
                        }),
                ),
            );

            this.uiShell?.dispatch({ type: "CLEAR_PRINT_PROGRESS" });

            const originalTitle = document.title;
            document.title = title;

            iframe.contentWindow?.print();

            setTimeout(() => {
                document.title = originalTitle;
                for (const url of blobUrls) URL.revokeObjectURL(url);
                iframe.remove();
            }, 1000);
        } catch (error) {
            this.uiShell?.dispatch({ type: "CLEAR_PRINT_PROGRESS" });
            for (const url of blobUrls) URL.revokeObjectURL(url);
            throw error;
        }
    }

    /** Returns the MIME type for the current document format. */
    private getMimeType(): string {
        switch (this.currentFormat) {
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "pptx":
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "image":
                return "application/octet-stream";
            case "pdf":
            default:
                return "application/pdf";
        }
    }

    /** Returns a default filename based on the source or format. */
    private getDefaultFilename(): string {
        if (this.sourceFilename) {
            // Extract filename from URL or File.name
            try {
                const url = new URL(this.sourceFilename);
                const path = url.pathname;
                const name = path.substring(path.lastIndexOf("/") + 1);
                if (name) return decodeURIComponent(name);
            } catch {
                // Not a full URL (e.g. relative path or File.name) — extract filename
                const lastSlash = this.sourceFilename.lastIndexOf("/");
                return lastSlash >= 0 ? this.sourceFilename.substring(lastSlash + 1) : this.sourceFilename;
            }
        }
        // Fallback based on format
        switch (this.currentFormat) {
            case "docx":
                return "document.docx";
            case "pptx":
                return "document.pptx";
            case "image":
                return "image.png";
            case "pdf":
            default:
                return "document.pdf";
        }
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
        if (this.storeUnsub) {
            this.storeUnsub();
            this.storeUnsub = null;
        }
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
                pageInfos: this._pageInfo,
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
        source: string | File | Uint8Array,
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
            },
            getVisibilityGroups: async (doc: { id: string }): Promise<VisibilityGroup[]> => {
                const raw = await this.workerClient.getVisibilityGroups(doc.id);
                return raw as VisibilityGroup[];
            },
            setVisibilityGroupVisible: async (
                doc: { id: string },
                groupId: string,
                visible: boolean,
            ): Promise<boolean> => {
                return await this.workerClient.setVisibilityGroupVisible(doc.id, groupId, visible);
            },
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

    private ensureUiMode(): void {
        if (!this.uiShell) {
            throw new Error("This method requires UI mode (container must be provided)");
        }
    }
}
