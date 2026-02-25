import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    calculateSpreads,
    findSpreadForPage,
    getSpreadPrimaryPage,
    calculateSpreadLayouts,
    findVisibleSpreadRange,
    type Spread,
} from "../src/ui/viewer/layout/spreadLayout.js";
import type { PageInfo } from "../src/ui/viewer/state.js";

const mockPageInfos = (sizes: Array<{ width: number; height: number }>): PageInfo[] => {
    return sizes.map((s) => ({ width: s.width, height: s.height }));
};

describe("calculateSpreads", () => {
    describe("single-page layout", () => {
        it("should return empty array for zero pages", () => {
            const spreads = calculateSpreads(0, "single-page");
            expect(spreads).toEqual([]);
        });

        it("should create one spread per page", () => {
            const spreads = calculateSpreads(3, "single-page");
            expect(spreads).toHaveLength(3);
            expect(spreads[0]).toEqual({ index: 0, slots: [1] });
            expect(spreads[1]).toEqual({ index: 1, slots: [2] });
            expect(spreads[2]).toEqual({ index: 2, slots: [3] });
        });

        it("should handle single page document", () => {
            const spreads = calculateSpreads(1, "single-page");
            expect(spreads).toHaveLength(1);
            expect(spreads[0]).toEqual({ index: 0, slots: [1] });
        });
    });

    describe("double-page layout", () => {
        it("should pair pages starting from page 1", () => {
            const spreads = calculateSpreads(4, "double-page");
            expect(spreads).toHaveLength(2);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, 2] });
            expect(spreads[1]).toEqual({ index: 1, slots: [3, 4] });
        });

        it("should handle odd page count with null right slot", () => {
            const spreads = calculateSpreads(5, "double-page");
            expect(spreads).toHaveLength(3);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, 2] });
            expect(spreads[1]).toEqual({ index: 1, slots: [3, 4] });
            expect(spreads[2]).toEqual({ index: 2, slots: [5, null] });
        });

        it("should handle single page document", () => {
            const spreads = calculateSpreads(1, "double-page");
            expect(spreads).toHaveLength(1);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, null] });
        });
    });

    describe("double-page-odd-right layout (cover mode)", () => {
        it("should place first page on right (cover)", () => {
            const spreads = calculateSpreads(5, "double-page-odd-right");
            expect(spreads).toHaveLength(3);
            expect(spreads[0]).toEqual({ index: 0, slots: [null, 1] });
            expect(spreads[1]).toEqual({ index: 1, slots: [2, 3] });
            expect(spreads[2]).toEqual({ index: 2, slots: [4, 5] });
        });

        it("should handle single page (cover only)", () => {
            const spreads = calculateSpreads(1, "double-page-odd-right");
            expect(spreads).toHaveLength(1);
            expect(spreads[0]).toEqual({ index: 0, slots: [null, 1] });
        });

        it("should handle two pages (cover + one spread)", () => {
            const spreads = calculateSpreads(2, "double-page-odd-right");
            expect(spreads).toHaveLength(2);
            expect(spreads[0]).toEqual({ index: 0, slots: [null, 1] });
            expect(spreads[1]).toEqual({ index: 1, slots: [2, null] });
        });
    });

    describe("double-page-odd-left layout (RTL reading)", () => {
        it("should place first page on left, then pair odd with previous even", () => {
            const spreads = calculateSpreads(5, "double-page-odd-left");
            expect(spreads).toHaveLength(3);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, null] });
            expect(spreads[1]).toEqual({ index: 1, slots: [3, 2] });
            expect(spreads[2]).toEqual({ index: 2, slots: [5, 4] });
        });

        it("should handle even page count with trailing page on right", () => {
            const spreads = calculateSpreads(6, "double-page-odd-left");
            expect(spreads).toHaveLength(4);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, null] });
            expect(spreads[1]).toEqual({ index: 1, slots: [3, 2] });
            expect(spreads[2]).toEqual({ index: 2, slots: [5, 4] });
            expect(spreads[3]).toEqual({ index: 3, slots: [null, 6] });
        });

        it("should handle single page", () => {
            const spreads = calculateSpreads(1, "double-page-odd-left");
            expect(spreads).toHaveLength(1);
            expect(spreads[0]).toEqual({ index: 0, slots: [1, null] });
        });
    });
});

