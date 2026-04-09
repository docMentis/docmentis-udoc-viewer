import type { OutlineItem, NavigationTarget, ScrollAlignment } from "./navigation";
import type { Annotation } from "./annotation";
import type { LayoutPage } from "../../worker/index.js";
import type { PageInfo } from "../../worker/index.js";

// -----------------------------------------------------------------------------
// Search types
// -----------------------------------------------------------------------------

/** A single search match with its location and geometry. */
export interface SearchMatch {
    /** 0-based page index. */
    pageIndex: number;
    /** Character offset within the concatenated page text. */
    charOffset: number;
    /** Length of the matched text. */
    length: number;
    /** Bounding rectangles for this match (in PDF points, for highlight rendering). */
    rects: Array<{ x: number; y: number; width: number; height: number; angle: number }>;
    /** Context snippet: [before, match, after] text for display in result list. */
    context: [string, string, string];
}

// -----------------------------------------------------------------------------
// Visibility group types
// -----------------------------------------------------------------------------

export interface VisibilityGroup {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
}

// -----------------------------------------------------------------------------
// Panel types
// -----------------------------------------------------------------------------

export type LeftPanelTab = "thumbnail" | "outline" | "bookmarks" | "layers" | "attachments" | "fonts";
export type RightPanelTab = "search" | "comments";
export type PanelTab = LeftPanelTab | RightPanelTab;

const LEFT_TABS: Set<PanelTab> = new Set(["thumbnail", "outline", "bookmarks", "layers", "attachments", "fonts"]);
export function isLeftPanelTab(tab: PanelTab): tab is LeftPanelTab {
    return LEFT_TABS.has(tab);
}

// -----------------------------------------------------------------------------
// View mode types
// -----------------------------------------------------------------------------

export type ViewMode = "paged" | "continuous";
export type ScrollMode = "spread" | "continuous";
export type LayoutMode = "single-page" | "double-page" | "double-page-odd-right" | "double-page-odd-left";
export type ZoomMode = "fit-spread-width" | "fit-spread-width-max" | "fit-spread-height" | "fit-spread" | "custom";
export type PageRotation = 0 | 90 | 180 | 270;
export type SpacingMode = "all" | "none" | "spread-only" | "page-only";
export type ThemeMode = "light" | "dark" | "system";

// -----------------------------------------------------------------------------
// Tool types
// -----------------------------------------------------------------------------

/** Simple tools that live directly on the toolbar (no sub-toolbar needed) */
export type SimpleTool = "pointer" | "hand" | "zoom";

/** Tool sets that expand into a sub-toolbar with sub-tools and options */
export type ToolSet = "annotate" | "markup";

/** The active tool is either a simple tool or a tool set */
export type ActiveTool = SimpleTool | ToolSet;

/** Individual annotation sub-tools */
export type AnnotateSubTool =
    | "select"
    | "freehand"
    | "line"
    | "arrow"
    | "rectangle"
    | "ellipse"
    | "polygon"
    | "polyline";

/** Individual markup sub-tools */
export type MarkupSubTool = "select" | "highlight" | "underline" | "strikethrough" | "squiggly";

/** Any sub-tool */
export type SubTool = AnnotateSubTool | MarkupSubTool;

/** Line dash style */
export type LineStyle = "solid" | "dashed" | "dotted";

/** Arrow head style */
export type ArrowHeadStyle = "none" | "open" | "closed";

/** Per-tool drawing options */
export interface ToolOptions {
    strokeColor: string;
    fillColor: string | null;
    strokeWidth: number;
    opacity: number;
    fontSize: number;
    lineStyle: LineStyle;
    arrowHeadStart: ArrowHeadStyle;
    arrowHeadEnd: ArrowHeadStyle;
}

/** Default sub-tool for each tool set */
export const DEFAULT_SUB_TOOL: Record<ToolSet, SubTool> = {
    annotate: "freehand",
    markup: "highlight",
};

/** Default tool options */
export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
    strokeColor: "#ff0000",
    fillColor: null,
    strokeWidth: 2,
    opacity: 1,
    fontSize: 16,
    lineStyle: "solid",
    arrowHeadStart: "none",
    arrowHeadEnd: "open",
};

/** Check if an active tool is a tool set (has sub-toolbar) */
export function isToolSet(tool: ActiveTool): tool is ToolSet {
    return tool === "annotate" || tool === "markup";
}

/** Document format as detected during loading */
export type DocumentFormat = "pdf" | "pptx" | "docx" | "xlsx" | "image";

/** Formats that support annotation editing */
export const ANNOTATION_FORMATS: ReadonlySet<DocumentFormat> = new Set(["pdf"]);

