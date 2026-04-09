/**
 * ViewToolController — handles pointer, hand (pan), and zoom tool interactions.
 *
 * Attaches to the viewport scroll area and manages cursor styles and
 * mouse/pointer events based on the currently active tool.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";

export interface ViewToolControllerOptions {
    /** The scroll container element (overflow: auto) */
    scrollArea: HTMLElement;
    /** The viewer root element (for applying cursor classes) */
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

/** CSS class applied to viewer root for each tool cursor */
const CURSOR_CLASSES: Record<string, string> = {
    pointer: "",
    hand: "udoc-viewer--tool-hand",
    zoom: "udoc-viewer--tool-zoom",
};

const HAND_GRABBING_CLASS = "udoc-viewer--tool-hand-grabbing";

export function createViewToolController(options: ViewToolControllerOptions) {
    const { scrollArea, viewerRoot, store } = options;

    let currentTool: string = "pointer";
    let cleanupFn: (() => void) | null = null;

    // --- Hand tool (drag to pan) ---

    function attachHandTool(): () => void {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startScrollLeft = 0;
        let startScrollTop = 0;

        const onPointerDown = (e: PointerEvent) => {
            // Only primary button
            if (e.button !== 0) return;
            // Don't interfere with interactive elements
            const target = e.target as HTMLElement;
            if (target.closest("a, button, input, [role=button]")) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startScrollLeft = scrollArea.scrollLeft;
            startScrollTop = scrollArea.scrollTop;

            viewerRoot.classList.add(HAND_GRABBING_CLASS);
            scrollArea.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            scrollArea.scrollLeft = startScrollLeft - dx;
            scrollArea.scrollTop = startScrollTop - dy;
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!isDragging) return;
            isDragging = false;
            viewerRoot.classList.remove(HAND_GRABBING_CLASS);
            scrollArea.releasePointerCapture(e.pointerId);
        };

        scrollArea.addEventListener("pointerdown", onPointerDown);
        scrollArea.addEventListener("pointermove", onPointerMove);
        scrollArea.addEventListener("pointerup", onPointerUp);
        scrollArea.addEventListener("pointercancel", onPointerUp);

        return () => {
            scrollArea.removeEventListener("pointerdown", onPointerDown);
            scrollArea.removeEventListener("pointermove", onPointerMove);
            scrollArea.removeEventListener("pointerup", onPointerUp);
            scrollArea.removeEventListener("pointercancel", onPointerUp);
            viewerRoot.classList.remove(HAND_GRABBING_CLASS);
        };
    }

    // --- Zoom tool (click to zoom in, alt+click to zoom out) ---

    function attachZoomTool(): () => void {
        const ZOOM_OUT_CLASS = "udoc-viewer--tool-zoom-out";

        const updateZoomCursor = (e: KeyboardEvent | MouseEvent) => {
            const out = e.altKey || e.shiftKey;
            viewerRoot.classList.toggle(ZOOM_OUT_CLASS, out);
        };

        const onKeyDown = (e: KeyboardEvent) => updateZoomCursor(e);
        const onKeyUp = (e: KeyboardEvent) => updateZoomCursor(e);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        const onClick = (e: MouseEvent) => {
            // Don't interfere with interactive elements
            const target = e.target as HTMLElement;
            if (target.closest("a, button, input, [role=button]")) return;

            const rect = scrollArea.getBoundingClientRect();

            // Viewport-relative click position (0-1 range)
            const viewX = (e.clientX - rect.left) / rect.width;
            const viewY = (e.clientY - rect.top) / rect.height;

            // Anchor data so the Viewport can scroll to keep the click point stable
            const anchor = {
                viewX,
                viewY,
                scrollLeft: scrollArea.scrollLeft,
                scrollTop: scrollArea.scrollTop,
                scrollWidth: scrollArea.scrollWidth,
                scrollHeight: scrollArea.scrollHeight,
            };

            // Alt/Shift+click = zoom out, normal click = zoom in
            if (e.altKey || e.shiftKey) {
                store.dispatch({ type: "ZOOM_OUT", anchor });
            } else {
                store.dispatch({ type: "ZOOM_IN", anchor });
            }
        };

        scrollArea.addEventListener("click", onClick);

        return () => {
            scrollArea.removeEventListener("click", onClick);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
            viewerRoot.classList.remove(ZOOM_OUT_CLASS);
        };
    }

    // --- Cursor and tool switching ---

    function setCursorClass(tool: string): void {
        // Remove all tool cursor classes
        for (const cls of Object.values(CURSOR_CLASSES)) {
            if (cls) viewerRoot.classList.remove(cls);
        }
        viewerRoot.classList.remove(HAND_GRABBING_CLASS);

        // Add new one
        const cls = CURSOR_CLASSES[tool];
        if (cls) viewerRoot.classList.add(cls);
    }

    function switchTool(tool: string): void {
        if (tool === currentTool) return;

        // Teardown previous tool
        if (cleanupFn) {
            cleanupFn();
            cleanupFn = null;
        }

        currentTool = tool;
        setCursorClass(tool);

        // Setup new tool
        switch (tool) {
            case "hand":
                cleanupFn = attachHandTool();
                break;
            case "zoom":
                cleanupFn = attachZoomTool();
                break;
            // "pointer" — default behavior, no extra handlers needed
        }
    }

    // Subscribe to tool state changes
    let prevTool: string = store.getState().activeTool;
    const unsub = store.subscribeRender((_prev, next) => {
        const tool = next.activeTool;
        if (tool !== prevTool) {
            prevTool = tool;
            // Only handle view tools; tool sets don't affect viewport interaction
            if (tool === "pointer" || tool === "hand" || tool === "zoom") {
                switchTool(tool);
            } else {
                // For annotation/markup tool sets, revert to pointer behavior
                switchTool("pointer");
            }
        }
    });

    // Apply initial state
    const initial = store.getState().activeTool;
    if (initial === "hand" || initial === "zoom") {
        switchTool(initial);
    }

    function destroy(): void {
        unsub();
        if (cleanupFn) {
            cleanupFn();
            cleanupFn = null;
        }
        setCursorClass("pointer");
    }

    return { destroy };
}
