/**
 * Main annotation rendering module.
 *
 * Coordinates all specialized renderers and provides a unified API.
 */
import type {
    Annotation,
    HighlightAnnotation,
    UnderlineAnnotation,
    StrikeOutAnnotation,
    SquigglyAnnotation,
    TextAnnotation,
    FreeTextAnnotation,
    StampAnnotation,
    CaretAnnotation,
    LineAnnotation,
    SquareAnnotation,
    CircleAnnotation,
    PolygonAnnotation,
    PolyLineAnnotation,
    InkAnnotation,
    RedactAnnotation,
    LinkAnnotation,
    Rect,
    MarkupMetadata
} from "./types";
import { boundsMatch, applyBoundsStyle } from "./utils";
import * as MarkupRenderer from "./MarkupRenderer";
import * as LinkRenderer from "./LinkRenderer";
import * as TextRenderer from "./TextRenderer";
import * as ShapeRenderer from "./ShapeRenderer";

export type { ShowPopupCallback } from "./TextRenderer";

/** Check if annotation type uses full-layer SVG overlay or inset: 0 container. */
function isSvgBasedAnnotation(type: string): boolean {
    // These annotation types render as full-layer SVG overlays
    return (
        type === "caret" ||
        type === "line" ||
        type === "square" ||
        type === "circle" ||
        type === "polygon" ||
        type === "polyLine" ||
        type === "ink" ||
        type === "redact"
    );
}

/** Check if annotation type uses full-layer container (inset: 0). */
function isFullLayerAnnotation(type: string): boolean {
    return type === "highlight" || type === "underline" || type === "strikeOut" || type === "squiggly";
}

/**
 * Create a highlight indicator element for an annotation.
 * Used for full-layer annotations where we can't just add a class to the container.
 */
function createHighlightIndicator(bounds: Rect, scale: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation-highlight-indicator";
    applyBoundsStyle(el, bounds, scale);
    return el;
}

/**
 * Render a single annotation element.
 */
export function renderAnnotation(
    layer: HTMLElement,
    annotation: Annotation,
    scale: number,
    onShowPopup?: TextRenderer.ShowPopupCallback
): Element | null {
    switch (annotation.type) {
        // Link
        case "link":
            return LinkRenderer.renderLink(layer, annotation as LinkAnnotation, scale);

        // Markup annotations
        case "highlight":
            return MarkupRenderer.renderHighlight(layer, annotation as HighlightAnnotation, scale);
        case "underline":
            return MarkupRenderer.renderUnderline(layer, annotation as UnderlineAnnotation, scale);
        case "strikeOut":
            return MarkupRenderer.renderStrikeOut(layer, annotation as StrikeOutAnnotation, scale);
        case "squiggly":
            return MarkupRenderer.renderSquiggly(layer, annotation as SquigglyAnnotation, scale);

        // Text annotations
        case "text":
            return TextRenderer.renderText(layer, annotation as TextAnnotation, scale, onShowPopup);
        case "freeText":
            return TextRenderer.renderFreeText(layer, annotation as FreeTextAnnotation, scale);
        case "stamp":
            return TextRenderer.renderStamp(layer, annotation as StampAnnotation, scale);
        case "caret":
            return TextRenderer.renderCaret(layer, annotation as CaretAnnotation, scale);

        // Shape annotations
        case "line":
            return ShapeRenderer.renderLine(layer, annotation as LineAnnotation, scale);
        case "square":
            return ShapeRenderer.renderSquare(layer, annotation as SquareAnnotation, scale);
        case "circle":
            return ShapeRenderer.renderCircle(layer, annotation as CircleAnnotation, scale);
        case "polygon":
            return ShapeRenderer.renderPolygon(layer, annotation as PolygonAnnotation, scale);
        case "polyLine":
            return ShapeRenderer.renderPolyLine(layer, annotation as PolyLineAnnotation, scale);
        case "ink":
            return ShapeRenderer.renderInk(layer, annotation as InkAnnotation, scale);
        case "redact":
            return ShapeRenderer.renderRedact(layer, annotation as RedactAnnotation, scale);

        default:
            // Unknown annotation type - create generic placeholder
            return createGenericAnnotation(layer, annotation, scale);
    }
}

