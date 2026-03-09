import { describe, it, expect } from "vitest";
import { executeSearch } from "../src/ui/viewer/search/search";
import type { TextRun } from "../src/ui/viewer/text/types";

// Mock text runs for testing
const createMockTextRun = (text: string, glyphs: number): TextRun => ({
    text,
    glyphs: Array(glyphs).fill({ x: 0, y: 0, width: 10, height: 10 }),
    fontName: "Arial",
    fontSize: 12,
    color: "#000000",
    fontStyle: "normal",
    transform: {
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        translateX: 0,
        translateY: 0,
    },
});

describe("executeSearch", () => {
    it("should return empty array for empty query", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world", 11)]);

        const result = executeSearch("", false, pageText, 1);
        expect(result).toEqual([]);
    });

    it("should return empty array for whitespace-only query", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world", 11)]);

        const result = executeSearch("   ", false, pageText, 1);
        expect(result).toEqual([]);
    });

    it("should find exact matches", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world", 11)]);

        const result = executeSearch("world", false, pageText, 1);
        expect(result).toHaveLength(1);
        expect(result[0].pageIndex).toBe(0);
        expect(result[0].length).toBe(5);
    });

    it("should find multiple matches", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world, hello world", 22)]);

        const result = executeSearch("world", false, pageText, 1);
        expect(result).toHaveLength(2);
    });

    it("should respect case sensitivity", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello World", 11)]);

        const caseInsensitiveResult = executeSearch("world", false, pageText, 1);
        expect(caseInsensitiveResult).toHaveLength(1);

        const caseSensitiveResult = executeSearch("world", true, pageText, 1);
        expect(caseSensitiveResult).toHaveLength(0);
    });

    it("should find matches across multiple pages", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world", 11)]);
        pageText.set(1, [createMockTextRun("Hello again", 11)]);

        const result = executeSearch("Hello", false, pageText, 2);
        expect(result).toHaveLength(2);
        expect(result[0].pageIndex).toBe(0);
        expect(result[1].pageIndex).toBe(1);
    });

    it("should handle empty page text", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, []);

        const result = executeSearch("Hello", false, pageText, 1);
        expect(result).toEqual([]);
    });

    it("should return empty array for no matches", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("Hello world", 11)]);

        const result = executeSearch("not found", false, pageText, 1);
        expect(result).toEqual([]);
    });

    it("should include context snippets in results", () => {
        const pageText = new Map<number, TextRun[]>();
        pageText.set(0, [createMockTextRun("This is a test sentence for search context", 42)]);

        const result = executeSearch("test", false, pageText, 1);
        expect(result).toHaveLength(1);
        expect(result[0].context).toBeDefined();
        expect(result[0].context[0]).toContain("is a");
        expect(result[0].context[1]).toBe("test");
        expect(result[0].context[2]).toContain("sentence");
    });
});
