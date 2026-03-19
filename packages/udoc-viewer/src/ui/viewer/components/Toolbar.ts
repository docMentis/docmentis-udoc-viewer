import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import { on } from "../../framework/events";
import type { ViewerState, ZoomMode, PanelTab, LeftPanelTab, ThemeMode } from "../state";
import { isLeftPanelTab } from "../state";
import type { Action } from "../actions";
import {
    ICON_MENU,
    ICON_SEARCH,
    ICON_COMMENTS,
    ICON_FULLSCREEN,
    ICON_FULLSCREEN_EXIT,
    ICON_CHEVRON_LEFT,
    ICON_CHEVRON_RIGHT,
    ICON_CHEVRON_DOWN,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT,
    ICON_THEME_LIGHT,
    ICON_THEME_DARK,
    ICON_THEME_SYSTEM,
    ICON_DOWNLOAD,
    ICON_PRINT,
} from "../icons";
import { createViewModeMenu } from "./ViewModeMenu";

function createButton(className: string, label: string, iconSvg: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = `udoc-toolbar__btn ${className}`;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = iconSvg;
    return btn;
}

/** Format zoom as percentage string, preserving 1 decimal when present */
function formatZoomPercent(zoom: number): string {
    const percent = Math.round(zoom * 1000) / 10;
    return percent % 1 === 0 ? `${percent}%` : `${percent.toFixed(1)}%`;
}

const LEFT_TABS: LeftPanelTab[] = ["thumbnail", "outline", "bookmarks", "layers", "attachments"];

interface ToolbarSlice {
    toolbarVisible: boolean;
    floatingToolbarVisible: boolean;
    fullscreenButtonVisible: boolean;
    downloadButtonVisible: boolean;
    printButtonVisible: boolean;
    isFullscreen: boolean;
    theme: ThemeMode;
    themeSwitchingDisabled: boolean;
    // Panel button visibility
    leftPanelVisible: boolean;
    rightPanelVisible: boolean;
    disabledPanels: ReadonlySet<PanelTab>;
    // Inline controls state (only used when floating toolbar is hidden)
    page: number;
    pageCount: number;
    zoom: number;
    zoomMode: ZoomMode;
    effectiveZoom: number | null;
    zoomSteps: readonly number[];
}

function sliceEqual(a: ToolbarSlice, b: ToolbarSlice): boolean {
    return (
        a.toolbarVisible === b.toolbarVisible &&
        a.floatingToolbarVisible === b.floatingToolbarVisible &&
        a.fullscreenButtonVisible === b.fullscreenButtonVisible &&
        a.downloadButtonVisible === b.downloadButtonVisible &&
        a.printButtonVisible === b.printButtonVisible &&
        a.isFullscreen === b.isFullscreen &&
        a.theme === b.theme &&
        a.themeSwitchingDisabled === b.themeSwitchingDisabled &&
        a.leftPanelVisible === b.leftPanelVisible &&
        a.rightPanelVisible === b.rightPanelVisible &&
        a.disabledPanels === b.disabledPanels &&
        a.page === b.page &&
        a.pageCount === b.pageCount &&
        a.zoom === b.zoom &&
        a.zoomMode === b.zoomMode &&
        a.effectiveZoom === b.effectiveZoom &&
        a.zoomSteps === b.zoomSteps
    );
}

function selectSlice(state: ViewerState): ToolbarSlice {
    return {
        toolbarVisible: state.toolbarVisible,
        floatingToolbarVisible: state.floatingToolbarVisible,
        fullscreenButtonVisible: state.fullscreenButtonVisible,
        downloadButtonVisible: state.downloadButtonVisible,
        printButtonVisible: state.printButtonVisible,
        isFullscreen: state.isFullscreen,
        theme: state.theme,
        themeSwitchingDisabled: state.themeSwitchingDisabled,
        leftPanelVisible: state.leftPanelVisible,
        rightPanelVisible: state.rightPanelVisible,
        disabledPanels: state.disabledPanels,
        page: state.page,
        pageCount: state.pageCount,
        zoom: state.zoom,
        zoomMode: state.zoomMode,
        effectiveZoom: state.effectiveZoom,
        zoomSteps: state.zoomSteps,
    };
}

