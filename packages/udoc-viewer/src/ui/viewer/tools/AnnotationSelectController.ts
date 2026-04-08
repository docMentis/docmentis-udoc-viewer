/**
 * AnnotationSelectController — handles annotation selection, move, resize, and deletion.
 *
 * When the "select" sub-tool is active (in either annotate or markup tool sets):
 * - Clicking an annotation selects it, showing a bounding box with resize handles.
 * - Dragging the bounding box moves the annotation.
 * - Dragging a resize handle resizes the annotation.
 * - Pressing Delete/Backspace removes the selected annotation.
 * - Clicking empty space deselects.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import { getPointsToPixels, isToolSet, ANNOTATION_FORMATS } from "../state";
import type { Action } from "../actions";
import { offsetAnnotation, resizeAnnotation } from "../annotation/utils";
import type { Rect } from "../annotation/types";

export interface AnnotationSelectControllerOptions {
    scrollArea: HTMLElement;
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

const SELECT_CURSOR_CLASS = "udoc-viewer--tool-select";
const MOVING_CLASS = "udoc-viewer--annotation-moving";
const RESIZING_CLASS = "udoc-viewer--annotation-resizing";
const BBOX_CLASS = "udoc-annotation-select-bbox";

/** Handle positions: 4 corners + 4 edge midpoints */
type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_POSITIONS: HandlePosition[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSORS: Record<HandlePosition, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
};

