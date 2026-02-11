import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import {
    getPointsToPixels,
    type ViewerState,
    type ScrollMode,
    type LayoutMode,
    type ZoomMode,
    type PageRotation,
    type PageInfo,
    type SpacingMode
} from "../state";
import type { Action } from "../actions";
import type { NavigationTarget } from "../navigation";
import { showAnnotationPopup, closeAnnotationPopup, type Annotation } from "../annotation";
import type { TextRun } from "../text";
import type { WorkerClient } from "../../../worker/index.js";
import {
    calculateSpreads,
    calculateSpreadLayouts,
    findSpreadForPage,
    findVisibleSpreadRange,
    getSpreadPrimaryPage,
    getSpreadDimensions,
    type Spread,
    type SpreadLayout
} from "../layout/spreadLayout";
import { createSpread, type SpreadComponent } from "./Spread";
import { createFloatingToolbar } from "./FloatingToolbar";
import { on } from "../../framework/events";
import { getDevicePixelRatio, snapToDevice, toCssPixels, toDevicePixels } from "../layout";

interface HighlightedAnnotation {
    pageIndex: number;
    bounds: { x: number; y: number; width: number; height: number };
}

interface ViewportSlice {
    docId: string | null;
    page: number;
    pageCount: number;
    pageInfos: readonly PageInfo[];
    scrollMode: ScrollMode;
    layoutMode: LayoutMode;
    zoomMode: ZoomMode;
    zoom: number;
    dpi: number;
    pageRotation: PageRotation;
    spacingMode: SpacingMode;
    pageSpacing: number;
    spreadSpacing: number;
    pageAnnotations: Map<number, Annotation[]>;
    highlightedAnnotation: HighlightedAnnotation | null;
    pageText: Map<number, TextRun[]>;
}

function viewportSliceEqual(a: ViewportSlice, b: ViewportSlice): boolean {
    return (
        a.docId === b.docId &&
        a.page === b.page &&
        a.pageCount === b.pageCount &&
        a.pageInfos === b.pageInfos &&
        a.scrollMode === b.scrollMode &&
        a.layoutMode === b.layoutMode &&
        a.zoomMode === b.zoomMode &&
        a.zoom === b.zoom &&
        a.dpi === b.dpi &&
        a.pageRotation === b.pageRotation &&
        a.spacingMode === b.spacingMode &&
        a.pageSpacing === b.pageSpacing &&
        a.spreadSpacing === b.spreadSpacing &&
        a.pageAnnotations === b.pageAnnotations &&
        a.highlightedAnnotation === b.highlightedAnnotation &&
        a.pageText === b.pageText
    );
}

interface Insets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface ViewportMetrics {
    width: number;
    height: number;
    innerWidth: number;
    innerHeight: number;
    padding: Insets;
}

interface LayoutState {
    spreads: Spread[];
    layouts: SpreadLayout[];
    contentWidth: number;
    contentHeight: number;
    scale: number;
}

/**
 * Tracks the document position at the viewport top edge.
 * This is used to maintain scroll position across layout changes and mode switches.
 *
 * Key insight: spacing between spreads is FIXED (doesn't scale with zoom),
 * but spread content DOES scale. So we track position differently:
 * - If in spacing area: store absolute pixel offset from next spread's top (negative)
 * - If in spread content: store ratio of spread height (scales with zoom)
 */
interface ViewportTopPosition {
    /** Which spread we're measuring from (by page number) */
    page: number;
    /**
     * If inSpacing is true: absolute pixel offset from spread top (negative, doesn't scale)
     * If inSpacing is false: ratio of spread height (0 = top, 1 = bottom, scales with zoom)
     */
    offset: number;
    /** Whether we're in the spacing area above this spread */
    inSpacing: boolean;
}

interface ViewportUpdatePlan {
    layoutChanged: boolean;
    shouldClearSpreads: boolean;
    /** Whether to restore the tracked viewport position after layout changes */
    shouldRestorePosition: boolean;
    /** Whether to scroll to the current page (on doc change, zoom mode change) */
    shouldScrollToPage: boolean;
}

let cachedScrollbarSize: { width: number; height: number } | null = null;

/** Number of spreads to render above/below viewport for smooth scrolling */
const RENDER_BUFFER = 2;

