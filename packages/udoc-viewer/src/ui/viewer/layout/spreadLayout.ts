import { getPointsToPixels, type LayoutMode, type PageRotation, type PageInfo } from "../state";
import { getDevicePixelRatio, toCssPixels, toDevicePixels } from "./pixelAlign";

/**
 * Represents a page slot within a spread.
 * `null` means an empty slot (for unbalanced spreads).
 */
export type PageSlot = number | null;

/**
 * A spread contains one or two page slots.
 * In single-page mode: [pageNumber]
 * In double-page modes: [leftPage, rightPage] where either can be null
 */
export interface Spread {
    /** Index of this spread (0-based) */
    index: number;
    /** Page slots: single-page has 1 slot, double-page has 2 slots */
    slots: [PageSlot] | [PageSlot, PageSlot];
}

/**
 * Calculate the spread composition for a document.
 *
 * @param pageCount - Total number of pages in the document
 * @param layoutMode - The layout mode determining pages per spread
 * @returns Array of spreads with their page assignments
 */
export function calculateSpreads(pageCount: number, layoutMode: LayoutMode): Spread[] {
    if (pageCount === 0) return [];

    switch (layoutMode) {
        case "single-page":
            return calculateSinglePageSpreads(pageCount);

        case "double-page":
            return calculateDoublePageSpreads(pageCount);

        case "double-page-odd-right":
            return calculateDoublePageOddRightSpreads(pageCount);

        case "double-page-odd-left":
            return calculateDoublePageOddLeftSpreads(pageCount);
    }
}

/**
 * Single page layout: one page per spread.
 * Spread 0: [1], Spread 1: [2], etc.
 */
function calculateSinglePageSpreads(pageCount: number): Spread[] {
    const spreads: Spread[] = [];
    for (let i = 0; i < pageCount; i++) {
        spreads.push({
            index: i,
            slots: [i + 1]
        });
    }
    return spreads;
}

/**
 * Double page layout: two pages per spread, starting from page 1.
 * Spread 0: [1, 2], Spread 1: [3, 4], etc.
 * Last spread may have empty right slot if odd page count.
 */
function calculateDoublePageSpreads(pageCount: number): Spread[] {
    const spreads: Spread[] = [];
    let spreadIndex = 0;

    for (let page = 1; page <= pageCount; page += 2) {
        const leftPage = page;
        const rightPage = page + 1 <= pageCount ? page + 1 : null;
        spreads.push({
            index: spreadIndex++,
            slots: [leftPage, rightPage]
        });
    }
    return spreads;
}

/**
 * Double page with odd pages on right (cover mode).
 * Spread 0: [null, 1] (cover on right)
 * Spread 1: [2, 3], Spread 2: [4, 5], etc.
 * Last spread may have empty right slot.
 */
function calculateDoublePageOddRightSpreads(pageCount: number): Spread[] {
    const spreads: Spread[] = [];

    // First spread: cover page on right
    spreads.push({
        index: 0,
        slots: [null, 1]
    });

    // Remaining spreads: pairs starting from page 2
    let spreadIndex = 1;
    for (let page = 2; page <= pageCount; page += 2) {
        const leftPage = page;
        const rightPage = page + 1 <= pageCount ? page + 1 : null;
        spreads.push({
            index: spreadIndex++,
            slots: [leftPage, rightPage]
        });
    }
    return spreads;
}

/**
 * Double page with odd pages on left (right-to-left reading order).
 * Spread 0: [1, null] (cover on left)
 * Spread 1: [3, 2], Spread 2: [5, 4], etc.
 * Last spread may have empty left slot if even page count.
 */
function calculateDoublePageOddLeftSpreads(pageCount: number): Spread[] {
    const spreads: Spread[] = [];
    if (pageCount === 0) return spreads;

    // First spread: cover page on left
    spreads.push({
        index: 0,
        slots: [1, null]
    });

    // Remaining spreads: [odd, previous even] pairs
    let spreadIndex = 1;
    for (let oddPage = 3; oddPage <= pageCount; oddPage += 2) {
        const evenPage = oddPage - 1;
        spreads.push({
            index: spreadIndex++,
            slots: [oddPage, evenPage]
        });
    }

    // If last page is even, it needs its own spread
    if (pageCount % 2 === 0) {
        spreads.push({
            index: spreadIndex,
            slots: [null, pageCount]
        });
    }

    return spreads;
}

/**
 * Find the spread index containing a specific page.
 */
