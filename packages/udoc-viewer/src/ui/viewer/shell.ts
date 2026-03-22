import { createStore } from "../framework/store";
import type { Store } from "../framework/store";
import type { ViewerState, PageInfo, ThemeMode, VisibilityGroup } from "./state";
import type { Action } from "./actions";
import type { OutlineItem } from "./navigation";
import type { Annotation } from "./annotation";
import type { TextRun } from "./text";
import { initialState } from "./state";
import { reducer } from "./reducer";
import { createEffects } from "./effects";
import type { WorkerClient } from "../../worker/index.js";
import { createToolbar } from "./components/Toolbar";
import { createLeftPanel } from "./components/LeftPanel";
import { createViewport } from "./components/Viewport";
import { createRightPanel } from "./components/RightPanel";
import { createPasswordDialog } from "./components/PasswordDialog";
import { createPrintDialog } from "./components/PrintDialog";
import type { PrintDialogResult } from "./components/PrintDialog";
import { createLoadingOverlay } from "./components/LoadingOverlay";
import { inlineStyles } from "./styles-inline.js";
import { createLiveRegion } from "./a11y";
import { createI18n } from "./i18n/index.js";

export interface EngineAdapter {
    getPageInfo(doc: { id: string }, page: number): Promise<PageInfo>;
    getOutline(doc: { id: string }): Promise<OutlineItem[]>;
    getPageAnnotations(doc: { id: string }, pageIndex: number): Promise<Annotation[]>;
    getPageText(doc: { id: string }, pageIndex: number): Promise<TextRun[]>;
    getVisibilityGroups(doc: { id: string }): Promise<VisibilityGroup[]>;
    setVisibilityGroupVisible(doc: { id: string }, groupId: string, visible: boolean): Promise<boolean>;
}

export interface ViewerShellCallbacks {
    onPasswordSubmit?: (password: string) => void;
    onDownload?: () => void;
    onPrint?: (options: PrintDialogResult) => void;
}

export interface ViewerShell {
    store: Store<ViewerState, Action>;
    dispatch: (action: Action) => void;
    getState: () => ViewerState;
    setCallbacks: (callbacks: ViewerShellCallbacks) => void;
    destroy: () => void;
}

export type InitialStateOverrides = Partial<Omit<ViewerState, "doc" | "page" | "pageCount">>;

