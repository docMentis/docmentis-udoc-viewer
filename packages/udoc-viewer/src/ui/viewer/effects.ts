import type { Store } from "../framework/store";
import type { ViewerState } from "./state";
import type { Action } from "./actions";
import type { EngineAdapter } from "./shell";

/**
 * Determine which pages need content loaded (annotations, text).
 * Returns 0-indexed page indices for the current page and adjacent pages in spread mode.
 */
function getPagesToLoad(state: ViewerState): number[] {
    const pages: number[] = [];
    // Current page (convert 1-based to 0-based)
    const currentPageIndex = state.page - 1;
    pages.push(currentPageIndex);

    // For double-page layouts, include the adjacent page
    if (state.layoutMode.startsWith("double-page")) {
        if (currentPageIndex > 0) pages.push(currentPageIndex - 1);
        if (currentPageIndex < state.pageCount - 1) pages.push(currentPageIndex + 1);
    }

    return pages.filter(p => p >= 0 && p < state.pageCount);
}

export function createEffects(
    store: Store<ViewerState, Action>,
    engine: EngineAdapter
): { destroy: () => void } {
    const unsubscribers: Array<() => void> = [];

    // Note: Cache invalidation is handled by UDocViewer.close() when switching documents.
    // Rendering is handled by Viewport/Spread components with properly computed scale.

    // Outline loading effect: load outline on-demand when outline panel is opened
    unsubscribers.push(store.subscribeEffect(async (prev, next) => {
        // Load outline when:
        // 1. Panel changes to "outline" AND outline not loaded AND not loading
        // 2. Document changes while outline panel is open AND outline not loaded
        const shouldLoad =
            next.doc !== null &&
            next.activePanel === "outline" &&
            next.outline === null &&
            !next.outlineLoading;

        if (shouldLoad) {
            store.dispatch({ type: "LOAD_OUTLINE" });
            try {
                const outline = await engine.getOutline(next.doc!);
                store.dispatch({ type: "SET_OUTLINE", outline });
            } catch (error) {
                console.error("Failed to load outline", error);
                store.dispatch({ type: "SET_OUTLINE", outline: [] });
            }
        }
    }));

    // Annotation loading effect: load annotations on-demand for visible pages
    // Deferred to avoid blocking page renders (worker processes requests sequentially)
    let annotationLoadTimeout: ReturnType<typeof setTimeout> | null = null;
    unsubscribers.push(store.subscribeEffect(async (prev, next) => {
        if (!next.doc) return;

        // Clear any pending annotation load when state changes
        if (annotationLoadTimeout) {
            clearTimeout(annotationLoadTimeout);
            annotationLoadTimeout = null;
        }

        // Load annotations for current page and adjacent pages (for spread mode)
        const pagesToLoad = getPagesToLoad(next);

        // Filter to pages that need loading
        const pagesToActuallyLoad = pagesToLoad.filter(pageIndex =>
            !next.pageAnnotations.has(pageIndex) && !next.annotationsLoading.has(pageIndex)
        );

        if (pagesToActuallyLoad.length === 0) return;

        // Defer annotation loading to let render requests go first
        const doc = next.doc;
        annotationLoadTimeout = setTimeout(async () => {
            annotationLoadTimeout = null;
            for (const pageIndex of pagesToActuallyLoad) {
                // Re-check state in case it changed during the delay
                const currentState = store.getState();
                if (currentState.pageAnnotations.has(pageIndex)) continue;
                if (currentState.annotationsLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_ANNOTATIONS", pageIndex });
                try {
                    const annotations = await engine.getPageAnnotations(doc, pageIndex);
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations });
                } catch (error) {
                    console.error(`Failed to load annotations for page ${pageIndex}`, error);
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations: [] });
                }
            }
        }, 100); // 100ms delay to let render requests go first
    }));

    // Cleanup annotation load timeout on destroy
    const cleanupAnnotationTimeout = () => {
        if (annotationLoadTimeout) {
            clearTimeout(annotationLoadTimeout);
            annotationLoadTimeout = null;
        }
    };
    unsubscribers.push(cleanupAnnotationTimeout);

    // Text loading effect: load text on-demand for visible pages (for text selection)
    // Deferred to avoid blocking page renders (worker processes requests sequentially)
    let textLoadTimeout: ReturnType<typeof setTimeout> | null = null;
    unsubscribers.push(store.subscribeEffect(async (prev, next) => {
        if (!next.doc) return;

        // Clear any pending text load when state changes
        if (textLoadTimeout) {
            clearTimeout(textLoadTimeout);
            textLoadTimeout = null;
        }

        // Load text for current page and adjacent pages (for spread mode)
        const pagesToLoad = getPagesToLoad(next);

        // Filter to pages that need loading
        const pagesToActuallyLoad = pagesToLoad.filter(pageIndex =>
            !next.pageText.has(pageIndex) && !next.textLoading.has(pageIndex)
        );

        if (pagesToActuallyLoad.length === 0) return;

        // Defer text loading to let render requests go first
        const doc = next.doc;
        textLoadTimeout = setTimeout(async () => {
            textLoadTimeout = null;
            for (const pageIndex of pagesToActuallyLoad) {
                // Re-check state in case it changed during the delay
                const currentState = store.getState();
                if (currentState.pageText.has(pageIndex)) continue;
                if (currentState.textLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_TEXT", pageIndex });
                try {
                    const text = await engine.getPageText(doc, pageIndex);
                    store.dispatch({ type: "SET_PAGE_TEXT", pageIndex, text });
                } catch (error) {
                    console.error(`Failed to load text for page ${pageIndex}`, error);
                    store.dispatch({ type: "SET_PAGE_TEXT", pageIndex, text: [] });
                }
            }
        }, 150); // 150ms delay (slightly longer than annotations since text is lower priority)
    }));

    // Cleanup text load timeout on destroy
    const cleanupTextTimeout = () => {
        if (textLoadTimeout) {
            clearTimeout(textLoadTimeout);
            textLoadTimeout = null;
        }
    };
    unsubscribers.push(cleanupTextTimeout);

    // Comments panel effect: load ALL annotations when comments panel is opened
    unsubscribers.push(store.subscribeEffect(async (prev, next) => {
        if (!next.doc) return;

        // Only trigger when comments panel is opened
        const commentsJustOpened = next.activePanel === "comments" && prev.activePanel !== "comments";
        const docLoadedWithCommentsOpen = next.activePanel === "comments" && prev.doc !== next.doc;

        if (!commentsJustOpened && !docLoadedWithCommentsOpen) return;

        // Load annotations for all pages
        for (let pageIndex = 0; pageIndex < next.pageCount; pageIndex++) {
            // Skip if already loaded or loading
            if (next.pageAnnotations.has(pageIndex)) continue;
            if (next.annotationsLoading.has(pageIndex)) continue;

            store.dispatch({ type: "LOAD_PAGE_ANNOTATIONS", pageIndex });
            try {
                const annotations = await engine.getPageAnnotations(next.doc, pageIndex);
                store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations });
            } catch (error) {
                console.error(`Failed to load annotations for page ${pageIndex}`, error);
                store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations: [] });
            }
        }
    }));

    // Annotation highlight auto-clear effect
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    unsubscribers.push(store.subscribeEffect((prev, next) => {
        // Clear timer if highlight was removed
        if (prev.highlightedAnnotation !== null && next.highlightedAnnotation === null) {
            if (highlightTimer) {
                clearTimeout(highlightTimer);
                highlightTimer = null;
            }
            return;
        }

        // Start timer when highlight is set
        if (prev.highlightedAnnotation !== next.highlightedAnnotation && next.highlightedAnnotation !== null) {
            if (highlightTimer) {
                clearTimeout(highlightTimer);
            }
            highlightTimer = setTimeout(() => {
                highlightTimer = null;
                store.dispatch({ type: "CLEAR_ANNOTATION_HIGHLIGHT" });
            }, 2000); // Clear highlight after 2 seconds
        }
    }));

    // Cleanup highlight timer on destroy
    const cleanupHighlightTimer = () => {
        if (highlightTimer) {
            clearTimeout(highlightTimer);
            highlightTimer = null;
        }
    };
    unsubscribers.push(cleanupHighlightTimer);

    return {
        destroy: () => {
            for (const unsub of unsubscribers) {
                unsub();
            }
            // Note: workerClient is not destroyed here - it's shared across viewers
            // and owned by UDocClient
        }
    };
}
