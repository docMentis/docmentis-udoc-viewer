/**
 * Text search algorithm for document viewer.
 *
 * Uses hybrid search strategy: native indexOf for short text,
 * Boyer-Moore algorithm for longer text to optimize performance.
 * Searches across all loaded page text and returns matches with
 * pre-computed bounding rectangles for highlight rendering.
 */
import type { TextRun } from "../text/types";
import type { SearchMatch } from "../state";

/**
 * Threshold for switching between native indexOf and Boyer-Moore.
 * For text shorter than this threshold, native indexOf is faster
 * due to no preprocessing overhead. For longer text, Boyer-Moore's
 * ability to skip characters provides better performance.
 */
const BOYER_MOORE_THRESHOLD = 100;

/**
 * Boyer-Moore bad character table.
 * Maps each character to its rightmost position in the pattern,
 * used to determine how far to shift the pattern when a mismatch occurs.
 */
type BadCharTable = Map<string, number>;

/**
 * Build the bad character table for Boyer-Moore algorithm.
 * For each character in the pattern, store its rightmost position
 * (excluding the last character).
 */
function buildBadCharTable(pattern: string): BadCharTable {
    const table: BadCharTable = new Map();
    const patternLen = pattern.length;

    for (let i = 0; i < patternLen - 1; i++) {
        table.set(pattern[i], patternLen - 1 - i);
    }

    return table;
}

/**
 * Find all occurrences of pattern in text using native indexOf.
 * Simple and efficient for short text where preprocessing overhead
 * of Boyer-Moore is not justified.
 */
function nativeSearch(text: string, pattern: string): number[] {
    const matches: number[] = [];
    let searchStart = 0;

    while (searchStart <= text.length - pattern.length) {
        const idx = text.indexOf(pattern, searchStart);
        if (idx === -1) break;
        matches.push(idx);
        searchStart = idx + 1;
    }

    return matches;
}

/**
 * Find all occurrences of pattern in text using Boyer-Moore algorithm.
 * Returns an array of starting indices for each match.
 *
 * Boyer-Moore achieves O(n/m) best case performance by skipping
 * sections of the text that cannot possibly match the pattern.
 */
function boyerMooreSearch(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const textLen = text.length;
    const patternLen = pattern.length;

    const badCharTable = buildBadCharTable(pattern);
    const defaultShift = patternLen;

    let i = 0;
    while (i <= textLen - patternLen) {
        let j = patternLen - 1;

        while (j >= 0 && pattern[j] === text[i + j]) {
            j--;
        }

        if (j < 0) {
            matches.push(i);
            i += patternLen > 1 ? (badCharTable.get(text[i + patternLen - 1]) ?? defaultShift) : 1;
        } else {
            const badChar = text[i + j];
            const shift = badCharTable.get(badChar) ?? defaultShift;
            i += Math.max(1, shift - (patternLen - 1 - j));
        }
    }

    return matches;
}

/**
 * Find all occurrences of pattern in text using adaptive search strategy.
 * Automatically selects the most efficient algorithm based on text length:
 * - Native indexOf for short text (< BOYER_MOORE_THRESHOLD)
 * - Boyer-Moore for longer text (>= BOYER_MOORE_THRESHOLD)
 *
 * @param text - The text to search in
 * @param pattern - The pattern to search for
 * @returns Array of starting indices for each match
 */
export function findPatternMatches(text: string, pattern: string): number[] {
    const textLen = text.length;
    const patternLen = pattern.length;

    if (patternLen === 0 || textLen === 0 || patternLen > textLen) {
        return [];
    }

    if (textLen < BOYER_MOORE_THRESHOLD) {
        return nativeSearch(text, pattern);
    }

    return boyerMooreSearch(text, pattern);
}

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

        const matchIndices = findPatternMatches(compareText, searchQuery);

        for (const idx of matchIndices) {
            const rects = computeMatchRects(charMap, idx, searchQuery.length);
            const rawBefore = fullText.substring(Math.max(0, idx - 30), idx);
            const rawAfter = fullText.substring(idx + searchQuery.length, idx + searchQuery.length + 30);
            const before = trimToLastNWords(rawBefore, 3);
            const matched = fullText.substring(idx, idx + searchQuery.length);
            const after = trimToFirstNWords(rawAfter, 3);
            const beforePrefix = idx > before.length ? "\u2026" : "";
            const afterSuffix = idx + searchQuery.length + after.length < fullText.length ? "\u2026" : "";
            const context: [string, string, string] = [beforePrefix + before, matched, after + afterSuffix];
            matches.push({ pageIndex, charOffset: idx, length: searchQuery.length, rects, context });
        }
    }

    return matches;
}
