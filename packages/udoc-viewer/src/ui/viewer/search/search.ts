/**
 * Text search algorithm for document viewer.
 *
 * Walks the JsLayoutPage hierarchy to extract text and glyph positions,
 * then searches across all loaded pages and returns matches with
 * pre-computed bounding rectangles for highlight rendering.
 */
import type {
    JsLayoutPage,
    JsLayoutParcel,
    JsLayoutLine,
    JsLayoutRun,
    JsLayoutTable,
    JsLayoutGrid,
    JsTransform,
} from "../../../wasm/udoc.js";
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

/** A positioned glyph run with its resolved transform in page space. */
interface ResolvedRun {
    text: string;
    glyphs: { x: number; y: number; advance: number }[];
    fontSize: number;
    transform: JsTransform;
}

interface CharMapping {
    run: ResolvedRun;
    glyphIndex: number;
}

/** Compose two affine transforms: result = A * B */
function compose(a: JsTransform, b: JsTransform): JsTransform {
    return {
        scaleX: a.scaleX * b.scaleX + a.skewX * b.skewY,
        skewY: a.skewY * b.scaleX + a.scaleY * b.skewY,
        skewX: a.scaleX * b.skewX + a.skewX * b.scaleY,
        scaleY: a.skewY * b.skewX + a.scaleY * b.scaleY,
        translateX: a.scaleX * b.translateX + a.skewX * b.translateY + a.translateX,
        translateY: a.skewY * b.translateX + a.scaleY * b.translateY + a.translateY,
    };
}

/** Prepend a translation to an existing transform. */
function translate(t: JsTransform, dx: number, dy: number): JsTransform {
    return {
        scaleX: t.scaleX,
        skewY: t.skewY,
        skewX: t.skewX,
        scaleY: t.scaleY,
        translateX: t.scaleX * dx + t.skewX * dy + t.translateX,
        translateY: t.skewY * dx + t.scaleY * dy + t.translateY,
    };
}

/**
 * Extract all glyph runs from a layout page, resolving transforms to page space.
 */
function extractRuns(layout: JsLayoutPage): ResolvedRun[] {
    const out: ResolvedRun[] = [];

    for (const frame of layout.frames) {
        if (frame.parcel) {
            collectParcel(out, frame.transform, frame.parcel);
        }
    }

    if (layout.grid) {
        collectGrid(out, layout.grid);
    }

    return out;
}

function collectParcel(out: ResolvedRun[], base: JsTransform, parcel: JsLayoutParcel): void {
    const t = translate(base, parcel.x, parcel.y);
    for (const line of parcel.lines) {
        collectLine(out, t, line);
    }
}

function collectLine(out: ResolvedRun[], base: JsTransform, line: JsLayoutLine): void {
    const content = line.content;
    if (content.type === "runList") {
        const t = translate(base, 0, line.y + content.baseline);
        for (const run of content.runs) {
            collectRun(out, t, run);
        }
    } else {
        const t = translate(base, 0, line.y);
        collectTable(out, t, content);
    }
}

function collectRun(out: ResolvedRun[], base: JsTransform, run: JsLayoutRun): void {
    const c = run.content;
    const t = translate(base, run.x, 0);
    const combined = compose(t, run.transform);

    if (c.type === "glyphs" && c.text && c.glyphs.length > 0) {
        out.push({
            text: c.text,
            glyphs: c.glyphs,
            fontSize: c.fontSize,
            transform: combined,
        });
    } else if (c.type === "space") {
        out.push({
            text: " ",
            glyphs: [{ x: 0, y: 0, advance: c.advance }],
            fontSize: c.fontSize,
            transform: combined,
        });
    } else if (c.type === "tab") {
        out.push({
            text: " ",
            glyphs: [{ x: 0, y: 0, advance: c.advance }],
            fontSize: c.fontSize,
            transform: combined,
        });
    } else if (c.type === "break") {
        out.push({
            text: "\n",
            glyphs: [{ x: 0, y: 0, advance: 0 }],
            fontSize: 0,
            transform: combined,
        });
    } else if (c.type === "inlineDrawing") {
        out.push({
            text: "\uFFFC",
            glyphs: [{ x: 0, y: 0, advance: c.width }],
            fontSize: 0,
            transform: combined,
        });
    }
}

