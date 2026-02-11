import { createStore } from "../framework/store";
import type { Store } from "../framework/store";
import type { ViewerState, PageInfo } from "./state";
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
import { createLoadingOverlay } from "./components/LoadingOverlay";
import { inlineStyles } from "./styles-inline.js";

export interface EngineAdapter {
    getPageInfo(doc: { id: string }, page: number): Promise<PageInfo>;
    getOutline(doc: { id: string }): Promise<OutlineItem[]>;
    getPageAnnotations(doc: { id: string }, pageIndex: number): Promise<Annotation[]>;
    getPageText(doc: { id: string }, pageIndex: number): Promise<TextRun[]>;
}

export interface ViewerShellCallbacks {
    onPasswordSubmit?: (password: string) => void;
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
    overrides?: InitialStateOverrides
): ViewerShell {
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

    // Panel overlay for mobile (closes panels when tapping outside)
    const panelOverlay = document.createElement("div");
    panelOverlay.className = "udoc-panel-overlay";

    bodySlot.append(leftPanelSlot, viewportSlot, rightPanelSlot, panelOverlay);
    layout.append(toolbarSlot, bodySlot);
    root.appendChild(layout);

    const mergedInitialState: ViewerState = overrides
        ? { ...initialState, ...overrides }
        : initialState;

    const store = createStore<ViewerState, Action>(reducer, mergedInitialState, { batched: true });

    const toolbar = createToolbar();
    toolbar.mount(toolbarSlot, store);

    const leftPanel = createLeftPanel();
    leftPanel.mount(leftPanelSlot, store, workerClient);

    const viewport = createViewport();
    viewport.mount(viewportSlot, store, workerClient);

    const rightPanel = createRightPanel();
    rightPanel.mount(rightPanelSlot, store);

    const effects = createEffects(store, engine);

    // Callbacks that can be set after mounting
    let callbacks: ViewerShellCallbacks = {};

    // Loading overlay (mounted to viewport slot, shows during document download)
    const loadingOverlay = createLoadingOverlay();
    loadingOverlay.mount(viewportSlot, store);

    // Password dialog (mounted to viewport slot so it covers only the viewer area)
    const passwordDialog = createPasswordDialog();
    passwordDialog.mount(viewportSlot, store, {
        onSubmit: (password: string) => {
            callbacks.onPasswordSubmit?.(password);
        }
    });

    // Handle panel overlay click to close panels (for mobile)
    panelOverlay.addEventListener("click", () => {
        store.dispatch({ type: "CLOSE_PANEL" });
    });

    // Subscribe to panel state to toggle udoc-panel-open class
    const unsubPanelClass = store.subscribeRender((prev, next) => {
        if ((prev.activePanel === null) !== (next.activePanel === null)) {
            layout.classList.toggle("udoc-panel-open", next.activePanel !== null);
        }
    });

    store.dispatch({ type: "__INIT__" });

    function setCallbacks(newCallbacks: ViewerShellCallbacks): void {
        callbacks = { ...callbacks, ...newCallbacks };
    }

    function destroy(): void {
        unsubPanelClass();
        effects.destroy();
        toolbar.destroy();
        leftPanel.destroy();
        viewport.destroy();
        rightPanel.destroy();
        loadingOverlay.destroy();
        passwordDialog.destroy();
        layout.remove();
    }

    return {
        store,
        dispatch: store.dispatch,
        getState: store.getState,
        setCallbacks,
        destroy
    };
}
