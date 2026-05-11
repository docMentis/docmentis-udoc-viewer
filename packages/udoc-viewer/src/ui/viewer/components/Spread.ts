import type { Spread as SpreadData, PageSlot } from "../layout/spreadLayout";
import { makeRenderKey, type WorkerClient } from "../../../worker/index.js";
import { getPointsToPixels, type PageRotation, type PageInfo } from "../state";
import { getDevicePixelRatio, getEffectiveDpr, toCssPixels, toDevicePixels, snapToDevice } from "../layout";
import { renderAnnotationsToLayer, type Annotation } from "../annotation";
import { renderTextToLayer, attachSelectionController } from "../text";
import type { LayoutPage } from "../../../worker/index.js";
import type { SearchMatch } from "../state";
import type { I18n } from "../i18n/index.js";
import { createBranding, type BrandingHandle } from "./Branding";

export interface HighlightedAnnotation {
    pageIndex: number;
    bounds: { x: number; y: number; width: number; height: number };
}

export interface SpreadRenderOptions {
    docId: string;
    scale: number;
    dpi: number;
}

/**
 * How to crop pages to contentRect in continuous view mode.
 * - "none": no cropping (paged mode)
 * - "vertical": crop top/bottom only, keep full page width (Word/PDF/PPTX continuous)
 * - "full": crop all four sides (XLSX grid continuous)
 */
export type CropMode = "none" | "vertical" | "full";

export interface SpreadLayoutOptions {
    pageInfos: readonly PageInfo[];
    scale: number;
    dpi: number;
    rotation: PageRotation;
    pageSpacing: number;
    /** How to crop pages to contentRect (continuous view mode) */
    cropMode?: CropMode;
}

