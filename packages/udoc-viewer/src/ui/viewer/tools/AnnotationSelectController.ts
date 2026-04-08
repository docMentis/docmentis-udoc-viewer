/**
 * AnnotationSelectController — handles annotation selection, deletion via keyboard.
 *
 * When the "select" sub-tool is active (in either annotate or markup tool sets),
 * clicking on an annotation selects it. Pressing Delete/Backspace removes it.
 * Clicking empty space deselects.
 *
 * A bounding box overlay is drawn around the selected annotation.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import { getPointsToPixels, isToolSet, ANNOTATION_FORMATS } from "../state";
import type { Action } from "../actions";

export interface AnnotationSelectControllerOptions {
    scrollArea: HTMLElement;
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

const SELECT_CURSOR_CLASS = "udoc-viewer--tool-select";
const BBOX_CLASS = "udoc-annotation-select-bbox";

export function createAnnotationSelectController(options: AnnotationSelectControllerOptions) {
    const { scrollArea, viewerRoot, store } = options;

    let active = false;
    let bboxEl: HTMLDivElement | null = null;

    /** Remove the current bounding box overlay. */
    function removeBbox(): void {
        if (bboxEl) {
            bboxEl.remove();
            bboxEl = null;
        }
    }

    /** Draw a bounding box overlay around the selected annotation. */
    function updateSelectionVisual(): void {
        removeBbox();

        const state = store.getState();
        const sel = state.selectedAnnotation;
        if (!sel) return;

        // Get the annotation data for its bounds
        const annotations = state.pageAnnotations.get(sel.pageIndex);
        if (!annotations || sel.annotationIndex >= annotations.length) return;
        const annotation = annotations[sel.annotationIndex];
        const bounds = annotation.bounds;
        if (!bounds || (bounds.width === 0 && bounds.height === 0)) return;

        // Find the annotation layer inside the page slot
        const pageNum = sel.pageIndex + 1;
        const slot = scrollArea.querySelector<HTMLElement>(`[data-page="${pageNum}"]`);
        if (!slot) return;
        const annotationLayer = slot.querySelector<HTMLElement>(".udoc-spread__annotation-layer");
        if (!annotationLayer) return;

        // Compute scale (same as annotation rendering)
        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;
        const scale = pointsToPixels * zoom;

        // Create bounding box div
        bboxEl = document.createElement("div");
        bboxEl.className = BBOX_CLASS;
        bboxEl.style.position = "absolute";
        bboxEl.style.left = `${bounds.x * scale}px`;
        bboxEl.style.top = `${bounds.y * scale}px`;
        bboxEl.style.width = `${bounds.width * scale}px`;
        bboxEl.style.height = `${bounds.height * scale}px`;
        bboxEl.style.pointerEvents = "none";

        annotationLayer.appendChild(bboxEl);
    }

    function onClick(e: MouseEvent): void {
        if (e.button !== 0) return;

        const target = e.target as HTMLElement;

        // Find the annotation element (has data-annotation-index attribute)
        // Use Element (not HTMLElement) since annotations may be SVG elements
        const annotationEl = target.closest("[data-annotation-index]");
        if (annotationEl) {
            // Find the page slot to get the page index
            const slotEl = annotationEl.closest<HTMLElement>("[data-page]");
            if (!slotEl) return;

            const pageNum = parseInt(slotEl.dataset.page!, 10);
            if (isNaN(pageNum)) return;

            const annotationIndex = parseInt(annotationEl.getAttribute("data-annotation-index")!, 10);
            if (isNaN(annotationIndex)) return;

            const pageIndex = pageNum - 1;
            store.dispatch({ type: "SELECT_ANNOTATION", pageIndex, annotationIndex });
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Clicked outside any annotation — deselect
        store.dispatch({ type: "DESELECT_ANNOTATION" });
    }

    function onKeyDown(e: KeyboardEvent): void {
        if (e.key !== "Delete" && e.key !== "Backspace") return;

        // Don't interfere with input fields
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        const sel = store.getState().selectedAnnotation;
        if (!sel) return;

        store.dispatch({ type: "REMOVE_ANNOTATION", pageIndex: sel.pageIndex, annotationIndex: sel.annotationIndex });
        e.preventDefault();
    }

    function activate(): void {
        if (active) return;
        active = true;
        viewerRoot.classList.add(SELECT_CURSOR_CLASS);
        scrollArea.addEventListener("click", onClick);
        document.addEventListener("keydown", onKeyDown);
    }

    function deactivate(): void {
        if (!active) return;
        active = false;
        viewerRoot.classList.remove(SELECT_CURSOR_CLASS);
        scrollArea.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeyDown);
        removeBbox();
    }

    function isSelectMode(s: ViewerState): boolean {
        return (
            s.documentFormat !== null &&
            ANNOTATION_FORMATS.has(s.documentFormat) &&
            isToolSet(s.activeTool) &&
            s.activeSubTool === "select"
        );
    }

    // Subscribe to store for tool and selection changes
    const unsub = store.subscribeRender((_prev, next) => {
        if (isSelectMode(next)) {
            activate();
            updateSelectionVisual();
        } else {
            deactivate();
        }
    });

    // Check initial state
    if (isSelectMode(store.getState())) {
        activate();
    }

    function destroy(): void {
        unsub();
        deactivate();
    }

    return { destroy };
}
