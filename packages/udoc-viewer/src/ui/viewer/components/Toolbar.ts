import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import { on } from "../../framework/events";
import type { I18n } from "../i18n/index.js";
import type { ViewerState, ZoomMode, PanelTab, LeftPanelTab, ThemeMode, ActiveTool, SimpleTool } from "../state";
import { isLeftPanelTab, isToolSet } from "../state";
import type { Action } from "../actions";
import { setupRovingTabindex } from "../a11y";
import {
    ICON_MENU,
    ICON_MORE,
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
    ICON_TOOL_POINTER,
    ICON_TOOL_HAND,
    ICON_TOOL_ZOOM,
    ICON_TOOL_ANNOTATE,
    ICON_TOOL_MARKUP,
} from "../icons";
import { createViewModeMenu } from "./ViewModeMenu";

function createButton(className: string, label: string, iconSvg: string, keyshortcuts?: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = `udoc-toolbar__btn ${className}`;
    btn.setAttribute("aria-label", label);
    if (keyshortcuts) {
        btn.setAttribute("aria-keyshortcuts", keyshortcuts);
    }
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
    // Tools
    disabledTools: ReadonlySet<ActiveTool>;
    activeTool: ActiveTool;
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
        a.zoomSteps === b.zoomSteps &&
        a.disabledTools === b.disabledTools &&
        a.activeTool === b.activeTool
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
        disabledTools: state.disabledTools,
        activeTool: state.activeTool,
    };
}

