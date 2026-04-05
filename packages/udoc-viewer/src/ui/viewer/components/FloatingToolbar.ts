import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import { on } from "../../framework/events";
import type { ViewerState, ZoomMode } from "../state";
import type { Action } from "../actions";
import { setupRovingTabindex } from "../a11y";
import { ICON_CHEVRON_LEFT, ICON_CHEVRON_RIGHT, ICON_CHEVRON_DOWN, ICON_ZOOM_IN, ICON_ZOOM_OUT } from "../icons";
import { createViewModeMenu } from "./ViewModeMenu";
import type { I18n } from "../i18n/index.js";

interface FloatingToolbarSlice {
    floatingToolbarVisible: boolean;
    page: number;
    pageCount: number;
    zoom: number;
    zoomMode: ZoomMode;
    effectiveZoom: number | null;
    zoomSteps: readonly number[];
}

function sliceEqual(a: FloatingToolbarSlice, b: FloatingToolbarSlice): boolean {
    return (
        a.floatingToolbarVisible === b.floatingToolbarVisible &&
        a.page === b.page &&
        a.pageCount === b.pageCount &&
        a.zoom === b.zoom &&
        a.zoomMode === b.zoomMode &&
        a.effectiveZoom === b.effectiveZoom &&
        a.zoomSteps === b.zoomSteps
    );
}