interface PageSlotElement {
    container: HTMLDivElement;
    canvas: HTMLCanvasElement | null;
    previewCanvas: HTMLCanvasElement | null;
    textLayer: HTMLDivElement | null;
    annotationLayer: HTMLDivElement | null;
    searchHighlightLayer: HTMLDivElement | null;
    pageNumber: PageSlot;
    renderKey: string;
    pendingKey: string | null;
    previewRenderKey: string;
    renderToken: number;
    loadingTimer: ReturnType<typeof setTimeout> | null;
    cssWidth: number;
    cssHeight: number;
    /** Last rendered annotations (for change detection) */
    lastAnnotations: Annotation[] | null;
    /** Last scale used for annotation rendering */
    lastAnnotationScale: number;
    /** Last highlighted annotation bounds (for change detection) */
    lastHighlightedBounds: HighlightedAnnotation["bounds"] | null;
    /** Last rendered text runs (for change detection) */
    lastTextLayout: LayoutPage | null;
    /** Last scale used for text rendering */
    lastTextScale: number;
    /** Cleanup function for text selection controller */
    cleanupSelectionController: (() => void) | null;
    /** Cleanup function for attribution tamper protection */
    cleanupAttrObserver: (() => void) | null;
    /** Last search matches rendered on this page (for change detection) */
    lastSearchMatches: SearchMatch[] | null;
    /** Last active search index */
    lastSearchActiveIndex: number;
    /** Last scale used for search highlight rendering */
    lastSearchScale: number;
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
export function createSpread(data: SpreadData, showAttribution = true, i18n?: I18n) {
    const el = document.createElement("div");
    el.className = "udoc-spread";
    el.dataset.spreadIndex = String(data.index);

    // Wrapper groups page slots for seamless connection and CSS centering
    const wrapper = document.createElement("div");
    wrapper.className = "udoc-spread__wrapper";
    el.appendChild(wrapper);

    const slotElements: PageSlotElement[] = [];
    let mounted = false;

    for (const slot of data.slots) {
        const slotEl = createSlotElement(slot);
        slotElements.push(slotEl);
        wrapper.appendChild(slotEl.container);
    }

    function createSlotElement(pageNumber: PageSlot): PageSlotElement {
        const container = document.createElement("div");
        container.className = "udoc-spread__slot";
        container.style.position = "relative";
        container.style.overflow = "hidden";

        if (pageNumber !== null) {
            container.dataset.page = String(pageNumber);
            container.setAttribute("role", "group");
            container.setAttribute(
                "aria-label",
                i18n ? i18n.t("spread.pageLabel", { page: pageNumber }) : `Page ${pageNumber}`,
            );
            // Delay showing the loading indicator — if render completes quickly
            // (cached/prerendered), the user never sees it.
            const loadingTimer = setTimeout(() => {
                container.classList.add("udoc-spread__slot--loading");
            }, 200);

            // Preview canvas (behind main canvas) — shows low-res preview while full-res renders
            const previewCanvas = document.createElement("canvas");
            previewCanvas.className = "udoc-spread__preview-canvas";
            previewCanvas.style.position = "absolute";
            previewCanvas.style.transformOrigin = "center";
            previewCanvas.style.display = "none";
            previewCanvas.setAttribute("aria-hidden", "true");
            container.appendChild(previewCanvas);

            const canvas = document.createElement("canvas");
            canvas.className = "udoc-spread__canvas";
            canvas.style.position = "absolute";
            canvas.style.transformOrigin = "center";
            canvas.setAttribute(
                "aria-label",
                i18n ? i18n.t("spread.pageContent", { page: pageNumber }) : `Page ${pageNumber} content`,
            );
            canvas.textContent = i18n ? i18n.t("spread.pageLabel", { page: pageNumber }) : `Page ${pageNumber}`;
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

            // Search highlight layer (above annotation layer)
            const searchHighlightLayer = document.createElement("div");
            searchHighlightLayer.className = "udoc-spread__search-highlight-layer";
            searchHighlightLayer.style.position = "absolute";
            searchHighlightLayer.style.transformOrigin = "center";
            searchHighlightLayer.style.pointerEvents = "none";
            container.appendChild(searchHighlightLayer);

            // Rendering indicator with optional brand logo.
            // Outer wrapper handles positioning + slot-loading-state visibility
            // in light DOM (with a per-instance random class so it can't be
            // statically targeted). The logo itself lives inside a closed
            // shadow root via createBranding.
            let brandingHandle: BrandingHandle | null = null;
            {
                const indicatorClass =
                    "_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
                const textClass = "_" + Math.random().toString(36).slice(2, 10);

                const indicatorStyle = document.createElement("style");
                indicatorStyle.textContent = `
                    .${indicatorClass} {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        pointer-events: none;
                        z-index: 1;
                        user-select: none;
                        opacity: 0.5;
                    }
                    .${textClass} {
                        font-size: 11px;
                        font-weight: 500;
                        color: #0f172a;
                    }
                    .udoc-viewer-dark .${textClass} {
                        color: #e2e8f0;
                    }
                    .udoc-spread__slot:not(.udoc-spread__slot--loading) .${indicatorClass} {
                        display: none;
                    }
                `;
                container.appendChild(indicatorStyle);

                const renderingLabel = i18n ? i18n.t("spread.rendering") : "Rendering...";

                const indicator = document.createElement("div");
                indicator.className = indicatorClass;
                if (showAttribution) {
                    brandingHandle = createBranding({ variant: "spread-indicator" });
                    indicator.appendChild(brandingHandle.el);
                }
                const span = document.createElement("span");
                span.className = textClass;
                span.textContent = renderingLabel;
                indicator.appendChild(span);
                container.appendChild(indicator);
                brandingHandle?.start();
            }
            const cleanupAttrObserver: (() => void) | null = brandingHandle ? () => brandingHandle!.destroy() : null;

            return {
                container,
                canvas,
                previewCanvas,
                textLayer,
                annotationLayer,
                searchHighlightLayer,
                pageNumber,
                renderKey: "",
                pendingKey: null,
                previewRenderKey: "",
                renderToken: 0,
                loadingTimer,
                cssWidth: 0,
                cssHeight: 0,
                lastAnnotations: null,
                lastAnnotationScale: 0,
                lastHighlightedBounds: null,
                lastTextLayout: null,
                lastTextScale: 0,
                cleanupSelectionController,
                cleanupAttrObserver,
                lastSearchMatches: null,
                lastSearchActiveIndex: -1,
                lastSearchScale: 0,
            };
        }

        container.classList.add("udoc-spread__slot--empty");
        return {
            container,
            canvas: null,
            previewCanvas: null,
            textLayer: null,
            annotationLayer: null,
            searchHighlightLayer: null,
            pageNumber: null,
            renderKey: "",
            pendingKey: null,
            previewRenderKey: "",
            renderToken: 0,
            loadingTimer: null,
            cssWidth: 0,
            cssHeight: 0,
            lastAnnotations: null,
            lastAnnotationScale: 0,
            lastHighlightedBounds: null,
            lastTextLayout: null,
            lastTextScale: 0,
            cleanupSelectionController: null,
            cleanupAttrObserver: null,
            lastSearchMatches: null,
            lastSearchActiveIndex: -1,
            lastSearchScale: 0,
        };
    }

    function updateLayout(options: SpreadLayoutOptions): void {
        const dpr = getDevicePixelRatio();
        const pointsToPixels = getPointsToPixels(options.dpi);
        const userRotation = normalizeRotation(options.rotation);
        const cropMode = options.cropMode ?? "none";

        const gapCss = toCssPixels(toDevicePixels(options.pageSpacing, dpr), dpr);
        wrapper.style.gap = `${gapCss}px`;

        let referenceSize: SlotSize | null = null;
        for (const slotEl of slotElements) {
            if (slotEl.pageNumber === null) continue;
            const pageInfo = options.pageInfos[slotEl.pageNumber - 1];
            if (pageInfo) {
                referenceSize = {
                    width: pageInfo.width * pointsToPixels * options.scale,
                    height: pageInfo.height * pointsToPixels * options.scale,
                };
                break;
            }
        }

        for (const slotEl of slotElements) {
            const pageInfo = slotEl.pageNumber === null ? null : options.pageInfos[slotEl.pageNumber - 1];

            const baseSize = pageInfo
                ? {
                      width: pageInfo.width * pointsToPixels * options.scale,
                      height: pageInfo.height * pointsToPixels * options.scale,
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

            slotEl.cssWidth = toCssPixels(baseWidthDevice, dpr);
            slotEl.cssHeight = toCssPixels(baseHeightDevice, dpr);

            // Crop the container based on cropMode and contentRect
            const cr = cropMode !== "none" && pageInfo?.contentRect ? pageInfo.contentRect : null;
            let containerWidth: number;
            let containerHeight: number;
            let cropOffsetLeft = 0;
            let cropOffsetTop = 0;

            if (cr) {
                // Content rect offset/size in CSS pixels (pre-rotation)
                const crLeft = cr.x * pointsToPixels * options.scale;
                const crTop = cr.y * pointsToPixels * options.scale;
                const crWidth = cr.width * pointsToPixels * options.scale;
                const crHeight = cr.height * pointsToPixels * options.scale;

                const crWidthDevice = toDevicePixels(crWidth, dpr);
                const crHeightDevice = toDevicePixels(crHeight, dpr);

                if (cropMode === "vertical") {
                    // Vertical crop only: keep full page width, crop top/bottom
                    const crRotatedHeight = rotateSize(
                        { width: crWidthDevice, height: crHeightDevice },
                        effectiveRotation,
                    );
                    containerWidth = toCssPixels(rotatedSize.width, dpr);
                    containerHeight = toCssPixels(crRotatedHeight.height, dpr);

                    const crTopDevice = toDevicePixels(crTop, dpr);
                    // Offset canvas vertically to show content area
                    switch (effectiveRotation) {
                        case 0:
                            cropOffsetTop = -toCssPixels(crTopDevice, dpr);
                            break;
                        case 90:
                            // When rotated 90°, original top becomes left
                            cropOffsetTop = -(
                                slotEl.cssWidth -
                                toCssPixels(toDevicePixels(crLeft, dpr), dpr) -
                                toCssPixels(crWidthDevice, dpr)
                            );
                            break;
                        case 180:
                            cropOffsetTop = -(
                                slotEl.cssHeight -
                                toCssPixels(crTopDevice, dpr) -
                                toCssPixels(crHeightDevice, dpr)
                            );
                            break;
                        case 270:
                            cropOffsetTop = -toCssPixels(toDevicePixels(crLeft, dpr), dpr);
                            break;
                    }
                } else {
                    // Full crop: crop all four sides
                    const crRotated = rotateSize({ width: crWidthDevice, height: crHeightDevice }, effectiveRotation);
                    containerWidth = toCssPixels(crRotated.width, dpr);
                    containerHeight = toCssPixels(crRotated.height, dpr);

                    const crLeftDevice = toDevicePixels(crLeft, dpr);
                    const crTopDevice = toDevicePixels(crTop, dpr);
                    switch (effectiveRotation) {
                        case 0:
                            cropOffsetLeft = -toCssPixels(crLeftDevice, dpr);
                            cropOffsetTop = -toCssPixels(crTopDevice, dpr);
                            break;
                        case 90:
                            cropOffsetLeft = -toCssPixels(crTopDevice, dpr);
                            cropOffsetTop = -(
                                slotEl.cssWidth -
                                toCssPixels(crLeftDevice, dpr) -
                                toCssPixels(crWidthDevice, dpr)
                            );
                            break;
                        case 180:
                            cropOffsetLeft = -(
                                slotEl.cssWidth -
                                toCssPixels(crLeftDevice, dpr) -
                                toCssPixels(crWidthDevice, dpr)
                            );
                            cropOffsetTop = -(
                                slotEl.cssHeight -
                                toCssPixels(crTopDevice, dpr) -
                                toCssPixels(crHeightDevice, dpr)
                            );
                            break;
                        case 270:
                            cropOffsetLeft = -(
                                slotEl.cssHeight -
                                toCssPixels(crTopDevice, dpr) -
                                toCssPixels(crHeightDevice, dpr)
                            );
                            cropOffsetTop = -toCssPixels(crLeftDevice, dpr);
                            break;
                    }
                }
            } else {
                containerWidth = toCssPixels(rotatedSize.width, dpr);
                containerHeight = toCssPixels(rotatedSize.height, dpr);
            }

            slotEl.container.style.width = formatCssSize(containerWidth);
            slotEl.container.style.height = formatCssSize(containerHeight);

            // Canvas position: center if no crop, offset if cropping
            let centerLeft: number;
            let centerTop: number;
            if (cr) {
                centerLeft = cropOffsetLeft;
                centerTop = cropOffsetTop;
            } else {
                centerLeft = snapToDevice((containerWidth - slotEl.cssWidth) / 2, dpr);
                centerTop = snapToDevice((containerHeight - slotEl.cssHeight) / 2, dpr);
            }

            if (slotEl.previewCanvas) {
                slotEl.previewCanvas.style.width = formatCssSize(slotEl.cssWidth);
                slotEl.previewCanvas.style.height = formatCssSize(slotEl.cssHeight);
                slotEl.previewCanvas.style.left = formatCssSize(centerLeft);
                slotEl.previewCanvas.style.top = formatCssSize(centerTop);
                slotEl.previewCanvas.style.transform =
                    effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }

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
                slotEl.annotationLayer.style.transform =
                    effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }

            // Update search highlight layer to match canvas position/transform
            if (slotEl.searchHighlightLayer) {
                slotEl.searchHighlightLayer.style.width = formatCssSize(slotEl.cssWidth);
                slotEl.searchHighlightLayer.style.height = formatCssSize(slotEl.cssHeight);
                slotEl.searchHighlightLayer.style.left = formatCssSize(centerLeft);
                slotEl.searchHighlightLayer.style.top = formatCssSize(centerTop);
                slotEl.searchHighlightLayer.style.transform =
                    effectiveRotation === 0 ? "none" : `rotate(${effectiveRotation}deg)`;
            }
        }
    }

    function drawToCanvas(
        canvas: HTMLCanvasElement,
        result: { bitmap: ImageBitmap; width: number; height: number },
        slotEl: PageSlotElement,
        dpr: number,
    ): void {
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
    }

    /** Scale factor for low-res preview renders (relative to full-res) */
    const PREVIEW_SCALE = 0.15;
    /** Set to true to enable low-res preview rendering while full-res loads */
    const PREVIEW_ENABLED = false;

    async function render(workerClient: WorkerClient, options: SpreadRenderOptions): Promise<void> {
        const dpr = getDevicePixelRatio();
        const pointsToPixels = getPointsToPixels(options.dpi);

        for (const slotEl of slotElements) {
            if (slotEl.pageNumber === null || slotEl.canvas === null) {
                slotEl.renderKey = "";
                slotEl.pendingKey = null;
                continue;
            }

            // Clamp DPR so the canvas stays within iOS Safari's 16M-pixel / 4096px limit at high zoom.
            const effDpr = getEffectiveDpr(slotEl.cssWidth, slotEl.cssHeight, dpr);
            const renderScale = pointsToPixels * options.scale * effDpr;

            const key = makeRenderKey(options.docId, slotEl.pageNumber, "page", renderScale);
            if (slotEl.renderKey === key || slotEl.pendingKey === key) continue;

            const token = ++slotEl.renderToken;
            slotEl.pendingKey = key;

            // Request low-res preview if no content is shown yet
            if (PREVIEW_ENABLED && slotEl.previewCanvas && slotEl.renderKey === "") {
                const previewRenderScale = renderScale * PREVIEW_SCALE;
                const previewKey = makeRenderKey(options.docId, slotEl.pageNumber, "preview", previewRenderScale);
                if (slotEl.previewRenderKey !== previewKey) {
                    workerClient
                        .requestRender({
                            docId: options.docId,
                            page: slotEl.pageNumber,
                            type: "preview",
                            scale: previewRenderScale,
                        })
                        .then((result) => {
                            if (!mounted || slotEl.renderToken !== token) return;
                            // Only show preview if full-res hasn't arrived yet
                            if (slotEl.renderKey === key) return;
                            drawToCanvas(slotEl.previewCanvas!, result, slotEl, effDpr);
                            slotEl.previewCanvas!.style.display = "block";
                            slotEl.previewRenderKey = previewKey;
                            if (slotEl.loadingTimer) {
                                clearTimeout(slotEl.loadingTimer);
                                slotEl.loadingTimer = null;
                            }
                            slotEl.container.classList.remove("udoc-spread__slot--loading");
                        })
                        .catch(() => {
                            /* ignore preview failures */
                        });
                }
            }

            try {
                const result = await workerClient.requestRender({
                    docId: options.docId,
                    page: slotEl.pageNumber,
                    type: "page",
                    scale: renderScale,
                });

                if (!mounted || slotEl.renderToken !== token) {
                    if (slotEl.pendingKey === key) slotEl.pendingKey = null;
                    continue;
                }

                drawToCanvas(slotEl.canvas, result, slotEl, effDpr);
                if (slotEl.loadingTimer) {
                    clearTimeout(slotEl.loadingTimer);
                    slotEl.loadingTimer = null;
                }
                slotEl.container.classList.remove("udoc-spread__slot--loading");

                // Hide preview canvas now that full-res is ready
                if (slotEl.previewCanvas) {
                    slotEl.previewCanvas.style.display = "none";
                }
                slotEl.previewRenderKey = "";

                slotEl.renderKey = key;
            } catch (error) {
                if (mounted && !(error instanceof Error && error.message === "Request cancelled")) {
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
            if (slotEl.cleanupAttrObserver) {
                slotEl.cleanupAttrObserver();
                slotEl.cleanupAttrObserver = null;
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
        highlightedAnnotation?: HighlightedAnnotation | null,
    ): void {
        const pointsToPixels = getPointsToPixels(options.dpi);
        const scale = pointsToPixels * options.scale;

        for (const slotEl of slotElements) {
            if (!slotEl.annotationLayer || slotEl.pageNumber === null) continue;

            // pageNumber is 1-based, annotations map is 0-based
            const pageIndex = slotEl.pageNumber - 1;
            const pageAnnotations = annotations.get(pageIndex);

            // Check if this page has a highlighted annotation
            const highlightBounds =
                highlightedAnnotation?.pageIndex === pageIndex ? highlightedAnnotation.bounds : null;

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

    function updateTextLayer(textContent: Map<number, LayoutPage>, options: SpreadLayoutOptions): void {
        const pointsToPixels = getPointsToPixels(options.dpi);
        const scale = pointsToPixels * options.scale;

        for (const slotEl of slotElements) {
            if (!slotEl.textLayer || slotEl.pageNumber === null) continue;

            const pageIndex = slotEl.pageNumber - 1;
            const layout = textContent.get(pageIndex) ?? null;
            const pageInfo = options.pageInfos[pageIndex];

            const scaleUnchanged = Math.abs(scale - slotEl.lastTextScale) < 0.0001;
            if (layout === slotEl.lastTextLayout && scaleUnchanged) {
                continue;
            }

            const pageHeight = pageInfo?.height ?? 0;
            renderTextToLayer(slotEl.textLayer, layout, scale, pageHeight);
            slotEl.lastTextLayout = layout;
            slotEl.lastTextScale = scale;
        }
    }

    function updateSearchHighlights(matches: SearchMatch[], activeIndex: number, options: SpreadLayoutOptions): void {
        const pointsToPixels = getPointsToPixels(options.dpi);
        const scale = pointsToPixels * options.scale;

        for (const slotEl of slotElements) {
            if (!slotEl.searchHighlightLayer || slotEl.pageNumber === null) continue;

            const pageIndex = slotEl.pageNumber - 1;
            const scaleUnchanged = Math.abs(scale - slotEl.lastSearchScale) < 0.0001;

            // Skip if nothing changed
            if (
                matches === slotEl.lastSearchMatches &&
                activeIndex === slotEl.lastSearchActiveIndex &&
                scaleUnchanged
            ) {
                continue;
            }

            // Clear and re-render
            slotEl.searchHighlightLayer.innerHTML = "";

            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                if (match.pageIndex !== pageIndex) continue;

                const isActive = i === activeIndex;

                for (const rect of match.rects) {
                    const highlightEl = document.createElement("div");
                    highlightEl.className = isActive
                        ? "udoc-search-highlight udoc-search-highlight--active"
                        : "udoc-search-highlight";
                    highlightEl.style.position = "absolute";
                    highlightEl.style.left = `${rect.x * scale}px`;
                    highlightEl.style.top = `${rect.y * scale}px`;
                    highlightEl.style.width = `${rect.width * scale}px`;
                    highlightEl.style.height = `${rect.height * scale}px`;
                    if (Math.abs(rect.angle) > 0.1) {
                        highlightEl.style.transformOrigin = "0 0";
                        highlightEl.style.transform = `rotate(${rect.angle}deg)`;
                    }
                    slotEl.searchHighlightLayer.appendChild(highlightEl);
                }
            }

            slotEl.lastSearchMatches = matches;
            slotEl.lastSearchActiveIndex = activeIndex;
            slotEl.lastSearchScale = scale;
        }
    }

    function resetRenderKeys(): void {
        for (const slotEl of slotElements) {
            slotEl.renderKey = "";
            slotEl.pendingKey = null;
            slotEl.previewRenderKey = "";
            if (slotEl.previewCanvas) {
                slotEl.previewCanvas.style.display = "none";
            }
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
        updateSearchHighlights,
        resetRenderKeys,
        getElement,
        getData,
    };
}

export type SpreadComponent = ReturnType<typeof createSpread>;
