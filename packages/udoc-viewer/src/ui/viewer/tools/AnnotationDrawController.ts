/**
 * AnnotationDrawController — handles mouse/pointer drawing for annotation tools.
 *
 * Converts pointer events on page slots into annotation objects dispatched to the store.
 * Supports: freehand (ink), line, arrow, rectangle, ellipse, polygon.
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
    PolygonAnnotation,
    PolyLineAnnotation,
    Point,
    Rect,
} from "../annotation/types";
import { parseHexColor, toLineEnding, toBorderStyle } from "../annotation/propertyUtils";

export interface AnnotationDrawControllerOptions {
    /** The scroll container that holds all spread/page elements */
    scrollArea: HTMLElement;
    /** The viewer root element (for cursor classes) */
    viewerRoot: HTMLElement;
    store: Store<ViewerState, Action>;
}

// CSS class for crosshair cursor during annotation drawing
const DRAW_CURSOR_CLASS = "udoc-viewer--tool-draw";

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
    // Committed vertices for polygon (click-to-add mode)
    let polygonVertices: Point[] = [];

    /** Convert a client-space pointer event to PDF page coordinates. */
    function clientToPageCoords(e: PointerEvent): Point | null {
        if (!drawSlot) return null;
        const rect = drawSlot.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        return { x: px / drawScale, y: py / drawScale };
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

        if (drawSubTool === "polygon" || drawSubTool === "polyline") {
            // During drawing: committed vertices + current cursor position
            const verts = isDrawing ? [...polygonVertices, endPt] : polygonVertices;
            if (verts.length >= 2) {
                if (drawSubTool === "polygon") {
                    return {
                        type: "polygon",
                        bounds: boundingRect(verts),
                        vertices: verts,
                        color,
                        interiorColor: drawOptions.fillColor ? parseHexColor(drawOptions.fillColor) : undefined,
                        borderWidth,
                        borderStyle,
                        startEnding: "None",
                        endEnding: "None",
                        opacity,
                    } as PolygonAnnotation;
                } else {
                    return {
                        type: "polyLine",
                        bounds: boundingRect(verts),
                        vertices: verts,
                        color,
                        borderWidth,
                        borderStyle,
                        startEnding: "None",
                        endEnding: "None",
                        opacity,
                    } as PolyLineAnnotation;
                }
            }
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

        // Polygon needs >= 3 vertices, polyline needs >= 2
        const minVerts = drawSubTool === "polygon" ? 3 : 2;
        if ((drawSubTool === "polygon" || drawSubTool === "polyline") && polygonVertices.length < minVerts) {
            isDrawing = false;
            removePreview();
            polygonVertices = [];
            return;
        }

        isDrawing = false;

        const annotation = buildCurrentAnnotation();
        if (annotation && drawPageIndex >= 0) {
            store.dispatch({ type: "ADD_ANNOTATION", pageIndex: drawPageIndex, annotation });
        }

        removePreview();
        inkPoints = [];
        polygonVertices = [];
    }

    // --- Shared setup for starting a draw on a page slot ---

    function beginDrawOnSlot(e: PointerEvent): Point | null {
        const state = store.getState();
        if (!isToolSet(state.activeTool)) return null;
        if (!state.activeSubTool) return null;
        if (state.activeTool === "markup") return null;

        const tool = state.activeSubTool;
        const target = e.target as HTMLElement;
        const slotEl = target.closest<HTMLElement>("[data-page]");
        if (!slotEl) return null;

        const pageNum = parseInt(slotEl.dataset.page!, 10);
        if (isNaN(pageNum)) return null;

        drawPageIndex = pageNum - 1;
        drawSlot = slotEl;
        drawSubTool = tool;
        drawOptions = state.toolOptions[tool] ?? { ...DEFAULT_TOOL_OPTIONS };

        const pointsToPixels = getPointsToPixels(state.dpi);
        const zoom = state.effectiveZoom ?? state.zoom;
        drawScale = pointsToPixels * zoom;

        return clientToPageCoords(e);
    }

    // --- Pointer event handlers ---

    function onPointerDown(e: PointerEvent): void {
        if (e.button !== 0) return;

        // Polygon/polyline use click-to-add mode, handled separately
        if (isDrawing && (drawSubTool === "polygon" || drawSubTool === "polyline")) return;

        const state = store.getState();
        if (state.activeSubTool === "polygon" || state.activeSubTool === "polyline") return;

        const pt = beginDrawOnSlot(e);
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
        if (drawSubTool === "polygon" || drawSubTool === "polyline") return; // finishes on double-click
        scrollArea.releasePointerCapture(e.pointerId);
        finishDrawing();
    }

    function onPointerCancel(e: PointerEvent): void {
        if (!isDrawing) return;
        scrollArea.releasePointerCapture(e.pointerId);
        isDrawing = false;
        removePreview();
        inkPoints = [];
        polygonVertices = [];
    }

    // --- Polygon click/double-click handlers ---

    function onClick(e: MouseEvent): void {
        if (e.button !== 0) return;

        const state = store.getState();
        if (state.activeSubTool !== "polygon" && state.activeSubTool !== "polyline") return;

        if (!isDrawing) {
            // First click — start polygon
            const pt = beginDrawOnSlot(e as unknown as PointerEvent);
            if (!pt) return;

            isDrawing = true;
            polygonVertices = [pt];
            endPt = pt;
            createPreviewLayer();
            e.preventDefault();
        } else {
            // Subsequent click — add vertex
            const pt = clientToPageCoords(e as unknown as PointerEvent);
            if (!pt) return;

            polygonVertices.push(pt);
            endPt = pt;
            updatePreview();
            e.preventDefault();
        }
    }

    function onDblClick(e: MouseEvent): void {
        if (!isDrawing || (drawSubTool !== "polygon" && drawSubTool !== "polyline")) return;
        e.preventDefault();
        finishDrawing();
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
        scrollArea.addEventListener("click", onClick);
        scrollArea.addEventListener("dblclick", onDblClick);
    }

    function deactivate(): void {
        if (!active) return;
        active = false;
        viewerRoot.classList.remove(DRAW_CURSOR_CLASS);
        scrollArea.removeEventListener("pointerdown", onPointerDown);
        scrollArea.removeEventListener("pointermove", onPointerMove);
        scrollArea.removeEventListener("pointerup", onPointerUp);
        scrollArea.removeEventListener("pointercancel", onPointerCancel);
        scrollArea.removeEventListener("click", onClick);
        scrollArea.removeEventListener("dblclick", onDblClick);
        if (isDrawing) {
            finishDrawing();
        }
    }

    function canDraw(s: ViewerState): boolean {
        return (
            s.documentFormat !== null &&
            ANNOTATION_FORMATS.has(s.documentFormat) &&
            isToolSet(s.activeTool) &&
            s.activeTool === "annotate" &&
            s.activeSubTool !== null &&
            s.activeSubTool !== "select"
        );
    }

    // Subscribe to store for tool changes
    const unsub = store.subscribeRender((prev, next) => {
        if (canDraw(next)) {
            // If the sub-tool changed while drawing, finish the in-progress shape
            if (isDrawing && prev.activeSubTool !== next.activeSubTool) {
                finishDrawing();
            }
            activate();
        } else {
            deactivate();
        }
    });

    // Listen for finish-drawing events (e.g. re-clicking the active polygon/polyline tool)
    const onFinishDrawing = () => {
        if (isDrawing) finishDrawing();
    };
    document.addEventListener("udoc-finish-drawing", onFinishDrawing);

    // Check initial state
    if (canDraw(store.getState())) {
        activate();
    }

    function destroy(): void {
        unsub();
        document.removeEventListener("udoc-finish-drawing", onFinishDrawing);
        deactivate();
    }

    return { destroy };
}