export function findSpreadForPage(spreads: Spread[], page: number): number {
    for (let i = 0; i < spreads.length; i++) {
        const spread = spreads[i];
        for (const slot of spread.slots) {
            if (slot === page) return i;
        }
    }
    return 0;
}

/**
 * Get the primary page of a spread (first non-null slot).
 */
export function getSpreadPrimaryPage(spread: Spread): number {
    for (const slot of spread.slots) {
        if (slot !== null) return slot;
    }
    return 1;
}

// -----------------------------------------------------------------------------
// Spread Layout with Positions
// -----------------------------------------------------------------------------

/**
 * Calculated layout for a spread, including position and dimensions.
 */
export interface SpreadLayout {
    /** Spread index */
    index: number;
    /** Page slots */
    slots: [PageSlot] | [PageSlot, PageSlot];
    /** Y position from top of container (scaled) */
    top: number;
    /** Width of the spread (scaled) */
    width: number;
    /** Height of the spread (scaled) */
    height: number;
}

export interface SpreadLayoutResult {
    layouts: SpreadLayout[];
    contentWidth: number;
    contentHeight: number;
}

export interface SpreadDimensions {
    width: number;
    height: number;
}

interface SpreadDimensionsDevice {
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

/**
 * Combine document rotation with user rotation to get effective rotation.
 */
function combineRotation(documentRotation: PageRotation, userRotation: PageRotation): PageRotation {
    const combined = (documentRotation + userRotation) % 360;
    return normalizeRotation(combined as PageRotation);
}

interface Size {
    width: number;
    height: number;
}

/**
 * Apply rotation to get the effective display size.
 * Combines document rotation (from PDF) with user rotation (viewer setting).
 */
function applyRotation(pageInfo: PageInfo, userRotation: PageRotation): Size {
    const documentRotation = normalizeRotation((pageInfo.rotation ?? 0) as PageRotation);
    const effectiveRotation = combineRotation(documentRotation, userRotation);
    if (effectiveRotation === 90 || effectiveRotation === 270) {
        return { width: pageInfo.height, height: pageInfo.width };
    }
    return { width: pageInfo.width, height: pageInfo.height };
}

/**
 * Calculate spread layouts with positions for virtual scrolling.
 *
 * @param spreads - Array of spreads from calculateSpreads()
 * @param pageInfos - Array of page sizes (0-indexed, in points)
 * @param scale - Zoom scale factor
 * @param pageSpacing - Horizontal spacing between pages in a spread
 * @param spreadSpacing - Vertical spacing between spreads
 * @param dpi - Display DPI for point-to-pixel conversion
 * @param rotation - Page rotation in degrees
 * @returns Layouts plus aggregated content size
 */
export function calculateSpreadLayouts(
    spreads: Spread[],
    pageInfos: readonly PageInfo[],
    scale: number,
    pageSpacing: number,
    spreadSpacing: number,
    dpi: number,
    rotation: PageRotation
): SpreadLayoutResult {
    // Snap all layout values to device pixels to ensure adjacent spreads align.
    // We use CUMULATIVE snapping: each spread's top is calculated from the
    // previous spread's snapped bottom, guaranteeing no gaps or overlaps.
    const dpr = getDevicePixelRatio();
    const layouts: SpreadLayout[] = [];
    const spacingDevice = toDevicePixels(spreadSpacing, dpr);
    let currentTopDevice = spreads.length > 0 ? spacingDevice : 0;
    let maxWidthDevice = 0;

    for (const spread of spreads) {
        const { width, height } = getSpreadDimensionsDevice(
            spread,
            pageInfos,
            scale,
            pageSpacing,
            dpi,
            rotation,
            dpr
        );

        layouts.push({
            index: spread.index,
            slots: spread.slots,
            top: toCssPixels(currentTopDevice, dpr),
            width: toCssPixels(width, dpr),
            height: toCssPixels(height, dpr)
        });

        // Next spread's top = this spread's bottom + spacing
        // Using snapped values ensures cumulative consistency
        currentTopDevice += height + spacingDevice;
        maxWidthDevice = Math.max(maxWidthDevice, width);
    }

    const contentHeight =
        spreads.length > 0
            ? toCssPixels(currentTopDevice, dpr)
            : 0;

    return {
        layouts,
        contentWidth: toCssPixels(maxWidthDevice, dpr),
        contentHeight
    };
}

/**
 * Calculate the dimensions of a spread based on its pages.
 * Returns dimensions in CSS pixels (accounting for DPI conversion).
 */
export function getSpreadDimensions(
    spread: Spread,
    pageInfos: readonly PageInfo[],
    scale: number,
    pageSpacing: number,
    dpi: number,
    rotation: PageRotation
): SpreadDimensions {
    const dpr = getDevicePixelRatio();
    const deviceDims = getSpreadDimensionsDevice(
        spread,
        pageInfos,
        scale,
        pageSpacing,
        dpi,
        rotation,
        dpr
    );
    return {
        width: toCssPixels(deviceDims.width, dpr),
        height: toCssPixels(deviceDims.height, dpr)
    };
}

function getSpreadDimensionsDevice(
    spread: Spread,
    pageInfos: readonly PageInfo[],
    scale: number,
    pageSpacing: number,
    dpi: number,
    rotation: PageRotation,
    dpr: number
): SpreadDimensionsDevice {
    const pointsToPixels = getPointsToPixels(dpi);
    let totalWidth = 0;
    let maxHeight = 0;
    const hasMultipleSlots = spread.slots.length > 1;

    let referenceSize: Size | null = null;
    for (const slot of spread.slots) {
        if (slot !== null) {
            const pageInfo = pageInfos[slot - 1];
            if (pageInfo) {
                referenceSize = applyRotation(pageInfo, rotation);
                break;
            }
        }
    }

    for (const slot of spread.slots) {
        if (slot !== null) {
            const pageIndex = slot - 1; // Convert 1-indexed page to 0-indexed
            const size = pageInfos[pageIndex];
            if (size) {
                const rotated = applyRotation(size, rotation);
                // Convert points to pixels: points * (dpi/72) * zoom
                const widthDevice = toDevicePixels(rotated.width * pointsToPixels * scale, dpr);
                const heightDevice = toDevicePixels(rotated.height * pointsToPixels * scale, dpr);
                totalWidth += widthDevice;
                maxHeight = Math.max(maxHeight, heightDevice);
            }
        } else if (referenceSize) {
            const widthDevice = toDevicePixels(referenceSize.width * pointsToPixels * scale, dpr);
            const heightDevice = toDevicePixels(referenceSize.height * pointsToPixels * scale, dpr);
            totalWidth += widthDevice;
            maxHeight = Math.max(maxHeight, heightDevice);
        }
    }

    // Add spacing between slots in multi-slot spreads (even if a slot is empty).
    if (hasMultipleSlots) {
        totalWidth += toDevicePixels(pageSpacing, dpr);
    }

    return { width: totalWidth, height: maxHeight };
}

/**
 * Calculate total content height including all spreads and spacing.
 */
export function calculateTotalHeight(layouts: SpreadLayout[], spreadSpacing: number): number {
    if (layouts.length === 0) return 0;
    const lastLayout = layouts[layouts.length - 1];
    return lastLayout.top + lastLayout.height + snapSpacing(spreadSpacing);
}

function snapSpacing(value: number): number {
    const dpr = getDevicePixelRatio();
    return toCssPixels(toDevicePixels(value, dpr), dpr);
}

/**
 * Find visible spread indices based on scroll position and viewport height.
 *
 * @param layouts - Array of spread layouts
 * @param scrollTop - Current scroll position
 * @param viewportHeight - Height of the visible viewport
 * @param buffer - Number of extra spreads to include above/below (for smooth scrolling)
 * @returns Object with start and end indices (inclusive)
 */
export function findVisibleSpreadRange(
    layouts: SpreadLayout[],
    scrollTop: number,
    viewportHeight: number,
    buffer: number = 1
): { start: number; end: number } {
    if (layouts.length === 0) {
        return { start: 0, end: -1 };
    }

    const viewportBottom = scrollTop + viewportHeight;

    // Find first visible spread
    let start = 0;
    for (let i = 0; i < layouts.length; i++) {
        const layout = layouts[i];
        if (layout.top + layout.height >= scrollTop) {
            start = i;
            break;
        }
        start = i;
    }

    // Find last visible spread
    let end = layouts.length - 1;
    for (let i = start; i < layouts.length; i++) {
        const layout = layouts[i];
        if (layout.top > viewportBottom) {
            end = i - 1;
            break;
        }
        end = i;
    }

    // Apply buffer
    start = Math.max(0, start - buffer);
    end = Math.min(layouts.length - 1, end + buffer);

    return { start, end };
}
