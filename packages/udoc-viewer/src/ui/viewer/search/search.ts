/**
 * Text search algorithm for document viewer.
 *
 * Walks the LayoutPage hierarchy to extract text and glyph positions,
 * then searches across all loaded pages and returns matches with
 * pre-computed bounding rectangles for highlight rendering.
 */
import type {
    LayoutPage,
    LayoutParcel,
    LayoutLine,
    LayoutRun,
    LayoutTable,
    LayoutGrid,
    Transform,
} from "../../../worker/index.js";
import type { SearchMatch } from "../state";

/** Trim text to at most the last n whitespace-separated words. */
function trimToLastNWords(text: string, n: number): string {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= n) return text;
    const trimmed = words.slice(-n).join(" ");
    // Preserve trailing whitespace so the match text doesn't abut the context
    return /\s$/.test(text) ? trimmed + text[text.length - 1] : trimmed;
}

/** Trim text to at most the first n whitespace-separated words. */
function trimToFirstNWords(text: string, n: number): string {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= n) return text;
    const trimmed = words.slice(0, n).join(" ");
    // Preserve leading whitespace so the match text doesn't abut the context
    return /^\s/.test(text) ? text[0] + trimmed : trimmed;
}

/** A positioned glyph run with its resolved transform in page space. */
interface ResolvedRun {
    text: string;
    glyphs: { x: number; y: number; advance: number }[];
    fontSize: number;
    transform: Transform;
}

interface CharMapping {
    run: ResolvedRun;
    glyphIndex: number;
}