describe("findSpreadForPage", () => {
    it("should find spread containing the page", () => {
        const spreads: Spread[] = [
            { index: 0, slots: [1, 2] },
            { index: 1, slots: [3, 4] },
            { index: 2, slots: [5, null] },
        ];
        expect(findSpreadForPage(spreads, 1)).toBe(0);
        expect(findSpreadForPage(spreads, 2)).toBe(0);
        expect(findSpreadForPage(spreads, 3)).toBe(1);
        expect(findSpreadForPage(spreads, 5)).toBe(2);
    });

    it("should return 0 for page not found", () => {
        const spreads: Spread[] = [
            { index: 0, slots: [1, 2] },
            { index: 1, slots: [3, 4] },
        ];
        expect(findSpreadForPage(spreads, 10)).toBe(0);
    });

    it("should handle empty spreads", () => {
        expect(findSpreadForPage([], 1)).toBe(0);
    });
});

describe("getSpreadPrimaryPage", () => {
    it("should return first non-null slot", () => {
        expect(getSpreadPrimaryPage({ index: 0, slots: [1, 2] })).toBe(1);
        expect(getSpreadPrimaryPage({ index: 0, slots: [null, 1] })).toBe(1);
        expect(getSpreadPrimaryPage({ index: 0, slots: [3, null] })).toBe(3);
    });

    it("should return 1 for all-null slots (edge case)", () => {
        expect(getSpreadPrimaryPage({ index: 0, slots: [null, null] as [number, number] })).toBe(1);
    });
});

describe("findVisibleSpreadRange", () => {
    const layouts = [
        { index: 0, slots: [1] as [number], top: 0, width: 100, height: 200 },
        { index: 1, slots: [2] as [number], top: 220, width: 100, height: 200 },
        { index: 2, slots: [3] as [number], top: 440, width: 100, height: 200 },
        { index: 3, slots: [4] as [number], top: 660, width: 100, height: 200 },
        { index: 4, slots: [5] as [number], top: 880, width: 100, height: 200 },
    ];

    it("should return empty range for empty layouts", () => {
        expect(findVisibleSpreadRange([], 0, 500)).toEqual({ start: 0, end: -1 });
    });

    it("should find visible spreads in viewport (with default buffer=1)", () => {
        expect(findVisibleSpreadRange(layouts, 0, 500)).toEqual({ start: 0, end: 3 });
        expect(findVisibleSpreadRange(layouts, 200, 500)).toEqual({ start: 0, end: 4 });
        expect(findVisibleSpreadRange(layouts, 500, 300)).toEqual({ start: 1, end: 4 });
    });

    it("should find visible spreads without buffer", () => {
        expect(findVisibleSpreadRange(layouts, 0, 500, 0)).toEqual({ start: 0, end: 2 });
        expect(findVisibleSpreadRange(layouts, 200, 500, 0)).toEqual({ start: 0, end: 3 });
        expect(findVisibleSpreadRange(layouts, 500, 300, 0)).toEqual({ start: 2, end: 3 });
    });

    it("should apply buffer correctly", () => {
        const result = findVisibleSpreadRange(layouts, 200, 300, 1);
        expect(result).toEqual({ start: 0, end: 3 });

        const resultWithBuffer2 = findVisibleSpreadRange(layouts, 400, 200, 2);
        expect(resultWithBuffer2).toEqual({ start: 0, end: 4 });
    });

    it("should clamp buffer to valid range", () => {
        const result = findVisibleSpreadRange(layouts, 0, 200, 10);
        expect(result.start).toBe(0);
        expect(result.end).toBe(4);
    });

    it("should handle scrolling near end (with default buffer=1)", () => {
        const result = findVisibleSpreadRange(layouts, 800, 200);
        expect(result.start).toBe(2);
        expect(result.end).toBe(4);
    });

    it("should handle scrolling near end without buffer", () => {
        const result = findVisibleSpreadRange(layouts, 800, 200, 0);
        expect(result.start).toBe(3);
        expect(result.end).toBe(4);
    });
});