/** Subset of view mode state that can be overridden per format */
export interface ViewModeDefaults {
    viewMode?: ViewMode;
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
            return { viewMode: "paged", scrollMode: "continuous", zoomMode: "fit-spread-width-max" };
        case "docx":
            return { viewMode: "paged", scrollMode: "continuous", zoomMode: "fit-spread-width-max" };
        case "xlsx":
            return {
                viewMode: "continuous",
                scrollMode: "continuous",
                layoutMode: "single-page",
                spacingMode: "none",
                zoomMode: "fit-spread-width-max",
            };
        case "pptx":
        case "image":
            return { viewMode: "paged", scrollMode: "spread", zoomMode: "fit-spread" };
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
// Zoom anchor (for zoom-tool click-to-point)
// -----------------------------------------------------------------------------

export interface ZoomAnchor {
    /** Click position relative to viewport (0-1 range) */
    viewX: number;
    viewY: number;
    /** Scroll position before zoom */
    scrollLeft: number;
    scrollTop: number;
    /** Scroll content dimensions before zoom */
    scrollWidth: number;
    scrollHeight: number;
}

// -----------------------------------------------------------------------------
// Viewer state
// -----------------------------------------------------------------------------

export interface ViewerState {
    // Document
    doc: { id: string } | null;
    documentFormat: DocumentFormat | null;
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

    // Visibility groups (loaded on-demand)
    /** Visibility groups (null = not loaded yet) */
    visibilityGroups: VisibilityGroup[] | null;
    /** Whether visibility groups are currently being loaded */
    visibilityGroupsLoading: boolean;

    // Annotations (loaded on-demand per page)
    /** Annotations by page index (0-based). Undefined = not loaded, [] = loaded but empty */
    pageAnnotations: Map<number, Annotation[]>;
    /** Set of page indices currently being loaded */
    annotationsLoading: Set<number>;

    // Text content (loaded on-demand per page, for text selection)
    /** Page layouts by page index (0-based). Undefined = not loaded yet */
    pageText: Map<number, LayoutPage>;
    /** Set of page indices currently being loaded */
    textLoading: Set<number>;
    /** Set of page indices that failed to load (prevents retry loops) */
    textFailed: Set<number>;

    // Navigation
    /** Target for navigation (null = no pending navigation) */
    navigationTarget: NavigationTarget | null;
    /** Default scroll alignment for navigation (outline, links, goToDestination) */
    navigationScrollAlignment: ScrollAlignment;
    /** Default scroll alignment for search result navigation */
    searchScrollAlignment: ScrollAlignment;

    // View modes
    viewMode: ViewMode;
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

    // Thumbnail
    /** Width of thumbnail images in CSS pixels */
    thumbnailWidth: number;

    // UI
    activePanel: PanelTab | null;
    /** Left panel width in pixels (null = use CSS default) */
    leftPanelWidth: number | null;
    /** Right panel width in pixels (null = use CSS default) */
    rightPanelWidth: number | null;

    // Component visibility
    /** Whether the top toolbar is visible */
    toolbarVisible: boolean;
    /** Whether the floating toolbar (page nav + zoom) is visible */
    floatingToolbarVisible: boolean;
    /** Whether the left panel area is visible */
    leftPanelVisible: boolean;
    /** Whether the right panel area is visible */
    rightPanelVisible: boolean;
    /** Set of panel tabs that are disabled (removed from the UI) */
    disabledPanels: ReadonlySet<PanelTab>;
    /** Whether the fullscreen button is visible in the toolbar */
    fullscreenButtonVisible: boolean;
    /** Whether the download button is visible in the toolbar */
    downloadButtonVisible: boolean;
    /** Whether the print button is visible in the toolbar */
    printButtonVisible: boolean;
    /** Current color theme mode */
    theme: ThemeMode;
    /** Whether the theme toggle button is hidden */
    themeSwitchingDisabled: boolean;
    /** Whether text selection is disabled */
    textSelectionDisabled: boolean;
    /** Whether slide transition animations are enabled (PPTX only) */
    transitionsEnabled: boolean;
    /** Minimum zoom level */
    minZoom: number;
    /** Maximum zoom level */
    maxZoom: number;

    // Annotation highlight (for click-to-highlight from comments panel)
    /** Currently highlighted annotation (null = none) */
    highlightedAnnotation: {
        pageIndex: number;
        bounds: { x: number; y: number; width: number; height: number };
    } | null;

    // Fullscreen
    /** Whether the viewer is in fullscreen mode */
    isFullscreen: boolean;

