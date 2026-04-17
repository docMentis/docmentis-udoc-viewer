import { describe, it, expect } from "vitest";
import { executeSearch } from "../src/ui/viewer/search/search";
import type { LayoutPage, Transform } from "../src/worker/index.js";

const identity: Transform = {
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    translateX: 0,
    translateY: 0,
};

/** Build a minimal single-line LayoutPage from a text string. */
function createMockLayoutPage(text: string): LayoutPage {
    const glyphs = Array.from(text).map((_, i) => ({
        x: i * 10,
        y: 0,
        advance: 10,
        offset: i,
    }));
    return {
        width: 600,
        height: 800,
        frames: [
            {
                transform: identity,
                parcel: {
                    x: 0,
                    y: 0,
                    width: 600,
                    height: 800,
                    lines: [
                        {
                            y: 0,
                            width: 600,
                            height: 20,
                            spaceBefore: 0,
                            spaceAfter: 0,
                            isFirstLineOfPara: true,
                            isLastLineOfPara: true,
                            content: {
                                type: "runList",
                                baseline: 15,
                                width: text.length * 10,
                                height: 20,
                                runs: [
                                    {
                                        x: 0,
                                        width: text.length * 10,
                                        transform: identity,
                                        content: {
                                            type: "glyphs",
                                            text,
                                            fontSize: 12,
                                            ascent: 10,
                                            descent: 2,
                                            glyphs,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ],
    };
}

describe("executeSearch", () => {
    it("should return empty array for empty query", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world"));

        const result = executeSearch("", false, pageLayouts, 1);
        expect(result).toEqual([]);
    });

    it("should return empty array for whitespace-only query", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world"));

        const result = executeSearch("   ", false, pageLayouts, 1);
        expect(result).toEqual([]);
    });

    it("should find exact matches", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world"));

        const result = executeSearch("world", false, pageLayouts, 1);
        expect(result).toHaveLength(1);
        expect(result[0].pageIndex).toBe(0);
        expect(result[0].length).toBe(5);
    });

    it("should find multiple matches", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world, hello world"));

        const result = executeSearch("world", false, pageLayouts, 1);
        expect(result).toHaveLength(2);
    });

    it("should respect case sensitivity", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello World"));

        const caseInsensitiveResult = executeSearch("world", false, pageLayouts, 1);
        expect(caseInsensitiveResult).toHaveLength(1);

        const caseSensitiveResult = executeSearch("world", true, pageLayouts, 1);
        expect(caseSensitiveResult).toHaveLength(0);
    });

    it("should find matches across multiple pages", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world"));
        pageLayouts.set(1, createMockLayoutPage("Hello again"));

        const result = executeSearch("Hello", false, pageLayouts, 2);
        expect(result).toHaveLength(2);
        expect(result[0].pageIndex).toBe(0);
        expect(result[1].pageIndex).toBe(1);
    });

    it("should handle empty page text", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, { width: 600, height: 800, frames: [] });

        const result = executeSearch("Hello", false, pageLayouts, 1);
        expect(result).toEqual([]);
    });

    it("should return empty array for no matches", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("Hello world"));

        const result = executeSearch("not found", false, pageLayouts, 1);
        expect(result).toEqual([]);
    });

    it("should include context snippets in results", () => {
        const pageLayouts = new Map<number, LayoutPage>();
        pageLayouts.set(0, createMockLayoutPage("This is a test sentence for search context"));

        const result = executeSearch("test", false, pageLayouts, 1);
        expect(result).toHaveLength(1);
        expect(result[0].context).toBeDefined();
        expect(result[0].context[0]).toContain("is a");
        expect(result[0].context[1]).toBe("test");
        expect(result[0].context[2]).toContain("sentence");
    });
});
