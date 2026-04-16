/**
 * SearchPanel - Full-featured text search panel in the right panel.
 *
 * Features:
 * - Search input with debounced query dispatch
 * - Case sensitivity toggle
 * - Match count and active index display
 * - Previous/Next match navigation
 * - Result list with context snippets, grouped by page
 * - Keyboard shortcuts (Enter = next, Shift+Enter = prev)
 */

import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import { on } from "../../framework/events";
import type { ViewerState, SearchMatch } from "../state";
import type { Action } from "../actions";
import { ICON_CHEVRON_UP, ICON_CHEVRON_DOWN, ICON_SEARCH, ICON_CLEAR } from "../icons";
import type { I18n } from "../i18n/index.js";

function matchEquals(a: SearchMatch, b: SearchMatch): boolean {
    return a.pageIndex === b.pageIndex && a.charOffset === b.charOffset && a.length === b.length;
}

type SearchPanelSlice = {
    isOpen: boolean;
    query: string;
    caseSensitive: boolean;
    matches: SearchMatch[];
    activeIndex: number;
    textLoading: boolean;
    textLoaded: boolean;
    pageCount: number;
};

export function createSearchPanel() {
    const el = document.createElement("div");
    el.className = "udoc-search-panel";

    // --- Header (input + case toggle) ---
    const header = document.createElement("div");
    header.className = "udoc-search-panel__header";

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "udoc-search-panel__input-wrapper";

    const inputIcon = document.createElement("span");
    inputIcon.className = "udoc-search-panel__input-icon";
    inputIcon.innerHTML = ICON_SEARCH;

    const input = document.createElement("input");
    input.className = "udoc-search-panel__input";
    input.type = "text";
    input.placeholder = "Search in document...";
    input.setAttribute("aria-label", "Search text");

    const clearBtn = document.createElement("button");
    clearBtn.className = "udoc-search-panel__clear";
    clearBtn.innerHTML = ICON_CLEAR;
    clearBtn.title = "Clear search";
    clearBtn.setAttribute("aria-label", "Clear search");
    clearBtn.style.display = "none";

    inputWrapper.append(inputIcon, input, clearBtn);

    const caseBtn = document.createElement("button");
    caseBtn.className = "udoc-search-panel__case";
    caseBtn.textContent = "Aa";
    caseBtn.title = "Match case";
    caseBtn.setAttribute("aria-label", "Match case");
    caseBtn.setAttribute("aria-pressed", "false");

    header.append(inputWrapper, caseBtn);

    // --- Navigation bar (status + prev/next) ---
    const nav = document.createElement("div");
    nav.className = "udoc-search-panel__nav";

    const status = document.createElement("span");
    status.className = "udoc-search-panel__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const navButtons = document.createElement("div");
    navButtons.className = "udoc-search-panel__nav-buttons";

    const prevBtn = document.createElement("button");
    prevBtn.className = "udoc-search-panel__nav-btn";
    prevBtn.innerHTML = ICON_CHEVRON_UP;
    prevBtn.title = "Previous match (Shift+Enter)";
    prevBtn.setAttribute("aria-label", "Previous match");

    const nextBtn = document.createElement("button");
    nextBtn.className = "udoc-search-panel__nav-btn";
    nextBtn.innerHTML = ICON_CHEVRON_DOWN;
    nextBtn.title = "Next match (Enter)";
    nextBtn.setAttribute("aria-label", "Next match");

    navButtons.append(prevBtn, nextBtn);
    nav.append(status, navButtons);

    // --- Result list ---
    const results = document.createElement("div");
    results.className = "udoc-search-panel__results";
    results.setAttribute("role", "listbox");
    results.setAttribute("aria-label", "Search results");

    el.append(header, nav, results);

    // --- State management ---
    let unsubRender: (() => void) | null = null;
    let storeRef: Store<ViewerState, Action> | null = null;
    let i18n: I18n | null = null;
    const unsubEvents: Array<() => void> = [];
    let lastSlice: SearchPanelSlice | null = null;
    // Track which matches array reference was used to build the result list
    let renderedMatchesRef: SearchMatch[] | null = null;

    function applyState(slice: SearchPanelSlice): void {
        if (!slice.isOpen) {
            el.style.display = "none";
            lastSlice = slice;
            return;
        }
        el.style.display = "";

        // Auto-focus input when panel opens (preventScroll avoids viewport
        // shift while the mobile slide-in transition is still running)
        if (lastSlice && !lastSlice.isOpen && slice.isOpen) {
            requestAnimationFrame(() => input.focus({ preventScroll: true }));
        }

        // Update input value only if it differs (avoid cursor jump)
        if (input.value !== slice.query) {
            input.value = slice.query;
        }

        // Show/hide clear button based on query
        clearBtn.style.display = slice.query ? "" : "none";

        // Update case button
        caseBtn.classList.toggle("udoc-search-panel__case--active", slice.caseSensitive);
        caseBtn.setAttribute("aria-pressed", String(slice.caseSensitive));

        // Update nav buttons
        const hasMatches = slice.matches.length > 0;
        prevBtn.disabled = !hasMatches;
        nextBtn.disabled = !hasMatches;

        // Update status text
        if (slice.textLoading) {
            status.textContent = i18n!.t("search.loadingText");
        } else if (slice.query && slice.matches.length === 0 && slice.textLoaded) {
            status.textContent = i18n!.t("search.noResults");
        } else if (slice.matches.length > 0) {
            status.textContent = i18n!.t("search.resultStatus", {
                current: slice.activeIndex + 1,
                total: slice.matches.length,
            });
        } else {
            status.textContent = "";
        }

        // During incremental text loading, executeSearch creates a new array each
        // time a page's text arrives.  Pages load in order, so new matches are
        // always appended.  Detect append-only updates by comparing the last
        // previously-rendered match (by value, not reference) and patch the DOM
        // instead of wiping it — a full innerHTML="" between mousedown and
        // mouseup kills the click event on result items.
        if (slice.matches !== renderedMatchesRef) {
            const prevLen = renderedMatchesRef ? renderedMatchesRef.length : 0;
            const isAppend =
                prevLen > 0 &&
                slice.matches.length >= prevLen &&
                matchEquals(renderedMatchesRef![prevLen - 1], slice.matches[prevLen - 1]);
            if (isAppend && slice.matches.length > prevLen) {
                appendResultItems(slice.matches, prevLen);
            } else if (!isAppend) {
                renderResultList(slice);
            }
            renderedMatchesRef = slice.matches;
        }

        // Update active result styling
        updateActiveResult(slice.activeIndex);

        lastSlice = slice;
    }

    function createResultItem(match: SearchMatch, globalIndex: number): HTMLDivElement {
        const item = document.createElement("div");
        item.className = "udoc-search-result";
        item.setAttribute("role", "option");
        item.dataset.matchIndex = String(globalIndex);

        const contextEl = document.createElement("span");
        contextEl.className = "udoc-search-result__context";
        const [before, matched, after] = match.context;
        const beforeText = document.createTextNode(before);
        const matchSpan = document.createElement("mark");
        matchSpan.className = "udoc-search-result__match";
        matchSpan.textContent = matched;
        const afterText = document.createTextNode(after);
        contextEl.append(beforeText, matchSpan, afterText);
        item.appendChild(contextEl);

        const idx = globalIndex;
        item.addEventListener("click", () => {
            if (storeRef) {
                storeRef.dispatch({ type: "SET_SEARCH_ACTIVE_INDEX", index: idx });
            }
        });

        return item;
    }

    let lastRenderedPage = -1;

    function renderResultList(slice: SearchPanelSlice): void {
        results.innerHTML = "";
        lastRenderedPage = -1;

        if (slice.matches.length === 0) return;

        appendResultItems(slice.matches, 0);
    }

    function appendResultItems(matches: SearchMatch[], fromIndex: number): void {
        for (let i = fromIndex; i < matches.length; i++) {
            const match = matches[i];
            if (match.pageIndex !== lastRenderedPage) {
                lastRenderedPage = match.pageIndex;
                const pageHeader = document.createElement("div");
                pageHeader.className = "udoc-search-result__page-header";
                pageHeader.textContent = i18n!.t("search.pageHeader", { page: match.pageIndex + 1 });
                results.appendChild(pageHeader);
            }

            results.appendChild(createResultItem(match, i));
        }
    }

    function updateActiveResult(activeIndex: number): void {
        const prev = results.querySelector(".udoc-search-result--active");
        if (prev) {
            prev.classList.remove("udoc-search-result--active");
            prev.setAttribute("aria-selected", "false");
        }

        if (activeIndex >= 0) {
            const active = results.querySelector(`[data-match-index="${activeIndex}"]`);
            if (active) {
                active.classList.add("udoc-search-result--active");
                active.setAttribute("aria-selected", "true");
                // Scroll into view
                active.scrollIntoView({ block: "nearest" });
            }
        }
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, i18nArg: I18n): void {
        container.appendChild(el);
        storeRef = store;
        i18n = i18nArg;

        input.placeholder = i18n.t("search.placeholder");
        input.setAttribute("aria-label", i18n.t("search.label"));
        caseBtn.title = i18n.t("search.matchCase");
        caseBtn.setAttribute("aria-label", i18n.t("search.matchCase"));
        prevBtn.title = i18n.t("search.previousMatch");
        prevBtn.setAttribute("aria-label", i18n.t("search.previousMatch"));
        nextBtn.title = i18n.t("search.nextMatch");
        nextBtn.setAttribute("aria-label", i18n.t("search.nextMatch"));
        results.setAttribute("aria-label", i18n.t("search.resultsLabel"));

        // Keyboard shortcuts on input
        unsubEvents.push(
            on(input, "keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter" && storeRef) {
                    e.preventDefault();
                    const queryChanged = storeRef.getState().searchQuery !== input.value;
                    if (queryChanged) {
                        storeRef.dispatch({ type: "SET_SEARCH_PAGE_RANGE", range: null });
                        storeRef.dispatch({ type: "SET_SEARCH_QUERY", query: input.value });
                    } else if (e.shiftKey) {
                        storeRef.dispatch({ type: "SEARCH_PREV" });
                    } else {
                        storeRef.dispatch({ type: "SEARCH_NEXT" });
                    }
                }
                if (e.key === "Escape" && storeRef) {
                    storeRef.dispatch({ type: "CLOSE_PANEL" });
                }
            }),
        );

        // Case sensitivity toggle
        unsubEvents.push(
            on(caseBtn, "click", () => {
                if (storeRef) {
                    const current = storeRef.getState().searchCaseSensitive;
                    storeRef.dispatch({ type: "SET_SEARCH_CASE_SENSITIVE", caseSensitive: !current });
                }
            }),
        );

        // Clear search button
        unsubEvents.push(
            on(clearBtn, "click", () => {
                if (storeRef) {
                    storeRef.dispatch({ type: "CLEAR_SEARCH" });
                    input.focus({ preventScroll: true });
                }
            }),
        );

        // Prev/Next buttons
        unsubEvents.push(
            on(prevBtn, "click", () => {
                if (storeRef) storeRef.dispatch({ type: "SEARCH_PREV" });
            }),
        );
        unsubEvents.push(
            on(nextBtn, "click", () => {
                if (storeRef) storeRef.dispatch({ type: "SEARCH_NEXT" });
            }),
        );

        // Subscribe to state
        applyState(selectSearchPanel(store.getState()));
        unsubRender = subscribeSelector(store, selectSearchPanel, applyState, {
            equality: searchPanelEqual,
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        storeRef = null;
        lastSlice = null;
        renderedMatchesRef = null;
        el.remove();
    }

    return { el, mount, destroy };
}

function selectSearchPanel(state: ViewerState): SearchPanelSlice {
    return {
        isOpen: state.activePanel === "search",
        query: state.searchQuery,
        caseSensitive: state.searchCaseSensitive,
        matches: state.searchMatches,
        activeIndex: state.searchActiveIndex,
        textLoading: state.searchTextLoading,
        textLoaded: state.searchTextLoaded,
        pageCount: state.pageCount,
    };
}

function searchPanelEqual(a: SearchPanelSlice, b: SearchPanelSlice): boolean {
    return (
        a.isOpen === b.isOpen &&
        a.query === b.query &&
        a.caseSensitive === b.caseSensitive &&
        a.matches === b.matches &&
        a.activeIndex === b.activeIndex &&
        a.textLoading === b.textLoading &&
        a.textLoaded === b.textLoaded &&
        a.pageCount === b.pageCount
    );
}
