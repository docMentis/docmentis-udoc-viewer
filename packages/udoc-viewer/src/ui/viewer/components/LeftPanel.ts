import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import type { ViewerState, LeftPanelTab, PanelTab } from "../state";
import { isLeftPanelTab } from "../state";
import type { Action } from "../actions";
import type { WorkerClient } from "../../../worker/index.js";
import { ICON_THUMBNAIL, ICON_OUTLINE, ICON_BOOKMARK, ICON_LAYERS, ICON_ATTACHMENT } from "../icons";
import { createThumbnailPanel, type ThumbnailPanelComponent } from "./ThumbnailPanel";
import { createOutlinePanel, type OutlinePanelComponent } from "./OutlinePanel";
import { createLayersPanel, type LayersPanelComponent } from "./LayersPanel";

interface TabConfig {
    id: LeftPanelTab;
    label: string;
    icon: string;
}

const TABS: TabConfig[] = [
    { id: "thumbnail", label: "Thumbnails", icon: ICON_THUMBNAIL },
    { id: "outline", label: "Outline", icon: ICON_OUTLINE },
    { id: "bookmarks", label: "Bookmarks", icon: ICON_BOOKMARK },
    { id: "layers", label: "Layers", icon: ICON_LAYERS },
    { id: "attachments", label: "Attachments", icon: ICON_ATTACHMENT },
];

type LeftPanelSlice = {
    open: boolean;
    activeTab: LeftPanelTab | null;
    width: number | null;
    panelVisible: boolean;
    disabledPanels: ReadonlySet<PanelTab>;
    allDisabled: boolean;
    noTransition: boolean;
};

