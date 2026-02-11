/**
 * Renderer for text annotations: text (sticky note), freeText, stamp, caret.
 */
import type {
    TextAnnotation,
    FreeTextAnnotation,
    StampAnnotation,
    CaretAnnotation,
    MarkupMetadata
} from "./types";
import { colorToRgb, scaleBounds, createSvgOverlay, createSvgElement } from "./utils";

/** Fixed icon size for sticky note annotations (in CSS pixels). */
const STICKY_NOTE_ICON_SIZE = 18;

/** Default sticky note color (yellow-orange). */
const DEFAULT_STICKY_NOTE_COLOR = { r: 1, g: 0.8, b: 0.2 };

/** Callback for showing annotation popup. */
export type ShowPopupCallback = (
    anchor: HTMLElement,
    metadata: MarkupMetadata,
    color: string
) => void;

/**
 * Create SVG icon for sticky note with specified color.
 */
function createStickyNoteSvg(color: { r: number; g: number; b: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const fill = `rgb(${r}, ${g}, ${b})`;
    // Darker shade for stroke
    const strokeR = Math.round(color.r * 180);
    const strokeG = Math.round(color.g * 180);
    const strokeB = Math.round(color.b * 180);
    const stroke = `rgb(${strokeR}, ${strokeG}, ${strokeB})`;

    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
</svg>`;
}

/**
 * Render a text (sticky note) annotation.
 */
export function renderText(
    layer: HTMLElement,
    annotation: TextAnnotation,
    scale: number,
    onShowPopup?: ShowPopupCallback
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation udoc-annotation--text";

    // Position at bottom-left of bounds (PDF anchor point), with fixed icon size
    el.style.position = "absolute";
    el.style.left = `${annotation.bounds.x * scale}px`;
    el.style.top = `${(annotation.bounds.y + annotation.bounds.height) * scale - STICKY_NOTE_ICON_SIZE}px`;
    el.style.width = `${STICKY_NOTE_ICON_SIZE}px`;
    el.style.height = `${STICKY_NOTE_ICON_SIZE}px`;
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";

    // Create SVG with annotation color or default
    const color = annotation.color || DEFAULT_STICKY_NOTE_COLOR;
    el.innerHTML = createStickyNoteSvg(color);

    // Store annotation data for popup
    el.dataset.annotationType = "text";
    el.dataset.annotation = JSON.stringify({
        contents: annotation.contents,
        metadata: annotation.metadata
    });

    // Set tooltip as fallback
    const contents = annotation.metadata?.contents || annotation.contents;
    if (contents) {
        el.title = contents;
    }

    // Add click handler for popup
    if (annotation.metadata && onShowPopup) {
        const colorStr = colorToRgb(color, "rgb(255, 208, 0)");
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            onShowPopup(el, annotation.metadata!, colorStr);
        });
    }

    layer.appendChild(el);
    return el;
}

/**
 * Render a free text annotation.
 */
export function renderFreeText(
    layer: HTMLElement,
    annotation: FreeTextAnnotation,
    scale: number
): HTMLElement {
    const scaled = scaleBounds(annotation.bounds, scale);
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const borderColor = colorToRgb(annotation.borderColor, "transparent");

    const el = document.createElement("div");
    el.className = "udoc-annotation udoc-annotation--freetext";
    el.style.position = "absolute";
    el.style.left = `${scaled.x}px`;
    el.style.top = `${scaled.y}px`;
    el.style.width = `${scaled.width}px`;
    el.style.height = `${scaled.height}px`;
    el.style.color = color;
    el.style.border = `1px solid ${borderColor}`;
    el.style.fontSize = `${12 * (scale / 96 * 72)}px`; // Approximate font scaling
    el.style.fontFamily = "Helvetica, Arial, sans-serif";
    el.style.textAlign = annotation.justification || "left";
    el.style.overflow = "hidden";
    el.style.wordWrap = "break-word";
    el.style.pointerEvents = "none";
    el.style.padding = "2px";
    el.style.boxSizing = "border-box";

    if (annotation.contents) {
        el.textContent = annotation.contents;
    }

    // Render callout line if present
    if (annotation.calloutLine && annotation.calloutLine.length >= 2) {
        const svg = createSvgOverlay();
        const lineColor = colorToRgb(annotation.borderColor, "rgb(0, 0, 0)");
        const strokeWidth = Math.max(1, scale);

        const pathData = annotation.calloutLine
            .map((point, i) => {
                const x = point.x * scale;
                const y = point.y * scale;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

        const path = createSvgElement("path");
        path.setAttribute("d", pathData);
        path.setAttribute("stroke", lineColor);
        path.setAttribute("stroke-width", String(strokeWidth));
        path.setAttribute("fill", "none");
        svg.appendChild(path);

        layer.appendChild(svg);
    }

    layer.appendChild(el);
    return el;
}

/**
 * Render a stamp annotation.
 */
export function renderStamp(
    layer: HTMLElement,
    annotation: StampAnnotation,
    scale: number
): HTMLElement {
    const scaled = scaleBounds(annotation.bounds, scale);
    const color = colorToRgb(annotation.color, "rgb(255, 0, 0)");

    const el = document.createElement("div");
    el.className = "udoc-annotation udoc-annotation--stamp";
    el.style.position = "absolute";
    el.style.left = `${scaled.x}px`;
    el.style.top = `${scaled.y}px`;
    el.style.width = `${scaled.width}px`;
    el.style.height = `${scaled.height}px`;
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.pointerEvents = "none";

    // Only show text for standard stamps without custom appearance
    if (!annotation.hasCustomAppearance && annotation.name) {
        // Estimate zoom factor from scale (scale ≈ 1.333 * zoom at 96 DPI)
        const zoomFactor = scale / 1.333;
        const label = document.createElement("span");
        label.style.color = color;
        label.style.fontSize = `${Math.min(scaled.height * 0.4, 16 * zoomFactor)}px`;
        label.style.fontWeight = "bold";
        label.style.fontFamily = "Helvetica, Arial, sans-serif";
        label.style.textTransform = "uppercase";
        label.style.border = `2px solid ${color}`;
        label.style.padding = `${2 * zoomFactor}px ${4 * zoomFactor}px`;
        label.style.transform = "rotate(-15deg)";
        label.style.whiteSpace = "nowrap";
        label.textContent = annotation.name;
        el.appendChild(label);
    }

    layer.appendChild(el);
    return el;
}

/** Fixed caret icon size (in CSS pixels at 100% zoom) */
const CARET_ICON_SIZE = 12;

/**
 * Render a caret annotation.
 */
export function renderCaret(
    layer: HTMLElement,
    annotation: CaretAnnotation,
    scale: number
): Element {
    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 128, 255)");
    const opacity = annotation.opacity ?? 1;

    const scaled = scaleBounds(annotation.bounds, scale);

    const g = createSvgElement("g");
    g.setAttribute("opacity", String(opacity));

    // Use fixed icon size scaled by zoom (scale already includes zoom factor)
    // At 100% zoom with 96 DPI, scale is approximately 1.333
    const zoomFactor = scale / 1.333; // Approximate zoom factor
    const iconSize = Math.max(CARET_ICON_SIZE * zoomFactor, scaled.height);

    // Draw caret symbol (^) or paragraph marker
    if (annotation.symbol === "P") {
        // Paragraph symbol (pilcrow)
        const text = createSvgElement("text");
        text.setAttribute("x", String(scaled.x + scaled.width / 2));
        text.setAttribute("y", String(scaled.y + scaled.height * 0.8));
        text.setAttribute("fill", color);
        text.setAttribute("font-size", String(iconSize));
        text.setAttribute("text-anchor", "middle");
        text.textContent = "\u00B6"; // Pilcrow sign
        g.appendChild(text);
    } else {
        // Default caret (^) - draw as an inverted V
        const caretHeight = Math.min(scaled.height, iconSize);
        const caretWidth = caretHeight * 0.8;
        const centerX = scaled.x + scaled.width / 2;
        const bottomY = scaled.y + scaled.height;

        const path = createSvgElement("path");
        path.setAttribute(
            "d",
            `M ${centerX - caretWidth / 2} ${bottomY} L ${centerX} ${bottomY - caretHeight} L ${centerX + caretWidth / 2} ${bottomY}`
        );
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", String(Math.max(2, 2 * zoomFactor)));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        g.appendChild(path);
    }

    svg.appendChild(g);
    layer.appendChild(svg);
    return svg;
}
