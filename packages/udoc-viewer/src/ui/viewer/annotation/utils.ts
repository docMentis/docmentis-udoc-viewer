/**
 * Shared utilities for annotation rendering.
 */
import type { AnnotationColor, Point, Rect } from "./types";

/**
 * Convert annotation color to CSS rgba() string.
 */
export function colorToRgba(
    color: AnnotationColor | undefined,
    opacity: number,
    defaultColor = "rgba(255, 255, 0, 0.3)"
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
export function colorToRgb(
    color: AnnotationColor | undefined,
    defaultColor = "rgb(0, 0, 0)"
): string {
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
        y: point.y * scale
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
        height: bounds.height * scale
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
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
    tagName: K
): SVGElementTagNameMap[K] {
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
