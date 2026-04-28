import { describe, it, expect } from "vitest";
import { executeSearch, extractPageText } from "../src/ui/viewer/search/search";
import type { LayoutPage, Transform } from "../src/worker/index.js";

const identity: Transform = {
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    translateX: 0,
    translateY: 0,
};

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

function createMultiLineLayoutPage(lines: string[]): LayoutPage {
    const lineHeight = 20;
    const lineSpacing = 5;
    const layoutLines = lines.map((text, i) => {
        const glyphs = Array.from(text).map((_, j) => ({
            x: j * 10,
            y: 0,
            advance: 10,
            offset: j,
        }));

        return {
            y: i * (lineHeight + lineSpacing),
            width: 600,
            height: lineHeight,
            spaceBefore: 0,
            spaceAfter: 0,
            isFirstLineOfPara: i === 0,
            isLastLineOfPara: i === lines.length - 1,
            content: {
                type: "runList" as const,
                baseline: 15,
                width: text.length * 10,
                height: lineHeight,
                runs: [
                    {
                        x: 0,
                        width: text.length * 10,
                        transform: identity,
                        content: {
                            type: "glyphs" as const,
                            text,
                            fontSize: 12,
                            ascent: 10,
                            descent: 2,
                            glyphs,
                        },
                    },
                ],
            },
        };
    });

    return {
        width: 600,
        height: lines.length * (lineHeight + lineSpacing),
        frames: [
            {
                transform: identity,
                parcel: {
                    x: 0,
                    y: 0,
                    width: 600,
                    height: lines.length * (lineHeight + lineSpacing),
                    lines: layoutLines,
                },
            },
        ],
    };
}