/**
 * Create a generic placeholder for unknown annotation types.
 */
function createGenericAnnotation(
    layer: HTMLElement,
    annotation: Annotation,
    scale: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = `udoc-annotation udoc-annotation--${annotation.type}`;
    applyBoundsStyle(el, annotation.bounds, scale);
    layer.appendChild(el);
    return el;
}

/**
 * Render all annotations into an annotation layer element.
 */
export function renderAnnotationsToLayer(
    layer: HTMLDivElement,
    annotations: Annotation[],
    scale: number,
    highlightBounds?: Rect | null,
    onShowPopup?: TextRenderer.ShowPopupCallback
): void {
    // Skip if no annotations to render
    if (annotations.length === 0) {
        if (layer.childElementCount > 0) {
            layer.innerHTML = "";
        }
        return;
    }

    layer.innerHTML = "";

    for (const annotation of annotations) {
        const el = renderAnnotation(layer, annotation, scale, onShowPopup);
        if (el) {
            // Check if this annotation should be highlighted
            if (highlightBounds && boundsMatch(annotation.bounds, highlightBounds)) {
                if (isFullLayerAnnotation(annotation.type) || isSvgBasedAnnotation(annotation.type)) {
                    // For full-layer or SVG-based annotations, add a separate highlight indicator
                    const indicator = createHighlightIndicator(annotation.bounds, scale);
                    layer.appendChild(indicator);
                } else {
                    // For bounded annotations, add class directly
                    el.classList.add("udoc-annotation--highlighted");
                }
            }
        }
    }
}

// =============================================================================
// Popup Management
// =============================================================================

/** Currently active popup element (only one popup at a time). */
let activePopup: HTMLElement | null = null;

/** Close the currently active popup. */
export function closeAnnotationPopup(): void {
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
}

/** Show popup for an annotation. */
export function showAnnotationPopup(
    annotation: { metadata?: MarkupMetadata; contents?: string },
    anchorEl: HTMLElement,
    container: HTMLElement
): void {
    // Close any existing popup
    closeAnnotationPopup();

    const contents = annotation.metadata?.contents || annotation.contents;
    if (!contents) return;

    const popup = document.createElement("div");
    popup.className = "udoc-annotation-popup";

    // Header with author and close button
    const header = document.createElement("div");
    header.className = "udoc-annotation-popup__header";

    const author = document.createElement("span");
    author.className = "udoc-annotation-popup__author";
    author.textContent = annotation.metadata?.author || "Note";
    header.appendChild(author);

    const closeBtn = document.createElement("button");
    closeBtn.className = "udoc-annotation-popup__close";
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeAnnotationPopup();
    };
    header.appendChild(closeBtn);
    popup.appendChild(header);

    // Content
    const content = document.createElement("div");
    content.className = "udoc-annotation-popup__content";
    content.textContent = contents;
    popup.appendChild(content);

    // Position popup near the anchor element
    const anchorRect = anchorEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Position to the right of the icon, within the container
    const left = anchorRect.right - containerRect.left + 4;
    const top = anchorRect.top - containerRect.top;

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    container.appendChild(popup);
    activePopup = popup;

    // Adjust if popup goes outside container
    requestAnimationFrame(() => {
        const popupRect = popup.getBoundingClientRect();

        // Check right edge
        if (popupRect.right > containerRect.right - 8) {
            // Position to the left of the icon instead
            popup.style.left = `${anchorRect.left - containerRect.left - popupRect.width - 4}px`;
        }

        // Check bottom edge
        if (popupRect.bottom > containerRect.bottom - 8) {
            popup.style.top = `${containerRect.bottom - containerRect.top - popupRect.height - 8}px`;
        }
    });
}