function parsePixel(value: string): number {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function readInsets(style: CSSStyleDeclaration): Insets {
    return {
        top: parsePixel(style.paddingTop),
        right: parsePixel(style.paddingRight),
        bottom: parsePixel(style.paddingBottom),
        left: parsePixel(style.paddingLeft)
    };
}

function addInsets(a: Insets, b: Insets): Insets {
    return {
        top: a.top + b.top,
        right: a.right + b.right,
        bottom: a.bottom + b.bottom,
        left: a.left + b.left
    };
}

function readViewportMetrics(scrollArea: HTMLElement, container: HTMLElement): ViewportMetrics {
    const scrollStyle = getComputedStyle(scrollArea);
    const containerStyle = getComputedStyle(container);
    const padding = addInsets(readInsets(scrollStyle), readInsets(containerStyle));
    const width = scrollArea.clientWidth;
    const height = scrollArea.clientHeight;
    const innerWidth = Math.max(0, width - padding.left - padding.right);
    const innerHeight = Math.max(0, height - padding.top - padding.bottom);

    return {
        width,
        height,
        innerWidth,
        innerHeight,
        padding
    };
}

function metricsEqual(a: ViewportMetrics, b: ViewportMetrics): boolean {
    // Use epsilon tolerance to prevent oscillation from 1px fluctuations
    const epsilon = 1;
    return (
        Math.abs(a.width - b.width) <= epsilon &&
        Math.abs(a.height - b.height) <= epsilon &&
        Math.abs(a.innerWidth - b.innerWidth) <= epsilon &&
        Math.abs(a.innerHeight - b.innerHeight) <= epsilon &&
        a.padding.top === b.padding.top &&
        a.padding.right === b.padding.right &&
        a.padding.bottom === b.padding.bottom &&
        a.padding.left === b.padding.left
    );
}

function resolveOverflowState(prev: boolean | null, delta: number, threshold: number): boolean {
    if (prev === null) return delta > threshold;
    if (prev) return delta >= -threshold;
    return delta > threshold;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function getCenteredOffset(containerSize: number, contentSize: number): number {
    const dpr = getDevicePixelRatio();
    const containerDevice = toDevicePixels(containerSize, dpr);
    const contentDevice = toDevicePixels(contentSize, dpr);
    const offsetDevice = Math.max(0, Math.floor((containerDevice - contentDevice) / 2));
    return toCssPixels(offsetDevice, dpr);
}

function getScrollbarSize(): { width: number; height: number } {
    if (cachedScrollbarSize) return cachedScrollbarSize;
    if (!document.body) {
        cachedScrollbarSize = { width: 0, height: 0 };
        return cachedScrollbarSize;
    }

    const probe = document.createElement("div");
    probe.style.width = "100px";
    probe.style.height = "100px";
    probe.style.overflow = "scroll";
    probe.style.position = "absolute";
    probe.style.top = "-9999px";
    document.body.appendChild(probe);

    const width = probe.offsetWidth - probe.clientWidth;
    const height = probe.offsetHeight - probe.clientHeight;
    probe.remove();

    cachedScrollbarSize = { width, height };
    return cachedScrollbarSize;
}

/**
 * Computes the zoom scale for fit modes.
 *
 * For fit-spread-width mode, we predict whether a vertical scrollbar will be needed
 * and adjust the available width accordingly. This prevents the feedback loop where:
 * 1. Scale is calculated based on viewport width
 * 2. Content is taller than viewport, scrollbar appears
 * 3. Scrollbar reduces viewport width, causing recalculation
 *
 * @param slice - Viewport state slice
 * @param metrics - Current viewport metrics
 * @param spreads - Array of spreads to layout
 * @param scrollbarVisible - Whether vertical scrollbar is currently visible
 */
function computeScale(
    slice: ViewportSlice,
    metrics: ViewportMetrics,
    spreads: Spread[],
    scrollbarVisible: boolean
): number {
    if (slice.zoomMode === "custom") return slice.zoom;
    if (metrics.innerWidth <= 0 || metrics.innerHeight <= 0) return slice.zoom;
    if (spreads.length === 0) return slice.zoom;

    let maxWidth = 0;
    let maxHeight = 0;
    for (const spread of spreads) {
        const dims = getSpreadDimensions(
            spread,
            slice.pageInfos,
            1,
            slice.pageSpacing,
            slice.dpi,
            slice.pageRotation
        );
        maxWidth = Math.max(maxWidth, dims.width);
        maxHeight = Math.max(maxHeight, dims.height);
    }

    if (maxWidth <= 0 || maxHeight <= 0) return slice.zoom;

    // Use snapped values to match layout calculations exactly.
    // Round to the nearest device pixel to avoid scrollbar feedback loops.
    const snappedSpacing = snapToDevice(slice.spreadSpacing);
    const snappedViewportHeight = snapToDevice(metrics.innerHeight);
    const scrollbar = getScrollbarSize();

    // Calculate the "base" viewport width (without scrollbar).
    // If scrollbar is currently visible, metrics.innerWidth already excludes it,
    // so we add it back to get the full available width.
    const baseViewportWidth = scrollbarVisible
        ? snapToDevice(metrics.innerWidth + scrollbar.width)
        : snapToDevice(metrics.innerWidth);

    const verticalSpacing = snappedSpacing * 2;
    // Add 1 pixel buffer to compensate for device pixel rounding in layout calculations.
    // Without this, the spread may be slightly smaller than the viewport, allowing
    // a thin line of the next page to show at the bottom in continuous scroll mode.
    // The same buffer is used in spread mode for consistency when switching modes.
    // Scrollbar overflow in spread mode is handled by applySingleLayout using viewport height.
    const targetHeight = Math.max(0, snappedViewportHeight - verticalSpacing + 1);

    switch (slice.zoomMode) {
        case "fit-spread-width": {
            // Calculate scale assuming full viewport width (no scrollbar)
            const fullWidthScale = baseViewportWidth / maxWidth;

            // Predict if vertical scrollbar will be needed at this scale.
            // For continuous mode: check if total content height exceeds viewport.
            // For spread mode: check if tallest spread + spacing exceeds viewport.
            let needsScrollbar: boolean;
            if (slice.scrollMode === "continuous") {
                // In continuous mode, calculate total content height
                // Total height = sum of all spread heights + spacing between spreads
                let totalHeight = 0;
                for (const spread of spreads) {
                    const dims = getSpreadDimensions(
                        spread,
                        slice.pageInfos,
                        fullWidthScale,
                        slice.pageSpacing,
                        slice.dpi,
                        slice.pageRotation
                    );
                    totalHeight += dims.height;
                }
                totalHeight += snappedSpacing * (spreads.length + 1); // spacing before first, between, and after last
                needsScrollbar = totalHeight > snappedViewportHeight;
            } else {
                // In spread mode, check if the tallest spread + spacing exceeds viewport
                const scaledMaxHeight = maxHeight * fullWidthScale;
                needsScrollbar = scaledMaxHeight + verticalSpacing > snappedViewportHeight;
            }

            if (needsScrollbar && scrollbar.width > 0) {
                // Scrollbar will be needed, calculate scale with reduced viewport width
                const adjustedWidth = baseViewportWidth - scrollbar.width;
                return adjustedWidth / maxWidth;
            }
            // No scrollbar needed, use full width
            return fullWidthScale;
        }
        case "fit-spread-height":
            // Content fits height by design, no vertical scrollbar needed
            return targetHeight / maxHeight;
        case "fit-spread":
            // Content fits both dimensions by design, no scrollbar needed
            return Math.min(baseViewportWidth / maxWidth, targetHeight / maxHeight);
        default:
            return slice.zoom;
    }
}

function buildLayout(
    slice: ViewportSlice,
    metrics: ViewportMetrics,
    scrollbarVisible: boolean
): LayoutState {
    const spreads = calculateSpreads(slice.pageCount, slice.layoutMode);
    const scale = computeScale(slice, metrics, spreads, scrollbarVisible);
    const layout = calculateSpreadLayouts(
        spreads,
        slice.pageInfos,
        scale,
        slice.pageSpacing,
        slice.spreadSpacing,
        slice.dpi,
        slice.pageRotation
    );

    return {
        spreads,
        layouts: layout.layouts,
        contentWidth: layout.contentWidth,
        contentHeight: layout.contentHeight,
        scale
    };
}

function computeViewportUpdate(
    prevSlice: ViewportSlice | null,
    nextSlice: ViewportSlice,
    prevMetrics: ViewportMetrics | null,
    nextMetrics: ViewportMetrics
): ViewportUpdatePlan {
    const metricsChanged = !prevMetrics || !metricsEqual(prevMetrics, nextMetrics);

    const layoutChanged =
        !prevSlice ||
        nextSlice.docId !== prevSlice.docId ||
        nextSlice.pageCount !== prevSlice.pageCount ||
        nextSlice.pageInfos !== prevSlice.pageInfos ||
        nextSlice.scrollMode !== prevSlice.scrollMode ||
        nextSlice.layoutMode !== prevSlice.layoutMode ||
        nextSlice.zoomMode !== prevSlice.zoomMode ||
        nextSlice.zoom !== prevSlice.zoom ||
        nextSlice.dpi !== prevSlice.dpi ||
        nextSlice.pageRotation !== prevSlice.pageRotation ||
        nextSlice.pageSpacing !== prevSlice.pageSpacing ||
        nextSlice.spreadSpacing !== prevSlice.spreadSpacing ||
        metricsChanged;

    const zoomModeChanged = !prevSlice || nextSlice.zoomMode !== prevSlice.zoomMode;
    const spreadsChanged =
        !prevSlice ||
        nextSlice.docId !== prevSlice.docId ||
        nextSlice.pageCount !== prevSlice.pageCount ||
        nextSlice.pageInfos !== prevSlice.pageInfos ||
        nextSlice.layoutMode !== prevSlice.layoutMode;

    const shouldClearSpreads = layoutChanged && spreadsChanged;

    // Scroll to page on document change or zoom mode change (explicit user actions)
    const shouldScrollToPage = spreadsChanged || zoomModeChanged;

    // Restore tracked viewport position when layout changes but document structure is the same
    // This maintains scroll position across mode switches, zoom changes, and viewport resizes
    const shouldRestorePosition = layoutChanged && !spreadsChanged && !zoomModeChanged;

    return {
        layoutChanged,
        shouldClearSpreads,
        shouldRestorePosition,
        shouldScrollToPage
    };
}

export function createViewport() {
    const el = document.createElement("div");
    el.className = "udoc-viewport";

    const scrollArea = document.createElement("div");
    scrollArea.className = "udoc-viewport__scroll";
    el.appendChild(scrollArea);

    const container = document.createElement("div");
    container.className = "udoc-viewport__container";
    scrollArea.appendChild(container);

    // Watermark with tamper protection - random class name on each instantiation
    const wmClass = "_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const wmHref = "https://docmentis.com";
    const wmText = "Powered by docMentis";
    const wmAttrs = { target: "_blank", rel: "noopener" };

    // Inject dynamic styles for the random class name
    const wmStyle = document.createElement("style");
    wmStyle.textContent = `
        .${wmClass} {
            position: absolute;
            right: 18px;
            bottom: 4px;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: 500;
            color: rgba(0, 0, 0, 0.3);
            text-decoration: none;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
            z-index: 10;
            transition: color 0.15s ease;
        }
        .${wmClass}:hover {
            color: rgba(0, 0, 0, 0.6);
        }
        @media (max-width: 768px) {
            .${wmClass} {
                bottom: 48px;
                right: 10px;
                font-size: 11px;
            }
        }
    `;
    el.appendChild(wmStyle);

    function createWatermark(): HTMLAnchorElement {
        const wm = document.createElement("a");
        wm.className = wmClass;
        wm.href = wmHref;
        wm.target = wmAttrs.target;
        wm.rel = wmAttrs.rel;
        wm.textContent = wmText;
        return wm;
    }

    let watermark = createWatermark();
    el.appendChild(watermark);

    // Protect watermark against removal and modification
    const wmObserver = new MutationObserver((mutations) => {
        let needsRestore = false;

        // Check if watermark was removed from DOM
        if (!el.contains(watermark)) {
            needsRestore = true;
        }

        // Check if style element was removed
        if (!el.contains(wmStyle)) {
            el.appendChild(wmStyle);
        }

        // Check for attribute tampering on the watermark itself
        for (const mutation of mutations) {
            if (mutation.target === watermark) {
                if (mutation.type === "attributes") {
                    needsRestore = true;
                } else if (mutation.type === "characterData" || mutation.type === "childList") {
                    needsRestore = true;
                }
            }
            // Check if watermark's text content was changed
            if (mutation.target.parentNode === watermark && mutation.type === "characterData") {
                needsRestore = true;
            }
        }

        if (needsRestore) {
            // Remove old watermark if still in DOM but corrupted
            if (el.contains(watermark)) {
                watermark.remove();
            }
            // Create fresh watermark
            watermark = createWatermark();
            el.appendChild(watermark);
        }
    });

    // Observe the parent for child removal and the watermark for attribute/content changes
    wmObserver.observe(el, { childList: true, subtree: false });
    wmObserver.observe(watermark, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
    });

    // Periodic integrity check (catches CSS-based hiding)
    const wmIntegrityCheck = setInterval(() => {
        // Restore style element if removed
        if (!el.contains(wmStyle)) {
            el.appendChild(wmStyle);
        }
        // Restore watermark if removed
        if (!el.contains(watermark)) {
            watermark = createWatermark();
            el.appendChild(watermark);
            wmObserver.observe(watermark, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        // Reset any inline style tampering
        watermark.style.cssText = "";
        watermark.removeAttribute("hidden");
        if (watermark.className !== wmClass) {
            watermark.className = wmClass;
        }
    }, 1000);

    const floatingToolbar = createFloatingToolbar();

    let workerClient: WorkerClient | null = null;
    let storeRef: Store<ViewerState, Action> | null = null;
    let unsubRender: (() => void) | null = null;
    let unsubScroll: (() => void) | null = null;
    let unsubNavigation: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    let currentSlice: ViewportSlice | null = null;
    let lastSlice: ViewportSlice | null = null;
    let lastMetrics: ViewportMetrics | null = null;
    let layoutState: LayoutState | null = null;
    let spreadComponents = new Map<number, SpreadComponent>();
    let layoutDirty = false;
    let lastVisibleRange: { start: number; end: number } = { start: 0, end: -1 };
    let containerSize = { width: 0, height: 0 };
    let lastOverflowX: boolean | null = null;
    let lastOverflowY: boolean | null = null;
    // Track the document position at viewport top edge for consistent positioning across mode switches
    let viewportTopPosition: ViewportTopPosition | null = null;

    let updateRaf = 0;
    let scrollRaf = 0;
    let renderDebounceTimer = 0;
    let rendersPaused = false;
    let resumeRenderAfterResize = false;
    const RENDER_DEBOUNCE_MS = 50;
    const unsubEvents: Array<() => void> = [];

    function mount(parent: HTMLElement, store: Store<ViewerState, Action>, wc: WorkerClient): void {
        parent.appendChild(el);
        workerClient = wc;
        storeRef = store;

        floatingToolbar.mount(el, store);

        currentSlice = selectViewport(store.getState());
        scheduleUpdate();

        unsubRender = subscribeSelector(store, selectViewport, (slice) => {
            currentSlice = slice;
            scheduleUpdate();
        }, {
            equality: viewportSliceEqual
        });

        unsubScroll = on(scrollArea, "scroll", () => {
            if (!currentSlice || !layoutState) return;
            if (scrollRaf) return;
            scrollRaf = requestAnimationFrame(() => {
                scrollRaf = 0;
                if (!currentSlice || !layoutState || !lastMetrics) return;
                if (currentSlice.scrollMode === "continuous") {
                    updateVisibleSpreads(currentSlice, lastMetrics, layoutState);
                }
                // Keep viewport position tracking up to date on scroll (both modes)
                updateViewportTopPosition(currentSlice, layoutState);
            });
        });

        // Resize handler: layout updates immediately, but renders are only paused
        // when resize events keep firing (e.g. dragging panel width). This avoids
        // a one-off "flash" when panels are simply toggled.
        const handleResize = () => {
            const isOngoingResize = renderDebounceTimer !== 0;
            if (isOngoingResize) {
                rendersPaused = true;
                resumeRenderAfterResize = true;
            }

            // Clear any pending render timer
            if (renderDebounceTimer) {
                clearTimeout(renderDebounceTimer);
            }

            // Schedule render after resize settles
            renderDebounceTimer = window.setTimeout(() => {
                renderDebounceTimer = 0;
                if (resumeRenderAfterResize) {
                    resumeRenderAfterResize = false;
                    rendersPaused = false;
                    // Trigger re-render of visible spreads
                    scheduleUpdate();
                }
            }, RENDER_DEBOUNCE_MS);

            // Layout updates immediately
            scheduleUpdate();
        };

        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(scrollArea);
        }

        window.addEventListener("resize", handleResize);
        unsubEvents.push(() => window.removeEventListener("resize", handleResize));

        // Handle annotation clicks (links and sticky notes)
        const handleAnnotationClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Handle sticky note (text) annotation - show popup
            const textEl = target.closest(".udoc-annotation--text") as HTMLElement | null;
            if (textEl) {
                e.stopPropagation();
                const annotationData = textEl.dataset.annotation;
                if (annotationData) {
                    try {
                        const annotation = JSON.parse(annotationData) as Annotation;
                        showAnnotationPopup(annotation, textEl, container);
                    } catch {
                        // Ignore parse errors
                    }
                }
                return;
            }

            // Handle link annotation - navigate
            const linkEl = target.closest(".udoc-annotation--link");
            if (linkEl) {
                const actionData = linkEl.getAttribute("data-action");
                if (!actionData) return;

                try {
                    const action = JSON.parse(actionData) as { actionType: string; destination?: unknown; uri?: string };
                    if (action.actionType === "goTo" && action.destination) {
                        store.dispatch({ type: "NAVIGATE_TO_DESTINATION", destination: action.destination as import("../navigation").Destination });
                    } else if (action.actionType === "uri" && action.uri) {
                        window.open(action.uri, "_blank", "noopener");
                    }
                } catch {
                    // Ignore parse errors
                }
                return;
            }

            // Click elsewhere closes any open popup
            closeAnnotationPopup();
        };
        container.addEventListener("click", handleAnnotationClick);
        unsubEvents.push(() => container.removeEventListener("click", handleAnnotationClick));

        // Handle mouse wheel for page flip in spread mode
        let wheelCooldown = false;
        const handleWheel = (e: WheelEvent) => {
            if (!currentSlice || currentSlice.scrollMode !== "spread") return;
            if (!layoutState || layoutState.spreads.length === 0) return;

            // Prevent default scroll in spread mode
            e.preventDefault();

            // Debounce rapid wheel events
            if (wheelCooldown) return;
            wheelCooldown = true;
            setTimeout(() => { wheelCooldown = false; }, 150);

            const currentSpreadIndex = findSpreadForPage(layoutState.spreads, currentSlice.page);

            if (e.deltaY > 0) {
                // Scroll down - next spread
                const nextSpreadIndex = Math.min(currentSpreadIndex + 1, layoutState.spreads.length - 1);
                if (nextSpreadIndex !== currentSpreadIndex) {
                    const nextPage = getSpreadPrimaryPage(layoutState.spreads[nextSpreadIndex]);
                    store.dispatch({ type: "SET_PAGE", page: nextPage });
                }
            } else if (e.deltaY < 0) {
                // Scroll up - previous spread
                const prevSpreadIndex = Math.max(currentSpreadIndex - 1, 0);
                if (prevSpreadIndex !== currentSpreadIndex) {
                    const prevPage = getSpreadPrimaryPage(layoutState.spreads[prevSpreadIndex]);
                    store.dispatch({ type: "SET_PAGE", page: prevPage });
                }
            }
        };
        scrollArea.addEventListener("wheel", handleWheel, { passive: false });
        unsubEvents.push(() => scrollArea.removeEventListener("wheel", handleWheel));

        unsubNavigation = store.subscribeEffect((prev, next) => {
            if (prev.navigationTarget === next.navigationTarget) return;
            if (next.navigationTarget === null) return;

            const target = next.navigationTarget;

            // Handle zoom change if specified
            if (target.zoom !== undefined && target.zoom !== next.zoom) {
                store.dispatch({ type: "SET_ZOOM", zoom: target.zoom });
            }

            if (next.scrollMode === "continuous") {
                scrollToTarget(target);
            } else {
                store.dispatch({ type: "SET_PAGE", page: target.page });
            }

            store.dispatch({ type: "CLEAR_NAVIGATION_TARGET" });
        });
    }

    function scheduleUpdate(): void {
        if (!currentSlice) return;
        if (updateRaf) return;
        updateRaf = requestAnimationFrame(() => {
            updateRaf = 0;
            if (!currentSlice) return;
            applyState(currentSlice);
        });
    }

    function applyState(slice: ViewportSlice): void {
        scrollArea.style.paddingLeft = `${slice.pageSpacing}px`;
        scrollArea.style.paddingRight = `${slice.pageSpacing}px`;
        el.classList.toggle("udoc-viewport--seamless", slice.spacingMode === "none");
        const metrics = readViewportMetrics(scrollArea, container);
        const hasDoc = !!slice.docId && slice.pageCount > 0 && slice.pageInfos.length > 0;

        if (!hasDoc || metrics.innerWidth <= 0 || metrics.innerHeight <= 0) {
            clearSpreads();
            container.style.height = "";
            container.style.width = "";
            scrollArea.style.overflowX = "hidden";
            scrollArea.style.overflowY = "hidden";
            layoutState = null;
            lastVisibleRange = { start: 0, end: -1 };
            viewportTopPosition = null;
            syncEffectiveZoom(slice, null);
            lastSlice = slice;
            lastMetrics = metrics;
            return;
        }

        const plan = computeViewportUpdate(lastSlice, slice, lastMetrics, metrics);

        if (plan.shouldClearSpreads) {
            clearSpreads();
            lastVisibleRange = { start: 0, end: -1 };
            viewportTopPosition = null;
        }

        if (plan.layoutChanged || !layoutState) {
            layoutState = buildLayout(slice, metrics, lastOverflowY ?? false);
            layoutDirty = true;
            lastMetrics = metrics;
        }

        syncEffectiveZoom(slice, layoutState);

        if (slice.scrollMode === "continuous") {
            applyContinuousLayout(metrics, layoutState);
            if (plan.shouldScrollToPage) {
                scrollToPage(slice.page, metrics);
            } else if (plan.shouldRestorePosition && viewportTopPosition) {
                restoreViewportPosition(viewportTopPosition, metrics, layoutState);
            }
            updateVisibleSpreads(slice, metrics, layoutState);
        } else {
            applySingleLayout(slice, metrics, layoutState);
            if (plan.shouldScrollToPage) {
                scrollArea.scrollTop = 0;
                scrollArea.scrollLeft = 0;
                lastOverflowX = null;
                lastOverflowY = null;
            } else if (plan.shouldRestorePosition && viewportTopPosition) {
                // In spread mode, restore position by showing the correct page
                const targetPage = viewportTopPosition.page;
                if (slice.page !== targetPage && storeRef) {
                    storeRef.dispatch({ type: "SET_PAGE", page: targetPage });
                }
                // Reset scroll and try to restore position within the spread if it's scrollable
                scrollArea.scrollLeft = 0;
                const spreadIndex = findSpreadForPage(layoutState.spreads, targetPage);
                const layout = layoutState.layouts[spreadIndex];
                if (layout && layout.height > metrics.innerHeight && !viewportTopPosition.inSpacing) {
                    // Spread is larger than viewport and we have a content offset
                    // Calculate scroll position to show the same relative position
                    const spreadTopInContainer = getCenteredOffset(containerSize.height, layout.height);
                    const offsetPixels = viewportTopPosition.offset * layout.height;
                    scrollArea.scrollTop = Math.max(0, spreadTopInContainer + offsetPixels);
                } else {
                    scrollArea.scrollTop = 0;
                }
                lastOverflowX = null;
                lastOverflowY = null;
            }
            showSingleSpread(slice, metrics, layoutState);
        }

        updateOverflow(slice, metrics);

        // Update tracked viewport position after layout is applied
        updateViewportTopPosition(slice, layoutState);

        lastSlice = slice;
    }

    function updateOverflow(slice: ViewportSlice, metrics: ViewportMetrics): void {
        const epsilon = 1;
        const scrollWidth = scrollArea.scrollWidth;
        const scrollHeight = scrollArea.scrollHeight;
        const clientWidth = scrollArea.clientWidth;
        const clientHeight = scrollArea.clientHeight;
        const scrollbar = getScrollbarSize();

        // Apply hysteresis to avoid scrollbar-induced resize loops near 1px thresholds.
        const assumeY = lastOverflowY ?? (scrollHeight - clientHeight > epsilon);
        const availableWidth = clientWidth + (assumeY ? scrollbar.width : 0);
        const deltaX = scrollWidth - availableWidth;
        const needsX = resolveOverflowState(lastOverflowX, deltaX, epsilon);
        const availableHeight = clientHeight + (needsX ? scrollbar.height : 0);
        const deltaY = scrollHeight - availableHeight;
        const finalNeedsY = resolveOverflowState(lastOverflowY, deltaY, epsilon);

        lastOverflowX = needsX;
        lastOverflowY = finalNeedsY;
        scrollArea.style.overflowX = needsX ? "auto" : "hidden";
        scrollArea.style.overflowY = finalNeedsY ? "auto" : "hidden";
    }

    function applyContinuousLayout(metrics: ViewportMetrics, state: LayoutState): void {
        container.style.display = "block";
        const width = snapToDevice(Math.max(metrics.innerWidth, state.contentWidth));
        const height = snapToDevice(Math.max(metrics.innerHeight, state.contentHeight));
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        containerSize = { width, height };
    }

    function applySingleLayout(
        slice: ViewportSlice,
        metrics: ViewportMetrics,
        state: LayoutState
    ): void {
        container.style.display = "block";
        const spreadIndex = findSpreadForPage(state.spreads, slice.page);
        const layout = state.layouts[spreadIndex];
        const spreadWidth = layout ? layout.width : 0;
        const spreadHeight = layout ? layout.height : 0;
        const snappedSpreadSpacing = snapToDevice(slice.spreadSpacing);
        const width = snapToDevice(Math.max(metrics.innerWidth, spreadWidth));
        const height = snapToDevice(Math.max(metrics.innerHeight, spreadHeight + snappedSpreadSpacing * 2));
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        containerSize = { width, height };
    }

    function syncEffectiveZoom(slice: ViewportSlice, state: LayoutState | null): void {
        if (!storeRef) return;
        const nextZoom = slice.zoomMode === "custom" ? null : state?.scale ?? null;
        const current = storeRef.getState().effectiveZoom;
        if (nextZoom === null) {
            if (current === null) return;
            storeRef.dispatch({ type: "SET_EFFECTIVE_ZOOM", zoom: null });
            return;
        }
        if (current !== null && Math.abs(nextZoom - current) < 0.001) return;
        storeRef.dispatch({ type: "SET_EFFECTIVE_ZOOM", zoom: nextZoom });
    }

    /**
     * Updates the tracked viewport top position based on current scroll state.
     * This captures which page is at the viewport top and how far into it we are.
     */
    function updateViewportTopPosition(
        slice: ViewportSlice,
        state: LayoutState
    ): void {
        if (state.layouts.length === 0 || state.spreads.length === 0) {
            viewportTopPosition = null;
            return;
        }

        let viewportTopInLayout: number;

        if (slice.scrollMode === "continuous") {
            // In continuous mode, viewport top position is directly from scrollTop
            viewportTopInLayout = scrollArea.scrollTop;
        } else {
            // In spread mode, the spread is centered in the viewport
            // Calculate where the viewport top would be in layout coordinates
            const spreadIndex = findSpreadForPage(state.spreads, slice.page);
            const layout = state.layouts[spreadIndex];
            if (!layout) {
                viewportTopPosition = null;
                return;
            }
            // The spread is positioned at getCenteredOffset from container top
            const spreadTopInContainer = getCenteredOffset(containerSize.height, layout.height);
            // Account for any scroll within spread mode (for large spreads)
            const viewportTopInContainer = scrollArea.scrollTop;
            // Map to layout coordinates: layout.top is where this spread is in continuous layout
            viewportTopInLayout = layout.top - spreadTopInContainer + viewportTopInContainer;
        }

        // Find which spread the viewport top is associated with
        for (let i = 0; i < state.layouts.length; i++) {
            const layout = state.layouts[i];
            const spread = state.spreads[i];
            if (!spread) continue;

            const spreadTop = layout.top;
            const spreadBottom = layout.top + layout.height;
            const offsetFromSpreadTop = viewportTopInLayout - spreadTop;

            // Check if viewport is in the spacing area before this spread
            if (viewportTopInLayout < spreadTop) {
                // We're in the spacing above this spread
                // Store the absolute pixel offset (negative) since spacing doesn't scale
                viewportTopPosition = {
                    page: getSpreadPrimaryPage(spread),
                    offset: offsetFromSpreadTop, // negative value
                    inSpacing: true
                };
                return;
            }

            // Check if viewport is within this spread's content
            if (viewportTopInLayout < spreadBottom || i === state.layouts.length - 1) {
                // We're within the spread content
                // Store as ratio of spread height so it scales correctly
                const offsetRatio = layout.height > 0 ? offsetFromSpreadTop / layout.height : 0;
                viewportTopPosition = {
                    page: getSpreadPrimaryPage(spread),
                    offset: offsetRatio,
                    inSpacing: false
                };
                return;
            }
        }

        viewportTopPosition = null;
    }

    /**
     * Restores the viewport to a previously tracked position.
     */
    function restoreViewportPosition(
        position: ViewportTopPosition,
        metrics: ViewportMetrics,
        state: LayoutState
    ): void {
        const spreadIndex = findSpreadForPage(state.spreads, position.page);
        const layout = state.layouts[spreadIndex];
        if (!layout) return;

        let targetScrollTop: number;

        if (position.inSpacing) {
            // In spacing area: offset is absolute pixels (negative), doesn't scale
            targetScrollTop = layout.top + position.offset;
        } else {
            // In spread content: offset is ratio of spread height, scales with zoom
            const offsetPixels = position.offset * layout.height;
            targetScrollTop = layout.top + offsetPixels;
        }

        const maxScrollTop = Math.max(0, containerSize.height - metrics.innerHeight);
        scrollArea.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);
    }

    function updateVisibleSpreads(
        slice: ViewportSlice,
        metrics: ViewportMetrics,
        state: LayoutState
    ): void {
        if (!workerClient || !slice.docId) return;
        if (state.layouts.length === 0) return;

        const scrollTop = scrollArea.scrollTop;
        const visibleRange = findVisibleSpreadRange(
            state.layouts,
            scrollTop,
            metrics.innerHeight,
            RENDER_BUFFER
        );

        const rangeChanged =
            visibleRange.start !== lastVisibleRange.start ||
            visibleRange.end !== lastVisibleRange.end;

        const layoutOptions = {
            pageInfos: slice.pageInfos,
            scale: state.scale,
            dpi: slice.dpi,
            rotation: slice.pageRotation,
            pageSpacing: slice.pageSpacing
        };

        if (layoutDirty || rangeChanged) {
            for (const [index, spread] of spreadComponents) {
                if (index < visibleRange.start || index > visibleRange.end) {
                    spread.destroy();
                    spreadComponents.delete(index);
                }
            }

            const renderOptions = {
                docId: slice.docId,
                scale: state.scale,
                dpi: slice.dpi
            };

            for (let i = visibleRange.start; i <= visibleRange.end; i++) {
                const layout = state.layouts[i];
                if (!layout) continue;

                let spreadComp = spreadComponents.get(i);
                if (!spreadComp) {
                    const spreadData = state.spreads[i];
                    spreadComp = createSpread(spreadData);
                    spreadComp.mount(container);
                    spreadComponents.set(i, spreadComp);
                }

                spreadComp.updateLayout(layoutOptions);

                // Set spread position and dimensions from layout.
                // Layout values are pre-snapped with cumulative consistency.
                const spreadEl = spreadComp.getElement();
                spreadEl.style.position = "absolute";
                spreadEl.style.top = `${layout.top}px`;
                spreadEl.style.width = `${layout.width}px`;
                spreadEl.style.height = `${layout.height}px`;
                spreadEl.style.left = `${getCenteredOffset(containerSize.width, layout.width)}px`;
                spreadEl.style.transform = "none";

                // Skip render during resize animation (renders debounced separately)
                if (!rendersPaused) {
                    spreadComp.render(workerClient, renderOptions);
                }
            }

            lastVisibleRange = visibleRange;
            // Only clear layoutDirty if renders actually happened
            // Otherwise keep it dirty so renders happen when rendersPaused becomes false
            if (!rendersPaused) {
                layoutDirty = false;
            }
        }

        // Always update annotations and text on visible spreads (they may load after layout)
        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
            const spreadComp = spreadComponents.get(i);
            if (spreadComp) {
                spreadComp.updateAnnotations(slice.pageAnnotations, layoutOptions, slice.highlightedAnnotation);
                spreadComp.updateTextLayer(slice.pageText, layoutOptions);
            }
        }

        const viewportCenter = scrollTop + metrics.innerHeight / 2;
        const focusPage = findFocusPage(viewportCenter, state);
        if (focusPage !== null) {
            workerClient.boostPageRenderPriority(slice.docId, focusPage);
        }

        updateCurrentPageFromScroll(scrollTop, metrics.innerHeight, state);
    }

    function showSingleSpread(
        slice: ViewportSlice,
        _metrics: ViewportMetrics,
        state: LayoutState
    ): void {
        if (!workerClient || !slice.docId) return;

        const spreadIndex = findSpreadForPage(state.spreads, slice.page);
        const layout = state.layouts[spreadIndex];
        if (!layout) return;

        for (const [index, spread] of spreadComponents) {
            if (index !== spreadIndex) {
                spread.destroy();
                spreadComponents.delete(index);
            }
        }

        let spreadComp = spreadComponents.get(spreadIndex);
        if (!spreadComp) {
            const spreadData = state.spreads[spreadIndex];
            spreadComp = createSpread(spreadData);
            spreadComp.mount(container);
            spreadComponents.set(spreadIndex, spreadComp);
        }

        const layoutOptions = {
            pageInfos: slice.pageInfos,
            scale: state.scale,
            dpi: slice.dpi,
            rotation: slice.pageRotation,
            pageSpacing: slice.pageSpacing
        };

        spreadComp.updateLayout(layoutOptions);
        spreadComp.updateAnnotations(slice.pageAnnotations, layoutOptions, slice.highlightedAnnotation);
        spreadComp.updateTextLayer(slice.pageText, layoutOptions);

        // Layout values are pre-snapped
        const top = getCenteredOffset(containerSize.height, layout.height);
        const spreadEl = spreadComp.getElement();
        spreadEl.style.position = "absolute";
        spreadEl.style.top = `${top}px`;
        spreadEl.style.width = `${layout.width}px`;
        spreadEl.style.height = `${layout.height}px`;
        spreadEl.style.left = `${getCenteredOffset(containerSize.width, layout.width)}px`;
        spreadEl.style.transform = "none";

        // Skip render during resize animation (renders debounced separately)
        if (!rendersPaused) {
            spreadComp.render(workerClient, {
                docId: slice.docId,
                scale: state.scale,
                dpi: slice.dpi
            });

            // Prerender adjacent pages for smooth page flipping
            const dpr = getDevicePixelRatio();
            const pointsToPixels = getPointsToPixels(slice.dpi);
            const renderScale = pointsToPixels * state.scale * dpr;
            workerClient.prerenderAdjacentPages(
                slice.docId,
                slice.page,
                renderScale,
                slice.pageInfos.length
            );
        }

        lastVisibleRange = { start: spreadIndex, end: spreadIndex };
        // Only clear layoutDirty if renders actually happened
        if (!rendersPaused) {
            layoutDirty = false;
        }
    }

    function findFocusPage(viewportCenter: number, state: LayoutState): number | null {
        if (state.layouts.length === 0 || state.spreads.length === 0) return null;

        let closestIndex = 0;
        let closestDistance = Infinity;

        for (let i = 0; i < state.layouts.length; i++) {
            const layout = state.layouts[i];
            const spreadCenter = layout.top + layout.height / 2;
            const distance = Math.abs(spreadCenter - viewportCenter);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }

        const spread = state.spreads[closestIndex];
        return spread ? getSpreadPrimaryPage(spread) : null;
    }

    function updateCurrentPageFromScroll(
        scrollTop: number,
        viewportHeight: number,
        state: LayoutState
    ): void {
        if (!storeRef) return;
        const viewportCenter = scrollTop + viewportHeight / 2;
        const primaryPage = findFocusPage(viewportCenter, state);
        if (primaryPage === null) return;

        const currentState = storeRef.getState();
        if (currentState.page !== primaryPage) {
            storeRef.dispatch({ type: "SET_PAGE", page: primaryPage });
        }
    }

    function scrollToPage(page: number, metrics?: ViewportMetrics, center?: boolean): void {
        if (!layoutState) return;
        if (layoutState.layouts.length === 0) return;
        const viewport = metrics ?? lastMetrics;
        if (!viewport) return;
        const slice = currentSlice ?? lastSlice;
        if (!slice) return;

        const spreadIndex = findSpreadForPage(layoutState.spreads, page);
        const layout = layoutState.layouts[spreadIndex];
        if (!layout) return;

        // Top-align with spacing (default), or center vertically if requested
        const snappedSpreadSpacing = snapToDevice(slice.spreadSpacing);
        const targetScrollTop = center
            ? layout.top - (viewport.innerHeight - layout.height) / 2
            : layout.top - snappedSpreadSpacing;
        const maxScrollTop = Math.max(0, containerSize.height - viewport.innerHeight);
        scrollArea.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);
    }

    function scrollToTarget(target: NavigationTarget, metrics?: ViewportMetrics): void {
        if (!layoutState) return;
        if (layoutState.layouts.length === 0) return;
        const viewport = metrics ?? lastMetrics;
        if (!viewport) return;
        const slice = currentSlice ?? lastSlice;
        if (!slice) return;

        const spreadIndex = findSpreadForPage(layoutState.spreads, target.page);
        const layout = layoutState.layouts[spreadIndex];
        if (!layout) return;

        let targetScrollTop: number;
        let targetScrollLeft = 0;

        // Apply scroll offset if specified (convert from PDF points to scaled pixels)
        if (target.scrollTo && target.scrollTo.y !== undefined) {
            // scrollTo.y is in PDF points from top of page (already Y-flipped by WASM)
            // Full conversion: points * (dpi/72) * zoomScale
            const dpiScale = getPointsToPixels(slice.dpi);
            const pointsToPixels = dpiScale * layoutState.scale;
            const yInPixels = target.scrollTo.y * pointsToPixels;
            // Position target at top of viewport
            targetScrollTop = layout.top + yInPixels;

            if (target.scrollTo.x !== undefined) {
                const xInPixels = target.scrollTo.x * pointsToPixels;
                // Center the x position in viewport if possible
                targetScrollLeft = Math.max(0, xInPixels - viewport.innerWidth / 2);
            }
        } else {
            // No specific scroll position - scroll to top of spread with spacing
            const snappedSpreadSpacing = snapToDevice(slice.spreadSpacing);
            targetScrollTop = layout.top - snappedSpreadSpacing;
        }

        const maxScrollTop = Math.max(0, containerSize.height - viewport.innerHeight);
        const maxScrollLeft = Math.max(0, containerSize.width - viewport.innerWidth);

        scrollArea.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);
        scrollArea.scrollLeft = clamp(targetScrollLeft, 0, maxScrollLeft);
    }

    function clearSpreads(): void {
        for (const spread of spreadComponents.values()) {
            spread.destroy();
        }
        spreadComponents.clear();
        lastOverflowX = null;
        lastOverflowY = null;
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        if (unsubScroll) unsubScroll();
        if (unsubNavigation) unsubNavigation();
        if (resizeObserver) resizeObserver.disconnect();
        for (const off of unsubEvents) off();
        if (updateRaf) cancelAnimationFrame(updateRaf);
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
        wmObserver.disconnect();
        clearInterval(wmIntegrityCheck);
        floatingToolbar.destroy();
        clearSpreads();
        workerClient = null;
        storeRef = null;
        currentSlice = null;
        lastSlice = null;
        layoutState = null;
        el.remove();
    }

    return { el, mount, destroy };
}

function selectViewport(state: ViewerState): ViewportSlice {
    return {
        docId: state.doc?.id ?? null,
        page: state.page,
        pageCount: state.pageCount,
        pageInfos: state.pageInfos,
        scrollMode: state.scrollMode,
        layoutMode: state.layoutMode,
        zoomMode: state.zoomMode,
        zoom: state.zoom,
        dpi: state.dpi,
        pageRotation: state.pageRotation,
        spacingMode: state.spacingMode,
        pageSpacing: state.pageSpacing,
        spreadSpacing: state.spreadSpacing,
        pageAnnotations: state.pageAnnotations,
        highlightedAnnotation: state.highlightedAnnotation,
        pageText: state.pageText
    };
}