/** Format zoom as percentage string, preserving 1 decimal when present */
function formatZoomPercent(zoom: number): string {
    const percent = Math.round(zoom * 1000) / 10; // Round to 1 decimal
    return percent % 1 === 0 ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function getDisplayZoom(slice: FloatingToolbarSlice): number {
    if (slice.zoomMode === "custom") return slice.zoom;
    return slice.effectiveZoom ?? slice.zoom;
}

export function createFloatingToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-floating-toolbar";
    el.setAttribute("role", "toolbar");
    el.setAttribute("aria-label", "Page navigation and zoom");

    // Navigation section
    const navSection = document.createElement("div");
    navSection.className = "udoc-toolbar__group";

    const prevBtn = document.createElement("button");
    prevBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    prevBtn.innerHTML = ICON_CHEVRON_LEFT;
    prevBtn.title = "Previous page";
    prevBtn.setAttribute("aria-label", "Previous page");

    const pageInfo = document.createElement("div");
    pageInfo.className = "udoc-toolbar__page-info";

    const pageInput = document.createElement("input");
    pageInput.className = "udoc-toolbar__page-input";
    pageInput.type = "text";
    pageInput.inputMode = "numeric";
    pageInput.setAttribute("aria-label", "Page number");

    const pageTotal = document.createElement("span");
    pageTotal.className = "udoc-toolbar__page-total";

    pageInfo.appendChild(pageInput);
    pageInfo.appendChild(pageTotal);

    const nextBtn = document.createElement("button");
    nextBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    nextBtn.innerHTML = ICON_CHEVRON_RIGHT;
    nextBtn.title = "Next page";
    nextBtn.setAttribute("aria-label", "Next page");

    navSection.appendChild(prevBtn);
    navSection.appendChild(pageInfo);
    navSection.appendChild(nextBtn);

    // Divider
    const divider = document.createElement("div");
    divider.className = "udoc-toolbar__divider";

    // Zoom section
    const zoomSection = document.createElement("div");
    zoomSection.className = "udoc-toolbar__group";

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    zoomOutBtn.innerHTML = ICON_ZOOM_OUT;
    zoomOutBtn.title = "Zoom out";
    zoomOutBtn.setAttribute("aria-label", "Zoom out");

    // Zoom dropdown container
    const zoomDropdownContainer = document.createElement("div");
    zoomDropdownContainer.className = "udoc-zoom-dropdown";

    const zoomToggle = document.createElement("div");
    zoomToggle.className = "udoc-zoom-dropdown__toggle";

    const zoomInput = document.createElement("input");
    zoomInput.className = "udoc-zoom-dropdown__input";
    zoomInput.type = "text";
    zoomInput.inputMode = "numeric";
    zoomInput.title = "Zoom level";
    zoomInput.setAttribute("aria-label", "Zoom level");

    const zoomChevron = document.createElement("button");
    zoomChevron.className = "udoc-zoom-dropdown__chevron";
    zoomChevron.innerHTML = ICON_CHEVRON_DOWN;
    zoomChevron.title = "Zoom options";
    zoomChevron.setAttribute("aria-label", "Zoom options");
    zoomChevron.setAttribute("aria-haspopup", "listbox");
    zoomChevron.setAttribute("aria-expanded", "false");

    zoomToggle.appendChild(zoomInput);
    zoomToggle.appendChild(zoomChevron);

    const zoomDropdown = document.createElement("div");
    zoomDropdown.className = "udoc-zoom-dropdown__menu";
    zoomDropdown.setAttribute("role", "listbox");
    zoomDropdown.setAttribute("aria-label", "Zoom levels");
    zoomDropdown.style.display = "none";

    zoomDropdownContainer.appendChild(zoomToggle);
    zoomDropdownContainer.appendChild(zoomDropdown);

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    zoomInBtn.innerHTML = ICON_ZOOM_IN;
    zoomInBtn.title = "Zoom in";
    zoomInBtn.setAttribute("aria-label", "Zoom in");

    zoomSection.appendChild(zoomOutBtn);
    zoomSection.appendChild(zoomDropdownContainer);
    zoomSection.appendChild(zoomInBtn);

    // Second divider
    const divider2 = document.createElement("div");
    divider2.className = "udoc-toolbar__divider";

    // View mode menu
    const viewModeMenu = createViewModeMenu();

    el.appendChild(navSection);
    el.appendChild(divider);
    el.appendChild(zoomSection);
    el.appendChild(divider2);
    el.appendChild(viewModeMenu.el);

    let unsub: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];
    let rovingTabindex: ReturnType<typeof setupRovingTabindex> | null = null;

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, i18n: I18n): void {
        container.appendChild(el);

        el.setAttribute("aria-label", i18n.t("floatingToolbar.label"));
        prevBtn.title = i18n.t("toolbar.previousPage");
        prevBtn.setAttribute("aria-label", i18n.t("toolbar.previousPage"));
        pageInput.setAttribute("aria-label", i18n.t("toolbar.pageNumber"));
        nextBtn.title = i18n.t("toolbar.nextPage");
        nextBtn.setAttribute("aria-label", i18n.t("toolbar.nextPage"));
        zoomOutBtn.title = i18n.t("toolbar.zoomOut");
        zoomOutBtn.setAttribute("aria-label", i18n.t("toolbar.zoomOut"));
        zoomInput.title = i18n.t("toolbar.zoomLevel");
        zoomInput.setAttribute("aria-label", i18n.t("toolbar.zoomLevel"));
        zoomChevron.title = i18n.t("toolbar.zoomOptions");
        zoomChevron.setAttribute("aria-label", i18n.t("toolbar.zoomOptions"));
        zoomDropdown.setAttribute("aria-label", i18n.t("toolbar.zoomLevels"));
        zoomInBtn.title = i18n.t("toolbar.zoomIn");
        zoomInBtn.setAttribute("aria-label", i18n.t("toolbar.zoomIn"));

        // Roving tabindex: single Tab stop, arrow keys between buttons
        rovingTabindex = setupRovingTabindex(el, ".udoc-toolbar__btn, input");

        // Mount view mode menu
        viewModeMenu.mount(store, i18n);

        // Event handlers
        unsubEvents.push(
            on(prevBtn, "click", () => {
                const state = store.getState();
                if (state.page > 1) {
                    store.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page - 1 });
                }
            }),
            on(nextBtn, "click", () => {
                const state = store.getState();
                if (state.page < state.pageCount) {
                    store.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page + 1 });
                }
            }),
            on(zoomOutBtn, "click", () => {
                store.dispatch({ type: "ZOOM_OUT" });
            }),
            on(zoomInBtn, "click", () => {
                store.dispatch({ type: "ZOOM_IN" });
            }),
            on(pageInput, "keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    const value = parseInt(pageInput.value, 10);
                    const state = store.getState();
                    if (!isNaN(value) && value >= 1 && value <= state.pageCount) {
                        store.dispatch({ type: "NAVIGATE_TO_PAGE", page: value });
                    } else {
                        // Reset to current page
                        pageInput.value = String(state.page);
                    }
                    pageInput.blur();
                }
            }),
            on(pageInput, "blur", () => {
                // Reset to current page on blur
                const state = store.getState();
                pageInput.value = String(state.page);
            }),
        );

        // Zoom dropdown state
        let isZoomDropdownOpen = false;

        const openZoomDropdown = () => {
            if (!isZoomDropdownOpen) {
                isZoomDropdownOpen = true;
                zoomDropdown.style.display = "block";
                zoomChevron.classList.add("udoc-zoom-dropdown__chevron--active");
                zoomChevron.setAttribute("aria-expanded", "true");
            }
        };

        const closeZoomDropdown = () => {
            if (isZoomDropdownOpen) {
                isZoomDropdownOpen = false;
                zoomDropdown.style.display = "none";
                zoomChevron.classList.remove("udoc-zoom-dropdown__chevron--active");
                zoomChevron.setAttribute("aria-expanded", "false");
            }
        };

        const toggleZoomDropdown = () => {
            if (isZoomDropdownOpen) {
                closeZoomDropdown();
            } else {
                openZoomDropdown();
            }
        };

        // Zoom input handlers
        unsubEvents.push(
            on(zoomInput, "keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    const value = parseFloat(zoomInput.value);
                    const state = store.getState();
                    if (!isNaN(value) && value >= 10 && value <= 500) {
                        store.dispatch({ type: "SET_ZOOM", zoom: value / 100 });
                    } else {
                        // Reset to current zoom
                        const displayZoom =
                            state.zoomMode === "custom" ? state.zoom : (state.effectiveZoom ?? state.zoom);
                        zoomInput.value = formatZoomPercent(displayZoom);
                    }
                    zoomInput.blur();
                }
            }),
            on(zoomInput, "focus", () => {
                // Select all text on focus for easy editing
                zoomInput.select();
            }),
            on(zoomInput, "blur", () => {
                // Reset to current zoom on blur
                const state = store.getState();
                const displayZoom = state.zoomMode === "custom" ? state.zoom : (state.effectiveZoom ?? state.zoom);
                zoomInput.value = formatZoomPercent(displayZoom);
            }),
        );

        // Zoom chevron toggle
        unsubEvents.push(
            on(zoomChevron, "click", (e: MouseEvent) => {
                e.stopPropagation();
                toggleZoomDropdown();
            }),
        );

        // Close on outside click
        const handleOutsideClick = (e: MouseEvent) => {
            if (!zoomDropdownContainer.contains(e.target as Node)) {
                closeZoomDropdown();
            }
        };
        document.addEventListener("click", handleOutsideClick);
        unsubEvents.push(() => document.removeEventListener("click", handleOutsideClick));

        // Close on escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeZoomDropdown();
            }
        };
        document.addEventListener("keydown", handleEscape);
        unsubEvents.push(() => document.removeEventListener("keydown", handleEscape));

        const ZOOM_MODE_OPTIONS: Array<{ mode: ZoomMode; label: string }> = [
            { mode: "fit-spread-width", label: i18n.t("zoom.fitWidth") },
            { mode: "fit-spread-height", label: i18n.t("zoom.fitHeight") },
            { mode: "fit-spread", label: i18n.t("zoom.fitPage") },
        ];

        const buildZoomDropdown = (slice: FloatingToolbarSlice) => {
            zoomDropdown.innerHTML = "";

            // Zoom step options
            const stepsSection = document.createElement("div");
            stepsSection.className = "udoc-zoom-dropdown__section";

            for (const step of slice.zoomSteps) {
                const item = document.createElement("button");
                item.className = "udoc-zoom-dropdown__item";
                item.setAttribute("role", "option");
                const stepPercent = Math.round(step * 100);
                const currentPercent = Math.round(slice.zoom * 100);
                const isActive = slice.zoomMode === "custom" && stepPercent === currentPercent;
                if (isActive) {
                    item.classList.add("udoc-zoom-dropdown__item--active");
                }
                item.setAttribute("aria-selected", String(isActive));
                item.textContent = `${stepPercent}%`;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    store.dispatch({ type: "SET_ZOOM", zoom: step });
                    closeZoomDropdown();
                });
                stepsSection.appendChild(item);
            }
            zoomDropdown.appendChild(stepsSection);

            // Divider
            const dividerEl = document.createElement("div");
            dividerEl.className = "udoc-zoom-dropdown__divider";
            dividerEl.setAttribute("role", "separator");
            zoomDropdown.appendChild(dividerEl);

            // Zoom mode options
            const modeSection = document.createElement("div");
            modeSection.className = "udoc-zoom-dropdown__section";

            for (const opt of ZOOM_MODE_OPTIONS) {
                const item = document.createElement("button");
                item.className = "udoc-zoom-dropdown__item";
                item.setAttribute("role", "option");
                const isActive = slice.zoomMode === opt.mode;
                if (isActive) {
                    item.classList.add("udoc-zoom-dropdown__item--active");
                }
                item.setAttribute("aria-selected", String(isActive));
                item.textContent = opt.label;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const state = store.getState();
                    store.dispatch({ type: "SET_ZOOM_MODE", mode: opt.mode });
                    // Re-center if already in this mode
                    if (state.zoomMode === opt.mode) {
                        store.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page });
                    }
                    closeZoomDropdown();
                });
                modeSection.appendChild(item);
            }
            zoomDropdown.appendChild(modeSection);
        };

        const applyState = (slice: FloatingToolbarSlice) => {
            // Visibility
            el.style.display = slice.floatingToolbarVisible ? "" : "none";

            if (!slice.floatingToolbarVisible) return;

            pageInput.value = String(slice.page);
            pageTotal.textContent = `\u00A0/ ${slice.pageCount}`;

            // Only update zoom input if it's not focused (user might be typing)
            if (document.activeElement !== zoomInput) {
                zoomInput.value = formatZoomPercent(getDisplayZoom(slice));
            }

            // Update button states
            prevBtn.disabled = slice.page <= 1;
            nextBtn.disabled = slice.page >= slice.pageCount;

            // Rebuild zoom dropdown
            buildZoomDropdown(slice);
        };

        // Initial state
        applyState(selectSlice(store.getState()));

        // Subscribe to changes
        unsub = subscribeSelector(store, selectSlice, applyState, {
            equality: sliceEqual,
        });
    }

    function destroy(): void {
        if (unsub) unsub();
        if (rovingTabindex) rovingTabindex.destroy();
        for (const off of unsubEvents) off();
        viewModeMenu.destroy();
        el.remove();
    }

    return { el, mount, destroy };
}

function selectSlice(state: ViewerState): FloatingToolbarSlice {
    return {
        floatingToolbarVisible: state.floatingToolbarVisible,
        page: state.page,
        pageCount: state.pageCount,
        zoom: state.zoom,
        zoomMode: state.zoomMode,
        effectiveZoom: state.effectiveZoom,
        zoomSteps: state.zoomSteps,
    };
}