export function createToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-toolbar";
    el.setAttribute("role", "toolbar");
    el.setAttribute("aria-label", "Document toolbar");

    // Left section
    const leftSection = document.createElement("div");
    leftSection.className = "udoc-toolbar__left";
    const menuBtn = createButton("udoc-toolbar__btn--menu", "Menu", ICON_MENU);

    // Pointer split button
    const pointerSplitBtn = document.createElement("div");
    pointerSplitBtn.className = "udoc-toolbar__split-btn";

    const pointerMainBtn = document.createElement("button");
    pointerMainBtn.className = "udoc-toolbar__btn udoc-toolbar__split-btn-main";
    pointerMainBtn.innerHTML = ICON_TOOL_POINTER;

    const pointerDropBtn = document.createElement("button");
    pointerDropBtn.className = "udoc-toolbar__btn udoc-toolbar__split-btn-drop";
    pointerDropBtn.innerHTML = ICON_CHEVRON_DOWN;
    pointerDropBtn.setAttribute("aria-haspopup", "true");
    pointerDropBtn.setAttribute("aria-expanded", "false");

    const pointerDropdown = document.createElement("div");
    pointerDropdown.className = "udoc-toolbar__split-dropdown";
    pointerDropdown.style.display = "none";

    pointerSplitBtn.append(pointerMainBtn, pointerDropBtn, pointerDropdown);

    // Tool set buttons
    const annotateBtn = createButton(
        "udoc-toolbar__btn--tool udoc-toolbar__btn--annotate",
        "Annotate",
        ICON_TOOL_ANNOTATE,
    );
    const markupBtn = createButton("udoc-toolbar__btn--tool udoc-toolbar__btn--markup", "Markup", ICON_TOOL_MARKUP);

    leftSection.append(menuBtn, pointerSplitBtn, annotateBtn, markupBtn);

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

    pageInfo.append(pageInput, pageTotal);

    const nextBtn = document.createElement("button");
    nextBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    nextBtn.innerHTML = ICON_CHEVRON_RIGHT;
    nextBtn.title = "Next page";
    nextBtn.setAttribute("aria-label", "Next page");

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
    zoomOutBtn.setAttribute("aria-label", "Zoom out");
    zoomOutBtn.setAttribute("aria-keyshortcuts", "Control+- Meta+-");

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
    zoomInput.setAttribute("aria-label", "Zoom level");

    const zoomChevron = document.createElement("button");
    zoomChevron.className = "udoc-zoom-dropdown__chevron";
    zoomChevron.innerHTML = ICON_CHEVRON_DOWN;
    zoomChevron.title = "Zoom options";
    zoomChevron.setAttribute("aria-label", "Zoom options");
    zoomChevron.setAttribute("aria-haspopup", "listbox");
    zoomChevron.setAttribute("aria-expanded", "false");

    zoomToggle.append(zoomInput, zoomChevron);

    const zoomDropdown = document.createElement("div");
    zoomDropdown.className = "udoc-zoom-dropdown__menu";
    zoomDropdown.setAttribute("role", "listbox");
    zoomDropdown.setAttribute("aria-label", "Zoom levels");
    zoomDropdown.style.display = "none";

    zoomDropdownContainer.append(zoomToggle, zoomDropdown);

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "udoc-toolbar__btn udoc-toolbar__btn--nav";
    zoomInBtn.innerHTML = ICON_ZOOM_IN;
    zoomInBtn.title = "Zoom in";
    zoomInBtn.setAttribute("aria-label", "Zoom in");
    zoomInBtn.setAttribute("aria-keyshortcuts", "Control+= Meta+=");

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
    const searchBtn = createButton("udoc-toolbar__btn--search", "Search", ICON_SEARCH, "Control+F Meta+F");
    const commentsBtn = createButton("udoc-toolbar__btn--comments", "Comments", ICON_COMMENTS);
    const printBtn = createButton("udoc-toolbar__btn--print", "Print", ICON_PRINT);
    const downloadBtn = createButton("udoc-toolbar__btn--download", "Download", ICON_DOWNLOAD);
    const themeBtn = createButton("udoc-toolbar__btn--theme", "Toggle theme", ICON_THEME_DARK);
    const fullscreenBtn = createButton("udoc-toolbar__btn--fullscreen", "Fullscreen", ICON_FULLSCREEN);
    // Overflow menu (visible only on mobile)
    const overflowContainer = document.createElement("div");
    overflowContainer.className = "udoc-overflow-menu";

    const overflowBtn = createButton("udoc-toolbar__btn--more", "More", ICON_MORE);
    overflowBtn.setAttribute("aria-haspopup", "true");
    overflowBtn.setAttribute("aria-expanded", "false");

    const overflowDropdown = document.createElement("div");
    overflowDropdown.className = "udoc-overflow-menu__dropdown";
    overflowDropdown.setAttribute("role", "menu");
    overflowDropdown.style.display = "none";

    overflowContainer.append(overflowBtn, overflowDropdown);

    rightSection.append(searchBtn, commentsBtn, printBtn, downloadBtn, themeBtn, fullscreenBtn, overflowContainer);

    el.append(leftSection, centerSection, rightSection);

    const unsubEvents: Array<() => void> = [];
    let unsubRender: (() => void) | null = null;
    let viewModeMounted = false;
    let rovingTabindex: ReturnType<typeof setupRovingTabindex> | null = null;
    let onDownloadCallback: (() => void) | null = null;
    let onPrintCallback: (() => void) | null = null;

    // Zoom dropdown local state
    let isOverflowOpen = false;

    const openOverflow = () => {
        if (!isOverflowOpen) {
            isOverflowOpen = true;
            overflowDropdown.style.display = "block";
            overflowBtn.setAttribute("aria-expanded", "true");
        }
    };

    const closeOverflow = () => {
        if (isOverflowOpen) {
            isOverflowOpen = false;
            overflowDropdown.style.display = "none";
            overflowBtn.setAttribute("aria-expanded", "false");
        }
    };

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

    function getDisplayZoom(slice: ToolbarSlice): number {
        if (slice.zoomMode === "custom") return slice.zoom;
        return slice.effectiveZoom ?? slice.zoom;
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, i18n: I18n): void {
        container.appendChild(el);

        // Apply i18n labels
        el.setAttribute("aria-label", i18n.t("toolbar.label"));
        menuBtn.setAttribute("aria-label", i18n.t("toolbar.menu"));
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
        menuBtn.title = i18n.t("toolbar.menu");
        searchBtn.title = i18n.t("toolbar.search");
        searchBtn.setAttribute("aria-label", i18n.t("toolbar.search"));
        commentsBtn.title = i18n.t("toolbar.comments");
        commentsBtn.setAttribute("aria-label", i18n.t("toolbar.comments"));
        printBtn.title = i18n.t("toolbar.print");
        printBtn.setAttribute("aria-label", i18n.t("toolbar.print"));
        downloadBtn.title = i18n.t("toolbar.download");
        downloadBtn.setAttribute("aria-label", i18n.t("toolbar.download"));
        themeBtn.title = i18n.t("toolbar.darkMode");
        themeBtn.setAttribute("aria-label", i18n.t("toolbar.darkMode"));
        fullscreenBtn.title = i18n.t("toolbar.fullscreen");
        fullscreenBtn.setAttribute("aria-label", i18n.t("toolbar.fullscreen"));

        const ZOOM_MODE_OPTIONS: Array<{ mode: ZoomMode; label: string }> = [
            { mode: "fit-spread-width", label: i18n.t("zoom.fitWidth") },
            { mode: "fit-spread-height", label: i18n.t("zoom.fitHeight") },
            { mode: "fit-spread", label: i18n.t("zoom.fitPage") },
        ];

        function buildZoomDropdown(slice: ToolbarSlice, store: Store<ViewerState, Action>): void {
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
                    if (state.zoomMode === opt.mode) {
                        store.dispatch({ type: "NAVIGATE_TO_PAGE", page: state.page });
                    }
                    closeZoomDropdown();
                });
                modeSection.appendChild(item);
            }
            zoomDropdown.appendChild(modeSection);
        }

        // Roving tabindex: single Tab stop, arrow keys between buttons
        rovingTabindex = setupRovingTabindex(el, ".udoc-toolbar__btn, .udoc-toolbar__btn--nav, input");

        // --- Tool buttons ---
        const SIMPLE_TOOLS: Array<{ tool: SimpleTool; icon: string; labelKey: string }> = [
            { tool: "pointer", icon: ICON_TOOL_POINTER, labelKey: "tools.pointer" },
            { tool: "hand", icon: ICON_TOOL_HAND, labelKey: "tools.hand" },
            { tool: "zoom", icon: ICON_TOOL_ZOOM, labelKey: "tools.zoom" },
        ];

        // Track last-used simple tool for the split button icon
        let lastSimpleTool: SimpleTool = "pointer";
        let isPointerDropdownOpen = false;

        const openPointerDropdown = () => {
            if (!isPointerDropdownOpen) {
                isPointerDropdownOpen = true;
                pointerDropdown.style.display = "block";
                pointerDropBtn.setAttribute("aria-expanded", "true");
            }
        };

        const closePointerDropdown = () => {
            if (isPointerDropdownOpen) {
                isPointerDropdownOpen = false;
                pointerDropdown.style.display = "none";
                pointerDropBtn.setAttribute("aria-expanded", "false");
            }
        };

        // Build pointer dropdown items
        function buildPointerDropdown(): void {
            pointerDropdown.innerHTML = "";
            for (const st of SIMPLE_TOOLS) {
                const item = document.createElement("button");
                item.className = "udoc-toolbar__split-dropdown-item";
                const state = store.getState();
                const isActive = state.activeTool === st.tool;
                if (isActive) item.classList.add("udoc-toolbar__split-dropdown-item--active");
                item.innerHTML = `<span class="udoc-toolbar__split-dropdown-icon">${st.icon}</span><span>${i18n.t(st.labelKey as keyof typeof i18n.t)}</span>`;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    lastSimpleTool = st.tool;
                    store.dispatch({ type: "SET_ACTIVE_TOOL", tool: st.tool });
                    closePointerDropdown();
                });
                pointerDropdown.appendChild(item);
            }
        }

        // Apply i18n to tool buttons
        pointerMainBtn.title = i18n.t("tools.pointer");
        pointerMainBtn.setAttribute("aria-label", i18n.t("tools.pointer"));
        pointerDropBtn.title = i18n.t("tools.pointer");
        pointerDropBtn.setAttribute("aria-label", i18n.t("tools.pointer"));
        annotateBtn.title = i18n.t("tools.annotate");
        annotateBtn.setAttribute("aria-label", i18n.t("tools.annotate"));
        markupBtn.title = i18n.t("tools.markup");
        markupBtn.setAttribute("aria-label", i18n.t("tools.markup"));

        // Pointer main button: activate last-used simple tool
        const onPointerMainClick = () => {
            store.dispatch({ type: "SET_ACTIVE_TOOL", tool: lastSimpleTool });
        };
        pointerMainBtn.addEventListener("click", onPointerMainClick);
        unsubEvents.push(() => pointerMainBtn.removeEventListener("click", onPointerMainClick));

        // Pointer dropdown toggle
        const onPointerDropClick = (e: MouseEvent) => {
            e.stopPropagation();
            if (isPointerDropdownOpen) {
                closePointerDropdown();
            } else {
                buildPointerDropdown();
                openPointerDropdown();
            }
        };
        pointerDropBtn.addEventListener("click", onPointerDropClick);
        unsubEvents.push(() => pointerDropBtn.removeEventListener("click", onPointerDropClick));

        // Close pointer dropdown on outside click
        const handlePointerOutsideClick = (e: MouseEvent) => {
            if (!pointerSplitBtn.contains(e.target as Node)) {
                closePointerDropdown();
            }
        };
        document.addEventListener("click", handlePointerOutsideClick);
        unsubEvents.push(() => document.removeEventListener("click", handlePointerOutsideClick));

        // Annotate button
        const onAnnotateClick = () => {
            store.dispatch({ type: "SET_ACTIVE_TOOL", tool: "annotate" });
        };
        annotateBtn.addEventListener("click", onAnnotateClick);
        unsubEvents.push(() => annotateBtn.removeEventListener("click", onAnnotateClick));

        // Markup button
        const onMarkupClick = () => {
            store.dispatch({ type: "SET_ACTIVE_TOOL", tool: "markup" });
        };
        markupBtn.addEventListener("click", onMarkupClick);
        unsubEvents.push(() => markupBtn.removeEventListener("click", onMarkupClick));

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

        // Wire overflow menu
        overflowBtn.title = i18n.t("toolbar.more");
        overflowBtn.setAttribute("aria-label", i18n.t("toolbar.more"));

        const onOverflowClick = (e: MouseEvent) => {
            e.stopPropagation();
            if (isOverflowOpen) {
                closeOverflow();
            } else {
                openOverflow();
            }
        };
        overflowBtn.addEventListener("click", onOverflowClick);
        unsubEvents.push(() => overflowBtn.removeEventListener("click", onOverflowClick));

        const handleOverflowOutsideClick = (e: MouseEvent) => {
            if (!overflowContainer.contains(e.target as Node)) {
                closeOverflow();
            }
        };
        document.addEventListener("click", handleOverflowOutsideClick);
        unsubEvents.push(() => document.removeEventListener("click", handleOverflowOutsideClick));

        const handleOverflowEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeOverflow();
            }
        };
        document.addEventListener("keydown", handleOverflowEscape);
        unsubEvents.push(() => document.removeEventListener("keydown", handleOverflowEscape));

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
                slice.theme === "light"
                    ? i18n.t("toolbar.darkMode")
                    : slice.theme === "dark"
                      ? i18n.t("toolbar.systemTheme")
                      : i18n.t("toolbar.lightMode");
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
            const fsLabel = slice.isFullscreen ? i18n.t("toolbar.exitFullscreen") : i18n.t("toolbar.fullscreen");
            fullscreenBtn.setAttribute("aria-label", fsLabel);
            fullscreenBtn.title = fsLabel;

            // Rebuild overflow menu items
            {
                overflowDropdown.innerHTML = "";

                type OverflowItem = { icon: string; label: string; action: () => void };
                const items: OverflowItem[] = [];

                const searchVisible = slice.rightPanelVisible && !slice.disabledPanels.has("search");
                if (searchVisible) {
                    items.push({ icon: ICON_SEARCH, label: i18n.t("toolbar.search"), action: onSearchClick });
                }

                const commentsVisible = slice.rightPanelVisible && !slice.disabledPanels.has("comments");
                if (commentsVisible) {
                    items.push({ icon: ICON_COMMENTS, label: i18n.t("toolbar.comments"), action: onCommentsClick });
                }

                if (slice.printButtonVisible) {
                    items.push({ icon: ICON_PRINT, label: i18n.t("toolbar.print"), action: onPrintClick });
                }

                if (slice.downloadButtonVisible) {
                    items.push({ icon: ICON_DOWNLOAD, label: i18n.t("toolbar.download"), action: onDownloadClick });
                }

                if (!slice.themeSwitchingDisabled) {
                    items.push({ icon: themeIcon, label: themeLabel, action: onThemeClick });
                }

                if (slice.fullscreenButtonVisible) {
                    const fsIcon = slice.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN;
                    items.push({ icon: fsIcon, label: fsLabel, action: onFullscreenClick });
                }

                for (const item of items) {
                    const menuItem = document.createElement("button");
                    menuItem.className = "udoc-overflow-menu__item";
                    menuItem.setAttribute("role", "menuitem");
                    menuItem.innerHTML = `<span class="udoc-overflow-menu__item-icon">${item.icon}</span><span class="udoc-overflow-menu__item-label">${item.label}</span>`;
                    menuItem.addEventListener("click", (e) => {
                        e.stopPropagation();
                        closeOverflow();
                        item.action();
                    });
                    overflowDropdown.appendChild(menuItem);
                }
            }

            // Tool buttons visibility (per-tool disabled check)
            const anySimpleEnabled =
                !slice.disabledTools.has("pointer") ||
                !slice.disabledTools.has("hand") ||
                !slice.disabledTools.has("zoom");
            pointerSplitBtn.style.display = anySimpleEnabled ? "flex" : "none";
            annotateBtn.style.display = slice.disabledTools.has("annotate") ? "none" : "";
            markupBtn.style.display = slice.disabledTools.has("markup") ? "none" : "";

            // Tool button active states
            {
                const tool = slice.activeTool;
                // Pointer split button: active when any simple tool is active
                const simpleActive = !isToolSet(tool);
                pointerSplitBtn.classList.toggle("udoc-toolbar__split-btn--active", simpleActive);

                // Update pointer main button icon to reflect the active simple tool
                if (simpleActive) {
                    lastSimpleTool = tool as SimpleTool;
                    const toolDef = SIMPLE_TOOLS.find((t) => t.tool === tool);
                    if (toolDef) {
                        pointerMainBtn.innerHTML = toolDef.icon;
                        pointerMainBtn.title = i18n.t(toolDef.labelKey as keyof typeof i18n.t);
                        pointerMainBtn.setAttribute("aria-label", i18n.t(toolDef.labelKey as keyof typeof i18n.t));
                    }
                }

                // Annotate / Markup toggle
                annotateBtn.classList.toggle("udoc-toolbar__btn--tool-active", tool === "annotate");
                markupBtn.classList.toggle("udoc-toolbar__btn--tool-active", tool === "markup");
            }

            // Center section visibility (show when floating toolbar is hidden)
            const showCenter = slice.toolbarVisible && !slice.floatingToolbarVisible;
            centerSection.style.display = showCenter ? "flex" : "none";

            // Mount view mode menu lazily on first show
            if (showCenter && !viewModeMounted) {
                viewModeMenu.mount(store, i18n);
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

            // Refresh roving tabindex after visibility changes
            rovingTabindex?.refresh();
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
        if (rovingTabindex) rovingTabindex.destroy();
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
