import type { Spread as SpreadData, PageSlot } from "../layout/spreadLayout";
import { makeRenderKey, type WorkerClient } from "../../../worker/index.js";
import { getPointsToPixels, type PageRotation, type PageInfo } from "../state";
import { getDevicePixelRatio, toCssPixels, toDevicePixels, snapToDevice } from "../layout";
import { renderAnnotationsToLayer, type Annotation } from "../annotation";
import { renderTextToLayer, attachSelectionController, type TextRun } from "../text";

export interface HighlightedAnnotation {
    pageIndex: number;
    bounds: { x: number; y: number; width: number; height: number };
}

export interface SpreadRenderOptions {
    docId: string;
    scale: number;
    dpi: number;
}

export interface SpreadLayoutOptions {
    pageInfos: readonly PageInfo[];
    scale: number;
    dpi: number;
    rotation: PageRotation;
    pageSpacing: number;
}

interface PageSlotElement {
    container: HTMLDivElement;
    canvas: HTMLCanvasElement | null;
    textLayer: HTMLDivElement | null;
    annotationLayer: HTMLDivElement | null;
    pageNumber: PageSlot;
    renderKey: string;
    pendingKey: string | null;
    renderToken: number;
    cssWidth: number;
    cssHeight: number;
    /** Last rendered annotations (for change detection) */
    lastAnnotations: Annotation[] | null;
    /** Last scale used for annotation rendering */
    lastAnnotationScale: number;
    /** Last highlighted annotation bounds (for change detection) */
    lastHighlightedBounds: HighlightedAnnotation["bounds"] | null;
    /** Last rendered text runs (for change detection) */
    lastTextRuns: TextRun[] | null;
    /** Last scale used for text rendering */
    lastTextScale: number;
    /** Cleanup function for text selection controller */
    cleanupSelectionController: (() => void) | null;
}

interface SlotSize {
    width: number;
    height: number;
}

function normalizeRotation(rotation: PageRotation): 0 | 90 | 180 | 270 {
    switch (rotation) {
        case 90:
        case 180:
        case 270:
            return rotation;
        default:
            return 0;
    }
}

function rotateSize(size: SlotSize, rotation: PageRotation): SlotSize {
    const normalized = normalizeRotation(rotation);
    if (normalized === 90 || normalized === 270) {
        return { width: size.height, height: size.width };
    }
    return size;
}

/**
 * Combine document rotation with user rotation to get effective rotation.
 * Both rotations are in degrees (0, 90, 180, 270).
 */
function combineRotation(documentRotation: PageRotation, userRotation: PageRotation): PageRotation {
    const combined = (documentRotation + userRotation) % 360;
    return normalizeRotation(combined as PageRotation);
}


function formatCssSize(value: number): string {
    return `${value.toFixed(3)}px`;
}

/**
 * Spread component - renders one or two pages side by side.
 * Empty slots render as blank placeholders that preserve layout.
 */
