/**
 * Shared utilities for annotation rendering.
 */
import type { Annotation, AnnotationColor, Point, Quad, Rect } from "./types";

/**
 * Convert annotation color to CSS rgba() string.
 */
export function colorToRgba(
    color: AnnotationColor | undefined,
    opacity: number,
    defaultColor = "rgba(255, 255, 0, 0.3)",
): string {
    if (!color) return defaultColor;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Convert annotation color to CSS rgb() string.
 */
export function colorToRgb(color: AnnotationColor | undefined, defaultColor = "rgb(0, 0, 0)"): string {
    if (!color) return defaultColor;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Scale a point from page coordinates to screen pixels.
 */
export function scalePoint(point: Point, scale: number): Point {
    return {
        x: point.x * scale,
        y: point.y * scale,
    };
}

/**
 * Scale bounds from page coordinates to screen pixels.
 */
export function scaleBounds(bounds: Rect, scale: number): Rect {
    return {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale,
    };
}

/**
 * Apply bounds as inline styles to an element.
 */
export function applyBoundsStyle(el: HTMLElement, bounds: Rect, scale: number): void {
    el.style.position = "absolute";
    el.style.left = `${bounds.x * scale}px`;
    el.style.top = `${bounds.y * scale}px`;
    el.style.width = `${bounds.width * scale}px`;
    el.style.height = `${bounds.height * scale}px`;
}

/**
 * Create an SVG element sized to cover the annotation layer.
 */
export function createSvgOverlay(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    return svg;
}

/**
 * Create SVG namespace element helper.
 */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

/**
 * Check if two bounds are approximately equal (for highlight matching).
 */
export function boundsMatch(a: Rect, b: Rect, epsilon = 0.1): boolean {
    return (
        Math.abs(a.x - b.x) < epsilon &&
        Math.abs(a.y - b.y) < epsilon &&
        Math.abs(a.width - b.width) < epsilon &&
        Math.abs(a.height - b.height) < epsilon
    );
}

// =============================================================================
// Annotation geometry helpers
// =============================================================================

/** Remap a point from oldBounds coordinate space to newBounds. */
function remapPoint(p: Point, oldBounds: Rect, newBounds: Rect): Point {
    const sx = oldBounds.width > 0 ? (p.x - oldBounds.x) / oldBounds.width : 0;
    const sy = oldBounds.height > 0 ? (p.y - oldBounds.y) / oldBounds.height : 0;
    return { x: newBounds.x + sx * newBounds.width, y: newBounds.y + sy * newBounds.height };
}

function remapQuads(quads: Quad[], oldBounds: Rect, newBounds: Rect): Quad[] {
    return quads.map((q) => ({
        points: q.points.map((p) => remapPoint(p, oldBounds, newBounds)) as Quad["points"],
    }));
}

/**
 * Return a new annotation with all geometry scaled to fit newBounds.
 * Points are remapped proportionally from the old bounds to the new bounds.
 */
export function resizeAnnotation(annotation: Annotation, newBounds: Rect): Annotation {
    const oldBounds = annotation.bounds;
    const base = { bounds: newBounds };

    switch (annotation.type) {
        case "line":
            return {
                ...annotation,
                ...base,
                start: remapPoint(annotation.start, oldBounds, newBounds),
                end: remapPoint(annotation.end, oldBounds, newBounds),
            };
        case "polygon":
        case "polyLine":
            return {
                ...annotation,
                ...base,
                vertices: annotation.vertices.map((p) => remapPoint(p, oldBounds, newBounds)),
            };
        case "ink":
            return {
                ...annotation,
                ...base,
                inkList: annotation.inkList.map((stroke) => stroke.map((p) => remapPoint(p, oldBounds, newBounds))),
            };
        case "highlight":
        case "underline":
        case "strikeOut":
        case "squiggly":
            return { ...annotation, ...base, quads: remapQuads(annotation.quads, oldBounds, newBounds) };
        case "redact":
            return {
                ...annotation,
                ...base,
                quads: annotation.quads ? remapQuads(annotation.quads, oldBounds, newBounds) : undefined,
            };
        case "freeText":
            return {
                ...annotation,
                ...base,
                calloutLine: annotation.calloutLine?.map((p) => remapPoint(p, oldBounds, newBounds)),
            };
        default:
            return { ...annotation, ...base };
    }
}

function offsetRect(r: Rect, dx: number, dy: number): Rect {
    return { x: r.x + dx, y: r.y + dy, width: r.width, height: r.height };
}

function offsetPoint(p: Point, dx: number, dy: number): Point {
    return { x: p.x + dx, y: p.y + dy };
}

function offsetQuads(quads: Quad[], dx: number, dy: number): Quad[] {
    return quads.map((q) => ({
        points: q.points.map((p) => offsetPoint(p, dx, dy)) as Quad["points"],
    }));
}

/**
 * Return a new annotation with all geometry offset by (dx, dy) in page coordinates.
 */
export function offsetAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
    const base = { bounds: offsetRect(annotation.bounds, dx, dy) };

    switch (annotation.type) {
        case "line":
            return {
                ...annotation,
                ...base,
                start: offsetPoint(annotation.start, dx, dy),
                end: offsetPoint(annotation.end, dx, dy),
            };
        case "polygon":
        case "polyLine":
            return { ...annotation, ...base, vertices: annotation.vertices.map((p) => offsetPoint(p, dx, dy)) };
        case "ink":
            return {
                ...annotation,
                ...base,
                inkList: annotation.inkList.map((stroke) => stroke.map((p) => offsetPoint(p, dx, dy))),
            };
        case "highlight":
        case "underline":
        case "strikeOut":
        case "squiggly":
            return { ...annotation, ...base, quads: offsetQuads(annotation.quads, dx, dy) };
        case "redact":
            return {
                ...annotation,
                ...base,
                quads: annotation.quads ? offsetQuads(annotation.quads, dx, dy) : undefined,
            };
        case "freeText":
            return { ...annotation, ...base, calloutLine: annotation.calloutLine?.map((p) => offsetPoint(p, dx, dy)) };
        default:
            // square, circle, text, stamp, caret, link — only bounds
            return { ...annotation, ...base };
    }
}
