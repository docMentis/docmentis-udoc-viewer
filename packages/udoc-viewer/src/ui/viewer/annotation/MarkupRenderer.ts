/**
 * Renderer for markup annotations: highlight, underline, strikeOut, squiggly.
 */
import type {
    HighlightAnnotation,
    UnderlineAnnotation,
    StrikeOutAnnotation,
    SquigglyAnnotation,
    Quad
} from "./types";
import { colorToRgba, colorToRgb } from "./utils";

/**
 * Render a highlight annotation.
 */
export function renderHighlight(
    layer: HTMLElement,
    annotation: HighlightAnnotation,
    scale: number
): HTMLElement {
    const container = document.createElement("div");
    container.className = "udoc-annotation udoc-annotation--highlight";
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.pointerEvents = "none";

    const opacity = annotation.opacity ?? 0.3;
    for (const quad of annotation.quads) {
        const quadEl = createQuadElement(quad, scale, annotation.color, opacity);
        container.appendChild(quadEl);
    }

    layer.appendChild(container);
    return container;
}

/**
 * Render an underline annotation.
 */
export function renderUnderline(
    layer: HTMLElement,
    annotation: UnderlineAnnotation,
    scale: number
): HTMLElement {
    const container = document.createElement("div");
    container.className = "udoc-annotation udoc-annotation--underline";
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.pointerEvents = "none";

    const opacity = annotation.opacity ?? 1;
    for (const quad of annotation.quads) {
        const lineEl = createUnderlineElement(quad, scale, annotation.color, opacity);
        container.appendChild(lineEl);
    }

    layer.appendChild(container);
    return container;
}

/**
 * Render a strikeout annotation.
 */
export function renderStrikeOut(
    layer: HTMLElement,
    annotation: StrikeOutAnnotation,
    scale: number
): HTMLElement {
    const container = document.createElement("div");
    container.className = "udoc-annotation udoc-annotation--strikeout";
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.pointerEvents = "none";

    const opacity = annotation.opacity ?? 1;
    for (const quad of annotation.quads) {
        const lineEl = createStrikeOutElement(quad, scale, annotation.color, opacity);
        container.appendChild(lineEl);
    }

    layer.appendChild(container);
    return container;
}

/**
 * Render a squiggly annotation.
 */
export function renderSquiggly(
    layer: HTMLElement,
    annotation: SquigglyAnnotation,
    scale: number
): HTMLElement {
    const container = document.createElement("div");
    container.className = "udoc-annotation udoc-annotation--squiggly";
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.pointerEvents = "none";

    const opacity = annotation.opacity ?? 1;
    for (const quad of annotation.quads) {
        const lineEl = createSquigglyElement(quad, scale, annotation.color, opacity);
        container.appendChild(lineEl);
    }

    layer.appendChild(container);
    return container;
}

// =============================================================================
// Helpers
// =============================================================================

function createQuadElement(
    quad: Quad,
    scale: number,
    color: { r: number; g: number; b: number } | undefined,
    opacity: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation__quad";

    // Convert quad points to CSS clip-path polygon
    const points = quad.points
        .map(p => `${p.x * scale}px ${p.y * scale}px`)
        .join(", ");

    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.clipPath = `polygon(${points})`;
    el.style.backgroundColor = colorToRgba(color, opacity);

    return el;
}

function createUnderlineElement(
    quad: Quad,
    scale: number,
    color: { r: number; g: number; b: number } | undefined,
    opacity: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation__line";

    // Use bottom edge of quad for underline position
    // Points order: [bottom-left, bottom-right, top-right, top-left]
    const [bl, br] = quad.points;
    const x = Math.min(bl.x, br.x) * scale;
    const y = Math.max(bl.y, br.y) * scale;
    const width = Math.abs(br.x - bl.x) * scale;

    el.style.position = "absolute";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${width}px`;
    el.style.height = "1px";
    el.style.backgroundColor = colorToRgba(color, opacity, "rgba(0, 0, 255, 1)");

    return el;
}

function createStrikeOutElement(
    quad: Quad,
    scale: number,
    color: { r: number; g: number; b: number } | undefined,
    opacity: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation__line";

    // Use middle of quad for strikeout position
    const [bl, br, _tr, tl] = quad.points;
    const x = Math.min(bl.x, tl.x) * scale;
    const y = ((bl.y + tl.y) / 2) * scale;
    const width = Math.abs(br.x - bl.x) * scale;

    el.style.position = "absolute";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${width}px`;
    el.style.height = "1px";
    el.style.backgroundColor = colorToRgba(color, opacity, "rgba(255, 0, 0, 1)");

    return el;
}

function createSquigglyElement(
    quad: Quad,
    scale: number,
    color: { r: number; g: number; b: number } | undefined,
    opacity: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation__squiggly";

    // Use bottom edge of quad
    const [bl, br] = quad.points;
    const x = Math.min(bl.x, br.x) * scale;
    const y = Math.max(bl.y, br.y) * scale;
    const width = Math.abs(br.x - bl.x) * scale;

    el.style.position = "absolute";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${width}px`;
    el.style.height = "3px";

    // Squiggly line via repeating gradient
    const colorStr = colorToRgb(color, "rgb(255, 0, 0)");
    el.style.backgroundImage = `repeating-linear-gradient(90deg, ${colorStr}, ${colorStr} 2px, transparent 2px, transparent 4px)`;
    el.style.opacity = String(opacity);

    return el;
}