/** Compose two affine transforms: result = A * B */
function compose(a: Transform, b: Transform): Transform {
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
function translate(t: Transform, dx: number, dy: number): Transform {
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
function extractRuns(layout: LayoutPage): ResolvedRun[] {
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

function collectParcel(out: ResolvedRun[], base: Transform, parcel: LayoutParcel): void {
    const t = translate(base, parcel.x, parcel.y);
    for (const line of parcel.lines) {
        collectLine(out, t, line);
    }
}

function collectLine(out: ResolvedRun[], base: Transform, line: LayoutLine): void {
    const content = line.content;
    if (content.type === "runList") {
        const t = translate(base, 0, line.y + line.spaceBefore + content.baseline);
        for (const run of content.runs) {
            collectRun(out, t, run);
        }
    } else {
        const t = translate(base, 0, line.y);
        collectTable(out, t, content);
    }
}

function collectRun(out: ResolvedRun[], base: Transform, run: LayoutRun): void {
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
    } else if (c.type === "paragraphEnd") {
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

function collectTable(out: ResolvedRun[], base: Transform, table: LayoutTable): void {
    for (const row of table.rows) {
        for (const cell of row.cells) {
            if (cell.parcel) {
                const t = translate(base, cell.x, cell.y);
                collectParcel(out, t, cell.parcel);
            }
        }
    }
}

function collectGrid(out: ResolvedRun[], grid: LayoutGrid): void {
    const base: Transform = {
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
 * Extract the flat text of a page, matching exactly what search sees.
 */
export function extractPageText(layout: LayoutPage): string {
    const runs = extractRuns(layout);
    let text = "";
    for (const run of runs) {
        if (!run.text || run.glyphs.length === 0) continue;
        text += run.text;
    }
    return text;
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
 * Handles rotated text by producing rotated rects with an angle.
 */
function computeMatchRects(
    charMap: CharMapping[],
    offset: number,
    length: number,
): Array<{ x: number; y: number; width: number; height: number; angle: number }> {
    const rects: Array<{ x: number; y: number; width: number; height: number; angle: number }> = [];

    // Current rect accumulator
    let hasRect = false;
    let rectAngle = 0;
    let rectAngleRad = 0;
    let rectFontSize = 0;
    // Page-space baseline position of the first glyph in the current rect
    let rectBaseX = 0;
    let rectBaseY = 0;
    // Distance along text direction from rectBase to the end of the current rect
    let rectAlongEnd = 0;

    for (let i = offset; i < offset + length && i < charMap.length; i++) {
        const { run, glyphIndex } = charMap[i];
        const glyph = run.glyphs[glyphIndex];
        const transform = run.transform;

        const angleRad = Math.atan2(transform.skewY, transform.scaleX);
        const angle = angleRad * (180 / Math.PI);
        const effectiveScaleX = Math.sqrt(transform.scaleX ** 2 + transform.skewY ** 2);
        const effectiveScaleY = Math.sqrt(transform.scaleY ** 2 + transform.skewX ** 2);
        const fontSize = run.fontSize * effectiveScaleY;

        // Glyph baseline position in page space (glyph.y is 0 for horizontal text)
        const glyphBaseX = transform.scaleX * glyph.x + transform.translateX;
        const glyphBaseY = transform.skewY * glyph.x + transform.translateY;
        const glyphAdvance = glyph.advance * effectiveScaleX;

        // Check if we can merge with the current rect
        let canMerge = false;
        if (hasRect && Math.abs(angle - rectAngle) < 0.5) {
            // Check perpendicular distance between baselines (should be ~0 for same line)
            const dx = glyphBaseX - rectBaseX;
            const dy = glyphBaseY - rectBaseY;
            const perpDist = Math.abs(-Math.sin(rectAngleRad) * dx + Math.cos(rectAngleRad) * dy);
            canMerge = perpDist < Math.max(rectFontSize, fontSize) * 0.5;
        }

        if (canMerge) {
            // Extend rect along text direction
            const dx = glyphBaseX - rectBaseX;
            const dy = glyphBaseY - rectBaseY;
            const along = Math.cos(rectAngleRad) * dx + Math.sin(rectAngleRad) * dy;
            rectAlongEnd = Math.max(rectAlongEnd, along + glyphAdvance);
            rectFontSize = Math.max(rectFontSize, fontSize);
        } else {
            // Flush previous rect
            if (hasRect) {
                pushRect(rects, rectBaseX, rectBaseY, rectAlongEnd, rectFontSize, rectAngle, rectAngleRad);
            }
            // Start new rect
            hasRect = true;
            rectAngle = angle;
            rectAngleRad = angleRad;
            rectFontSize = fontSize;
            rectBaseX = glyphBaseX;
            rectBaseY = glyphBaseY;
            rectAlongEnd = glyphAdvance;
        }
    }

    if (hasRect) {
        pushRect(rects, rectBaseX, rectBaseY, rectAlongEnd, rectFontSize, rectAngle, rectAngleRad);
    }

    return rects;
}

/** Push a rotated rect, offsetting from baseline to the top-left corner of the rect. */
function pushRect(
    rects: Array<{ x: number; y: number; width: number; height: number; angle: number }>,
    baseX: number,
    baseY: number,
    width: number,
    fontSize: number,
    angle: number,
    angleRad: number,
): void {
    // Offset from baseline "up" by 80% of fontSize in the perpendicular direction.
    // Perpendicular "up" in page space for angle θ is (sin θ, -cos θ).
    const ascent = fontSize * 0.8;
    const x = baseX + Math.sin(angleRad) * ascent;
    const y = baseY - Math.cos(angleRad) * ascent;
    rects.push({ x, y, width, height: fontSize, angle });
}

// ---------------------------------------------------------------------------
// Text normalization for fuzzy (AI-citation) matching
// ---------------------------------------------------------------------------

/** Characters treated as whitespace/separators during fuzzy matching. */
function isNormalizableChar(code: number, ch: string): boolean {
    return (
        ch === " " ||
        ch === "\t" ||
        ch === "\n" ||
        ch === "\r" ||
        ch === "|" ||
        ch === "\uFFFC" || // inline drawing placeholder
        ch === "\u00A0" || // non-breaking space
        ch === "\uFEFF" || // BOM / zero-width no-break space
        ch === "\u200B" || // zero-width space
        ch === "\u200C" || // zero-width non-joiner
        ch === "\u200D" || // zero-width joiner
        ch === "\u2028" || // line separator
        ch === "\u2029" || // paragraph separator
        code < 0x20 // other control characters
    );
}

/**
 * Normalize text for fuzzy matching: strip all whitespace/control/separator
 * characters and return a mapping from each normalized character index back
 * to its original index in the source string.
 */
function normalizeText(text: string): { normalized: string; origIndices: number[] } {
    let normalized = "";
    const origIndices: number[] = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const code = ch.charCodeAt(0);

        if (isNormalizableChar(code, ch)) {
            continue;
        }

        normalized += ch;
        origIndices.push(i);
    }

    return { normalized, origIndices };
}

/**
 * Execute text search across loaded pages.
 *
 * @param query - Search string
 * @param caseSensitive - Whether to match case
 * @param pageLayouts - Map of page index to LayoutPage
 * @param pageCount - Total number of pages
 * @param pageRange - Optional inclusive range to restrict search to (null = all pages)
 * @param fuzzy - When true, normalize whitespace/control characters before matching
 *   so that e.g. AI-generated citations match the original document text even when
 *   whitespace or special characters differ.
 * @returns Array of search matches with pre-computed highlight rects
 */
export function executeSearch(
    query: string,
    caseSensitive: boolean,
    pageLayouts: Map<number, LayoutPage>,
    pageCount: number,
    pageRange: { start: number; end: number } | null = null,
    fuzzy: boolean = false,
): SearchMatch[] {
    if (!query.trim()) return [];

    const matches: SearchMatch[] = [];

    const startPage = pageRange ? Math.max(0, pageRange.start) : 0;
    const endPage = pageRange ? Math.min(pageCount - 1, pageRange.end) : pageCount - 1;

    // Prepare the search query (normalize if fuzzy, then apply case)
    let searchQuery: string;
    if (fuzzy) {
        const { normalized } = normalizeText(query);
        searchQuery = caseSensitive ? normalized : normalized.toLowerCase();
    } else {
        searchQuery = caseSensitive ? query : query.toLowerCase();
    }

    if (!searchQuery) return [];

    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
        const layout = pageLayouts.get(pageIndex);
        if (!layout) continue;

        const runs = extractRuns(layout);
        if (runs.length === 0) continue;

        const { fullText, charMap } = buildPageTextMap(runs);

        if (fuzzy) {
            // Fuzzy mode: normalize page text and match, then map back to original positions
            const caseText = caseSensitive ? fullText : fullText.toLowerCase();
            const { normalized: normText, origIndices } = normalizeText(caseText);

            let searchStart = 0;
            while (searchStart < normText.length) {
                const idx = normText.indexOf(searchQuery, searchStart);
                if (idx === -1) break;

                // Map normalized match back to original text positions
                const origStart = origIndices[idx];
                const origEndChar = origIndices[idx + searchQuery.length - 1];
                const origLen = origEndChar - origStart + 1;

                const rects = computeMatchRects(charMap, origStart, origLen);
                const context = buildContext(fullText, origStart, origLen);
                matches.push({ pageIndex, charOffset: origStart, length: origLen, rects, context });
                searchStart = idx + 1;
            }
        } else {
            // Exact mode: direct indexOf on full text
            const compareText = caseSensitive ? fullText : fullText.toLowerCase();

            let searchStart = 0;
            while (searchStart < compareText.length) {
                const idx = compareText.indexOf(searchQuery, searchStart);
                if (idx === -1) break;

                const rects = computeMatchRects(charMap, idx, searchQuery.length);
                const context = buildContext(fullText, idx, searchQuery.length);
                matches.push({ pageIndex, charOffset: idx, length: searchQuery.length, rects, context });
                searchStart = idx + 1;
            }
        }
    }

    return matches;
}

/** Build a context snippet [before, match, after] for display in the result list. */
function buildContext(fullText: string, offset: number, length: number): [string, string, string] {
    const rawBefore = fullText.substring(Math.max(0, offset - 30), offset);
    const rawAfter = fullText.substring(offset + length, offset + length + 30);
    const beforeUpToNl = rawBefore.includes("\n") ? rawBefore.substring(rawBefore.lastIndexOf("\n") + 1) : rawBefore;
    const afterUpToNl = rawAfter.includes("\n") ? rawAfter.substring(0, rawAfter.indexOf("\n")) : rawAfter;
    const before = trimToLastNWords(beforeUpToNl, 3);
    const matched = fullText.substring(offset, offset + length);
    const after = trimToFirstNWords(afterUpToNl, 3);
    const beforePrefix = before.length < beforeUpToNl.length ? "\u2026" : "";
    const afterSuffix = after.length < afterUpToNl.length ? "\u2026" : "";
    return [beforePrefix + before, matched, after + afterSuffix];
}
