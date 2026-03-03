/**
 * Text search algorithm for document viewer.
 *
 * Searches across all loaded page text and returns matches with
 * pre-computed bounding rectangles for highlight rendering.
 */
import type { TextRun } from "../text/types";
import type { SearchMatch } from "../state";

/** Trim text to at most the last n whitespace-separated words. */
function trimToLastNWords(text: string, n: number): string {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= n) return text;
    return words.slice(-n).join(" ");
}

/** Trim text to at most the first n whitespace-separated words. */
function trimToFirstNWords(text: string, n: number): string {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= n) return text;
    return words.slice(0, n).join(" ");
}

interface CharMapping {
    run: TextRun;
    glyphIndex: number;
}

/**
 * Build a flat text string from text runs, with a mapping from each
 * character position back to its source TextRun and glyph index.
 */
function buildPageTextMap(runs: TextRun[]): { fullText: string; charMap: CharMapping[] } {
    let fullText = "";
    const charMap: CharMapping[] = [];

    for (const run of runs) {
        const text = run.text ?? "";
        if (!text || run.glyphs.length === 0) continue;

        for (let i = 0; i < text.length; i++) {
            const glyphIndex = Math.min(i, run.glyphs.length - 1);
            charMap.push({ run, glyphIndex });
        }
        fullText += text;
    }

    return { fullText, charMap };
}

/**
 * Convert character offset + length to bounding rectangles in PDF points.
 * Groups adjacent glyphs on the same line into merged rects.
 */
function computeMatchRects(
    charMap: CharMapping[],
    offset: number,
    length: number,
): Array<{ x: number; y: number; width: number; height: number }> {
    const rects: Array<{ x: number; y: number; width: number; height: number }> = [];

    let currentRun: TextRun | null = null;
    let rectStartX = 0;
    let rectEndX = 0;
    let rectY = 0;
    let rectHeight = 0;

    for (let i = offset; i < offset + length && i < charMap.length; i++) {
        const { run, glyphIndex } = charMap[i];
        const glyph = run.glyphs[glyphIndex];
        const transform = run.transform;
        const effectiveScaleX = Math.sqrt(transform.scaleX ** 2 + transform.skewY ** 2);
        const effectiveScaleY = Math.sqrt(transform.scaleY ** 2 + transform.skewX ** 2);
        const fontSize = run.fontSize * effectiveScaleY;

        // Glyph position in page space (PDF points)
        const glyphX = transform.translateX + glyph.x * effectiveScaleX;
        const glyphWidth = glyph.advance * effectiveScaleX;
        const glyphY = transform.translateY - fontSize * 0.8; // ascent approximation
        const glyphHeight = fontSize;

        if (currentRun === run && Math.abs(glyphY - rectY) < fontSize * 0.3) {
            // Same run and same line: extend current rect
            rectEndX = glyphX + glyphWidth;
        } else {
            // New run or new line: flush previous rect and start new one
            if (currentRun !== null) {
                rects.push({ x: rectStartX, y: rectY, width: rectEndX - rectStartX, height: rectHeight });
            }
            currentRun = run;
            rectStartX = glyphX;
            rectEndX = glyphX + glyphWidth;
            rectY = glyphY;
            rectHeight = glyphHeight;
        }
    }

    // Flush last rect
    if (currentRun !== null) {
        rects.push({ x: rectStartX, y: rectY, width: rectEndX - rectStartX, height: rectHeight });
    }

    return rects;
}

/**
 * Execute text search across all loaded pages.
 *
 * @param query - Search string
 * @param caseSensitive - Whether to match case
 * @param pageText - Map of page index to text runs
 * @param pageCount - Total number of pages
 * @returns Array of search matches with pre-computed highlight rects
 */
export function executeSearch(
    query: string,
    caseSensitive: boolean,
    pageText: Map<number, TextRun[]>,
    pageCount: number,
): SearchMatch[] {
    if (!query.trim()) return [];

    const matches: SearchMatch[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const runs = pageText.get(pageIndex);
        if (!runs || runs.length === 0) continue;

        const { fullText, charMap } = buildPageTextMap(runs);
        const compareText = caseSensitive ? fullText : fullText.toLowerCase();

        let searchStart = 0;
        while (searchStart < compareText.length) {
            const idx = compareText.indexOf(searchQuery, searchStart);
            if (idx === -1) break;

            const rects = computeMatchRects(charMap, idx, searchQuery.length);
            // Build context snippet: min(30 chars, 3 words) before and after
            const rawBefore = fullText.substring(Math.max(0, idx - 30), idx);
            const rawAfter = fullText.substring(idx + searchQuery.length, idx + searchQuery.length + 30);
            const before = trimToLastNWords(rawBefore, 3);
            const matched = fullText.substring(idx, idx + searchQuery.length);
            const after = trimToFirstNWords(rawAfter, 3);
            const beforePrefix = idx > before.length ? "\u2026" : "";
            const afterSuffix = idx + searchQuery.length + after.length < fullText.length ? "\u2026" : "";
            const context: [string, string, string] = [beforePrefix + before, matched, after + afterSuffix];
            matches.push({ pageIndex, charOffset: idx, length: searchQuery.length, rects, context });
            searchStart = idx + 1;
        }
    }

    return matches;
}
