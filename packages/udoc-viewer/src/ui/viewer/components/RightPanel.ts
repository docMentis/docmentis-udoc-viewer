import type { Store } from "../../framework/store";
import { subscribeSelector, shallowEqual } from "../../framework/selectors";
import type { ViewerState, RightPanelTab } from "../state";
import { isLeftPanelTab } from "../state";
import type { Action } from "../actions";
import { createAnnotationPanel } from "./AnnotationPanel";

type RightPanelSlice = {
    open: boolean;
    activeTab: RightPanelTab | null;
    width: number | null;
};

export function createRightPanel() {
    const el = document.createElement("div");
    el.className = "udoc-right-panel";

    // Resize handle (on left edge for right panel)
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "udoc-right-panel__resize-handle";

    // Content area (search or comments)
    const content = document.createElement("div");
    content.className = "udoc-right-panel__content";

    el.append(resizeHandle, content);

    // Child components
    const annotationPanel = createAnnotationPanel();

    let unsubRender: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];
    let storeRef: Store<ViewerState, Action> | null = null;

    function applyState(slice: RightPanelSlice): void {
        el.classList.toggle("udoc-right-panel--closed", !slice.open);

        // Apply width from state (only when open)
        if (slice.open && slice.width !== null) {
            el.style.width = `${slice.width}px`;
        } else {
            el.style.width = "";
        }

        if (slice.activeTab) {
            content.setAttribute("data-tab", slice.activeTab);
        } else {
            content.removeAttribute("data-tab");
        }
    }

    function setupResize(): void {
        let startX = 0;
        let startWidth = 0;

        const onPointerMove = (e: PointerEvent) => {
            // For right panel, dragging left increases width
            const delta = startX - e.clientX;
            const newWidth = Math.max(200, Math.min(500, startWidth + delta));
            el.style.width = `${newWidth}px`;
        };

        const onPointerUp = () => {
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            el.classList.remove("udoc-right-panel--resizing");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            // Persist width to state
            if (storeRef) {
                const finalWidth = el.offsetWidth;
                storeRef.dispatch({ type: "SET_RIGHT_PANEL_WIDTH", width: finalWidth });
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = el.offsetWidth;
            el.classList.add("udoc-right-panel--resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("pointermove", onPointerMove);
            document.addEventListener("pointerup", onPointerUp);
        };

        resizeHandle.addEventListener("pointerdown", onPointerDown);
        unsubEvents.push(() => resizeHandle.removeEventListener("pointerdown", onPointerDown));
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(el);
        storeRef = store;

        // Setup resize handle
        setupResize();

        // Mount annotation panel
        annotationPanel.mount(content, store);

        // Subscribe to state changes
        applyState(selectRightPanel(store.getState()));
        unsubRender = subscribeSelector(store, selectRightPanel, applyState, {
            equality: shallowEqual
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        annotationPanel.destroy();
        storeRef = null;
        el.remove();
    }

    return { el, mount, destroy };
}

function selectRightPanel(state: ViewerState): RightPanelSlice {
    const panel = state.activePanel;
    const isRightTab = panel !== null && !isLeftPanelTab(panel);
    return {
        open: isRightTab,
        activeTab: isRightTab ? panel : null,
        width: state.rightPanelWidth
    };
}
