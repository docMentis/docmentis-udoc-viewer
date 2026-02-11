// -----------------------------------------------------------------------------
// Destination display types (matching WASM JsDestinationDisplay)
// -----------------------------------------------------------------------------

/**
 * How a page should be displayed when navigating to a destination.
 * Matches PDF destination display types and WASM JsDestinationDisplay.
 */
export type DestinationDisplay =
    | { type: "xyz"; left?: number; top?: number; zoom?: number }
    | { type: "fit" }
    | { type: "fitH"; top?: number }
    | { type: "fitV"; left?: number }
    | { type: "fitR"; left: number; top: number; right: number; bottom: number }
    | { type: "fitB" }
    | { type: "fitBH"; top?: number }
    | { type: "fitBV"; left?: number };

/**
 * A navigation destination (page + display mode).
 * Matches WASM JsDestination.
 */
export interface Destination {
    /** Target page index (0-based, from WASM) */
    pageIndex: number;
    /** How the page should be displayed */
    display: DestinationDisplay;
}

// -----------------------------------------------------------------------------
// Outline types (matching WASM JsOutlineItem)
// -----------------------------------------------------------------------------

/**
 * An outline (table of contents) item.
 * Matches WASM JsOutlineItem.
 */
export interface OutlineItem {
    /** Display title */
    title: string;
    /** Navigation destination (optional - some items are structural only) */
    destination?: Destination;
    /** Child items */
    children: OutlineItem[];
    /** Whether the item should be initially collapsed in UI */
    initiallyCollapsed: boolean;
}

// -----------------------------------------------------------------------------
// Navigation target (internal UI state)
// -----------------------------------------------------------------------------

/**
 * Internal navigation target for the viewer.
 * Converted from Destination for use in viewer state.
 */
export interface NavigationTarget {
    /** Target page (1-based for UI consistency) */
    page: number;
    /** Optional scroll position within page (in PDF points, relative to page top-left) */
    scrollTo?: { x?: number; y?: number };
    /** Optional zoom level (undefined = keep current) */
    zoom?: number;
}

// -----------------------------------------------------------------------------
// Conversion utilities
// -----------------------------------------------------------------------------

/**
 * Convert a WASM destination to an internal navigation target.
 *
 * @param dest - The destination from WASM
 * @param pageCount - Total number of pages (for clamping)
 * @returns NavigationTarget for internal use
 */
export function destinationToNavigationTarget(
    dest: Destination,
    pageCount: number
): NavigationTarget {
    // Convert 0-based pageIndex to 1-based page
    const page = Math.max(1, Math.min(dest.pageIndex + 1, Math.max(1, pageCount)));

    const target: NavigationTarget = { page };

    switch (dest.display.type) {
        case "xyz":
            if (dest.display.top !== undefined || dest.display.left !== undefined) {
                target.scrollTo = {
                    x: dest.display.left,
                    y: dest.display.top
                };
            }
            if (dest.display.zoom !== undefined && dest.display.zoom > 0) {
                target.zoom = dest.display.zoom;
            }
            break;

        case "fitH":
            if (dest.display.top !== undefined) {
                target.scrollTo = { y: dest.display.top };
            }
            break;

        case "fitV":
            if (dest.display.left !== undefined) {
                target.scrollTo = { x: dest.display.left };
            }
            break;

        case "fitBH":
            if (dest.display.top !== undefined) {
                target.scrollTo = { y: dest.display.top };
            }
            break;

        case "fitBV":
            if (dest.display.left !== undefined) {
                target.scrollTo = { x: dest.display.left };
            }
            break;

        // "fit", "fitB", "fitR" - just navigate to page, no specific scroll position
        case "fit":
        case "fitB":
        case "fitR":
            // No scroll position needed
            break;
    }

    return target;
}