export function createToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-toolbar";

    // Left section
    const leftSection = document.createElement("div");
    leftSection.className = "udoc-toolbar__left";
    const menuBtn = createButton("udoc-toolbar__btn--menu", "Menu", ICON_MENU);
    leftSection.appendChild(menuBtn);

    // Center section (inline controls — visible when floating toolbar is hidden)
    const centerSection = document.createElement("div");
    centerSection.className = "udoc-toolbar__center";
    centerSection.style.display = "none";

    // -- Page navigation
    const navGroup = document.createElement("div");
    navGroup.className = "udoc-toolbar__group";

    const prevBtn = document.createElement("button");
    prevBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    prevBtn.innerHTML = ICON_CHEVRON_LEFT;
    prevBtn.title = "Previous page";

    const pageInfo = document.createElement("div");
    pageInfo.className = "udoc-toolbar__page-info";

    const pageInput = document.createElement("input");
    pageInput.className = "udoc-toolbar__page-input";
    pageInput.type = "text";
    pageInput.inputMode = "numeric";

    const pageTotal = document.createElement("span");
    pageTotal.className = "udoc-toolbar__page-total";

    pageInfo.append(pageInput, pageTotal);

    const nextBtn = document.createElement("button");
    nextBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    nextBtn.innerHTML = ICON_CHEVRON_RIGHT;
    nextBtn.title = "Next page";

    navGroup.append(prevBtn, pageInfo, nextBtn);

    // -- Divider
    const divider1 = document.createElement("div");
    divider1.className = "udoc-toolbar__divider";

    // -- Zoom controls
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "udoc-toolbar__group";

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    zoomOutBtn.innerHTML = ICON_ZOOM_OUT;
    zoomOutBtn.title = "Zoom out";

    // Zoom dropdown container
    const zoomDropdownContainer = document.createElement("div");
    zoomDropdownContainer.className = "udoc-zoom-dropdown udoc-zoom-dropdown--toolbar";

    const zoomToggle = document.createElement("div");
    zoomToggle.className = "udoc-zoom-dropdown__toggle";

    const zoomInput = document.createElement("input");
    zoomInput.className = "udoc-zoom-dropdown__input";
    zoomInput.type = "text";
    zoomInput.inputMode = "numeric";
    zoomInput.title = "Zoom level";

    const zoomChevron = document.createElement("button");
    zoomChevron.className = "udoc-zoom-dropdown__chevron";
    zoomChevron.innerHTML = ICON_CHEVRON_DOWN;
    zoomChevron.title = "Zoom options";

    zoomToggle.append(zoomInput, zoomChevron);

    const zoomDropdown = document.createElement("div");
    zoomDropdown.className = "udoc-zoom-dropdown__menu";
    zoomDropdown.style.display = "none";

    zoomDropdownContainer.append(zoomToggle, zoomDropdown);

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    zoomInBtn.innerHTML = ICON_ZOOM_IN;
    zoomInBtn.title = "Zoom in";

    zoomGroup.append(zoomOutBtn, zoomDropdownContainer, zoomInBtn);

    // -- Divider
    const divider2 = document.createElement("div");
    divider2.className = "udoc-toolbar__divider";

    // -- View mode menu
    const viewModeMenu = createViewModeMenu();

    centerSection.append(navGroup, divider1, zoomGroup, divider2, viewModeMenu.el);

    // Right section
    const rightSection = document.createElement("div");
    rightSection.className = "udoc-toolbar__right";
    const searchBtn = createButton("udoc-toolbar__btn--search", "Search", ICON_SEARCH);
    const commentsBtn = createButton("udoc-toolbar__btn--comments", "Comments", ICON_COMMENTS);
    const printBtn = createButton("udoc-toolbar__btn--print", "Print", ICON_PRINT);
    const downloadBtn = createButton("udoc-toolbar__btn--download", "Download", ICON_DOWNLOAD);
    const themeBtn = createButton("udoc-toolbar__btn--theme", "Toggle theme", ICON_THEME_DARK);
    const fullscreenBtn = createButton("udoc-toolbar__btn--fullscreen", "Fullscreen", ICON_FULLSCREEN);
    rightSection.append(searchBtn, commentsBtn, printBtn, downloadBtn, themeBtn, fullscreenBtn);

    el.append(leftSection, centerSection, rightSection);

    const unsubEvents: Array<() => void> = [];
    let unsubRender: (() => void) | null = null;
    let viewModeMounted = false;
    let onDownloadCallback: (() => void) | null = null;
    let onPrintCallback: (() => void) | null = null;

    // Zoom dropdown local state
    let isZoomDropdownOpen = false;

    const openZoomDropdown = () => {
        if (!isZoomDropdownOpen) {
            isZoomDropdownOpen = true;
            zoomDropdown.style.display = "block";
            zoomChevron.classList.add("udoc-zoom-dropdown__chevron--active");
        }
    };

    const closeZoomDropdown = () => {
        if (isZoomDropdownOpen) {
            isZoomDropdownOpen = false;
            zoomDropdown.style.display = "none";
            zoomChevron.classList.remove("udoc-zoom-dropdown__chevron--active");
        }
    };

    const ZOOM_MODE_OPTIONS: Array<{ mode: ZoomMode; label: string }> = [
        { mode: "fit-spread-width", label: "Fit Width" },
        { mode: "fit-spread-height", label: "Fit Height" },
        { mode: "fit-spread", label: "Fit Page" },
    ];

    function getDisplayZoom(slice: ToolbarSlice): number {
        if (slice.zoomMode === "custom") return slice.zoom;
        return slice.effectiveZoom ?? slice.zoom;
    }

    function buildZoomDropdown(slice: ToolbarSlice, store: Store<ViewerState, Action>): void {
        zoomDropdown.innerHTML = "";

        // Zoom step options
        const stepsSection = document.createElement("div");
        stepsSection.className = "udoc-zoom-dropdown__section";

        for (const step of slice.zoomSteps) {
            const item = document.createElement("button");
            item.className = "udoc-zoom-dropdown__item";
            const stepPercent = Math.round(step * 100);
            const currentPercent = Math.round(slice.zoom * 100);
            if (slice.zoomMode === "custom" && stepPercent === currentPercent) {
                item.classList.add("udoc-zoom-dropdown__item--active");
            }
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
        zoomDropdown.appendChild(dividerEl);

        // Zoom mode options
        const modeSection = document.createElement("div");
        modeSection.className = "udoc-zoom-dropdown__section";

        for (const opt of ZOOM_MODE_OPTIONS) {
            const item = document.createElement("button");
            item.className = "udoc-zoom-dropdown__item";
            if (slice.zoomMode === opt.mode) {
                item.classList.add("udoc-zoom-dropdown__item--active");
            }
            item.textContent = opt.label;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const state = store.getState();
                store.dispatch({ type: "SET_ZOOM_MODE", mode: opt.mode });
                if (state.zoomMode === opt.mode) {
                    store.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page });
                }
                closeZoomDropdown();
            });
            modeSection.appendChild(item);
        }
        zoomDropdown.appendChild(modeSection);
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(el);

        // Wire menu button to toggle the first available left panel tab
        const onMenuClick = () => {
            const state = store.getState();
            // If a left panel is already open, close it
            if (state.activePanel !== null && isLeftPanelTab(state.activePanel)) {
                store.dispatch({ type: "CLOSE_PANEL" });
                return;
            }
            // Find first non-disabled left tab
            const firstTab = LEFT_TABS.find((t) => !state.disabledPanels.has(t));
            if (firstTab) {
                store.dispatch({ type: "TOGGLE_PANEL", panel: firstTab });
            }
        };
        menuBtn.addEventListener("click", onMenuClick);
        unsubEvents.push(() => menuBtn.removeEventListener("click", onMenuClick));

        // Wire search button to toggle search panel
        const onSearchClick = () => {
            store.dispatch({ type: "TOGGLE_PANEL", panel: "search" });
        };
        searchBtn.addEventListener("click", onSearchClick);
        unsubEvents.push(() => searchBtn.removeEventListener("click", onSearchClick));

        // Wire comments button to toggle comments panel
        const onCommentsClick = () => {
            store.dispatch({ type: "TOGGLE_PANEL", panel: "comments" });
        };
        commentsBtn.addEventListener("click", onCommentsClick);
        unsubEvents.push(() => commentsBtn.removeEventListener("click", onCommentsClick));

        // Wire theme toggle button
        const onThemeClick = () => {
            const state = store.getState();
            const nextTheme: ThemeMode = state.theme === "light" ? "dark" : state.theme === "dark" ? "system" : "light";
            store.dispatch({ type: "SET_THEME", theme: nextTheme });
        };
        themeBtn.addEventListener("click", onThemeClick);
        unsubEvents.push(() => themeBtn.removeEventListener("click", onThemeClick));

        // Wire fullscreen button
        const onFullscreenClick = () => {
            const root = el.closest(".udoc-viewer-root") as HTMLElement | null;
            if (!root) return;

            if (!document.fullscreenElement) {
                root.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        };
        fullscreenBtn.addEventListener("click", onFullscreenClick);
        unsubEvents.push(() => fullscreenBtn.removeEventListener("click", onFullscreenClick));

        // Wire print button
        const onPrintClick = () => {
            onPrintCallback?.();
        };
        printBtn.addEventListener("click", onPrintClick);
        unsubEvents.push(() => printBtn.removeEventListener("click", onPrintClick));

        // Wire download button
        const onDownloadClick = () => {
            onDownloadCallback?.();
        };
        downloadBtn.addEventListener("click", onDownloadClick);
        unsubEvents.push(() => downloadBtn.removeEventListener("click", onDownloadClick));

        // Listen for fullscreen change events to sync state
        const onFullscreenChange = () => {
            const root = el.closest(".udoc-viewer-root");
            const isFullscreen = document.fullscreenElement === root;
            store.dispatch({ type: "SET_FULLSCREEN", isFullscreen });
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        unsubEvents.push(() => document.removeEventListener("fullscreenchange", onFullscreenChange));

        // Wire inline controls (page navigation)
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
            on(pageInput, "keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    const value = parseInt(pageInput.value, 10);
                    const state = store.getState();
                    if (!isNaN(value) && value >= 1 && value <= state.pageCount) {
                        store.dispatch({ type: "NAVIGATE_TO_PAGE", page: value });
                    } else {
                        pageInput.value = String(state.page);
                    }
                    pageInput.blur();
                }
            }),
            on(pageInput, "blur", () => {
                const state = store.getState();
                pageInput.value = String(state.page);
            }),
        );

        // Wire inline controls (zoom)
        unsubEvents.push(
            on(zoomOutBtn, "click", () => {
                store.dispatch({ type: "ZOOM_OUT" });
            }),
            on(zoomInBtn, "click", () => {
                store.dispatch({ type: "ZOOM_IN" });
            }),
            on(zoomInput, "keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    const value = parseFloat(zoomInput.value);
                    const state = store.getState();
                    if (!isNaN(value) && value >= 10 && value <= 500) {
                        store.dispatch({ type: "SET_ZOOM", zoom: value / 100 });
                    } else {
                        const displayZoom =
                            state.zoomMode === "custom" ? state.zoom : (state.effectiveZoom ?? state.zoom);
                        zoomInput.value = formatZoomPercent(displayZoom);
                    }
                    zoomInput.blur();
                }
            }),
            on(zoomInput, "focus", () => {
                zoomInput.select();
            }),
            on(zoomInput, "blur", () => {
                const state = store.getState();
                const displayZoom = state.zoomMode === "custom" ? state.zoom : (state.effectiveZoom ?? state.zoom);
                zoomInput.value = formatZoomPercent(displayZoom);
            }),
        );

        // Zoom chevron toggle
        unsubEvents.push(
            on(zoomChevron, "click", (e: MouseEvent) => {
                e.stopPropagation();
                if (isZoomDropdownOpen) {
                    closeZoomDropdown();
                } else {
                    openZoomDropdown();
                }
            }),
        );

        // Close zoom dropdown on outside click
        const handleOutsideClick = (e: MouseEvent) => {
            if (!zoomDropdownContainer.contains(e.target as Node)) {
                closeZoomDropdown();
            }
        };
        document.addEventListener("click", handleOutsideClick);
        unsubEvents.push(() => document.removeEventListener("click", handleOutsideClick));

        // Close zoom dropdown on escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeZoomDropdown();
            }
        };
        document.addEventListener("keydown", handleEscape);
        unsubEvents.push(() => document.removeEventListener("keydown", handleEscape));

        // Subscribe to state changes
        const applyState = (slice: ToolbarSlice) => {
            // Toolbar visibility
            el.style.display = slice.toolbarVisible ? "" : "none";

            // Menu button: hidden when left panel disabled or all left tabs disabled
            const allLeftDisabled = LEFT_TABS.every((t) => slice.disabledPanels.has(t));
            menuBtn.style.display = !slice.leftPanelVisible || allLeftDisabled ? "none" : "";

            // Search button: hidden when right panel disabled or search individually disabled
            searchBtn.style.display = !slice.rightPanelVisible || slice.disabledPanels.has("search") ? "none" : "";

            // Comments button: hidden when right panel disabled or comments individually disabled
            commentsBtn.style.display = !slice.rightPanelVisible || slice.disabledPanels.has("comments") ? "none" : "";

            // Theme button visibility
            themeBtn.style.display = slice.themeSwitchingDisabled ? "none" : "";

            // Theme button icon and label
            const themeIcon =
                slice.theme === "light"
                    ? ICON_THEME_DARK
                    : slice.theme === "dark"
                      ? ICON_THEME_SYSTEM
                      : ICON_THEME_LIGHT;
            const themeLabel =
                slice.theme === "light" ? "Dark mode" : slice.theme === "dark" ? "System theme" : "Light mode";
            themeBtn.innerHTML = themeIcon;
            themeBtn.setAttribute("aria-label", themeLabel);
            themeBtn.title = themeLabel;

            // Print button visibility
            printBtn.style.display = slice.printButtonVisible ? "" : "none";

            // Download button visibility
            downloadBtn.style.display = slice.downloadButtonVisible ? "" : "none";

            // Fullscreen button visibility and icon
            fullscreenBtn.style.display = slice.fullscreenButtonVisible ? "" : "none";
            fullscreenBtn.innerHTML = slice.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN;
            fullscreenBtn.setAttribute("aria-label", slice.isFullscreen ? "Exit fullscreen" : "Fullscreen");

            // Center section visibility (show when floating toolbar is hidden)
            const showCenter = slice.toolbarVisible && !slice.floatingToolbarVisible;
            centerSection.style.display = showCenter ? "flex" : "none";

            // Mount view mode menu lazily on first show
            if (showCenter && !viewModeMounted) {
                viewModeMenu.mount(store);
                viewModeMounted = true;
            }

            if (showCenter) {
                // Update page navigation
                pageInput.value = String(slice.page);
                pageTotal.textContent = `\u00A0/ ${slice.pageCount}`;
                prevBtn.disabled = slice.page <= 1;
                nextBtn.disabled = slice.page >= slice.pageCount;

                // Update zoom input (only if not focused)
                if (document.activeElement !== zoomInput) {
                    zoomInput.value = formatZoomPercent(getDisplayZoom(slice));
                }

                // Rebuild zoom dropdown
                buildZoomDropdown(slice, store);
            }
        };

        // Initial state
        applyState(selectSlice(store.getState()));

        // Subscribe to changes
        unsubRender = subscribeSelector(store, selectSlice, applyState, {
            equality: sliceEqual,
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        if (viewModeMounted) viewModeMenu.destroy();
        el.remove();
    }

    function setOnDownload(callback: (() => void) | null): void {
        onDownloadCallback = callback;
    }

    function setOnPrint(callback: (() => void) | null): void {
        onPrintCallback = callback;
    }

    return { el, mount, destroy, setOnDownload, setOnPrint };
}