export function createLeftPanel() {
    const el = document.createElement("div");
    el.className = "udoc-left-panel";

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "udoc-left-panel__tabs";
    tabBar.setAttribute("role", "tablist");
    tabBar.setAttribute("aria-label", "Panel tabs");

    const tabButtons = new Map<LeftPanelTab, HTMLButtonElement>();
    for (const tab of TABS) {
        const btn = document.createElement("button");
        btn.className = "udoc-left-panel__tab";
        btn.id = `udoc-left-tab-${tab.id}`;
        btn.setAttribute("aria-label", tab.label);
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute("aria-controls", "udoc-left-panel-content");
        btn.setAttribute("data-tab", tab.id);
        btn.innerHTML = tab.icon;
        tabButtons.set(tab.id, btn);
        tabBar.appendChild(btn);
    }

    // Content area
    const content = document.createElement("div");
    content.className = "udoc-left-panel__content";
    content.id = "udoc-left-panel-content";
    content.setAttribute("role", "tabpanel");

    // Resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "udoc-left-panel__resize-handle";
    resizeHandle.setAttribute("role", "separator");
    resizeHandle.setAttribute("aria-orientation", "vertical");
    resizeHandle.setAttribute("aria-label", "Resize side panel");
    resizeHandle.setAttribute("tabindex", "0");
    resizeHandle.setAttribute("aria-valuenow", "280");
    resizeHandle.setAttribute("aria-valuemin", "200");
    resizeHandle.setAttribute("aria-valuemax", "500");

    el.append(tabBar, content, resizeHandle);

    let unsubRender: (() => void) | null = null;
    let unsubContent: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];

    // Panel content components
    let thumbnailPanel: ThumbnailPanelComponent | null = null;
    let outlinePanel: OutlinePanelComponent | null = null;
    let layersPanel: LayersPanelComponent | null = null;
    let storeRef: Store<ViewerState, Action> | null = null;
    let workerClientRef: WorkerClient | null = null;

    function applyState(slice: LeftPanelSlice): void {
        // Hide entire panel area if disabled or all left tabs are disabled
        el.style.display = !slice.panelVisible || slice.allDisabled ? "none" : "";

        // Suppress transition when loading a new document
        el.style.transition = slice.noTransition ? "none" : "";

        el.classList.toggle("udoc-left-panel--closed", !slice.open);

        // Apply width from state (only when open)
        if (slice.open && slice.width !== null) {
            el.style.width = `${slice.width}px`;
        } else {
            el.style.width = "";
        }

        for (const [tabId, btn] of tabButtons) {
            const isActive = tabId === slice.activeTab;
            btn.classList.toggle("udoc-left-panel__tab--active", isActive);
            btn.setAttribute("aria-selected", String(isActive));
            // Hide individual tab buttons that are disabled
            btn.style.display = slice.disabledPanels.has(tabId) ? "none" : "";
        }

        // Link tabpanel to active tab
        if (slice.activeTab) {
            content.setAttribute("aria-labelledby", `udoc-left-tab-${slice.activeTab}`);
        } else {
            content.removeAttribute("aria-labelledby");
        }
    }

    function applyContent(activeTab: LeftPanelTab | null): void {
        // Destroy previous content
        if (thumbnailPanel) {
            thumbnailPanel.destroy();
            thumbnailPanel = null;
        }
        if (outlinePanel) {
            outlinePanel.destroy();
            outlinePanel = null;
        }
        if (layersPanel) {
            layersPanel.destroy();
            layersPanel = null;
        }

        // Mount new content based on active tab
        if (activeTab === "thumbnail" && storeRef && workerClientRef) {
            thumbnailPanel = createThumbnailPanel();
            thumbnailPanel.mount(content, storeRef, workerClientRef);
        } else if (activeTab === "outline" && storeRef) {
            outlinePanel = createOutlinePanel();
            outlinePanel.mount(content, storeRef);
        } else if (activeTab === "layers" && storeRef && workerClientRef) {
            layersPanel = createLayersPanel();
            layersPanel.mount(content, storeRef, workerClientRef);
        }
    }

    function setupResize(): void {
        let startX = 0;
        let startWidth = 0;

        const onPointerMove = (e: PointerEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(500, startWidth + delta));
            el.style.width = `${newWidth}px`;
        };

        const onPointerUp = () => {
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            el.classList.remove("udoc-left-panel--resizing");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            // Persist width to state
            if (storeRef) {
                const finalWidth = el.offsetWidth;
                storeRef.dispatch({ type: "SET_LEFT_PANEL_WIDTH", width: finalWidth });
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = el.offsetWidth;
            el.classList.add("udoc-left-panel--resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("pointermove", onPointerMove);
            document.addEventListener("pointerup", onPointerUp);
        };

        resizeHandle.addEventListener("pointerdown", onPointerDown);
        unsubEvents.push(() => resizeHandle.removeEventListener("pointerdown", onPointerDown));

        // Keyboard resize: arrow keys
        const RESIZE_STEP = 20;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const currentWidth = el.offsetWidth;
            const delta = e.key === "ArrowRight" ? RESIZE_STEP : -RESIZE_STEP;
            const newWidth = Math.max(200, Math.min(500, currentWidth + delta));
            el.style.width = `${newWidth}px`;
            resizeHandle.setAttribute("aria-valuenow", String(newWidth));
            if (storeRef) {
                storeRef.dispatch({ type: "SET_LEFT_PANEL_WIDTH", width: newWidth });
            }
        };
        resizeHandle.addEventListener("keydown", onKeyDown);
        unsubEvents.push(() => resizeHandle.removeEventListener("keydown", onKeyDown));
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, workerClient: WorkerClient): void {
        container.appendChild(el);
        storeRef = store;
        workerClientRef = workerClient;

        // Tab click handlers
        for (const [tabId, btn] of tabButtons) {
            const onClick = () => {
                store.dispatch({ type: "TOGGLE_PANEL", panel: tabId });
            };
            btn.addEventListener("click", onClick);
            unsubEvents.push(() => btn.removeEventListener("click", onClick));
        }

        // Setup resize handle
        setupResize();

        // Subscribe to state changes for panel open/close
        const initialSlice = selectLeftPanel(store.getState());
        applyState(initialSlice);
        unsubRender = subscribeSelector(store, selectLeftPanel, applyState, {
            equality: (a, b) =>
                a.open === b.open &&
                a.activeTab === b.activeTab &&
                a.width === b.width &&
                a.panelVisible === b.panelVisible &&
                a.disabledPanels === b.disabledPanels &&
                a.allDisabled === b.allDisabled &&
                a.noTransition === b.noTransition,
        });

        // Subscribe to active tab changes for content
        applyContent(initialSlice.activeTab);
        unsubContent = subscribeSelector(store, (state) => selectLeftPanel(state).activeTab, applyContent);
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        if (unsubContent) unsubContent();
        for (const off of unsubEvents) off();

        if (thumbnailPanel) {
            thumbnailPanel.destroy();
            thumbnailPanel = null;
        }
        if (outlinePanel) {
            outlinePanel.destroy();
            outlinePanel = null;
        }
        if (layersPanel) {
            layersPanel.destroy();
            layersPanel = null;
        }

        storeRef = null;
        workerClientRef = null;
        el.remove();
    }

    return { el, mount, destroy };
}

function selectLeftPanel(state: ViewerState): LeftPanelSlice {
    const panel = state.activePanel;
    const isLeftTab = panel !== null && isLeftPanelTab(panel);
    const allDisabled = TABS.every((tab) => state.disabledPanels.has(tab.id));
    return {
        open: isLeftTab,
        activeTab: isLeftTab ? panel : null,
        width: state.leftPanelWidth,
        panelVisible: state.leftPanelVisible,
        disabledPanels: state.disabledPanels,
        allDisabled,
        noTransition: state.panelTransitionsDisabled,
    };
}
