/**
 * AnnotationSelectController — handles annotation selection, move, and deletion.
 *
 * When the "select" sub-tool is active (in either annotate or markup tool sets):
 * - Clicking an annotation selects it, showing a dashed bounding box.
 * - Dragging a selected annotation moves it.
 * - Pressing Delete/Backspace removes the selected annotation.
 * - Clicking empty space deselects.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import { getPointsToPixels, isToolSet, ANNOTATION_FORMATS } from "../state";
import type { Action } from "../actions";
import { offsetAnnotation } from "../annotation/utils";

export interface AnnotationSelectControllerOptions {
    scrollArea: HTMLElement;
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

const SELECT_CURSOR_CLASS = "udoc-viewer--tool-select";
const MOVING_CLASS = "udoc-viewer--annotation-moving";
const BBOX_CLASS = "udoc-annotation-select-bbox";

export function createAnnotationSelectController(options: AnnotationSelectControllerOptions) {
    const { scrollArea, viewerRoot, store } = options;

    let active = false;
    let bboxEl: HTMLDivElement | null = null;

    // --- Drag/move state ---
    let isDragging = false;
    /** Pixels-per-point scale at drag start */
    let dragScale = 1;
    /** Pointer position at drag start (client coords) */
    let dragStartX = 0;
    let dragStartY = 0;
    /** Accumulated offset in page coordinates during drag */
    let dragDx = 0;
    let dragDy = 0;
    /** The annotation being dragged (snapshot at drag start) */
    let dragAnnotationPageIndex = -1;
    let dragAnnotationIndex = -1;

    // =========================================================================
    // Bounding box
    // =========================================================================

    function removeBbox(): void {
        if (bboxEl) {
            bboxEl.remove();
            bboxEl = null;
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
        // Use the annotation layer to copy its positioning (left/top/transform),
        // but append the bbox to the slot container so it survives annotation re-renders.
        const annotationLayer = slot.querySelector<HTMLElement>(".udoc-spread__annotation-layer");
        if (!annotationLayer) return;

        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;
        const scale = pointsToPixels * zoom;

        bboxEl = document.createElement("div");
        bboxEl.className = BBOX_CLASS;
        bboxEl.style.position = "absolute";
        // Copy annotation layer's positioning so bbox coordinates align
        bboxEl.style.width = annotationLayer.style.width;
        bboxEl.style.height = annotationLayer.style.height;
        bboxEl.style.left = annotationLayer.style.left;
        bboxEl.style.top = annotationLayer.style.top;
        bboxEl.style.transform = annotationLayer.style.transform;
        bboxEl.style.transformOrigin = "center";

        // Inner element for the actual bbox rectangle
        const inner = document.createElement("div");
        inner.className = BBOX_CLASS + "__inner";
        inner.style.position = "absolute";
        inner.style.left = `${bounds.x * scale}px`;
        inner.style.top = `${bounds.y * scale}px`;
        inner.style.width = `${bounds.width * scale}px`;
        inner.style.height = `${bounds.height * scale}px`;
        bboxEl.appendChild(inner);

        slot.appendChild(bboxEl);
    }

    // =========================================================================
    // Click / select
    // =========================================================================

    function onPointerDown(e: PointerEvent): void {
        if (e.button !== 0) return;

        const target = e.target as Element;

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
            const state = store.getState();
            const sel = state.selectedAnnotation;

            // If clicking the already-selected annotation, start a drag
            if (sel && sel.pageIndex === pageIndex && sel.annotationIndex === annotationIndex) {
                startDrag(e, slotEl, pageIndex, annotationIndex);
                return;
            }

            // Otherwise select it
            store.dispatch({ type: "SELECT_ANNOTATION", pageIndex, annotationIndex });
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Check if clicking on the bounding box inner element (for drag)
        const bboxInner = bboxEl?.firstElementChild;
        if (bboxInner && (target === bboxInner || bboxInner.contains(target as Node))) {
            const sel = store.getState().selectedAnnotation;
            if (sel) {
                const slotEl = bboxEl!.closest<HTMLElement>("[data-page]");
                if (slotEl) {
                    startDrag(e, slotEl, sel.pageIndex, sel.annotationIndex);
                    return;
                }
            }
        }

        // Clicked outside — deselect
        store.dispatch({ type: "DESELECT_ANNOTATION" });
    }

    // =========================================================================
    // Drag / move
    // =========================================================================

    function startDrag(e: PointerEvent, _slotEl: HTMLElement, pageIndex: number, annotationIndex: number): void {
        const state = store.getState();
        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;

        isDragging = true;
        dragScale = pointsToPixels * zoom;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragDx = 0;
        dragDy = 0;
        dragAnnotationPageIndex = pageIndex;
        dragAnnotationIndex = annotationIndex;

        viewerRoot.classList.add(MOVING_CLASS);
        scrollArea.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
    }

    function onPointerMove(e: PointerEvent): void {
        if (!isDragging) return;

        // Compute delta in page coordinates
        const pxDx = e.clientX - dragStartX;
        const pxDy = e.clientY - dragStartY;
        dragDx = pxDx / dragScale;
        dragDy = pxDy / dragScale;

        // Move the bounding box visually (live preview)
        const inner = bboxEl?.firstElementChild as HTMLElement | null;
        if (inner) {
            const state = store.getState();
            const annotations = state.pageAnnotations.get(dragAnnotationPageIndex);
            if (annotations && dragAnnotationIndex < annotations.length) {
                const bounds = annotations[dragAnnotationIndex].bounds;
                inner.style.left = `${(bounds.x + dragDx) * dragScale}px`;
                inner.style.top = `${(bounds.y + dragDy) * dragScale}px`;
            }
        }
    }

    function onPointerUp(e: PointerEvent): void {
        if (!isDragging) return;

        scrollArea.releasePointerCapture(e.pointerId);
        viewerRoot.classList.remove(MOVING_CLASS);
        isDragging = false;

        // Only dispatch if there was meaningful movement
        if (Math.abs(dragDx) < 0.5 && Math.abs(dragDy) < 0.5) {
            // Reset bbox position
            updateSelectionVisual();
            return;
        }

        const state = store.getState();
        const annotations = state.pageAnnotations.get(dragAnnotationPageIndex);
        if (!annotations || dragAnnotationIndex >= annotations.length) return;

        const original = annotations[dragAnnotationIndex];
        const moved = offsetAnnotation(original, dragDx, dragDy);

        store.dispatch({
            type: "UPDATE_ANNOTATION",
            pageIndex: dragAnnotationPageIndex,
            annotationIndex: dragAnnotationIndex,
            annotation: moved,
        });

        // Bbox will be redrawn by the store subscription
    }

    function onPointerCancel(e: PointerEvent): void {
        if (!isDragging) return;

        scrollArea.releasePointerCapture(e.pointerId);
        viewerRoot.classList.remove(MOVING_CLASS);
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
            // Don't redraw bbox while dragging (we move it manually)
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