describe("calculateSpreadLayouts", () => {
    beforeEach(() => {
        vi.stubGlobal("window", { devicePixelRatio: 1 });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should return empty result for empty spreads", () => {
        const result = calculateSpreadLayouts([], [], 1, 10, 20, 96, 0);
        expect(result.layouts).toEqual([]);
        expect(result.contentWidth).toBe(0);
        expect(result.contentHeight).toBe(0);
    });

    it("should calculate layout for single page", () => {
        const spreads: Spread[] = [{ index: 0, slots: [1] }];
        const pageInfos = mockPageInfos([{ width: 612, height: 792 }]);

        const result = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);

        expect(result.layouts).toHaveLength(1);
        expect(result.layouts[0].index).toBe(0);
        expect(result.layouts[0].slots).toEqual([1]);
        expect(result.layouts[0].top).toBe(20);
        expect(result.layouts[0].width).toBeCloseTo(816, 0);
        expect(result.layouts[0].height).toBeCloseTo(1056, 0);
    });

    it("should calculate layout for double-page spread", () => {
        const spreads: Spread[] = [{ index: 0, slots: [1, 2] }];
        const pageInfos = mockPageInfos([
            { width: 612, height: 792 },
            { width: 612, height: 792 },
        ]);

        const result = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);

        expect(result.layouts).toHaveLength(1);
        expect(result.layouts[0].width).toBeCloseTo(816 * 2 + 10, 0);
        expect(result.layouts[0].height).toBeCloseTo(1056, 0);
    });

    it("should handle rotation correctly", () => {
        const spreads: Spread[] = [{ index: 0, slots: [1] }];
        const pageInfos = mockPageInfos([{ width: 612, height: 792 }]);

        const result0 = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);
        const result90 = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 90);

        expect(result0.layouts[0].width).toBeCloseTo(816, 0);
        expect(result0.layouts[0].height).toBeCloseTo(1056, 0);

        expect(result90.layouts[0].width).toBeCloseTo(1056, 0);
        expect(result90.layouts[0].height).toBeCloseTo(816, 0);
    });

    it("should apply scale factor", () => {
        const spreads: Spread[] = [{ index: 0, slots: [1] }];
        const pageInfos = mockPageInfos([{ width: 612, height: 792 }]);

        const result1x = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);
        const result2x = calculateSpreadLayouts(spreads, pageInfos, 2, 10, 20, 96, 0);

        expect(result2x.layouts[0].width).toBeCloseTo(result1x.layouts[0].width * 2, 0);
        expect(result2x.layouts[0].height).toBeCloseTo(result1x.layouts[0].height * 2, 0);
    });

    it("should calculate content height correctly with multiple spreads", () => {
        const spreads: Spread[] = [
            { index: 0, slots: [1] },
            { index: 1, slots: [2] },
        ];
        const pageInfos = mockPageInfos([
            { width: 612, height: 792 },
            { width: 612, height: 792 },
        ]);

        const result = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);

        expect(result.layouts).toHaveLength(2);
        expect(result.layouts[1].top).toBeGreaterThan(result.layouts[0].top + result.layouts[0].height);
    });

    it("should handle empty slot in double-page spread", () => {
        const spreads: Spread[] = [{ index: 0, slots: [1, null] }];
        const pageInfos = mockPageInfos([{ width: 612, height: 792 }]);

        const result = calculateSpreadLayouts(spreads, pageInfos, 1, 10, 20, 96, 0);

        expect(result.layouts).toHaveLength(1);
        expect(result.layouts[0].width).toBeCloseTo(816 * 2 + 10, 0);
    });
});