    // Search
    /** Current search query string */
    searchQuery: string;
    /** Whether search is case-sensitive */
    searchCaseSensitive: boolean;
    /** All search matches across all pages */
    searchMatches: SearchMatch[];
    /** Index of the currently active/focused match (-1 = none) */
    searchActiveIndex: number;
    /** Incremented each time the user explicitly navigates to a match. */
    searchNavGen: number;
    /** Per-call scroll alignment override for the current search navigation (cleared after use). */
    searchNavScrollAlignment: ScrollAlignment | null;
    /** Whether all page text has been loaded for search */
    searchTextLoaded: boolean;
    /** Whether search text is currently being loaded */
    searchTextLoading: boolean;

    // Loading progress (for document download and print preparation)
    /** Whether document is currently being downloaded or print is being prepared */
    isDownloading: boolean;
    /** Download progress: loaded bytes */
    downloadLoaded: number;
    /** Download progress: total bytes (0 if unknown) */
    downloadTotal: number;
    /** Whether document is being processed (WASM load, page info extraction) after download */
    isProcessing: boolean;
    /** Whether print preparation is in progress */
    isPrinting: boolean;
    /** Print progress: current page being rendered (1-based) */
    printCurrentPage: number;
    /** Print progress: total pages to render */
    printTotalPages: number;

    /** Whether the print dialog is visible */
    showPrintDialog: boolean;

    /** When true, panel open/close should skip CSS transitions (reset automatically after one frame) */
    panelTransitionsDisabled: boolean;

    // Annotation editing
    /** Set of page indices that have been modified by user annotation edits */
    annotationsDirtyPages: ReadonlySet<number>;
    /** Currently selected annotation for editing (null = none) */
    selectedAnnotation: { pageIndex: number; annotationIndex: number } | null;

    // Zoom anchor (for zoom-to-click-point)
    /** Anchor data from zoom tool click, consumed by Viewport to scroll to click point */
    zoomAnchor: ZoomAnchor | null;

    // Tools
    /** Set of tools/tool sets that are disabled (hidden from the UI). */
    disabledTools: ReadonlySet<ActiveTool>;
    /** Currently active tool (simple tool or tool set) */
    activeTool: ActiveTool;
    /** Currently active sub-tool within a tool set (null for simple tools) */
    activeSubTool: SubTool | null;
    /** Remembers the last-used sub-tool per tool set */
    lastSubToolPerSet: Record<ToolSet, SubTool>;
    /** Per-sub-tool persistent options */
    toolOptions: Record<string, ToolOptions>;
}

export const initialState: ViewerState = {
    doc: null,
    documentFormat: null,
    page: 1,
    pageCount: 0,
    pageInfos: [],

    needsPassword: false,
    passwordError: null,
    isAuthenticating: false,

    outline: null,
    outlineLoading: false,

    visibilityGroups: null,
    visibilityGroupsLoading: false,

    pageAnnotations: new Map(),
    annotationsLoading: new Set(),

    pageText: new Map(),
    textLoading: new Set(),
    textFailed: new Set(),

    navigationTarget: null,
    navigationScrollAlignment: "top",
    searchScrollAlignment: "nearest",

    viewMode: "paged",
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
    thumbnailWidth: 150,

    activePanel: null,
    leftPanelWidth: null,
    rightPanelWidth: null,

    toolbarVisible: true,
    floatingToolbarVisible: true,
    leftPanelVisible: true,
    rightPanelVisible: true,
    disabledPanels: new Set(),
    fullscreenButtonVisible: true,
    downloadButtonVisible: true,
    printButtonVisible: true,
    theme: "light",
    themeSwitchingDisabled: false,
    textSelectionDisabled: false,
    transitionsEnabled: false,
    minZoom: DEFAULT_ZOOM_STEPS[0],
    maxZoom: DEFAULT_ZOOM_STEPS[DEFAULT_ZOOM_STEPS.length - 1],

    highlightedAnnotation: null,

    isFullscreen: false,

    searchQuery: "",
    searchCaseSensitive: false,
    searchMatches: [],
    searchActiveIndex: -1,
    searchNavGen: 0,
    searchNavScrollAlignment: null,
    searchTextLoaded: false,
    searchTextLoading: false,

    isDownloading: false,
    downloadLoaded: 0,
    downloadTotal: 0,

    isProcessing: false,
    isPrinting: false,
    printCurrentPage: 0,
    printTotalPages: 0,

    showPrintDialog: false,

    panelTransitionsDisabled: false,

    annotationsDirtyPages: new Set(),
    selectedAnnotation: null,

    zoomAnchor: null,

    disabledTools: new Set<ActiveTool>(["annotate", "markup"]),
    activeTool: "pointer",
    activeSubTool: null,
    lastSubToolPerSet: { annotate: "freehand", markup: "highlight" },
    toolOptions: {},
};