export function createAnnotationSelectController(options: AnnotationSelectControllerOptions) {
    const { scrollArea, viewerRoot, store } = options;

    let active = false;
    let bboxEl: HTMLDivElement | null = null;
    let innerEl: HTMLDivElement | null = null;

    // --- Drag state (shared by move & resize) ---
    type DragMode = "move" | "resize";
    let isDragging = false;
    let dragMode: DragMode = "move";
    let dragScale = 1;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragDx = 0;
    let dragDy = 0;
    let dragAnnotationPageIndex = -1;
    let dragAnnotationIndex = -1;
    /** Original bounds at drag start (for resize) */
    let dragOriginalBounds: Rect = { x: 0, y: 0, width: 0, height: 0 };
    /** Which handle is being dragged (for resize) */
    let dragHandle: HandlePosition = "se";

    // =========================================================================
    // Bounding box with handles
    // =========================================================================

    function removeBbox(): void {
        if (bboxEl) {
            bboxEl.remove();
            bboxEl = null;
            innerEl = null;
        }
    }

    function updateSelectionVisual(): void {
        removeBbox();

        const state = store.getState();
        const sel = state.selectedAnnotation;
        if (!sel) return;

        const annotations = state.pageAnnotations.get(sel.pageIndex);
        if (!annotations || sel.annotationIndex >= annotations.length) return;
        const annotation = annotations[sel.annotationIndex];
        const bounds = annotation.bounds;
        if (!bounds || (bounds.width === 0 && bounds.height === 0)) return;

        const pageNum = sel.pageIndex + 1;
        const slot = scrollArea.querySelector<HTMLElement>(`[data-page="${pageNum}"]`);
        if (!slot) return;
        const annotationLayer = slot.querySelector<HTMLElement>(".udoc-spread__annotation-layer");
        if (!annotationLayer) return;

        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;
        const scale = pointsToPixels * zoom;

        // Outer wrapper — copies annotation layer positioning
        bboxEl = document.createElement("div");
        bboxEl.className = BBOX_CLASS;
        bboxEl.style.position = "absolute";
        bboxEl.style.width = annotationLayer.style.width;
        bboxEl.style.height = annotationLayer.style.height;
        bboxEl.style.left = annotationLayer.style.left;
        bboxEl.style.top = annotationLayer.style.top;
        bboxEl.style.transform = annotationLayer.style.transform;
        bboxEl.style.transformOrigin = "center";

        // Inner — the actual bounding rectangle
        innerEl = document.createElement("div");
        innerEl.className = BBOX_CLASS + "__inner";
        innerEl.style.position = "absolute";
        innerEl.style.left = `${bounds.x * scale}px`;
        innerEl.style.top = `${bounds.y * scale}px`;
        innerEl.style.width = `${bounds.width * scale}px`;
        innerEl.style.height = `${bounds.height * scale}px`;

        // Resize handles
        for (const pos of HANDLE_POSITIONS) {
            const handle = document.createElement("div");
            handle.className = `${BBOX_CLASS}__handle ${BBOX_CLASS}__handle--${pos}`;
            handle.style.cursor = HANDLE_CURSORS[pos];
            handle.dataset.handle = pos;
            innerEl.appendChild(handle);
        }

        bboxEl.appendChild(innerEl);
        slot.appendChild(bboxEl);
    }

    /** Update inner element position/size during drag preview. */
    function updateInnerPreview(bounds: Rect, newBounds: Rect): void {
        if (!innerEl) return;
        innerEl.style.left = `${newBounds.x * dragScale}px`;
        innerEl.style.top = `${newBounds.y * dragScale}px`;
        innerEl.style.width = `${newBounds.width * dragScale}px`;
        innerEl.style.height = `${newBounds.height * dragScale}px`;
    }

    // =========================================================================
    // Resize bounds computation
    // =========================================================================

    /** Compute new bounds from dragging a resize handle. */
    function computeResizedBounds(original: Rect, handle: HandlePosition, dx: number, dy: number): Rect {
        let { x, y, width, height } = original;

        // Adjust edges based on handle
        if (handle.includes("w")) {
            x += dx;
            width -= dx;
        }
        if (handle.includes("e") || handle === "e") {
            width += dx;
        }
        if (handle.includes("n") && handle !== "ne" && handle !== "nw") {
            // "n" only
            y += dy;
            height -= dy;
        }
        if (handle === "nw" || handle === "n" || handle === "ne") {
            y += dy;
            height -= dy;
        }
        if (handle === "sw" || handle === "s" || handle === "se") {
            height += dy;
        }

        // Enforce minimum size and flip if dragged past opposite edge
        const MIN = 2;
        if (width < MIN) {
            x = x + width - MIN;
            width = MIN;
        }
        if (height < MIN) {
            y = y + height - MIN;
            height = MIN;
        }

        return { x, y, width, height };
    }

    // =========================================================================
    // Pointer events
    // =========================================================================

    function onPointerDown(e: PointerEvent): void {
        if (e.button !== 0) return;

        const target = e.target as Element;

        // Check if clicking a resize handle
        const handleEl = target.closest<HTMLElement>(`[data-handle]`);
        if (handleEl && bboxEl?.contains(handleEl)) {
            const sel = store.getState().selectedAnnotation;
            if (sel) {
                const slotEl = bboxEl.closest<HTMLElement>("[data-page]");
                if (slotEl) {
                    startDrag(
                        e,
                        sel.pageIndex,
                        sel.annotationIndex,
                        "resize",
                        handleEl.dataset.handle as HandlePosition,
                    );
                    return;
                }
            }
        }

        // Check if clicking on an annotation
        const annotationEl = target.closest("[data-annotation-index]");
        if (annotationEl) {
            const slotEl = annotationEl.closest<HTMLElement>("[data-page]");
            if (!slotEl) return;

            const pageNum = parseInt(slotEl.dataset.page!, 10);
            if (isNaN(pageNum)) return;
            const annotationIndex = parseInt(annotationEl.getAttribute("data-annotation-index")!, 10);
            if (isNaN(annotationIndex)) return;

            const pageIndex = pageNum - 1;
            const sel = store.getState().selectedAnnotation;

            if (sel && sel.pageIndex === pageIndex && sel.annotationIndex === annotationIndex) {
                startDrag(e, pageIndex, annotationIndex, "move");
                return;
            }

            store.dispatch({ type: "SELECT_ANNOTATION", pageIndex, annotationIndex });
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Check if clicking on the bbox inner (for move)
        if (innerEl && (target === innerEl || innerEl.contains(target as Node))) {
            const sel = store.getState().selectedAnnotation;
            if (sel) {
                startDrag(e, sel.pageIndex, sel.annotationIndex, "move");
                return;
            }
        }

        // Clicked outside — deselect
        store.dispatch({ type: "DESELECT_ANNOTATION" });
    }

    function startDrag(
        e: PointerEvent,
        pageIndex: number,
        annotationIndex: number,
        mode: DragMode,
        handle?: HandlePosition,
    ): void {
        const state = store.getState();
        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;

        const annotations = state.pageAnnotations.get(pageIndex);
        if (!annotations || annotationIndex >= annotations.length) return;

        isDragging = true;
        dragMode = mode;
        dragScale = pointsToPixels * zoom;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragDx = 0;
        dragDy = 0;
        dragAnnotationPageIndex = pageIndex;
        dragAnnotationIndex = annotationIndex;
        dragOriginalBounds = { ...annotations[annotationIndex].bounds };
        dragHandle = handle ?? "se";

        viewerRoot.classList.add(mode === "move" ? MOVING_CLASS : RESIZING_CLASS);
        if (mode === "resize") {
            viewerRoot.style.cursor = HANDLE_CURSORS[dragHandle];
        }
        scrollArea.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
    }

    function onPointerMove(e: PointerEvent): void {
        if (!isDragging) return;

        const pxDx = e.clientX - dragStartX;
        const pxDy = e.clientY - dragStartY;
        dragDx = pxDx / dragScale;
        dragDy = pxDy / dragScale;

        if (dragMode === "move") {
            if (innerEl) {
                const b = dragOriginalBounds;
                updateInnerPreview(b, { x: b.x + dragDx, y: b.y + dragDy, width: b.width, height: b.height });
            }
        } else {
            // Resize preview
            const newBounds = computeResizedBounds(dragOriginalBounds, dragHandle, dragDx, dragDy);
            updateInnerPreview(dragOriginalBounds, newBounds);
        }
    }

    function onPointerUp(e: PointerEvent): void {
        if (!isDragging) return;

        scrollArea.releasePointerCapture(e.pointerId);
        viewerRoot.classList.remove(MOVING_CLASS);
        viewerRoot.classList.remove(RESIZING_CLASS);
        viewerRoot.style.cursor = "";
        isDragging = false;

        // Check for meaningful movement
        if (Math.abs(dragDx) < 0.5 && Math.abs(dragDy) < 0.5) {
            updateSelectionVisual();
            return;
        }

        const state = store.getState();
        const annotations = state.pageAnnotations.get(dragAnnotationPageIndex);
        if (!annotations || dragAnnotationIndex >= annotations.length) return;

        const original = annotations[dragAnnotationIndex];
        let updated;

        if (dragMode === "move") {
            updated = offsetAnnotation(original, dragDx, dragDy);
        } else {
            const newBounds = computeResizedBounds(dragOriginalBounds, dragHandle, dragDx, dragDy);
            updated = resizeAnnotation(original, newBounds);
        }

        store.dispatch({
            type: "UPDATE_ANNOTATION",
            pageIndex: dragAnnotationPageIndex,
            annotationIndex: dragAnnotationIndex,
            annotation: updated,
        });
    }

    function onPointerCancel(e: PointerEvent): void {
        if (!isDragging) return;

        scrollArea.releasePointerCapture(e.pointerId);
        viewerRoot.classList.remove(MOVING_CLASS);
        viewerRoot.classList.remove(RESIZING_CLASS);
        viewerRoot.style.cursor = "";
        isDragging = false;
        updateSelectionVisual();
    }

    // =========================================================================
    // Keyboard
    // =========================================================================

    function onKeyDown(e: KeyboardEvent): void {
        if (e.key !== "Delete" && e.key !== "Backspace") return;

        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        const sel = store.getState().selectedAnnotation;
        if (!sel) return;

        store.dispatch({ type: "REMOVE_ANNOTATION", pageIndex: sel.pageIndex, annotationIndex: sel.annotationIndex });
        e.preventDefault();
    }

    // =========================================================================
    // Activate / deactivate
    // =========================================================================

    function activate(): void {
        if (active) return;
        active = true;
        viewerRoot.classList.add(SELECT_CURSOR_CLASS);
        scrollArea.addEventListener("pointerdown", onPointerDown);
        scrollArea.addEventListener("pointermove", onPointerMove);
        scrollArea.addEventListener("pointerup", onPointerUp);
        scrollArea.addEventListener("pointercancel", onPointerCancel);
        document.addEventListener("keydown", onKeyDown);
    }

    function deactivate(): void {
        if (!active) return;
        active = false;
        viewerRoot.classList.remove(SELECT_CURSOR_CLASS);
        viewerRoot.classList.remove(MOVING_CLASS);
        viewerRoot.classList.remove(RESIZING_CLASS);
        viewerRoot.style.cursor = "";
        scrollArea.removeEventListener("pointerdown", onPointerDown);
        scrollArea.removeEventListener("pointermove", onPointerMove);
        scrollArea.removeEventListener("pointerup", onPointerUp);
        scrollArea.removeEventListener("pointercancel", onPointerCancel);
        document.removeEventListener("keydown", onKeyDown);
        removeBbox();
        isDragging = false;
    }

    function isSelectMode(s: ViewerState): boolean {
        return (
            s.documentFormat !== null &&
            ANNOTATION_FORMATS.has(s.documentFormat) &&
            isToolSet(s.activeTool) &&
            s.activeSubTool === "select"
        );
    }

    const unsub = store.subscribeRender((_prev, next) => {
        if (isSelectMode(next)) {
            activate();
            if (!isDragging) {
                updateSelectionVisual();
            }
        } else {
            deactivate();
        }
    });

    if (isSelectMode(store.getState())) {
        activate();
    }

    function destroy(): void {
        unsub();
        deactivate();
    }

    return { destroy };
}
