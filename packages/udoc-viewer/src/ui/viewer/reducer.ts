import type { ViewerState } from "./state";
import { initialState } from "./state";
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
            return {
                ...state,
                doc: action.doc,
                page: 1,
                pageCount: action.pageCount,
                pageInfos: action.pageInfos,
                // Reset view mode to defaults (format-specific if provided)
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
                textLoading: new Set()
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
                annotationsLoading: newLoading
            };
        }
        case "CLEAR_ANNOTATIONS": {
            if (state.pageAnnotations.size === 0 && state.annotationsLoading.size === 0) return state;
            return {
                ...state,
                pageAnnotations: new Map(),
                annotationsLoading: new Set()
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
                textLoading: newLoading
            };
        }
        case "CLEAR_TEXT": {
            if (state.pageText.size === 0 && state.textLoading.size === 0) return state;
            return {
                ...state,
                pageText: new Map(),
                textLoading: new Set()
            };
        }

        // Navigation
        case "NAVIGATE_TO_PAGE": {
            const page = clamp(action.page, 1, Math.max(1, state.pageCount || 1));
            const target = { page };
            if (state.navigationTarget?.page === page && !state.navigationTarget.scrollTo && !state.navigationTarget.zoom) {
                return state;
            }
            return { ...state, navigationTarget: target };
        }
        case "NAVIGATE_TO_DESTINATION": {
            const target = destinationToNavigationTarget(action.destination, state.pageCount);
            return { ...state, navigationTarget: target };
        }
        case "CLEAR_NAVIGATION_TARGET": {
            if (state.navigationTarget === null) return state;
            return { ...state, navigationTarget: null };
        }

        // View modes
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
            const steps = state.zoomSteps;
            const zoom = clamp(action.zoom, steps[0], steps[steps.length - 1]);
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
            const nextStep = steps.find(s => s > state.zoom) ?? steps[steps.length - 1];
            if (state.zoom === nextStep) return state;
            return { ...state, zoom: nextStep, zoomMode: "custom" };
        }
        case "ZOOM_OUT": {
            const steps = state.zoomSteps;
            const prevStep = [...steps].reverse().find(s => s < state.zoom) ?? steps[0];
            if (state.zoom === prevStep) return state;
            return { ...state, zoom: prevStep, zoomMode: "custom" };
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

        // Annotation highlight
        case "HIGHLIGHT_ANNOTATION": {
            return {
                ...state,
                highlightedAnnotation: {
                    pageIndex: action.pageIndex,
                    bounds: action.bounds
                }
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

        // Download progress
        case "SET_DOWNLOAD_PROGRESS": {
            return {
                ...state,
                isDownloading: true,
                downloadLoaded: action.loaded,
                downloadTotal: action.total
            };
        }
        case "CLEAR_DOWNLOAD_PROGRESS": {
            if (!state.isDownloading) return state;
            return {
                ...state,
                isDownloading: false,
                downloadLoaded: 0,
                downloadTotal: 0
            };
        }

        default:
            return state;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
