import type { PanelTab, ScrollMode, LayoutMode, ZoomMode, PageRotation, SpacingMode, PageInfo, ViewModeDefaults } from "./state";
import type { Destination, OutlineItem } from "./navigation";
import type { Annotation } from "./annotation";
import type { TextRun } from "./text";

export type Action =
    // Lifecycle
    | { type: "__INIT__" }
    // Document
    | { type: "SET_DOC"; doc: { id: string }; pageCount: number; pageInfos: readonly PageInfo[]; viewDefaults?: ViewModeDefaults }
    | { type: "UPDATE_PAGE_SIZES"; pageInfos: readonly PageInfo[] }
    | { type: "CLEAR_DOC" }
    | { type: "SET_PAGE"; page: number }
    // Password protection
    | { type: "SET_NEEDS_PASSWORD"; needsPassword: boolean }
    | { type: "AUTHENTICATE_START" }
    | { type: "AUTHENTICATE_SUCCESS" }
    | { type: "AUTHENTICATE_FAILURE"; error: string }
    | { type: "CLEAR_PASSWORD_ERROR" }
    // Outline (on-demand loading)
    | { type: "LOAD_OUTLINE" }
    | { type: "SET_OUTLINE"; outline: OutlineItem[] }
    // Annotations (on-demand loading per page)
    | { type: "LOAD_PAGE_ANNOTATIONS"; pageIndex: number }
    | { type: "SET_PAGE_ANNOTATIONS"; pageIndex: number; annotations: Annotation[] }
    | { type: "CLEAR_ANNOTATIONS" }
    // Text content (on-demand loading per page, for text selection)
    | { type: "LOAD_PAGE_TEXT"; pageIndex: number }
    | { type: "SET_PAGE_TEXT"; pageIndex: number; text: TextRun[] }
    | { type: "CLEAR_TEXT" }
    // Navigation
    | { type: "NAVIGATE_TO_PAGE"; page: number }
    | { type: "NAVIGATE_TO_DESTINATION"; destination: Destination }
    | { type: "CLEAR_NAVIGATION_TARGET" }
    // View modes
    | { type: "SET_SCROLL_MODE"; mode: ScrollMode }
    | { type: "SET_LAYOUT_MODE"; mode: LayoutMode }
    | { type: "SET_ZOOM_MODE"; mode: ZoomMode }
    | { type: "SET_ZOOM"; zoom: number }
    | { type: "SET_EFFECTIVE_ZOOM"; zoom: number | null }
    | { type: "SET_ZOOM_STEPS"; steps: readonly number[] }
    | { type: "ZOOM_IN" }
    | { type: "ZOOM_OUT" }
    | { type: "SET_PAGE_ROTATION"; rotation: PageRotation }
    | { type: "SET_SPACING_MODE"; mode: SpacingMode }
    // Spacing
    | { type: "SET_PAGE_SPACING"; spacing: number }
    | { type: "SET_SPREAD_SPACING"; spacing: number }
    // UI
    | { type: "TOGGLE_PANEL"; panel: PanelTab }
    | { type: "CLOSE_PANEL" }
    | { type: "SET_LEFT_PANEL_WIDTH"; width: number | null }
    | { type: "SET_RIGHT_PANEL_WIDTH"; width: number | null }
    // Annotation highlight
    | { type: "HIGHLIGHT_ANNOTATION"; pageIndex: number; bounds: { x: number; y: number; width: number; height: number } }
    | { type: "CLEAR_ANNOTATION_HIGHLIGHT" }
    // Fullscreen
    | { type: "SET_FULLSCREEN"; isFullscreen: boolean }
    // Download progress
    | { type: "SET_DOWNLOAD_PROGRESS"; loaded: number; total: number }
    | { type: "CLEAR_DOWNLOAD_PROGRESS" };