function collectTable(out: ResolvedRun[], base: JsTransform, table: JsLayoutTable): void {
    for (const row of table.rows) {
        for (const cell of row.cells) {
            if (cell.parcel) {
                const t = translate(base, cell.x, cell.y);
                collectParcel(out, t, cell.parcel);
            }
        }
    }
}

function collectGrid(out: ResolvedRun[], grid: JsLayoutGrid): void {
    const base: JsTransform = {
        scaleX: grid.scale,
        skewY: 0,
        skewX: 0,
        scaleY: grid.scale,
        translateX: grid.x,
        translateY: grid.y,
    };
    for (const row of grid.rows) {
        for (const cell of row.cells) {
            if (cell.parcel) {
                const t = translate(base, cell.x, cell.y);
                collectParcel(out, t, cell.parcel);
            }
        }
    }
}

/**
 * Build a flat text string from resolved runs, with a mapping from each
 * character position back to its source run and glyph index.
 */
function buildPageTextMap(runs: ResolvedRun[]): { fullText: string; charMap: CharMapping[] } {
    let fullText = "";
    const charMap: CharMapping[] = [];

    for (const run of runs) {
        if (!run.text || run.glyphs.length === 0) continue;

        for (let i = 0; i < run.text.length; i++) {
            const glyphIndex = Math.min(i, run.glyphs.length - 1);
            charMap.push({ run, glyphIndex });
        }
        fullText += run.text;
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

    let hasRect = false;
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

        const glyphX = transform.translateX + glyph.x * effectiveScaleX;
        const glyphWidth = glyph.advance * effectiveScaleX;
        const glyphY = transform.translateY - fontSize * 0.8;
        const glyphHeight = fontSize;

        // Merge glyphs on the same line (regardless of run boundaries)
        if (hasRect && Math.abs(glyphY - rectY) < Math.max(rectHeight, glyphHeight) * 0.5) {
            rectEndX = Math.max(rectEndX, glyphX + glyphWidth);
            rectHeight = Math.max(rectHeight, glyphHeight);
        } else {
            if (hasRect) {
                rects.push({ x: rectStartX, y: rectY, width: rectEndX - rectStartX, height: rectHeight });
            }
            hasRect = true;
            rectStartX = glyphX;
            rectEndX = glyphX + glyphWidth;
            rectY = glyphY;
            rectHeight = glyphHeight;
        }
    }

    if (hasRect) {
        rects.push({ x: rectStartX, y: rectY, width: rectEndX - rectStartX, height: rectHeight });
    }

    return rects;
}

/**
 * Execute text search across all loaded pages.
 *
 * @param query - Search string
 * @param caseSensitive - Whether to match case
 * @param pageLayouts - Map of page index to JsLayoutPage
 * @param pageCount - Total number of pages
 * @returns Array of search matches with pre-computed highlight rects
 */
export function executeSearch(
    query: string,
    caseSensitive: boolean,
    pageLayouts: Map<number, JsLayoutPage>,
    pageCount: number,
): SearchMatch[] {
    if (!query.trim()) return [];

    const matches: SearchMatch[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const layout = pageLayouts.get(pageIndex);
        if (!layout) continue;

        const runs = extractRuns(layout);
        if (runs.length === 0) continue;

        const { fullText, charMap } = buildPageTextMap(runs);
        const compareText = caseSensitive ? fullText : fullText.toLowerCase();

        let searchStart = 0;
        while (searchStart < compareText.length) {
            const idx = compareText.indexOf(searchQuery, searchStart);
            if (idx === -1) break;

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
            searchStart = idx + 1;
        }
    }

    return matches;
}
