/**
 * Renderer for link annotations.
 */
import type { LinkAnnotation } from "./types";
import { applyBoundsStyle } from "./utils";

/**
 * Render a link annotation.
 */
export function renderLink(
    layer: HTMLElement,
    annotation: LinkAnnotation,
    scale: number
): HTMLElement {
    const el = document.createElement("div");
    el.className = "udoc-annotation udoc-annotation--link";
    applyBoundsStyle(el, annotation.bounds, scale);
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";

    if (annotation.action) {
        el.dataset.action = JSON.stringify(annotation.action);
    }

    layer.appendChild(el);
    return el;
}