function createRotatedLayoutPage(text: string, angleDegrees: number): LayoutPage {
    const radians = (angleDegrees * Math.PI) / 180;
    const rotatedTransform: Transform = {
        scaleX: Math.cos(radians),
        skewY: Math.sin(radians),
        skewX: -Math.sin(radians),
        scaleY: Math.cos(radians),
        translateX: 0,
        translateY: 0,
    };

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
                transform: rotatedTransform,
                parcel: {
                    x: 100,
                    y: 100,
                    width: 400,
                    height: 400,
                    lines: [
                        {
                            y: 0,
                            width: text.length * 10,
                            height: 20,
                            spaceBefore: 0,
                            spaceAfter: 0,
                            isFirstLineOfPara: true,
                            isLastLineOfPara: true,
                            content: {
                                type: "runList" as const,
                                baseline: 15,
                                width: text.length * 10,
                                height: 20,
                                runs: [
                                    {
                                        x: 0,
                                        width: text.length * 10,
                                        transform: identity,
                                        content: {
                                            type: "glyphs" as const,
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

function createTableLayoutPage(rows: string[][]): LayoutPage {
    const cellWidth = 100;
    const cellHeight = 30;
    const tableRows = rows.map((cells, rowIndex) => ({
        y: rowIndex * cellHeight,
        height: cellHeight,
        cells: cells.map((cellText, colIndex) => {
            const glyphs = Array.from(cellText).map((_, i) => ({
                x: i * 8,
                y: 0,
                advance: 8,
                offset: i,
            }));

            return {
                colIndex,
                colSpan: 1,
                rowSpan: 1,
                x: colIndex * cellWidth,
                y: 0,
                width: cellWidth,
                height: cellHeight,
                parcel: {
                    x: 0,
                    y: 0,
                    width: cellWidth,
                    height: cellHeight,
                    lines: [
                        {
                            y: 5,
                            width: cellWidth,
                            height: 20,
                            spaceBefore: 0,
                            spaceAfter: 0,
                            isFirstLineOfPara: true,
                            isLastLineOfPara: true,
                            content: {
                                type: "runList" as const,
                                baseline: 15,
                                width: cellText.length * 8,
                                height: 20,
                                runs: [
                                    {
                                        x: 5,
                                        width: cellText.length * 8,
                                        transform: identity,
                                        content: {
                                            type: "glyphs" as const,
                                            text: cellText,
                                            fontSize: 10,
                                            ascent: 8,
                                            descent: 2,
                                            glyphs,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            };
        }),
    }));

    const colCount = rows[0]?.length || 1;
    const columns = Array.from({ length: colCount }, (_, i) => ({
        x: i * cellWidth,
        width: cellWidth,
    }));

    return {
        width: colCount * cellWidth,
        height: rows.length * cellHeight,
        frames: [
            {
                transform: identity,
                parcel: {
                    x: 50,
                    y: 50,
                    width: colCount * cellWidth,
                    height: rows.length * cellHeight,
                    lines: [
                        {
                            y: 0,
                            width: colCount * cellWidth,
                            height: rows.length * cellHeight,
                            spaceBefore: 0,
                            spaceAfter: 0,
                            isFirstLineOfPara: true,
                            isLastLineOfPara: true,
                            content: {
                                type: "table" as const,
                                width: colCount * cellWidth,
                                height: rows.length * cellHeight,
                                columns,
                                rows: tableRows,
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

    describe("fuzzy mode", () => {
        it("should match across unicode bullet markers in document text", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMockLayoutPage("• Paragraph"));

            const result = executeSearch("Paragraph", false, pageLayouts, 1, null, true);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should match when the query itself carries a leading bullet", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMockLayoutPage("Paragraph one"));

            const result = executeSearch("• Paragraph", false, pageLayouts, 1, null, true);
            expect(result).toHaveLength(1);
        });

        it("should handle a variety of unicode list-marker glyphs", () => {
            const markers = ["•", "◦", "▪", "‣", "⁃", "●", "■"];
            for (const marker of markers) {
                const pageLayouts = new Map<number, LayoutPage>();
                pageLayouts.set(0, createMockLayoutPage(`${marker} Item`));

                const result = executeSearch("Item", false, pageLayouts, 1, null, true);
                expect(result, `marker U+${marker.charCodeAt(0).toString(16)}`).toHaveLength(1);
            }
        });

        it("should NOT strip ASCII dashes/asterisks (kept for prose correctness)", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMockLayoutPage("state-of-the-art"));

            // Hyphens preserved — "stateoftheart" must not match
            const result = executeSearch("stateoftheart", false, pageLayouts, 1, null, true);
            expect(result).toHaveLength(0);
        });

        it("should map match rects back to original positions after bullet stripping", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMockLayoutPage("• Paragraph"));

            const result = executeSearch("Paragraph", false, pageLayouts, 1, null, true);
            expect(result).toHaveLength(1);
            // "• Paragraph" — "Paragraph" starts at index 2 in the original text
            expect(result[0].charOffset).toBe(2);
            expect(result[0].length).toBe(9);
        });
    });

    describe("multi-line text", () => {
        it("should find text on the first line", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["First line", "Second line", "Third line"]));

            const result = executeSearch("First", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text on the middle line", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["First line", "Second line", "Third line"]));

            const result = executeSearch("Second", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text on the last line", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["First line", "Second line", "Third line"]));

            const result = executeSearch("Third", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text that appears on multiple lines", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["Hello world", "Hello again", "Hello there"]));

            const result = executeSearch("Hello", false, pageLayouts, 1);
            expect(result).toHaveLength(3);
        });

        it("should extract text from all lines in correct order", () => {
            const page = createMultiLineLayoutPage(["Line one", "Line two", "Line three"]);
            const text = extractPageText(page);

            expect(text).toContain("Line one");
            expect(text).toContain("Line two");
            expect(text).toContain("Line three");
        });

        it("should handle single-line page in multi-line helper", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["Only line"]));

            const result = executeSearch("Only", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should handle empty lines gracefully", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createMultiLineLayoutPage(["First", "", "Third"]));

            const result = executeSearch("Third", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });
    });

    describe("rotated text", () => {
        it("should find text rotated 90 degrees", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Rotated Text", 90));

            const result = executeSearch("Rotated", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text rotated 180 degrees", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Upside Down", 180));

            const result = executeSearch("Upside", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should find text rotated 270 degrees", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Rotated 270", 270));

            const result = executeSearch("Rotated", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should find text with no rotation (0 degrees)", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Normal Text", 0));

            const result = executeSearch("Normal", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should compute correct rect angle for rotated text", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Test", 90));

            const result = executeSearch("Test", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].rects.length).toBeGreaterThan(0);
            // Angle should be approximately 90 degrees
            expect(result[0].rects[0].angle).toBeCloseTo(90, 0);
        });

        it("should compute correct rect angle for 180 degree rotation", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("Test", 180));

            const result = executeSearch("Test", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            // Angle should be approximately 180 degrees (or -180)
            const angle = Math.abs(result[0].rects[0].angle);
            expect(angle).toBeCloseTo(180, 0);
        });

        it("should handle case-insensitive search on rotated text", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createRotatedLayoutPage("ROTATED", 45));

            const result = executeSearch("rotated", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });
    });

    describe("table content", () => {
        it("should find text in the first table cell", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createTableLayoutPage([["Name", "Age", "City"]]));

            const result = executeSearch("Name", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text in the middle table cell", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createTableLayoutPage([["Name", "Age", "City"]]));

            const result = executeSearch("Age", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should find text in the last table cell", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createTableLayoutPage([["Name", "Age", "City"]]));

            const result = executeSearch("City", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should find text in multiple rows", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(
                0,
                createTableLayoutPage([
                    ["Alice", "30", "Beijing"],
                    ["Bob", "25", "Shanghai"],
                    ["Charlie", "35", "Guangzhou"],
                ]),
            );

            const result = executeSearch("Beijing", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
            expect(result[0].pageIndex).toBe(0);
        });

        it("should find text that appears in multiple cells", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(
                0,
                createTableLayoutPage([
                    ["Item A", "Item B"],
                    ["Item C", "Item D"],
                ]),
            );

            const result = executeSearch("Item", false, pageLayouts, 1);
            expect(result).toHaveLength(4);
        });

        it("should handle single-cell table", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createTableLayoutPage([["Single Cell"]]));

            const result = executeSearch("Single", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should handle empty cells gracefully", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(
                0,
                createTableLayoutPage([
                    ["A", "", "C"],
                    ["D", "E", ""],
                ]),
            );

            const result = executeSearch("E", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });

        it("should extract text from all cells", () => {
            const page = createTableLayoutPage([
                ["A1", "B1"],
                ["A2", "B2"],
            ]);
            const text = extractPageText(page);

            expect(text).toContain("A1");
            expect(text).toContain("B1");
            expect(text).toContain("A2");
            expect(text).toContain("B2");
        });

        it("should handle case-insensitive search in table", () => {
            const pageLayouts = new Map<number, LayoutPage>();
            pageLayouts.set(0, createTableLayoutPage([["HELLO", "WORLD"]]));

            const result = executeSearch("hello", false, pageLayouts, 1);
            expect(result).toHaveLength(1);
        });
    });
});
