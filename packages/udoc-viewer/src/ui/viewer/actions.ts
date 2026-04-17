import type {
    PanelTab,
    ViewMode,
    ScrollMode,
    LayoutMode,
    ZoomMode,
    PageRotation,
    SpacingMode,
    PageInfo,
    ViewModeDefaults,
    SearchMatch,
    ThemeMode,
    VisibilityGroup,
    ActiveTool,
    SubTool,
    DocumentFormat,
    ZoomAnchor,
} from "./state";
import type { Destination, OutlineItem, ScrollAlignment } from "./navigation";
import type { Annotation } from "./annotation";
import type { LayoutPage } from "../../worker/index.js";

export type Action =
    // Lifecycle
    | { type: "__INIT__" }
    // Document
    | {
          type: "SET_DOC";
          doc: { id: string };
          documentFormat: DocumentFormat;
          pageCount: number;
          pageInfos: readonly PageInfo[];
          viewDefaults?: ViewModeDefaults;
      }
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
    // Visibility groups (on-demand loading)
    | { type: "LOAD_VISIBILITY_GROUPS" }
    | { type: "SET_VISIBILITY_GROUPS"; groups: VisibilityGroup[] }
    | { type: "SET_VISIBILITY_GROUP_VISIBLE"; groupId: string; visible: boolean }
    // Annotations (on-demand loading per page)
    | { type: "LOAD_PAGE_ANNOTATIONS"; pageIndex: number }
    | { type: "SET_PAGE_ANNOTATIONS"; pageIndex: number; annotations: Annotation[] }
    | { type: "CLEAR_ANNOTATIONS" }
    // Text content (on-demand loading per page, for text selection)
    | { type: "LOAD_PAGE_TEXT"; pageIndex: number }
    | { type: "SET_PAGE_TEXT"; pageIndex: number; text: LayoutPage }
    | { type: "CLEAR_PAGE_TEXT_LOADING"; pageIndex: number }
    | { type: "SET_PAGE_TEXT_FAILED"; pageIndex: number }
    | { type: "CLEAR_TEXT" }
    // Navigation
    | { type: "NAVIGATE_TO_PAGE"; page: number }
    | {
          type: "NAVIGATE_TO_DESTINATION";
          destination: Destination;
          scrollAlignment?: ScrollAlignment;
          /** Height of the target area in PDF points (used with "nearest" alignment) */
          scrollToHeight?: number;
      }
    | { type: "CLEAR_NAVIGATION_TARGET" }
    | { type: "SET_NAVIGATION_SCROLL_ALIGNMENT"; alignment: ScrollAlignment }
    | { type: "SET_SEARCH_SCROLL_ALIGNMENT"; alignment: ScrollAlignment }
    // View modes
    | { type: "SET_VIEW_MODE"; mode: ViewMode }
    | { type: "SET_SCROLL_MODE"; mode: ScrollMode }
    | { type: "SET_LAYOUT_MODE"; mode: LayoutMode }
    | { type: "SET_ZOOM_MODE"; mode: ZoomMode }
    | { type: "SET_ZOOM"; zoom: number }
    | { type: "SET_EFFECTIVE_ZOOM"; zoom: number | null }
    | { type: "SET_ZOOM_STEPS"; steps: readonly number[] }
    | { type: "ZOOM_IN"; anchor?: ZoomAnchor }
    | { type: "ZOOM_OUT"; anchor?: ZoomAnchor }
    | { type: "CLEAR_ZOOM_ANCHOR" }
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
    // Component visibility
    | { type: "SET_TOOLBAR_VISIBLE"; visible: boolean }
    | { type: "SET_FLOATING_TOOLBAR_VISIBLE"; visible: boolean }
    | { type: "SET_LEFT_PANEL_VISIBLE"; visible: boolean }
    | { type: "SET_RIGHT_PANEL_VISIBLE"; visible: boolean }
    | { type: "SET_PANEL_DISABLED"; panel: PanelTab; disabled: boolean }
    | { type: "SET_FULLSCREEN_BUTTON_VISIBLE"; visible: boolean }
    | { type: "SET_DOWNLOAD_BUTTON_VISIBLE"; visible: boolean }
    | { type: "SET_PRINT_BUTTON_VISIBLE"; visible: boolean }
    | { type: "SET_THEME"; theme: ThemeMode }
    | { type: "SET_THEME_SWITCHING_DISABLED"; disabled: boolean }
    | { type: "SET_TEXT_SELECTION_DISABLED"; disabled: boolean }
    | { type: "SET_MIN_ZOOM"; zoom: number }
    | { type: "SET_MAX_ZOOM"; zoom: number }
    // Annotation highlight
    | {
          type: "HIGHLIGHT_ANNOTATION";
          pageIndex: number;
          bounds: { x: number; y: number; width: number; height: number };
      }
    | { type: "CLEAR_ANNOTATION_HIGHLIGHT" }
    // Fullscreen
    | { type: "SET_FULLSCREEN"; isFullscreen: boolean }
    // Search
    | { type: "SET_SEARCH_QUERY"; query: string }
    | { type: "SET_SEARCH_CASE_SENSITIVE"; caseSensitive: boolean }
    | { type: "SET_SEARCH_FUZZY"; fuzzy: boolean }
    | { type: "SET_SEARCH_MATCHES"; matches: SearchMatch[]; resetActiveIndex?: boolean }
    | { type: "SET_SEARCH_ACTIVE_INDEX"; index: number; scrollAlignment?: ScrollAlignment }
    | { type: "SEARCH_NEXT"; scrollAlignment?: ScrollAlignment }
    | { type: "SEARCH_PREV"; scrollAlignment?: ScrollAlignment }
    | { type: "CLEAR_SEARCH" }
    | { type: "SET_SEARCH_PAGE_RANGE"; range: { start: number; end: number } | null }
    | { type: "SET_SEARCH_TEXT_LOADING"; loading: boolean }
    | { type: "SET_SEARCH_TEXT_LOADED"; loaded: boolean }
    // Download progress
    | { type: "SET_DOWNLOAD_PROGRESS"; loaded: number; total: number }
    | { type: "CLEAR_DOWNLOAD_PROGRESS" }
    // Processing state (WASM load / page info after download)
    | { type: "SET_PROCESSING"; processing: boolean }
    // Print progress
    | { type: "SET_PRINT_PROGRESS"; currentPage: number; totalPages: number }
    | { type: "CLEAR_PRINT_PROGRESS" }
    // Print dialog
    | { type: "SHOW_PRINT_DIALOG" }
    | { type: "HIDE_PRINT_DIALOG" }
    // Panel transitions
    | { type: "ENABLE_PANEL_TRANSITIONS" }
    // Tools
    | { type: "SET_ACTIVE_TOOL"; tool: ActiveTool }
    | { type: "SET_SUB_TOOL"; subTool: SubTool }
    | { type: "SET_TOOL_OPTION"; subTool: string; key: string; value: string | number | null }
    // Annotation editing
    | { type: "ADD_ANNOTATION"; pageIndex: number; annotation: Annotation }
    | { type: "REMOVE_ANNOTATION"; pageIndex: number; annotationIndex: number }
    | { type: "UPDATE_ANNOTATION"; pageIndex: number; annotationIndex: number; annotation: Annotation }
    | { type: "RESTORE_PAGE_ANNOTATIONS"; pageIndex: number; annotations: Annotation[] }
    // Annotation selection
    | { type: "SELECT_ANNOTATION"; pageIndex: number; annotationIndex: number }
    | { type: "DESELECT_ANNOTATION" };