export function mountViewerShell(
    root: HTMLElement,
    engine: EngineAdapter,
    workerClient: WorkerClient,
    overrides?: InitialStateOverrides,
    showAttribution = true,
    locale?: string,
    translations?: Record<string, string>,
): ViewerShell {
    const i18n = createI18n(locale, translations);
    const layout = document.createElement("div");
    layout.className = "udoc-viewer-root";

    // Inject styles into the viewer
    const style = document.createElement("style");
    style.textContent = inlineStyles;
    layout.appendChild(style);

    const toolbarSlot = document.createElement("div");
    toolbarSlot.className = "udoc-slot udoc-toolbar-slot";

    const bodySlot = document.createElement("div");
    bodySlot.className = "udoc-slot udoc-body-slot";

    const leftPanelSlot = document.createElement("div");
    leftPanelSlot.className = "udoc-slot udoc-left-panel-slot";

    const viewportSlot = document.createElement("div");
    viewportSlot.className = "udoc-slot udoc-viewport-slot";

    const rightPanelSlot = document.createElement("div");
    rightPanelSlot.className = "udoc-slot udoc-right-panel-slot";

    // ARIA landmark roles for F6 region navigation
    toolbarSlot.setAttribute("role", "region");
    toolbarSlot.setAttribute("aria-label", i18n.t("shell.regionToolbar"));
    toolbarSlot.setAttribute("tabindex", "-1");

    leftPanelSlot.setAttribute("role", "region");
    leftPanelSlot.setAttribute("aria-label", i18n.t("shell.regionSidePanel"));
    leftPanelSlot.setAttribute("tabindex", "-1");

    viewportSlot.setAttribute("role", "region");
    viewportSlot.setAttribute("aria-label", i18n.t("shell.regionDocument"));
    viewportSlot.setAttribute("tabindex", "-1");

    rightPanelSlot.setAttribute("role", "region");
    rightPanelSlot.setAttribute("aria-label", i18n.t("shell.regionSearchComments"));
    rightPanelSlot.setAttribute("tabindex", "-1");

    // Skip navigation link
    const skipLink = document.createElement("a");
    skipLink.href = "#";
    skipLink.className = "udoc-skip-link";
    skipLink.textContent = i18n.t("shell.skipToDocument");
    skipLink.addEventListener("click", (e) => {
        e.preventDefault();
        const focusTarget = viewportSlot.querySelector<HTMLElement>('[tabindex="0"]') ?? viewportSlot;
        focusTarget.focus();
    });

    // Panel overlay for mobile (closes panels when tapping outside)
    const panelOverlay = document.createElement("div");
    panelOverlay.className = "udoc-panel-overlay";

    bodySlot.append(leftPanelSlot, viewportSlot, rightPanelSlot, panelOverlay);
    layout.append(skipLink, toolbarSlot, bodySlot);
    root.appendChild(layout);

    // Live region for screen reader announcements
    const liveRegion = createLiveRegion();
    layout.appendChild(liveRegion.el);

    // Debounced page announcement to avoid rapid-fire in continuous scroll
    let pageAnnounceTimer: ReturnType<typeof setTimeout> | null = null;
    function announcePageDebounced(page: number, pageCount: number): void {
        if (pageAnnounceTimer) clearTimeout(pageAnnounceTimer);
        pageAnnounceTimer = setTimeout(() => {
            liveRegion.announce(i18n.t("shell.pageOfTotal", { page, pageCount }));
            pageAnnounceTimer = null;
        }, 500);
    }

    // Keyboard shortcut help (screen-reader accessible)
    const shortcutHelp = document.createElement("div");
    shortcutHelp.id = "udoc-shortcut-help";
    shortcutHelp.className = "udoc-sr-only";
    shortcutHelp.textContent = i18n.t("shell.shortcutHelp");
    layout.appendChild(shortcutHelp);
    layout.setAttribute("aria-describedby", "udoc-shortcut-help");

    // Always create fresh mutable collections to prevent sharing across viewers
    const mergedInitialState: ViewerState = {
        ...initialState,
        pageAnnotations: new Map(),
        annotationsLoading: new Set(),
        pageText: new Map(),
        textLoading: new Set(),
        disabledPanels: new Set(),
        ...overrides,
    };

    const store = createStore<ViewerState, Action>(reducer, mergedInitialState, { batched: true });

    const toolbar = createToolbar();
    toolbar.mount(toolbarSlot, store, i18n);

    const leftPanel = createLeftPanel();
    leftPanel.mount(leftPanelSlot, store, workerClient, i18n);

    const viewport = createViewport(showAttribution);
    viewport.mount(viewportSlot, store, workerClient, i18n);

    const rightPanel = createRightPanel();
    rightPanel.mount(rightPanelSlot, store, i18n);

    const effects = createEffects(store, engine);

    // Callbacks that can be set after mounting
    let callbacks: ViewerShellCallbacks = {};

    // Loading overlay (mounted to viewport slot, shows during document download)
    const loadingOverlay = createLoadingOverlay(showAttribution);
    loadingOverlay.mount(layout, store, i18n);

    // Password dialog (mounted to viewport slot so it covers only the viewer area)
    const passwordDialog = createPasswordDialog();
    passwordDialog.mount(viewportSlot, store, i18n, {
        onSubmit: (password: string) => {
            callbacks.onPasswordSubmit?.(password);
        },
    });

    // Handle panel overlay click to close panels (for mobile)
    const handleOverlayClick = () => {
        store.dispatch({ type: "CLOSE_PANEL" });
    };
    panelOverlay.addEventListener("click", handleOverlayClick);

    // Keyboard shortcuts (scoped to viewer — only fires when focus is inside)
    layout.setAttribute("tabindex", "-1");
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+F / Cmd+F to open search panel
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            e.preventDefault();
            const state = store.getState();
            if (state.activePanel !== "search") {
                store.dispatch({ type: "TOGGLE_PANEL", panel: "search" });
            }
        }

        // Zoom in: Ctrl++ or Ctrl+=
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+") && !e.shiftKey) {
            e.preventDefault();
            store.dispatch({ type: "ZOOM_IN" });
        }

        // Zoom out: Ctrl+-
        if ((e.ctrlKey || e.metaKey) && e.key === "-" && !e.shiftKey) {
            e.preventDefault();
            store.dispatch({ type: "ZOOM_OUT" });
        }

        // Reset zoom: Ctrl+0
        if ((e.ctrlKey || e.metaKey) && e.key === "0" && !e.shiftKey) {
            e.preventDefault();
            store.dispatch({ type: "SET_ZOOM", zoom: 1 });
        }

        // Ctrl+P / Cmd+P to open print dialog
        if ((e.ctrlKey || e.metaKey) && e.key === "p") {
            e.preventDefault();
            const state = store.getState();
            if (state.printButtonVisible && !state.showPrintDialog) {
                store.dispatch({ type: "SHOW_PRINT_DIALOG" });
            }
        }

        // F6: cycle focus between regions
        if (e.key === "F6") {
            e.preventDefault();
            const regions = [toolbarSlot, leftPanelSlot, viewportSlot, rightPanelSlot].filter(
                (r) => r.offsetParent !== null,
            );
            if (regions.length === 0) return;
            const currentIndex = regions.findIndex((r) => r.contains(document.activeElement));
            const direction = e.shiftKey ? -1 : 1;
            const nextIndex = (currentIndex + direction + regions.length) % regions.length;
            const target = regions[nextIndex];
            const focusable = target.querySelector<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
            );
            (focusable ?? target).focus();
        }

        // Close panel or print dialog: Escape
        if (e.key === "Escape") {
            const state = store.getState();
            if (state.showPrintDialog) {
                e.preventDefault();
                store.dispatch({ type: "HIDE_PRINT_DIALOG" });
            } else if (state.activePanel !== null) {
                e.preventDefault();
                store.dispatch({ type: "CLOSE_PANEL" });
            }
        }

        // ? key: announce keyboard shortcuts
        if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
            // Don't trigger when typing in an input
            const tag = (document.activeElement as HTMLElement)?.tagName;
            if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                liveRegion.announce(i18n.t("shell.shortcutHelpAnnounce"));
            }
        }
    };
    layout.addEventListener("keydown", handleKeyDown);

    // Theme management
    function resolveIsDark(theme: ThemeMode): boolean {
        if (theme === "dark") return true;
        if (theme === "light") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function applyThemeClass(isDark: boolean): void {
        layout.classList.toggle("udoc-viewer-dark", isDark);
    }

    let systemDarkQuery: MediaQueryList | null = null;
    let systemDarkHandler: ((e: MediaQueryListEvent) => void) | null = null;

    function setupSystemListener(): void {
        systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
        systemDarkHandler = (e) => applyThemeClass(e.matches);
        systemDarkQuery.addEventListener("change", systemDarkHandler);
    }

    function cleanupSystemListener(): void {
        if (systemDarkQuery && systemDarkHandler) {
            systemDarkQuery.removeEventListener("change", systemDarkHandler);
            systemDarkQuery = null;
            systemDarkHandler = null;
        }
    }

    // Apply initial theme
    applyThemeClass(resolveIsDark(mergedInitialState.theme));
    if (mergedInitialState.theme === "system") {
        setupSystemListener();
    }

    // Subscribe to panel state to toggle udoc-panel-open class,
    // toolbar slot visibility, theme changes, and live region announcements
    const unsubPanelClass = store.subscribeRender((prev, next) => {
        if ((prev.activePanel === null) !== (next.activePanel === null)) {
            layout.classList.toggle("udoc-panel-open", next.activePanel !== null);
        }
        if (prev.toolbarVisible !== next.toolbarVisible) {
            toolbarSlot.style.display = next.toolbarVisible ? "" : "none";
        }
        if (prev.theme !== next.theme) {
            if (prev.theme === "system") cleanupSystemListener();
            if (next.theme === "system") setupSystemListener();
            applyThemeClass(resolveIsDark(next.theme));
        }
        if (prev.textSelectionDisabled !== next.textSelectionDisabled) {
            layout.classList.toggle("udoc-viewer--no-text-select", next.textSelectionDisabled);
        }
        // Re-enable panel transitions after one frame so future open/close animates normally
        if (next.panelTransitionsDisabled && !prev.panelTransitionsDisabled) {
            requestAnimationFrame(() => {
                store.dispatch({ type: "ENABLE_PANEL_TRANSITIONS" });
            });
        }

        // --- Live region announcements for screen readers ---
        if (prev.page !== next.page && next.pageCount > 0) {
            announcePageDebounced(next.page, next.pageCount);
        } else if (prev.zoom !== next.zoom) {
            liveRegion.announce(i18n.t("shell.zoomPercent", { percent: Math.round(next.zoom * 100) }));
        } else if (prev.activePanel !== next.activePanel) {
            if (next.activePanel !== null) {
                liveRegion.announce(i18n.t("shell.panelOpened", { panel: next.activePanel }));
            } else {
                liveRegion.announce(i18n.t("shell.panelClosed"));
            }
        }
    });

    // Apply initial toolbar visibility
    if (!mergedInitialState.toolbarVisible) {
        toolbarSlot.style.display = "none";
    }

    // Apply initial text selection state
    if (mergedInitialState.textSelectionDisabled) {
        layout.classList.add("udoc-viewer--no-text-select");
    }

    store.dispatch({ type: "__INIT__" });

    // Print dialog (mounted to layout root so it covers toolbar + viewport)
    const printDialog = createPrintDialog();
    printDialog.mount(layout, store, i18n, {
        onPrint: (result: PrintDialogResult) => {
            store.dispatch({ type: "HIDE_PRINT_DIALOG" });
            callbacks.onPrint?.(result);
        },
        onCancel: () => {
            store.dispatch({ type: "HIDE_PRINT_DIALOG" });
        },
    });

    function setCallbacks(newCallbacks: ViewerShellCallbacks): void {
        callbacks = { ...callbacks, ...newCallbacks };
        toolbar.setOnDownload(callbacks.onDownload ?? null);
        toolbar.setOnPrint(() => {
            store.dispatch({ type: "SHOW_PRINT_DIALOG" });
        });
    }

    function destroy(): void {
        cleanupSystemListener();
        if (pageAnnounceTimer) clearTimeout(pageAnnounceTimer);
        liveRegion.destroy();
        layout.removeEventListener("keydown", handleKeyDown);
        panelOverlay.removeEventListener("click", handleOverlayClick);
        unsubPanelClass();
        effects.destroy();
        toolbar.destroy();
        leftPanel.destroy();
        viewport.destroy();
        rightPanel.destroy();
        loadingOverlay.destroy();
        passwordDialog.destroy();
        printDialog.destroy();
        layout.remove();
    }

    return {
        store,
        dispatch: store.dispatch,
        getState: store.getState,
        setCallbacks,
        destroy,
    };
}
