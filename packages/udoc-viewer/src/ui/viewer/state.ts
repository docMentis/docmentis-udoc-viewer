import type { OutlineItem, NavigationTarget } from "./navigation";
import type { Annotation } from "./annotation";
import type { TextRun } from "./text";
import type { PageInfo } from "../../worker/index.js";

// -----------------------------------------------------------------------------
// Panel types
// -----------------------------------------------------------------------------

export type LeftPanelTab = "thumbnail" | "outline" | "bookmarks" | "layers" | "attachments";
export type RightPanelTab = "search" | "comments";
export type PanelTab = LeftPanelTab | RightPanelTab;

const LEFT_TABS: Set<PanelTab> = new Set(["thumbnail", "outline", "bookmarks", "layers", "attachments"]);
export function isLeftPanelTab(tab: PanelTab): tab is LeftPanelTab {
    return LEFT_TABS.has(tab);
}

// -----------------------------------------------------------------------------
// View mode types
// -----------------------------------------------------------------------------

export type ScrollMode = "spread" | "continuous";
export type LayoutMode = "single-page" | "double-page" | "double-page-odd-right" | "double-page-odd-left";
export type ZoomMode = "fit-spread-width" | "fit-spread-width-max" | "fit-spread-height" | "fit-spread" | "custom";
export type PageRotation = 0 | 90 | 180 | 270;
export type SpacingMode = "all" | "none" | "spread-only" | "page-only";

/** Document format as detected during loading */
export type DocumentFormat = "pdf" | "pptx" | "image";

/** Subset of view mode state that can be overridden per format */
export interface ViewModeDefaults {
    scrollMode?: ScrollMode;
    layoutMode?: LayoutMode;
    zoomMode?: ZoomMode;
    zoom?: number;
    effectiveZoom?: number | null;
    pageRotation?: PageRotation;
    spacingMode?: SpacingMode;
    pageSpacing?: number;
    spreadSpacing?: number;
}

/** Returns format-specific view mode defaults */
export function getFormatDefaults(format: DocumentFormat): ViewModeDefaults {
    switch (format) {
        case "pdf":
            return { scrollMode: "continuous", zoomMode: "fit-spread-width-max" };
        case "pptx":
        case "image":
            return { scrollMode: "spread", zoomMode: "fit-spread" };
    }
}

/** Default zoom steps for zoom in/out actions */
export const DEFAULT_ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5] as const;

// -----------------------------------------------------------------------------
// Page size types
// -----------------------------------------------------------------------------

// Re-export PageInfo from worker for use in viewer components
export type { PageInfo };

// -----------------------------------------------------------------------------
// DPI and scaling constants
// -----------------------------------------------------------------------------

/** PDF points are defined at 72 DPI */
export const PDF_DPI = 72;

/** Default display DPI (CSS standard) */
export const DEFAULT_DPI = 96;

/** Scale factor to convert PDF points to pixels at 100% zoom */
export const POINTS_TO_PIXELS = DEFAULT_DPI / PDF_DPI; // 1.333...

/** Calculate the scale factor for a given display DPI */
export function getPointsToPixels(dpi: number): number {
    return dpi / PDF_DPI;
}

// -----------------------------------------------------------------------------
// Viewer state
// -----------------------------------------------------------------------------

export interface ViewerState {
    // Document
    doc: { id: string } | null;
    page: number;
    pageCount: number;
    pageInfos: readonly PageInfo[];

    // Password protection
    /** Whether the document requires a password to open */
    needsPassword: boolean;
    /** Error message when password authentication fails */
    passwordError: string | null;
    /** Whether authentication is currently in progress */
    isAuthenticating: boolean;

    // Outline (loaded on-demand)
    /** Document outline/bookmarks (null = not loaded yet) */
    outline: OutlineItem[] | null;
    /** Whether outline is currently being loaded */
    outlineLoading: boolean;

    // Annotations (loaded on-demand per page)
    /** Annotations by page index (0-based). Undefined = not loaded, [] = loaded but empty */
    pageAnnotations: Map<number, Annotation[]>;
    /** Set of page indices currently being loaded */
    annotationsLoading: Set<number>;

    // Text content (loaded on-demand per page, for text selection)
    /** Text runs by page index (0-based). Undefined = not loaded, [] = loaded but empty */
    pageText: Map<number, TextRun[]>;
    /** Set of page indices currently being loaded */
    textLoading: Set<number>;

    // Navigation
    /** Target for navigation (null = no pending navigation) */
    navigationTarget: NavigationTarget | null;

    // View modes
    scrollMode: ScrollMode;
    layoutMode: LayoutMode;
    zoomMode: ZoomMode;
    zoom: number;
    /** Derived zoom for fit modes (null when not applicable). */
    effectiveZoom: number | null;
    zoomSteps: readonly number[];
    pageRotation: PageRotation;
    spacingMode: SpacingMode;

    // Display settings
    dpi: number;

    // Spacing (in pixels)
    pageSpacing: number;
    spreadSpacing: number;

    // UI
    activePanel: PanelTab | null;
    /** Left panel width in pixels (null = use CSS default) */
    leftPanelWidth: number | null;
    /** Right panel width in pixels (null = use CSS default) */
    rightPanelWidth: number | null;

    // Annotation highlight (for click-to-highlight from comments panel)
    /** Currently highlighted annotation (null = none) */
    highlightedAnnotation: {
        pageIndex: number;
        bounds: { x: number; y: number; width: number; height: number };
    } | null;

    // Fullscreen
    /** Whether the viewer is in fullscreen mode */
    isFullscreen: boolean;

    // Loading progress (for document download)
    /** Whether document is currently being downloaded */
    isDownloading: boolean;
    /** Download progress: loaded bytes */
    downloadLoaded: number;
    /** Download progress: total bytes (0 if unknown) */
    downloadTotal: number;
}

export const initialState: ViewerState = {
    doc: null,
    page: 1,
    pageCount: 0,
    pageInfos: [],

    needsPassword: false,
    passwordError: null,
    isAuthenticating: false,

    outline: null,
    outlineLoading: false,

    pageAnnotations: new Map(),
    annotationsLoading: new Set(),

    pageText: new Map(),
    textLoading: new Set(),

    navigationTarget: null,

    scrollMode: "continuous",
    layoutMode: "single-page",
    zoomMode: "fit-spread-width",
    zoom: 1,
    effectiveZoom: null,
    zoomSteps: DEFAULT_ZOOM_STEPS,
    pageRotation: 0,
    spacingMode: "all",

    dpi: DEFAULT_DPI,

    pageSpacing: 20,
    spreadSpacing: 20,

    activePanel: null,
    leftPanelWidth: null,
    rightPanelWidth: null,

    highlightedAnnotation: null,

    isFullscreen: false,

    isDownloading: false,
    downloadLoaded: 0,
    downloadTotal: 0,
};
