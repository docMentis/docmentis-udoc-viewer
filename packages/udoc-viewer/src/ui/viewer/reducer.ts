import type { ViewerState, ToolSet } from "./state";
import { initialState, isLeftPanelTab, isToolSet, DEFAULT_TOOL_OPTIONS, ANNOTATION_FORMATS } from "./state";
import type { Action } from "./actions";
import { destinationToNavigationTarget } from "./navigation";

export function reducer(state: ViewerState, action: Action): ViewerState {
    switch (action.type) {
        case "__INIT__":
            return state;

        // Document
        case "SET_DOC": {
            if (state.doc === action.doc) return state;
            const vd = action.viewDefaults;
            const supportsAnnotations = ANNOTATION_FORMATS.has(action.documentFormat);
            // Reset tool to pointer if switching to a format that doesn't support annotations
            const toolNowUnavailable = !supportsAnnotations && isToolSet(state.activeTool);
            return {
                ...state,
                doc: action.doc,
                documentFormat: action.documentFormat,
                page: 1,
                pageCount: action.pageCount,
                pageInfos: action.pageInfos,
                activeTool: toolNowUnavailable ? "pointer" : state.activeTool,
                activeSubTool: toolNowUnavailable ? null : state.activeSubTool,
                // Reset view mode to defaults (format-specific if provided)
                viewMode: vd?.viewMode ?? initialState.viewMode,
                scrollMode: vd?.scrollMode ?? initialState.scrollMode,
                layoutMode: vd?.layoutMode ?? initialState.layoutMode,
                zoomMode: vd?.zoomMode ?? initialState.zoomMode,
                zoom: vd?.zoom ?? initialState.zoom,
                effectiveZoom: vd?.effectiveZoom !== undefined ? vd.effectiveZoom : initialState.effectiveZoom,
                pageRotation: vd?.pageRotation ?? initialState.pageRotation,
                spacingMode: vd?.spacingMode ?? initialState.spacingMode,
                pageSpacing: vd?.pageSpacing ?? initialState.pageSpacing,
                spreadSpacing: vd?.spreadSpacing ?? initialState.spreadSpacing,
            };
        }
        case "UPDATE_PAGE_SIZES": {
            return { ...state, pageInfos: action.pageInfos };
        }
        case "CLEAR_DOC": {
            if (!state.doc && state.pageCount === 0) return state;
            return {
                ...state,
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
                annotationsDirtyPages: new Set(),
                selectedAnnotation: null,
                pageText: new Map(),
                textLoading: new Set(),
                textFailed: new Set(),
                searchQuery: "",
                searchCaseSensitive: false,
                searchMatches: [],
                searchActiveIndex: -1,
                searchTextLoaded: false,
                searchTextLoading: false,
                isProcessing: false,
                // Close panels instantly when clearing a document
                activePanel: null,
                panelTransitionsDisabled: true,
            };
        }
        case "SET_PAGE": {
            const page = clamp(action.page, 1, Math.max(1, state.pageCount || 1));
            if (state.page === page) return state;
            return { ...state, page };
        }

        // Password protection
        case "SET_NEEDS_PASSWORD": {
            if (state.needsPassword === action.needsPassword) return state;
            return { ...state, needsPassword: action.needsPassword, passwordError: null };
        }
        case "AUTHENTICATE_START": {
            if (state.isAuthenticating) return state;
            return { ...state, isAuthenticating: true, passwordError: null };
        }
        case "AUTHENTICATE_SUCCESS": {
            return { ...state, isAuthenticating: false, needsPassword: false, passwordError: null };
        }
        case "AUTHENTICATE_FAILURE": {
            return { ...state, isAuthenticating: false, passwordError: action.error };
        }
        case "CLEAR_PASSWORD_ERROR": {
            if (state.passwordError === null) return state;
            return { ...state, passwordError: null };
        }

        // Outline (on-demand loading)
        case "LOAD_OUTLINE": {
            if (state.outlineLoading) return state;
            return { ...state, outlineLoading: true };
        }
        case "SET_OUTLINE": {
            return { ...state, outline: action.outline, outlineLoading: false };
        }

        // Visibility groups (on-demand loading)
        case "LOAD_VISIBILITY_GROUPS": {
            if (state.visibilityGroupsLoading) return state;
            return { ...state, visibilityGroupsLoading: true };
        }
        case "SET_VISIBILITY_GROUPS": {
            return { ...state, visibilityGroups: action.groups, visibilityGroupsLoading: false };
        }
        case "SET_VISIBILITY_GROUP_VISIBLE": {
            if (!state.visibilityGroups) return state;
            const groups = state.visibilityGroups.map((g) =>
                g.id === action.groupId ? { ...g, visible: action.visible } : g,
            );
            return { ...state, visibilityGroups: groups };
        }
        // Annotations (on-demand loading per page)
        case "LOAD_PAGE_ANNOTATIONS": {
            if (state.annotationsLoading.has(action.pageIndex)) return state;
            if (state.pageAnnotations.has(action.pageIndex)) return state;
            const newLoading = new Set(state.annotationsLoading);
            newLoading.add(action.pageIndex);
            return { ...state, annotationsLoading: newLoading };
        }
        case "SET_PAGE_ANNOTATIONS": {
            const newAnnotations = new Map(state.pageAnnotations);
            newAnnotations.set(action.pageIndex, action.annotations);
            const newLoading = new Set(state.annotationsLoading);
            newLoading.delete(action.pageIndex);
            return {
                ...state,
                pageAnnotations: newAnnotations,
                annotationsLoading: newLoading,
            };
        }
        case "CLEAR_ANNOTATIONS": {
            if (state.pageAnnotations.size === 0 && state.annotationsLoading.size === 0) return state;
            return {
                ...state,
                pageAnnotations: new Map(),
                annotationsLoading: new Set(),
            };
        }

        // Text content (on-demand loading per page)
        case "LOAD_PAGE_TEXT": {
            if (state.textLoading.has(action.pageIndex)) return state;
            if (state.pageText.has(action.pageIndex)) return state;
            const newLoading = new Set(state.textLoading);
            newLoading.add(action.pageIndex);
            return { ...state, textLoading: newLoading };
        }
        case "SET_PAGE_TEXT": {
            const newText = new Map(state.pageText);
            newText.set(action.pageIndex, action.text);
            const newLoading = new Set(state.textLoading);
            newLoading.delete(action.pageIndex);
            return {
                ...state,
                pageText: newText,
                textLoading: newLoading,
            };
        }
        case "CLEAR_PAGE_TEXT_LOADING": {
            if (!state.textLoading.has(action.pageIndex)) return state;
            const newLoading = new Set(state.textLoading);
            newLoading.delete(action.pageIndex);
            return { ...state, textLoading: newLoading };
        }
        case "SET_PAGE_TEXT_FAILED": {
            const newLoading = new Set(state.textLoading);
            newLoading.delete(action.pageIndex);
            const newFailed = new Set(state.textFailed);
            newFailed.add(action.pageIndex);
            return { ...state, textLoading: newLoading, textFailed: newFailed };
        }
        case "CLEAR_TEXT": {
            if (state.pageText.size === 0 && state.textLoading.size === 0 && state.textFailed.size === 0) return state;
            return {
                ...state,
                pageText: new Map(),
                textLoading: new Set(),
                textFailed: new Set(),
            };
        }

        // Navigation
        case "NAVIGATE_TO_PAGE": {
            const page = clamp(action.page, 1, Math.max(1, state.pageCount || 1));
            const target = { page };
            if (
                state.navigationTarget?.page === page &&
                !state.navigationTarget.scrollTo &&
                !state.navigationTarget.zoom
            ) {
                return state;
            }
            return { ...state, navigationTarget: target };
        }
        case "NAVIGATE_TO_DESTINATION": {
            const target = destinationToNavigationTarget(action.destination, state.pageCount);
            target.scrollAlignment = action.scrollAlignment ?? state.navigationScrollAlignment;
            if (action.scrollToHeight !== undefined && target.scrollTo) {
                target.scrollTo.height = action.scrollToHeight;
            }
            return { ...state, navigationTarget: target };
        }
        case "CLEAR_NAVIGATION_TARGET": {
            if (state.navigationTarget === null) return state;
            return { ...state, navigationTarget: null };
        }
        case "SET_NAVIGATION_SCROLL_ALIGNMENT": {
            if (state.navigationScrollAlignment === action.alignment) return state;
            return { ...state, navigationScrollAlignment: action.alignment };
        }
        case "SET_SEARCH_SCROLL_ALIGNMENT": {
            if (state.searchScrollAlignment === action.alignment) return state;
            return { ...state, searchScrollAlignment: action.alignment };
        }

        // View modes
        case "SET_VIEW_MODE": {
            if (state.viewMode === action.mode) return state;
            switch (action.mode) {
                case "continuous":
                    return {
                        ...state,
                        viewMode: "continuous",
                        layoutMode: "single-page",
                        scrollMode: "continuous",
                        spacingMode: "none",
                        pageSpacing: 0,
                        spreadSpacing: 0,
                        pageRotation: 0,
                    };
                case "paged":
                    return {
                        ...state,
                        viewMode: "paged",
                        // Restore paged defaults
                        spacingMode: "all",
                        pageSpacing: 20,
                        spreadSpacing: 20,
                    };
            }
            break;
        }
        case "SET_SCROLL_MODE": {
            if (state.scrollMode === action.mode) return state;
            return { ...state, scrollMode: action.mode };
        }
        case "SET_LAYOUT_MODE": {
            if (state.layoutMode === action.mode) return state;
            return { ...state, layoutMode: action.mode };
        }
        case "SET_ZOOM_MODE": {
            if (state.zoomMode === action.mode) return state;
            return { ...state, zoomMode: action.mode };
        }
        case "SET_ZOOM": {
            const zoom = clamp(action.zoom, state.minZoom, state.maxZoom);
            if (state.zoom === zoom && state.zoomMode === "custom") return state;
            return { ...state, zoom, zoomMode: "custom" };
        }
        case "SET_EFFECTIVE_ZOOM": {
            if (state.effectiveZoom === action.zoom) return state;
            return { ...state, effectiveZoom: action.zoom };
        }
        case "SET_ZOOM_STEPS": {
            if (state.zoomSteps === action.steps) return state;
            return { ...state, zoomSteps: action.steps };
        }
        case "ZOOM_IN": {
            const steps = state.zoomSteps;
            const currentZoom = state.effectiveZoom ?? state.zoom;
            const nextStep = steps.find((s) => s > currentZoom + 1e-9) ?? steps[steps.length - 1];
            const clamped = Math.min(nextStep, state.maxZoom);
            if (currentZoom >= clamped - 1e-9 && state.zoomMode === "custom") return state;
            return { ...state, zoom: clamped, zoomMode: "custom", zoomAnchor: action.anchor ?? null };
        }
        case "ZOOM_OUT": {
            const steps = state.zoomSteps;
            const currentZoom = state.effectiveZoom ?? state.zoom;
            const prevStep = [...steps].reverse().find((s) => s < currentZoom - 1e-9) ?? steps[0];
            const clamped = Math.max(prevStep, state.minZoom);
            if (currentZoom <= clamped + 1e-9 && state.zoomMode === "custom") return state;
            return { ...state, zoom: clamped, zoomMode: "custom", zoomAnchor: action.anchor ?? null };
        }
        case "CLEAR_ZOOM_ANCHOR": {
            if (!state.zoomAnchor) return state;
            return { ...state, zoomAnchor: null };
        }
        case "SET_PAGE_ROTATION": {
            if (state.pageRotation === action.rotation) return state;
            return { ...state, pageRotation: action.rotation };
        }
        case "SET_SPACING_MODE": {
            if (state.spacingMode === action.mode) return state;
            // Apply spacing based on spacing mode
            switch (action.mode) {
                case "all":
                    return { ...state, spacingMode: action.mode, pageSpacing: 20, spreadSpacing: 20 };
                case "none":
                    return { ...state, spacingMode: action.mode, pageSpacing: 0, spreadSpacing: 0 };
                case "spread-only":
                    return { ...state, spacingMode: action.mode, pageSpacing: 0, spreadSpacing: 20 };
                case "page-only":
                    return { ...state, spacingMode: action.mode, pageSpacing: 20, spreadSpacing: 0 };
            }
            break;
        }

        // Spacing
        case "SET_PAGE_SPACING": {
            const spacing = Math.max(0, action.spacing);
            if (state.pageSpacing === spacing) return state;
            return { ...state, pageSpacing: spacing };
        }
        case "SET_SPREAD_SPACING": {
            const spacing = Math.max(0, action.spacing);
            if (state.spreadSpacing === spacing) return state;
            return { ...state, spreadSpacing: spacing };
        }

        // UI
        case "TOGGLE_PANEL": {
            // Prevent opening a panel if its side is disabled
            if (isLeftPanelTab(action.panel) && !state.leftPanelVisible) return state;
            if (!isLeftPanelTab(action.panel) && !state.rightPanelVisible) return state;
            // Prevent opening an individually disabled panel
            if (state.disabledPanels.has(action.panel)) return state;
            const newPanel = state.activePanel === action.panel ? null : action.panel;
            if (state.activePanel === newPanel) return state;
            return { ...state, activePanel: newPanel };
        }
        case "CLOSE_PANEL": {
            if (state.activePanel === null) return state;
            return { ...state, activePanel: null };
        }
        case "SET_LEFT_PANEL_WIDTH": {
            if (state.leftPanelWidth === action.width) return state;
            return { ...state, leftPanelWidth: action.width };
        }
        case "SET_RIGHT_PANEL_WIDTH": {
            if (state.rightPanelWidth === action.width) return state;
            return { ...state, rightPanelWidth: action.width };
        }

        // Component visibility
        case "SET_TOOLBAR_VISIBLE": {
            if (state.toolbarVisible === action.visible) return state;
            return { ...state, toolbarVisible: action.visible };
        }
        case "SET_FLOATING_TOOLBAR_VISIBLE": {
            if (state.floatingToolbarVisible === action.visible) return state;
            return { ...state, floatingToolbarVisible: action.visible };
        }
        case "SET_LEFT_PANEL_VISIBLE": {
            if (state.leftPanelVisible === action.visible) return state;
            // Close active panel if it's a left tab and we're hiding the left panel
            const activePanel =
                !action.visible && state.activePanel !== null && isLeftPanelTab(state.activePanel)
                    ? null
                    : state.activePanel;
            return { ...state, leftPanelVisible: action.visible, activePanel };
        }
        case "SET_RIGHT_PANEL_VISIBLE": {
            if (state.rightPanelVisible === action.visible) return state;
            // Close active panel if it's a right tab and we're hiding the right panel
            const activePanel =
                !action.visible && state.activePanel !== null && !isLeftPanelTab(state.activePanel)
                    ? null
                    : state.activePanel;
            return { ...state, rightPanelVisible: action.visible, activePanel };
        }
        case "SET_FULLSCREEN_BUTTON_VISIBLE": {
            if (state.fullscreenButtonVisible === action.visible) return state;
            return { ...state, fullscreenButtonVisible: action.visible };
        }
        case "SET_DOWNLOAD_BUTTON_VISIBLE": {
            if (state.downloadButtonVisible === action.visible) return state;
            return { ...state, downloadButtonVisible: action.visible };
        }
        case "SET_PRINT_BUTTON_VISIBLE": {
            if (state.printButtonVisible === action.visible) return state;
            return { ...state, printButtonVisible: action.visible };
        }
        case "SET_THEME": {
            if (state.theme === action.theme) return state;
            return { ...state, theme: action.theme };
        }
        case "SET_THEME_SWITCHING_DISABLED": {
            if (state.themeSwitchingDisabled === action.disabled) return state;
            return { ...state, themeSwitchingDisabled: action.disabled };
        }
        case "SET_TEXT_SELECTION_DISABLED": {
            if (state.textSelectionDisabled === action.disabled) return state;
            return { ...state, textSelectionDisabled: action.disabled };
        }
        case "SET_MIN_ZOOM": {
            if (state.minZoom === action.zoom) return state;
            const zoom = state.zoom < action.zoom ? action.zoom : state.zoom;
            return { ...state, minZoom: action.zoom, zoom };
        }
        case "SET_MAX_ZOOM": {
            if (state.maxZoom === action.zoom) return state;
            const zoom = state.zoom > action.zoom ? action.zoom : state.zoom;
            return { ...state, maxZoom: action.zoom, zoom };
        }
        case "SET_PANEL_DISABLED": {
            const alreadyDisabled = state.disabledPanels.has(action.panel);
            if (alreadyDisabled === action.disabled) return state;
            const newDisabled = new Set(state.disabledPanels);
            if (action.disabled) {
                newDisabled.add(action.panel);
            } else {
                newDisabled.delete(action.panel);
            }
            // If the currently active panel is being disabled, close it
            const activePanel = action.disabled && state.activePanel === action.panel ? null : state.activePanel;
            return { ...state, disabledPanels: newDisabled, activePanel };
        }

        // Annotation highlight
        case "HIGHLIGHT_ANNOTATION": {
            return {
                ...state,
                highlightedAnnotation: {
                    pageIndex: action.pageIndex,
                    bounds: action.bounds,
                },
            };
        }
        case "CLEAR_ANNOTATION_HIGHLIGHT": {
            if (state.highlightedAnnotation === null) return state;
            return { ...state, highlightedAnnotation: null };
        }

        // Fullscreen
        case "SET_FULLSCREEN": {
            if (state.isFullscreen === action.isFullscreen) return state;
            return { ...state, isFullscreen: action.isFullscreen };
        }

        // Search
        case "SET_SEARCH_QUERY": {
            if (state.searchQuery === action.query) return state;
            return { ...state, searchQuery: action.query };
        }
        case "SET_SEARCH_CASE_SENSITIVE": {
            if (state.searchCaseSensitive === action.caseSensitive) return state;
            return { ...state, searchCaseSensitive: action.caseSensitive, searchMatches: [], searchActiveIndex: -1 };
        }
        case "SET_SEARCH_MATCHES": {
            const hasMatches = action.matches.length > 0;
            const hadMatches = state.searchActiveIndex >= 0;
            const resetActive = action.resetActiveIndex !== false;
            const shouldReset = resetActive || !hadMatches;
            const activeIndex = hasMatches
                ? shouldReset
                    ? 0
                    : Math.min(state.searchActiveIndex, action.matches.length - 1)
                : -1;
            const navChanged = shouldReset && hasMatches;
            return {
                ...state,
                searchMatches: action.matches,
                searchActiveIndex: activeIndex,
                searchNavGen: navChanged ? state.searchNavGen + 1 : state.searchNavGen,
            };
        }
        case "SET_SEARCH_ACTIVE_INDEX": {
            const index = action.index;
            if (index < 0 || index >= state.searchMatches.length) return state;
            return {
                ...state,
                searchActiveIndex: index,
                searchNavGen: state.searchNavGen + 1,
                searchNavScrollAlignment: action.scrollAlignment ?? null,
            };
        }
        case "SEARCH_NEXT": {
            if (state.searchMatches.length === 0) return state;
            const next = (state.searchActiveIndex + 1) % state.searchMatches.length;
            return {
                ...state,
                searchActiveIndex: next,
                searchNavGen: state.searchNavGen + 1,
                searchNavScrollAlignment: action.scrollAlignment ?? null,
            };
        }
        case "SEARCH_PREV": {
            if (state.searchMatches.length === 0) return state;
            const prev = (state.searchActiveIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
            return {
                ...state,
                searchActiveIndex: prev,
                searchNavGen: state.searchNavGen + 1,
                searchNavScrollAlignment: action.scrollAlignment ?? null,
            };
        }
        case "CLEAR_SEARCH": {
            if (state.searchQuery === "" && state.searchMatches.length === 0 && state.searchActiveIndex === -1)
                return state;
            return { ...state, searchQuery: "", searchMatches: [], searchActiveIndex: -1 };
        }
        case "SET_SEARCH_TEXT_LOADING": {
            if (state.searchTextLoading === action.loading) return state;
            return { ...state, searchTextLoading: action.loading };
        }
        case "SET_SEARCH_TEXT_LOADED": {
            if (state.searchTextLoaded === action.loaded) return state;
            return { ...state, searchTextLoaded: action.loaded };
        }

        // Download progress
        case "SET_DOWNLOAD_PROGRESS": {
            return {
                ...state,
                isDownloading: true,
                downloadLoaded: action.loaded,
                downloadTotal: action.total,
            };
        }
        case "CLEAR_DOWNLOAD_PROGRESS": {
            if (!state.isDownloading) return state;
            return {
                ...state,
                isDownloading: false,
                downloadLoaded: 0,
                downloadTotal: 0,
            };
        }

        // Processing state
        case "SET_PROCESSING": {
            if (state.isProcessing === action.processing) return state;
            return { ...state, isProcessing: action.processing };
        }

        // Print progress
        case "SET_PRINT_PROGRESS": {
            return {
                ...state,
                isPrinting: true,
                printCurrentPage: action.currentPage,
                printTotalPages: action.totalPages,
            };
        }
        case "CLEAR_PRINT_PROGRESS": {
            if (!state.isPrinting) return state;
            return {
                ...state,
                isPrinting: false,
                printCurrentPage: 0,
                printTotalPages: 0,
            };
        }

        case "SHOW_PRINT_DIALOG": {
            if (state.showPrintDialog) return state;
            return { ...state, showPrintDialog: true };
        }

        case "HIDE_PRINT_DIALOG": {
            if (!state.showPrintDialog) return state;
            return { ...state, showPrintDialog: false };
        }

        case "ENABLE_PANEL_TRANSITIONS": {
            if (!state.panelTransitionsDisabled) return state;
            return { ...state, panelTransitionsDisabled: false };
        }

        // Tools
        case "SET_ACTIVE_TOOL": {
            const tool = action.tool;
            if (state.activeTool === tool) {
                // Clicking the same tool set again → back to pointer
                if (isToolSet(tool)) {
                    return { ...state, activeTool: "pointer", activeSubTool: null };
                }
                return state;
            }
            if (isToolSet(tool)) {
                // Activate tool set with last-used sub-tool
                const subTool = state.lastSubToolPerSet[tool];
                return {
                    ...state,
                    activeTool: tool,
                    activeSubTool: subTool,
                    selectedAnnotation: subTool === "select" ? state.selectedAnnotation : null,
                };
            }
            // Simple tool
            return { ...state, activeTool: tool, activeSubTool: null, selectedAnnotation: null };
        }
        case "SET_SUB_TOOL": {
            const activeTool = state.activeTool;
            if (!isToolSet(activeTool)) return state;
            if (state.activeSubTool === action.subTool) return state;
            return {
                ...state,
                activeSubTool: action.subTool,
                lastSubToolPerSet: {
                    ...state.lastSubToolPerSet,
                    [activeTool as ToolSet]: action.subTool,
                },
                // Clear selection when switching away from select tool
                selectedAnnotation: action.subTool !== "select" ? null : state.selectedAnnotation,
            };
        }
        case "SET_TOOL_OPTION": {
            const current = state.toolOptions[action.subTool] ?? { ...DEFAULT_TOOL_OPTIONS };
            const updated = { ...current, [action.key]: action.value };
            return {
                ...state,
                toolOptions: { ...state.toolOptions, [action.subTool]: updated },
            };
        }

        // Annotation editing
        case "ADD_ANNOTATION": {
            const existing = state.pageAnnotations.get(action.pageIndex) ?? [];
            const newAnnotations = new Map(state.pageAnnotations);
            newAnnotations.set(action.pageIndex, [...existing, action.annotation]);
            const newDirty = new Set(state.annotationsDirtyPages);
            newDirty.add(action.pageIndex);
            return { ...state, pageAnnotations: newAnnotations, annotationsDirtyPages: newDirty };
        }
        case "REMOVE_ANNOTATION": {
            const existing = state.pageAnnotations.get(action.pageIndex);
            if (!existing || action.annotationIndex >= existing.length) return state;
            const newList = existing.filter((_, i) => i !== action.annotationIndex);
            const newAnnotations = new Map(state.pageAnnotations);
            newAnnotations.set(action.pageIndex, newList);
            const newDirty = new Set(state.annotationsDirtyPages);
            newDirty.add(action.pageIndex);
            return {
                ...state,
                pageAnnotations: newAnnotations,
                annotationsDirtyPages: newDirty,
                selectedAnnotation: null,
            };
        }

        case "UPDATE_ANNOTATION": {
            const existing = state.pageAnnotations.get(action.pageIndex);
            if (!existing || action.annotationIndex >= existing.length) return state;
            const newList = existing.map((a, i) => (i === action.annotationIndex ? action.annotation : a));
            const newAnnotations = new Map(state.pageAnnotations);
            newAnnotations.set(action.pageIndex, newList);
            const newDirty = new Set(state.annotationsDirtyPages);
            newDirty.add(action.pageIndex);
            return { ...state, pageAnnotations: newAnnotations, annotationsDirtyPages: newDirty };
        }

        case "RESTORE_PAGE_ANNOTATIONS": {
            const newAnnotations = new Map(state.pageAnnotations);
            newAnnotations.set(action.pageIndex, action.annotations);
            const newDirty = new Set(state.annotationsDirtyPages);
            newDirty.add(action.pageIndex);
            return {
                ...state,
                pageAnnotations: newAnnotations,
                annotationsDirtyPages: newDirty,
                selectedAnnotation: null,
            };
        }

        // Annotation selection
        case "SELECT_ANNOTATION": {
            const sel = state.selectedAnnotation;
            if (sel && sel.pageIndex === action.pageIndex && sel.annotationIndex === action.annotationIndex)
                return state;
            return {
                ...state,
                selectedAnnotation: { pageIndex: action.pageIndex, annotationIndex: action.annotationIndex },
            };
        }
        case "DESELECT_ANNOTATION": {
            if (state.selectedAnnotation === null) return state;
            return { ...state, selectedAnnotation: null };
        }

        default:
            return state;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
