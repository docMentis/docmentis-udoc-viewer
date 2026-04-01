import type { Store } from "../framework/store";
import type { ViewerState } from "./state";
import type { Action } from "./actions";
import type { EngineAdapter } from "./shell";
import { executeSearch } from "./search";

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

    return pages.filter((p) => p >= 0 && p < state.pageCount);
}

export function createEffects(store: Store<ViewerState, Action>, engine: EngineAdapter): { destroy: () => void } {
    const unsubscribers: Array<() => void> = [];

    // Generation counter to detect stale async operations after document switches.
    // Incremented on every document change; closures capture the current value
    // and bail out if it no longer matches.
    let docGeneration = 0;

    // Note: Cache invalidation is handled by UDocViewer.close() when switching documents.
    // Rendering is handled by Viewport/Spread components with properly computed scale.

    // Outline loading effect: load outline on-demand when outline panel is opened
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            // Bump generation on document change so stale async work is discarded
            if (prev.doc !== next.doc) docGeneration++;
            const gen = docGeneration;

            // Load outline when:
            // 1. Panel changes to "outline" AND outline not loaded AND not loading
            // 2. Document changes while outline panel is open AND outline not loaded
            const shouldLoad =
                next.doc !== null && next.activePanel === "outline" && next.outline === null && !next.outlineLoading;

            if (shouldLoad) {
                store.dispatch({ type: "LOAD_OUTLINE" });
                try {
                    const outline = await engine.getOutline(next.doc!);
                    if (gen !== docGeneration) return; // stale
                    store.dispatch({ type: "SET_OUTLINE", outline });
                } catch (error) {
                    if (gen !== docGeneration) return; // stale
                    console.error("Failed to load outline", error);
                    store.dispatch({ type: "SET_OUTLINE", outline: [] });
                }
            }
        }),
    );

    // Visibility groups loading effect: load when layers panel is opened
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            if (prev.doc !== next.doc) docGeneration++;
            const gen = docGeneration;

            const shouldLoad =
                next.doc !== null &&
                next.activePanel === "layers" &&
                next.visibilityGroups === null &&
                !next.visibilityGroupsLoading;

            if (shouldLoad) {
                store.dispatch({ type: "LOAD_VISIBILITY_GROUPS" });
                try {
                    const groups = await engine.getVisibilityGroups(next.doc!);
                    if (gen !== docGeneration) return;
                    store.dispatch({ type: "SET_VISIBILITY_GROUPS", groups });
                } catch (error) {
                    if (gen !== docGeneration) return;
                    console.error("Failed to load visibility groups", error);
                    store.dispatch({ type: "SET_VISIBILITY_GROUPS", groups: [] });
                }
            }
        }),
    );

    // Annotation loading effect: load annotations on-demand for visible pages.
    // Yields one rAF so the Viewport (which also defers to rAF) can submit render
    // requests first. The unified work queue then ensures renders complete before annotations.
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            if (!next.doc) return;

            // Load annotations for current page and adjacent pages (for spread mode)
            const pagesToLoad = getPagesToLoad(next);

            // Filter to pages that need loading
            const pagesToActuallyLoad = pagesToLoad.filter(
                (pageIndex) => !next.pageAnnotations.has(pageIndex) && !next.annotationsLoading.has(pageIndex),
            );

            if (pagesToActuallyLoad.length === 0) return;

            const doc = next.doc;
            const gen = docGeneration;

            // Yield to rAF so the Viewport submits render requests first
            await new Promise((r) => requestAnimationFrame(r));
            if (gen !== docGeneration) return;

            for (const pageIndex of pagesToActuallyLoad) {
                if (gen !== docGeneration) return; // document changed, discard
                const currentState = store.getState();
                if (currentState.pageAnnotations.has(pageIndex)) continue;
                if (currentState.annotationsLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_ANNOTATIONS", pageIndex });
                try {
                    const annotations = await engine.getPageAnnotations(doc, pageIndex);
                    if (gen !== docGeneration) return; // stale
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations });
                } catch (error) {
                    if (gen !== docGeneration) return; // stale
                    console.error(`Failed to load annotations for page ${pageIndex}`, error);
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations: [] });
                }
            }
        }),
    );

    // Text loading effect: load text on-demand for visible pages (for text selection).
    // Yields one rAF so the Viewport can submit render requests first.
    // The unified work queue then ensures renders and annotations complete before text.
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            if (!next.doc) return;

            // Load text for current page and adjacent pages (for spread mode)
            const pagesToLoad = getPagesToLoad(next);

            // Filter to pages that need loading
            const pagesToActuallyLoad = pagesToLoad.filter(
                (pageIndex) => !next.pageText.has(pageIndex) && !next.textLoading.has(pageIndex),
            );

            if (pagesToActuallyLoad.length === 0) return;

            const doc = next.doc;
            const gen = docGeneration;

            // Yield to rAF so the Viewport submits render requests first
            await new Promise((r) => requestAnimationFrame(r));
            if (gen !== docGeneration) return;

            for (const pageIndex of pagesToActuallyLoad) {
                if (gen !== docGeneration) return; // document changed, discard
                const currentState = store.getState();
                if (currentState.pageText.has(pageIndex)) continue;
                if (currentState.textLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_TEXT", pageIndex });
                try {
                    const text = await engine.getLayoutPage(doc, pageIndex);
                    if (gen !== docGeneration) return; // stale
                    store.dispatch({ type: "SET_PAGE_TEXT", pageIndex, text });
                } catch (error) {
                    if (gen !== docGeneration) return; // stale
                    console.error(`Failed to load text for page ${pageIndex}`, error);
                    store.dispatch({ type: "CLEAR_PAGE_TEXT_LOADING", pageIndex });
                }
            }
        }),
    );

    // Comments panel effect: load ALL annotations when comments panel is opened
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            if (!next.doc) return;

            // Only trigger when comments panel is opened
            const commentsJustOpened = next.activePanel === "comments" && prev.activePanel !== "comments";
            const docLoadedWithCommentsOpen = next.activePanel === "comments" && prev.doc !== next.doc;

            if (!commentsJustOpened && !docLoadedWithCommentsOpen) return;

            const gen = docGeneration;

            // Load annotations for all pages
            for (let pageIndex = 0; pageIndex < next.pageCount; pageIndex++) {
                if (gen !== docGeneration) return; // document changed, discard
                // Skip if already loaded or loading
                if (next.pageAnnotations.has(pageIndex)) continue;
                if (next.annotationsLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_ANNOTATIONS", pageIndex });
                try {
                    const annotations = await engine.getPageAnnotations(next.doc, pageIndex);
                    if (gen !== docGeneration) return; // stale
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations });
                } catch (error) {
                    if (gen !== docGeneration) return; // stale
                    console.error(`Failed to load annotations for page ${pageIndex}`, error);
                    store.dispatch({ type: "SET_PAGE_ANNOTATIONS", pageIndex, annotations: [] });
                }
            }
        }),
    );

    // Annotation highlight auto-clear effect
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    unsubscribers.push(
        store.subscribeEffect((prev, next) => {
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
        }),
    );

    // Cleanup highlight timer on destroy
    const cleanupHighlightTimer = () => {
        if (highlightTimer) {
            clearTimeout(highlightTimer);
            highlightTimer = null;
        }
    };
    unsubscribers.push(cleanupHighlightTimer);

    // Search text loading effect: load ALL page text when a search query is set
    // or the search panel is opened. Supports both built-in panel and external API usage.
    unsubscribers.push(
        store.subscribeEffect(async (prev, next) => {
            if (!next.doc) return;

            const searchJustOpened = next.activePanel === "search" && prev.activePanel !== "search";
            const docLoadedWithSearchOpen = next.activePanel === "search" && prev.doc !== next.doc;
            const queryJustSet = next.searchQuery !== "" && prev.searchQuery === "";
            const docLoadedWithQuery = next.searchQuery !== "" && prev.doc !== next.doc;

            if (!searchJustOpened && !docLoadedWithSearchOpen && !queryJustSet && !docLoadedWithQuery) return;
            if (next.searchTextLoaded || next.searchTextLoading) return;

            const gen = docGeneration;
            store.dispatch({ type: "SET_SEARCH_TEXT_LOADING", loading: true });

            for (let pageIndex = 0; pageIndex < next.pageCount; pageIndex++) {
                if (gen !== docGeneration) return;
                const currentState = store.getState();
                if (currentState.pageText.has(pageIndex)) continue;
                if (currentState.textLoading.has(pageIndex)) continue;

                store.dispatch({ type: "LOAD_PAGE_TEXT", pageIndex });
                try {
                    const text = await engine.getLayoutPage(next.doc!, pageIndex);
                    if (gen !== docGeneration) return;
                    store.dispatch({ type: "SET_PAGE_TEXT", pageIndex, text });
                } catch (error) {
                    if (gen !== docGeneration) return;
                    console.error(`Failed to load text for page ${pageIndex}`, error);
                    store.dispatch({ type: "CLEAR_PAGE_TEXT_LOADING", pageIndex });
                }
            }

            if (gen !== docGeneration) return;
            store.dispatch({ type: "SET_SEARCH_TEXT_LOADING", loading: false });
            store.dispatch({ type: "SET_SEARCH_TEXT_LOADED", loaded: true });
        }),
    );

    // Search execution effect: run search when query, case sensitivity, or text data changes.
    // Works regardless of whether the search panel is open (supports external API usage).
    unsubscribers.push(
        store.subscribeEffect((prev, next) => {
            // Only re-run search when search-relevant state actually changes
            const searchInputChanged =
                prev.searchQuery !== next.searchQuery ||
                prev.searchCaseSensitive !== next.searchCaseSensitive ||
                prev.pageText !== next.pageText;

            if (!searchInputChanged) return;

            if (!next.searchQuery.trim()) {
                if (next.searchMatches.length > 0) {
                    store.dispatch({ type: "SET_SEARCH_MATCHES", matches: [] });
                }
                return;
            }

            const matches = executeSearch(next.searchQuery, next.searchCaseSensitive, next.pageText, next.pageCount);
            store.dispatch({ type: "SET_SEARCH_MATCHES", matches });
        }),
    );

    // Search navigation effect: navigate to the page and position of the active match
    unsubscribers.push(
        store.subscribeEffect((prev, next) => {
            if (next.searchActiveIndex === -1) return;
            if (prev.searchNavGen === next.searchNavGen) return;
            if (next.searchMatches.length === 0) return;

            const match = next.searchMatches[next.searchActiveIndex];
            if (!match) return;

            // Navigate to the match position using a destination with XYZ display
            // so the viewport scrolls to show the match, not just the page top
            const rect = match.rects[0];
            store.dispatch({
                type: "NAVIGATE_TO_DESTINATION",
                destination: {
                    pageIndex: match.pageIndex,
                    display: {
                        type: "xyz",
                        left: rect ? rect.x : undefined,
                        top: rect ? rect.y : undefined,
                    },
                },
            });
        }),
    );

    return {
        destroy: () => {
            for (const unsub of unsubscribers) {
                unsub();
            }
            // Note: workerClient is not destroyed here - it's shared across viewers
            // and owned by UDocClient
        },
    };
}
