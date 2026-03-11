import { describe, it, expect } from "vitest";
import { executeSearch } from "../src/ui/viewer/search/search";
import { findPatternMatches } from "../src/ui/viewer/search/search";
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

describe("findPatternMatches", () => {
    it("should return empty array for empty pattern", () => {
        const result = findPatternMatches("Hello world", "");
        expect(result).toEqual([]);
    });

    it("should return empty array for empty text", () => {
        const result = findPatternMatches("", "test");
        expect(result).toEqual([]);
    });

    it("should return empty array when pattern is longer than text", () => {
        const result = findPatternMatches("Hi", "Hello");
        expect(result).toEqual([]);
    });

    it("should find single match at the beginning", () => {
        const result = findPatternMatches("Hello world", "Hello");
        expect(result).toEqual([0]);
    });

    it("should find single match at the end", () => {
        const result = findPatternMatches("Hello world", "world");
        expect(result).toEqual([6]);
    });

    it("should find single match in the middle", () => {
        const result = findPatternMatches("Hello world", "o w");
        expect(result).toEqual([4]);
    });

    it("should find multiple non-overlapping matches", () => {
        const result = findPatternMatches("abababab", "ab");
        expect(result).toEqual([0, 2, 4, 6]);
    });

    it("should find overlapping matches", () => {
        const result = findPatternMatches("aaa", "aa");
        expect(result).toEqual([0, 1]);
    });

    it("should return empty array when no match found", () => {
        const result = findPatternMatches("Hello world", "xyz");
        expect(result).toEqual([]);
    });

    it("should handle single character pattern", () => {
        const result = findPatternMatches("Hello", "l");
        expect(result).toEqual([2, 3]);
    });

    it("should handle single character text", () => {
        const result = findPatternMatches("a", "a");
        expect(result).toEqual([0]);
    });

    it("should handle exact match", () => {
        const result = findPatternMatches("test", "test");
        expect(result).toEqual([0]);
    });

    it("should be case sensitive", () => {
        const result1 = findPatternMatches("Hello World", "World");
        expect(result1).toEqual([6]);

        const result2 = findPatternMatches("Hello World", "world");
        expect(result2).toEqual([]);
    });

    it("should handle special characters", () => {
        const result = findPatternMatches("Hello! @world# $test", "@world#");
        expect(result).toEqual([7]);
    });

    it("should handle unicode characters", () => {
        const result = findPatternMatches("Hello 世界 test", "世界");
        expect(result).toEqual([6]);
    });

    it("should handle repeated characters in pattern", () => {
        const result = findPatternMatches("aabbaabbaa", "aa");
        expect(result).toEqual([0, 4, 8]);
    });

    it("should handle long text efficiently", () => {
        const longText = "a".repeat(10000) + "target" + "a".repeat(10000);
        const result = findPatternMatches(longText, "target");
        expect(result).toEqual([10000]);
    });

    it("should find all matches in long text with repeated pattern", () => {
        const longText = "abc ".repeat(1000).trim();
        const result = findPatternMatches(longText, "abc");
        expect(result).toHaveLength(1000);
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(4);
    });

    describe("adaptive threshold behavior", () => {
        it("should handle short text below threshold", () => {
            const shortText = "Hello world, this is a test";
            const result = findPatternMatches(shortText, "test");
            expect(result).toEqual([23]);
        });

        it("should handle text at threshold boundary (99 chars)", () => {
            const textAtBoundary = "a".repeat(99);
            const result = findPatternMatches(textAtBoundary, "a");
            expect(result).toHaveLength(99);
        });

        it("should handle text at threshold boundary (100 chars)", () => {
            const textAtBoundary = "a".repeat(100);
            const result = findPatternMatches(textAtBoundary, "a");
            expect(result).toHaveLength(100);
        });

        it("should handle text just above threshold", () => {
            const textAboveThreshold = "a".repeat(101) + "target" + "a".repeat(101);
            const result = findPatternMatches(textAboveThreshold, "target");
            expect(result).toEqual([101]);
        });

        it("should produce consistent results across threshold", () => {
            const pattern = "test";
            const shortText = "This is a test string";
            const longText =
                "This is a test string with a lot more content to push it above the threshold of one hundred characters for example purposes";

            const shortResult = findPatternMatches(shortText, pattern);
            const longResult = findPatternMatches(longText, pattern);

            expect(shortResult).toEqual([10]);
            expect(longResult).toEqual([10]);
        });

        it("should find multiple matches in text near threshold", () => {
            const text = "test ".repeat(25).trim();
            expect(text.length).toBeLessThan(150);

            const result = findPatternMatches(text, "test");
            expect(result).toHaveLength(25);
        });
    });
});
