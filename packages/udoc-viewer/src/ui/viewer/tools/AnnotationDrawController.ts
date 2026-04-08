/**
 * AnnotationDrawController — handles mouse/pointer drawing for annotation tools.
 *
 * Converts pointer events on page slots into annotation objects dispatched to the store.
 * Supports: freehand (ink), line, arrow, rectangle, ellipse.
 * Uses the same renderAnnotation() for both live preview and final result.
 */

import type { Store } from "../../framework/store";
import type { ViewerState, ToolOptions, SubTool } from "../state";
import { getPointsToPixels, isToolSet, DEFAULT_TOOL_OPTIONS, ANNOTATION_FORMATS } from "../state";
import type { Action } from "../actions";
import { renderAnnotation } from "../annotation/render";
import type {
    Annotation,
    InkAnnotation,
    LineAnnotation,
    SquareAnnotation,
    CircleAnnotation,
    AnnotationColor,
    LineEnding,
    BorderStyle,
    Point,
    Rect,
} from "../annotation/types";

export interface AnnotationDrawControllerOptions {
    /** The scroll container that holds all spread/page elements */
    scrollArea: HTMLElement;
    /** The viewer root element (for cursor classes) */
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

// CSS class for crosshair cursor during annotation drawing
const DRAW_CURSOR_CLASS = "udoc-viewer--tool-draw";

/** Parse hex color (#rrggbb) to AnnotationColor (0-1 range). */
function parseHexColor(hex: string): AnnotationColor {
    const h = hex.replace("#", "");
    return {
        r: parseInt(h.substring(0, 2), 16) / 255,
        g: parseInt(h.substring(2, 4), 16) / 255,
        b: parseInt(h.substring(4, 6), 16) / 255,
    };
}

/** Map ArrowHeadStyle to PDF LineEnding. */
function toLineEnding(style: string): LineEnding {
    switch (style) {
        case "open":
            return "OpenArrow";
        case "closed":
            return "ClosedArrow";
        default:
            return "None";
    }
}

/** Compute bounding rect from a list of points. */
function boundingRect(points: Point[]): Rect {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function createAnnotationDrawController(options: AnnotationDrawControllerOptions) {
    const { scrollArea, viewerRoot, store } = options;

    // Preview layer (a div placed over the page slot, rendered via renderAnnotation)
    let previewLayer: HTMLDivElement | null = null;

    // Drawing state
    let isDrawing = false;
    let drawPageIndex = -1; // 0-based
    let drawSlot: HTMLElement | null = null; // The page slot container
    let drawScale = 1; // pixels-per-point for converting back to PDF coords
    let drawSubTool: SubTool | null = null;
    let drawOptions: ToolOptions = { ...DEFAULT_TOOL_OPTIONS };

    // Accumulated points (in PDF page coordinates)
    let inkPoints: Point[] = [];
    // Start/end for geometry tools (in PDF coords)
    let startPt: Point = { x: 0, y: 0 };
    let endPt: Point = { x: 0, y: 0 };

    /** Convert a client-space pointer event to PDF page coordinates. */
    function clientToPageCoords(e: PointerEvent): Point | null {
        if (!drawSlot) return null;
        const rect = drawSlot.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        return { x: px / drawScale, y: py / drawScale };
    }

    /** Map tool lineStyle to PDF borderStyle. */
    function toBorderStyle(lineStyle: string): BorderStyle {
        if (lineStyle === "dashed" || lineStyle === "dotted") return "dashed";
        return "solid";
    }

    /** Build an Annotation object from the current drawing state, or null if invalid. */
    function buildCurrentAnnotation(): Annotation | null {
        const color = parseHexColor(drawOptions.strokeColor);
        const opacity = drawOptions.opacity;
        const borderWidth = drawOptions.strokeWidth;
        const borderStyle = toBorderStyle(drawOptions.lineStyle);

        if (drawSubTool === "freehand" && inkPoints.length >= 2) {
            return {
                type: "ink",
                bounds: boundingRect(inkPoints),
                inkList: [inkPoints],
                color,
                borderWidth,
                borderStyle,
                opacity,
            } as InkAnnotation;
        }

        if ((drawSubTool === "line" || drawSubTool === "arrow") && (startPt.x !== endPt.x || startPt.y !== endPt.y)) {
            return {
                type: "line",
                bounds: boundingRect([startPt, endPt]),
                start: startPt,
                end: endPt,
                startEnding: drawSubTool === "arrow" ? toLineEnding(drawOptions.arrowHeadStart) : "None",
                endEnding: drawSubTool === "arrow" ? toLineEnding(drawOptions.arrowHeadEnd) : "None",
                color,
                borderWidth,
                borderStyle,
                opacity,
            } as LineAnnotation;
        }

        if (drawSubTool === "rectangle" && startPt.x !== endPt.x && startPt.y !== endPt.y) {
            const x = Math.min(startPt.x, endPt.x);
            const y = Math.min(startPt.y, endPt.y);
            return {
                type: "square",
                bounds: { x, y, width: Math.abs(endPt.x - startPt.x), height: Math.abs(endPt.y - startPt.y) },
                color,
                interiorColor: drawOptions.fillColor ? parseHexColor(drawOptions.fillColor) : undefined,
                borderWidth,
                borderStyle,
                opacity,
            } as SquareAnnotation;
        }

        if (drawSubTool === "ellipse" && startPt.x !== endPt.x && startPt.y !== endPt.y) {
            const x = Math.min(startPt.x, endPt.x);
            const y = Math.min(startPt.y, endPt.y);
            return {
                type: "circle",
                bounds: { x, y, width: Math.abs(endPt.x - startPt.x), height: Math.abs(endPt.y - startPt.y) },
                color,
                interiorColor: drawOptions.fillColor ? parseHexColor(drawOptions.fillColor) : undefined,
                borderWidth,
                borderStyle,
                opacity,
            } as CircleAnnotation;
        }

        return null;
    }

    /** Create the preview layer inside the page slot. */
    function createPreviewLayer(): void {
        if (!drawSlot) return;
        previewLayer = document.createElement("div");
        previewLayer.style.position = "absolute";
        previewLayer.style.inset = "0";
        previewLayer.style.pointerEvents = "none";
        previewLayer.style.zIndex = "10";
        previewLayer.className = "udoc-annotation-draw-preview";
        drawSlot.appendChild(previewLayer);
    }

    /** Update the live preview using the same renderer as final annotations. */
    function updatePreview(): void {
        if (!previewLayer) return;
        previewLayer.innerHTML = "";

        const annotation = buildCurrentAnnotation();
        if (annotation) {
            renderAnnotation(previewLayer, annotation, drawScale);
        }
    }

    /** Remove the preview layer. */
    function removePreview(): void {
        if (previewLayer) {
            previewLayer.remove();
            previewLayer = null;
        }
    }

    /** Finalize drawing and dispatch the annotation to the store. */
    function finishDrawing(): void {
        if (!isDrawing) return;
        isDrawing = false;

        const annotation = buildCurrentAnnotation();
        if (annotation && drawPageIndex >= 0) {
            store.dispatch({ type: "ADD_ANNOTATION", pageIndex: drawPageIndex, annotation });
        }

        removePreview();
        inkPoints = [];
    }

    // --- Pointer event handlers ---

    function onPointerDown(e: PointerEvent): void {
        if (e.button !== 0) return;

        const state = store.getState();
        if (!isToolSet(state.activeTool)) return;
        if (!state.activeSubTool) return;

        // Only handle drawing sub-tools (not textbox/polygon for now)
        const tool = state.activeSubTool;
        if (tool === "textbox" || tool === "polygon") return;
        // Markup tools (highlight, underline, etc.) need text selection, not handled here
        if (state.activeTool === "markup") return;

        // Find the page slot under the pointer
        const target = e.target as HTMLElement;
        const slotEl = target.closest<HTMLElement>("[data-page]");
        if (!slotEl) return;

        const pageNum = parseInt(slotEl.dataset.page!, 10);
        if (isNaN(pageNum)) return;

        drawPageIndex = pageNum - 1; // convert to 0-based
        drawSlot = slotEl;
        drawSubTool = tool;
        drawOptions = state.toolOptions[tool] ?? { ...DEFAULT_TOOL_OPTIONS };

        // Compute the scale (pixels per PDF point) for this page
        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;
        drawScale = pointsToPixels * zoom;

        const pt = clientToPageCoords(e);
        if (!pt) return;

        isDrawing = true;
        startPt = pt;
        endPt = pt;
        inkPoints = [pt];

        createPreviewLayer();
        scrollArea.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function onPointerMove(e: PointerEvent): void {
        if (!isDrawing) return;

        const pt = clientToPageCoords(e);
        if (!pt) return;

        endPt = pt;

        if (drawSubTool === "freehand") {
            inkPoints.push(pt);
        }

        updatePreview();
    }

    function onPointerUp(e: PointerEvent): void {
        if (!isDrawing) return;
        scrollArea.releasePointerCapture(e.pointerId);
        finishDrawing();
    }

    function onPointerCancel(e: PointerEvent): void {
        if (!isDrawing) return;
        scrollArea.releasePointerCapture(e.pointerId);
        isDrawing = false;
        removePreview();
        inkPoints = [];
    }

    // --- Cursor management ---

    let active = false;

    function activate(): void {
        if (active) return;
        active = true;
        viewerRoot.classList.add(DRAW_CURSOR_CLASS);
        scrollArea.addEventListener("pointerdown", onPointerDown);
        scrollArea.addEventListener("pointermove", onPointerMove);
        scrollArea.addEventListener("pointerup", onPointerUp);
        scrollArea.addEventListener("pointercancel", onPointerCancel);
    }

    function deactivate(): void {
        if (!active) return;
        active = false;
        viewerRoot.classList.remove(DRAW_CURSOR_CLASS);
        scrollArea.removeEventListener("pointerdown", onPointerDown);
        scrollArea.removeEventListener("pointermove", onPointerMove);
        scrollArea.removeEventListener("pointerup", onPointerUp);
        scrollArea.removeEventListener("pointercancel", onPointerCancel);
        if (isDrawing) {
            isDrawing = false;
            removePreview();
            inkPoints = [];
        }
    }

    function canDraw(s: ViewerState): boolean {
        return (
            s.documentFormat !== null &&
            ANNOTATION_FORMATS.has(s.documentFormat) &&
            isToolSet(s.activeTool) &&
            s.activeTool === "annotate" &&
            s.activeSubTool !== null &&
            s.activeSubTool !== "textbox" &&
            s.activeSubTool !== "polygon"
        );
    }

    // Subscribe to store for tool changes
    const unsub = store.subscribeRender((_prev, next) => {
        if (canDraw(next)) {
            activate();
        } else {
            deactivate();
        }
    });

    // Check initial state
    if (canDraw(store.getState())) {
        activate();
    }

    function destroy(): void {
        unsub();
        deactivate();
    }

    return { destroy };
}
