/**
 * AnnotationDrawController — handles mouse/pointer drawing for annotation tools.
 *
 * Converts pointer events on page slots into annotation objects dispatched to the store.
 * Supports: freehand (ink), line, arrow, rectangle, ellipse.
 * Draws a live preview SVG overlay during the drag gesture.
 */

import type { Store } from "../../framework/store";
import type { ViewerState, ToolOptions, SubTool } from "../state";
import { getPointsToPixels, isToolSet, DEFAULT_TOOL_OPTIONS, ANNOTATION_FORMATS } from "../state";
import type { Action } from "../actions";
import type {
    Annotation,
    InkAnnotation,
    LineAnnotation,
    SquareAnnotation,
    CircleAnnotation,
    AnnotationColor,
    LineEnding,
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

    // Live preview overlay (SVG positioned over the page slot being drawn on)
    let previewSvg: SVGSVGElement | null = null;
    let previewPath: SVGPathElement | SVGRectElement | SVGEllipseElement | SVGLineElement | null = null;

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

    /** Create the SVG preview overlay inside the page slot. */
    function createPreview(): void {
        if (!drawSlot) return;
        previewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        previewSvg.style.position = "absolute";
        previewSvg.style.inset = "0";
        previewSvg.style.width = "100%";
        previewSvg.style.height = "100%";
        previewSvg.style.pointerEvents = "none";
        previewSvg.style.zIndex = "10";
        previewSvg.setAttribute("class", "udoc-annotation-draw-preview");
        drawSlot.appendChild(previewSvg);
    }

    /** Update the live preview based on current drawing state. */
    function updatePreview(): void {
        if (!previewSvg) return;

        const color = drawOptions.strokeColor;
        const width = drawOptions.strokeWidth * drawScale;
        const opacity = String(drawOptions.opacity);

        // Remove old preview element
        if (previewPath) {
            previewPath.remove();
            previewPath = null;
        }

        if (drawSubTool === "freehand" && inkPoints.length > 1) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let d = `M ${inkPoints[0].x * drawScale} ${inkPoints[0].y * drawScale}`;
            for (let i = 1; i < inkPoints.length; i++) {
                d += ` L ${inkPoints[i].x * drawScale} ${inkPoints[i].y * drawScale}`;
            }
            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", String(width));
            path.setAttribute("stroke-opacity", opacity);
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            previewSvg.appendChild(path);
            previewPath = path;
        } else if (drawSubTool === "line" || drawSubTool === "arrow") {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(startPt.x * drawScale));
            line.setAttribute("y1", String(startPt.y * drawScale));
            line.setAttribute("x2", String(endPt.x * drawScale));
            line.setAttribute("y2", String(endPt.y * drawScale));
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", String(width));
            line.setAttribute("stroke-opacity", opacity);
            if (drawSubTool === "arrow") {
                // Simple arrowhead marker
                const markerId = "udoc-draw-arrow";
                let defs = previewSvg.querySelector("defs");
                if (!defs) {
                    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    previewSvg.appendChild(defs);
                }
                if (!defs.querySelector(`#${markerId}`)) {
                    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
                    marker.setAttribute("id", markerId);
                    marker.setAttribute("markerWidth", "10");
                    marker.setAttribute("markerHeight", "7");
                    marker.setAttribute("refX", "10");
                    marker.setAttribute("refY", "3.5");
                    marker.setAttribute("orient", "auto");
                    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
                    polygon.setAttribute("fill", color);
                    marker.appendChild(polygon);
                    defs.appendChild(marker);
                }
                line.setAttribute("marker-end", `url(#${markerId})`);
            }
            previewSvg.appendChild(line);
            previewPath = line;
        } else if (drawSubTool === "rectangle") {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const x = Math.min(startPt.x, endPt.x) * drawScale;
            const y = Math.min(startPt.y, endPt.y) * drawScale;
            const w = Math.abs(endPt.x - startPt.x) * drawScale;
            const h = Math.abs(endPt.y - startPt.y) * drawScale;
            rect.setAttribute("x", String(x));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", String(w));
            rect.setAttribute("height", String(h));
            rect.setAttribute("fill", drawOptions.fillColor ?? "none");
            rect.setAttribute("fill-opacity", drawOptions.fillColor ? opacity : "0");
            rect.setAttribute("stroke", color);
            rect.setAttribute("stroke-width", String(width));
            rect.setAttribute("stroke-opacity", opacity);
            previewSvg.appendChild(rect);
            previewPath = rect;
        } else if (drawSubTool === "ellipse") {
            const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            const cx = ((startPt.x + endPt.x) / 2) * drawScale;
            const cy = ((startPt.y + endPt.y) / 2) * drawScale;
            const rx = (Math.abs(endPt.x - startPt.x) / 2) * drawScale;
            const ry = (Math.abs(endPt.y - startPt.y) / 2) * drawScale;
            ellipse.setAttribute("cx", String(cx));
            ellipse.setAttribute("cy", String(cy));
            ellipse.setAttribute("rx", String(rx));
            ellipse.setAttribute("ry", String(ry));
            ellipse.setAttribute("fill", drawOptions.fillColor ?? "none");
            ellipse.setAttribute("fill-opacity", drawOptions.fillColor ? opacity : "0");
            ellipse.setAttribute("stroke", color);
            ellipse.setAttribute("stroke-width", String(width));
            ellipse.setAttribute("stroke-opacity", opacity);
            previewSvg.appendChild(ellipse);
            previewPath = ellipse;
        }
    }

    /** Remove the preview overlay. */
    function removePreview(): void {
        if (previewSvg) {
            previewSvg.remove();
            previewSvg = null;
            previewPath = null;
        }
    }

    /** Finalize drawing and dispatch the annotation to the store. */
    function finishDrawing(): void {
        if (!isDrawing) return;
        isDrawing = false;

        const color = parseHexColor(drawOptions.strokeColor);
        const opacity = drawOptions.opacity;
        const borderWidth = drawOptions.strokeWidth;
        let annotation: Annotation | null = null;

        if (drawSubTool === "freehand" && inkPoints.length >= 2) {
            const bounds = boundingRect(inkPoints);
            annotation = {
                type: "ink",
                bounds,
                inkList: [inkPoints],
                color,
                borderWidth,
                opacity,
            } as InkAnnotation;
        } else if (
            (drawSubTool === "line" || drawSubTool === "arrow") &&
            (startPt.x !== endPt.x || startPt.y !== endPt.y)
        ) {
            const bounds = boundingRect([startPt, endPt]);
            const lineAnnotation: LineAnnotation = {
                type: "line",
                bounds,
                start: startPt,
                end: endPt,
                startEnding: drawSubTool === "arrow" ? toLineEnding(drawOptions.arrowHeadStart) : "None",
                endEnding: drawSubTool === "arrow" ? toLineEnding(drawOptions.arrowHeadEnd) : "None",
                color,
                borderWidth,
                opacity,
            };
            annotation = lineAnnotation;
        } else if (drawSubTool === "rectangle" && startPt.x !== endPt.x && startPt.y !== endPt.y) {
            const x = Math.min(startPt.x, endPt.x);
            const y = Math.min(startPt.y, endPt.y);
            const w = Math.abs(endPt.x - startPt.x);
            const h = Math.abs(endPt.y - startPt.y);
            annotation = {
                type: "square",
                bounds: { x, y, width: w, height: h },
                color,
                interiorColor: drawOptions.fillColor ? parseHexColor(drawOptions.fillColor) : undefined,
                borderWidth,
                borderStyle: "solid",
                opacity,
            } as SquareAnnotation;
        } else if (drawSubTool === "ellipse" && startPt.x !== endPt.x && startPt.y !== endPt.y) {
            const x = Math.min(startPt.x, endPt.x);
            const y = Math.min(startPt.y, endPt.y);
            const w = Math.abs(endPt.x - startPt.x);
            const h = Math.abs(endPt.y - startPt.y);
            annotation = {
                type: "circle",
                bounds: { x, y, width: w, height: h },
                color,
                interiorColor: drawOptions.fillColor ? parseHexColor(drawOptions.fillColor) : undefined,
                borderWidth,
                borderStyle: "solid",
                opacity,
            } as CircleAnnotation;
        }

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

        createPreview();
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