export function createSpread(data: SpreadData) {
    const el = document.createElement("div");
    el.className = "udoc-spread";
    el.dataset.spreadIndex = String(data.index);

    const slotElements: PageSlotElement[] = [];
    let mounted = false;

    for (const slot of data.slots) {
        const slotEl = createSlotElement(slot);
        slotElements.push(slotEl);
        el.appendChild(slotEl.container);
    }

    function createSlotElement(pageNumber: PageSlot): PageSlotElement {
        const container = document.createElement("div");
        container.className = "udoc-spread__slot";
        container.style.position = "relative";
        container.style.overflow = "hidden";

        if (pageNumber !== null) {
            container.dataset.page = String(pageNumber);
            const canvas = document.createElement("canvas");
            canvas.className = "udoc-spread__canvas";
            canvas.style.position = "absolute";
            canvas.style.transformOrigin = "center";
            container.appendChild(canvas);

            // Text layer (above canvas, below annotations) - for text selection
            const textLayer = document.createElement("div");
            textLayer.className = "udoc-spread__text-layer";
            textLayer.style.position = "absolute";
            textLayer.style.transformOrigin = "center";
            container.appendChild(textLayer);

            // Attach selection controller to prevent selection reversal in gaps
            const cleanupSelectionController = attachSelectionController(textLayer);

            // Annotation layer (above text layer)
            const annotationLayer = document.createElement("div");
            annotationLayer.className = "udoc-spread__annotation-layer";
            annotationLayer.style.position = "absolute";
            annotationLayer.style.transformOrigin = "center";
            annotationLayer.style.pointerEvents = "none";
            container.appendChild(annotationLayer);

            return {
                container,
                canvas,
                textLayer,
                annotationLayer,
                pageNumber,
                renderKey: "",
                pendingKey: null,
                renderToken: 0,
                cssWidth: 0,
                cssHeight: 0,
                lastAnnotations: null,
                lastAnnotationScale: 0,
                lastHighlightedBounds: null,
                lastTextRuns: null,
                lastTextScale: 0,
                cleanupSelectionController
            };
        }

        container.classList.add("udoc-spread__slot--empty");
        return {
            container,
            canvas: null,
            textLayer: null,
            annotationLayer: null,
            pageNumber: null,
            renderKey: "",
            pendingKey: null,
            renderToken: 0,
            cssWidth: 0,
            cssHeight: 0,
            lastAnnotations: null,
            lastAnnotationScale: 0,
            lastHighlightedBounds: null,
            lastTextRuns: null,
            lastTextScale: 0,
            cleanupSelectionController: null
        };
    }

    function updateLayout(options: SpreadLayoutOptions): void {
        const dpr = getDevicePixelRatio();
        const pointsToPixels = getPointsToPixels(options.dpi);
        const userRotation = normalizeRotation(options.rotation);

        const gapCss = toCssPixels(toDevicePixels(options.pageSpacing, dpr), dpr);
        el.style.gap = `${gapCss}px`;

        let referenceSize: SlotSize | null = null;
        for (const slotEl of slotElements) {
            if (slotEl.pageNumber === null) continue;
            const pageInfo = options.pageInfos[slotEl.pageNumber - 1];
            if (pageInfo) {
                referenceSize = {
                    width: pageInfo.width * pointsToPixels * options.scale,
                    height: pageInfo.height * pointsToPixels * options.scale
                };
                break;
            }
        }

        for (const slotEl of slotElements) {
            const pageInfo = slotEl.pageNumber === null
                ? null
                : options.pageInfos[slotEl.pageNumber - 1];

            const baseSize = pageInfo
                ? {
                    width: pageInfo.width * pointsToPixels * options.scale,
                    height: pageInfo.height * pointsToPixels * options.scale
                }
                : referenceSize;

            if (!baseSize) {
                slotEl.container.style.width = "0px";
                slotEl.container.style.height = "0px";
                continue;
            }

            // Combine document rotation (from PDF) with user rotation (viewer setting)
            const documentRotation = normalizeRotation((pageInfo?.rotation ?? 0) as PageRotation);
            const effectiveRotation = combineRotation(documentRotation, userRotation);

            const baseWidthDevice = toDevicePixels(baseSize.width, dpr);
            const baseHeightDevice = toDevicePixels(baseSize.height, dpr);
            const rotatedSize = rotateSize({ width: baseWidthDevice, height: baseHeightDevice }, effectiveRotation);
            slotEl.container.style.width = formatCssSize(toCssPixels(rotatedSize.width, dpr));
            slotEl.container.style.height = formatCssSize(toCssPixels(rotatedSize.height, dpr));

            slotEl.cssWidth = toCssPixels(baseWidthDevice, dpr);
            slotEl.cssHeight = toCssPixels(baseHeightDevice, dpr);

            // Calculate pixel-snapped center position for the canvas
            // Container dimensions (rotated)
            const containerWidth = toCssPixels(rotatedSize.width, dpr);
            const containerHeight = toCssPixels(rotatedSize.height, dpr);
            // Center position to place canvas center at container center
            const centerLeft = snapToDevice((containerWidth - slotEl.cssWidth) / 2, dpr);
            const centerTop = snapToDevice((containerHeight - slotEl.cssHeight) / 2, dpr);

            if (slotEl.canvas) {
                slotEl.canvas.style.width = formatCssSize(slotEl.cssWidth);
                slotEl.canvas.style.height = formatCssSize(slotEl.cssHeight);
                slotEl.canvas.style.left = formatCssSize(centerLeft);
                slotEl.canvas.style.top = formatCssSize(centerTop);
                slotEl.canvas.style.transform = effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }

            // Update text layer to match canvas position/transform
            if (slotEl.textLayer) {
                slotEl.textLayer.style.width = formatCssSize(slotEl.cssWidth);
                slotEl.textLayer.style.height = formatCssSize(slotEl.cssHeight);
                slotEl.textLayer.style.left = formatCssSize(centerLeft);
                slotEl.textLayer.style.top = formatCssSize(centerTop);
                slotEl.textLayer.style.transform = effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }

            // Update annotation layer to match canvas position/transform
            if (slotEl.annotationLayer) {
                slotEl.annotationLayer.style.width = formatCssSize(slotEl.cssWidth);
                slotEl.annotationLayer.style.height = formatCssSize(slotEl.cssHeight);
                slotEl.annotationLayer.style.left = formatCssSize(centerLeft);
                slotEl.annotationLayer.style.top = formatCssSize(centerTop);
                slotEl.annotationLayer.style.transform = effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }
        }
    }

    async function render(
        workerClient: WorkerClient,
        options: SpreadRenderOptions
    ): Promise<void> {
        const dpr = getDevicePixelRatio();
        const pointsToPixels = getPointsToPixels(options.dpi);
        const renderScale = pointsToPixels * options.scale * dpr;

        for (const slotEl of slotElements) {
            if (slotEl.pageNumber === null || slotEl.canvas === null) {
                slotEl.renderKey = "";
                slotEl.pendingKey = null;
                continue;
            }

            const key = makeRenderKey(options.docId, slotEl.pageNumber, "page", renderScale);
            if (slotEl.renderKey === key || slotEl.pendingKey === key) continue;

            const token = ++slotEl.renderToken;
            slotEl.pendingKey = key;

            try {
                const result = await workerClient.requestRender({
                    docId: options.docId,
                    page: slotEl.pageNumber,
                    type: "page",
                    scale: renderScale
                });

                if (!mounted || slotEl.renderToken !== token) {
                    if (slotEl.pendingKey === key) slotEl.pendingKey = null;
                    continue;
                }

                const canvas = slotEl.canvas;
                let targetWidth: number;
                let targetHeight: number;
                if (slotEl.cssWidth > 0 && slotEl.cssHeight > 0) {
                    targetWidth = Math.max(1, Math.round(slotEl.cssWidth * dpr));
                    targetHeight = Math.max(1, Math.round(slotEl.cssHeight * dpr));
                    canvas.style.width = formatCssSize(slotEl.cssWidth);
                    canvas.style.height = formatCssSize(slotEl.cssHeight);
                } else {
                    targetWidth = result.width;
                    targetHeight = result.height;
                }
                if (canvas.width !== targetWidth) canvas.width = targetWidth;
                if (canvas.height !== targetHeight) canvas.height = targetHeight;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (canvas.width === result.width && canvas.height === result.height) {
                        ctx.drawImage(result.bitmap, 0, 0);
                    } else {
                        ctx.drawImage(result.bitmap, 0, 0, canvas.width, canvas.height);
                    }
                }

                slotEl.renderKey = key;
            } catch (error) {
                if ((error as Error).message !== "Request cancelled") {
                    console.error(`Spread render failed for page ${slotEl.pageNumber}:`, error);
                }
            } finally {
                if (slotEl.pendingKey === key) slotEl.pendingKey = null;
            }
        }
    }

    function mount(container: HTMLElement): void {
        container.appendChild(el);
        mounted = true;
    }

    function destroy(): void {
        mounted = false;
        for (const slotEl of slotElements) {
            slotEl.renderKey = "";
            slotEl.pendingKey = null;
            slotEl.renderToken = 0;
            // Cleanup selection controller event listeners
            if (slotEl.cleanupSelectionController) {
                slotEl.cleanupSelectionController();
                slotEl.cleanupSelectionController = null;
            }
        }
        el.remove();
    }

    function getElement(): HTMLDivElement {
        return el;
    }

    function getData(): SpreadData {
        return data;
    }

    function updateAnnotations(
        annotations: Map<number, Annotation[]>,
        options: SpreadLayoutOptions,
        highlightedAnnotation?: HighlightedAnnotation | null
    ): void {
        const pointsToPixels = getPointsToPixels(options.dpi);
        const scale = pointsToPixels * options.scale;

        for (const slotEl of slotElements) {
            if (!slotEl.annotationLayer || slotEl.pageNumber === null) continue;

            // pageNumber is 1-based, annotations map is 0-based
            const pageIndex = slotEl.pageNumber - 1;
            const pageAnnotations = annotations.get(pageIndex);

            // Check if this page has a highlighted annotation
            const highlightBounds = highlightedAnnotation?.pageIndex === pageIndex
                ? highlightedAnnotation.bounds
                : null;

            // Skip if annotations, scale, and highlight haven't changed
            // Use epsilon comparison for scale to prevent oscillation from floating-point drift
            const scaleUnchanged = Math.abs(scale - slotEl.lastAnnotationScale) < 0.0001;
            if (
                pageAnnotations === slotEl.lastAnnotations &&
                scaleUnchanged &&
                highlightBounds === slotEl.lastHighlightedBounds
            ) {
                continue;
            }

            // Render and cache
            renderAnnotationsToLayer(slotEl.annotationLayer, pageAnnotations || [], scale, highlightBounds);
            slotEl.lastAnnotations = pageAnnotations ?? null;
            slotEl.lastAnnotationScale = scale;
            slotEl.lastHighlightedBounds = highlightBounds;
        }
    }

    function updateTextLayer(
        textContent: Map<number, TextRun[]>,
        options: SpreadLayoutOptions
    ): void {
        const pointsToPixels = getPointsToPixels(options.dpi);
        const scale = pointsToPixels * options.scale;

        for (const slotEl of slotElements) {
            if (!slotEl.textLayer || slotEl.pageNumber === null) continue;

            // pageNumber is 1-based, text map is 0-based
            const pageIndex = slotEl.pageNumber - 1;
            const pageText = textContent.get(pageIndex);
            const pageInfo = options.pageInfos[pageIndex];

            // Skip if text and scale haven't changed
            const scaleUnchanged = Math.abs(scale - slotEl.lastTextScale) < 0.0001;
            if (pageText === slotEl.lastTextRuns && scaleUnchanged) {
                continue;
            }

            // Render and cache
            // Pass page height for Y-coordinate flipping (PDF Y=0 is at bottom)
            const pageHeight = pageInfo?.height ?? 0;
            renderTextToLayer(slotEl.textLayer, pageText || [], scale, pageHeight);
            slotEl.lastTextRuns = pageText ?? null;
            slotEl.lastTextScale = scale;
        }
    }

    return {
        el,
        mount,
        destroy,
        render,
        updateLayout,
        updateAnnotations,
        updateTextLayer,
        getElement,
        getData
    };
}

export type SpreadComponent = ReturnType<typeof createSpread>;
