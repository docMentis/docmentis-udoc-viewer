/**
 * Text layer rendering for text selection.
 *
 * Two rendering modes:
 *
 * 1. **Hierarchical** (DOCX/PPTX/XLSX) — builds DOM mirroring the layout:
 *    frame → parcel → line → run, table → row → cell, grid → row → cell
 *
 * 2. **Flat** (PDF) — no layout structure, runs use transforms for positioning.
 *    Decomposes transforms into final pixel coordinates, no CSS transforms.
 *    Same approach as the search highlight code.
 */
import type {
    LayoutPage,
    LayoutFrame,
    LayoutParcel,
    LayoutLine,
    LayoutRun,
    LayoutTable,
    LayoutTableRow,
    LayoutTableCell,
    LayoutGrid,
    LayoutGridRow,
    LayoutGridCell,
    Transform,
} from "../../../worker/index.js";

interface PendingSpan {
    span: HTMLSpanElement;
    targetWidth: number;
    angle: number;
}

function px(v: number): string {
    return `${v}px`;
}

/** Format a Transform as a CSS matrix() with translation scaled to pixels. */
function cssMatrix(t: Transform, scale: number): string {
    return `matrix(${t.scaleX},${t.skewY},${t.skewX},${t.scaleY},${t.translateX * scale},${t.translateY * scale})`;
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
 * Detect if layout has real structure (DOCX/PPTX) or is flat (PDF).
 * PDF layouts have runs with non-identity transforms.
 */
function isFlat(layout: LayoutPage): boolean {
    for (const frame of layout.frames) {
        if (!frame.parcel) continue;
        for (const line of frame.parcel.lines) {
            if (line.content.type !== "runList") continue;
            for (const run of line.content.runs) {
                const t = run.transform;
                if (
                    Math.abs(t.scaleX - 1) > 0.001 ||
                    Math.abs(t.scaleY - 1) > 0.001 ||
                    Math.abs(t.skewX) > 0.001 ||
                    Math.abs(t.skewY) > 0.001 ||
                    Math.abs(t.translateX) > 0.001 ||
                    Math.abs(t.translateY) > 0.001
                ) {
                    return true;
                }
                // Only need to check first glyph run
                if (run.content.type === "glyphs") return false;
            }
        }
    }
    return false;
}

/**
 * Render a LayoutPage to a text layer element.
 */
export function renderTextToLayer(
    layer: HTMLDivElement,
    layout: LayoutPage | null | undefined,
    scale: number,
    _pageHeight: number,
): void {
    if (!layout) {
        layer.replaceChildren();
        return;
    }

    if (isFlat(layout)) {
        renderFlat(layer, layout, scale);
    } else {
        renderHierarchical(layer, layout, scale);
    }
}

// =============================================================================
// Flat rendering (PDF)
// =============================================================================

function renderFlat(layer: HTMLDivElement, layout: LayoutPage, scale: number): void {
    const pendingSpans: PendingSpan[] = [];
    const fragment = document.createDocumentFragment();

    for (const frame of layout.frames) {
        if (frame.parcel) {
            flattenParcel(fragment, frame.transform, frame.parcel, scale, pendingSpans);
        }
    }

    layer.replaceChildren(fragment);

    // Batch reads then writes
    if (pendingSpans.length > 0) {
        const measurements: number[] = new Array(pendingSpans.length);
        for (let i = 0; i < pendingSpans.length; i++) {
            measurements[i] = pendingSpans[i].span.offsetWidth;
        }
        for (let i = 0; i < pendingSpans.length; i++) {
            const { span, targetWidth, angle } = pendingSpans[i];
            const naturalWidth = measurements[i];
            const hasRotation = Math.abs(angle) > 0.1;
            if (naturalWidth > 0 && targetWidth > 0) {
                const sx = targetWidth / naturalWidth;
                if (Math.abs(sx - 1) > 0.001) {
                    span.style.transform = hasRotation ? `rotate(${angle}deg) scaleX(${sx})` : `scaleX(${sx})`;
                } else if (hasRotation) {
                    span.style.transform = `rotate(${angle}deg)`;
                }
            } else if (hasRotation) {
                span.style.transform = `rotate(${angle}deg)`;
            }
            span.style.width = px(naturalWidth);
        }
    }
}

function flattenParcel(
    parent: Node,
    base: Transform,
    parcel: LayoutParcel,
    scale: number,
    pending: PendingSpan[],
): void {
    const t = translate(base, parcel.x, parcel.y);
    for (const line of parcel.lines) {
        flattenLine(parent, t, line, scale, pending);
    }
}

function flattenLine(parent: Node, base: Transform, line: LayoutLine, scale: number, pending: PendingSpan[]): void {
    const content = line.content;
    if (content.type === "runList") {
        const t = translate(base, 0, line.y + content.baseline);
        for (const run of content.runs) {
            const span = flattenRun(t, run, scale, pending);
            if (span) parent.appendChild(span);
        }
    } else {
        const t = translate(base, 0, line.y);
        flattenTable(parent, t, content, scale, pending);
    }
}

function flattenRun(base: Transform, run: LayoutRun, scale: number, pending: PendingSpan[]): HTMLSpanElement | null {
    const c = run.content;
    const t = translate(base, run.x, 0);
    const combined = compose(t, run.transform);

    const effectiveScaleX = Math.sqrt(combined.scaleX ** 2 + combined.skewY ** 2);
    const effectiveScaleY = Math.sqrt(combined.scaleY ** 2 + combined.skewX ** 2);

    if (c.type === "glyphs") {
        if (!c.text || c.glyphs.length === 0) return null;

        const fontSize = c.fontSize * effectiveScaleY;
        const ascent = c.ascent * effectiveScaleY;
        const height = (c.ascent + c.descent) * effectiveScaleY * scale;

        const lastGlyph = c.glyphs[c.glyphs.length - 1];
        const targetWidth = (lastGlyph.x + lastGlyph.advance) * effectiveScaleX * scale;

        const angleRad = Math.atan2(combined.skewY, combined.scaleX);
        const angle = angleRad * (180 / Math.PI);

        // Position the span's top-left so that after CSS rotate(angle) around (0,0),
        // the baseline origin (local 0, ascent) lands at the transform's translate.
        const x = (combined.translateX + Math.sin(angleRad) * ascent) * scale;
        const y = (combined.translateY - Math.cos(angleRad) * ascent) * scale;

        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = c.text;
        span.style.left = px(x);
        span.style.top = px(y);
        span.style.fontSize = px(fontSize * scale);
        span.style.lineHeight = px(height);
        span.style.height = px(height);
        span.style.transformOrigin = "0 0";

        pending.push({ span, targetWidth, angle });
        return span;
    }

    if (c.type === "space" || c.type === "tab") {
        const fontSize = c.fontSize * effectiveScaleY;
        const ascent = c.ascent * effectiveScaleY;
        const width = c.advance * effectiveScaleX * scale;
        const height = (c.ascent + c.descent) * effectiveScaleY * scale;

        const angleRad = Math.atan2(combined.skewY, combined.scaleX);
        const angle = angleRad * (180 / Math.PI);

        const x = (combined.translateX + Math.sin(angleRad) * ascent) * scale;
        const y = (combined.translateY - Math.cos(angleRad) * ascent) * scale;

        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = c.type === "tab" ? "\t" : " ";
        span.style.left = px(x);
        span.style.top = px(y);
        span.style.fontSize = px(fontSize * scale);
        span.style.lineHeight = px(height);
        span.style.width = px(width);
        span.style.height = px(height);
        if (Math.abs(angle) > 0.1) {
            span.style.transformOrigin = "0 0";
            span.style.transform = `rotate(${angle}deg)`;
        }

        return span;
    }

    if (c.type === "break") {
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\n";
        span.style.position = "absolute";
        span.style.width = "0";
        span.style.height = "0";
        span.style.overflow = "hidden";
        return span;
    }

    if (c.type === "paragraphEnd") {
        const x = combined.translateX * scale;
        const y = combined.translateY * scale;
        const width = c.advance * effectiveScaleX * scale;

        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\n";
        span.style.left = px(x);
        span.style.top = px(y);
        span.style.width = px(width);
        span.style.fontSize = "1px";
        span.style.lineHeight = "1px";
        return span;
    }

    if (c.type === "inlineDrawing") {
        const x = combined.translateX * scale;
        const y = combined.translateY * scale;
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\uFFFC";
        span.style.left = px(x);
        span.style.top = px(y);
        span.style.width = px(c.width * effectiveScaleX * scale);
        span.style.height = px(c.height * effectiveScaleY * scale);
        span.style.fontSize = "0";
        return span;
    }

    return null;
}

function flattenTable(parent: Node, base: Transform, table: LayoutTable, scale: number, pending: PendingSpan[]): void {
    for (const row of table.rows) {
        for (const cell of row.cells) {
            if (cell.parcel) {
                const t = translate(base, cell.x, cell.y);
                flattenParcel(parent, t, cell.parcel, scale, pending);
            }
        }
    }
}

// =============================================================================
// Hierarchical rendering (DOCX/PPTX/XLSX)
// =============================================================================

function renderHierarchical(layer: HTMLDivElement, layout: LayoutPage, scale: number): void {
    const pendingSpans: PendingSpan[] = [];
    const fragment = document.createDocumentFragment();

    for (const frame of layout.frames) {
        if (frame.parcel) {
            fragment.appendChild(buildFrame(frame, scale, pendingSpans));
        }
    }

    if (layout.grid) {
        fragment.appendChild(buildGrid(layout.grid, scale, pendingSpans));
    }

    layer.replaceChildren(fragment);

    // Batch reads then writes to avoid layout thrashing.
    if (pendingSpans.length > 0) {
        const measurements: number[] = new Array(pendingSpans.length);
        for (let i = 0; i < pendingSpans.length; i++) {
            measurements[i] = pendingSpans[i].span.offsetWidth;
        }
        for (let i = 0; i < pendingSpans.length; i++) {
            const { span, targetWidth } = pendingSpans[i];
            const naturalWidth = measurements[i];
            if (naturalWidth > 0 && targetWidth > 0) {
                const sx = targetWidth / naturalWidth;
                if (Math.abs(sx - 1) > 0.001) {
                    span.style.transform = `scaleX(${sx})`;
                }
            }
            span.style.width = px(naturalWidth);
        }
    }
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

function buildFrame(frame: LayoutFrame, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-frame";
    el.style.transform = cssMatrix(frame.transform, scale);
    el.style.transformOrigin = "0 0";
    const p = frame.parcel!;
    el.style.width = px((p.x + p.width) * scale);
    el.style.height = px((p.y + p.height) * scale);
    buildParcel(el, p, scale, pending);
    return el;
}

// ---------------------------------------------------------------------------
// Parcel
// ---------------------------------------------------------------------------

function buildParcel(parent: HTMLElement, parcel: LayoutParcel, scale: number, pending: PendingSpan[]): void {
    const el = document.createElement("div");
    el.className = "udoc-text-parcel";
    el.style.left = px(parcel.x * scale);
    el.style.top = px(parcel.y * scale);
    el.style.width = px(parcel.width * scale);
    el.style.height = px(parcel.height * scale);

    for (const line of parcel.lines) {
        el.appendChild(buildLine(line, parcel.width, scale, pending));
    }

    parent.appendChild(el);
}

// ---------------------------------------------------------------------------
// Line
// ---------------------------------------------------------------------------

function buildLine(line: LayoutLine, _parcelWidth: number, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-line";
    el.style.top = px(line.y * scale);
    el.style.width = px(line.width * scale);
    el.style.height = px(line.height * scale);

    const content = line.content;
    if (content.type === "runList") {
        const runs = content.runs;
        const baseline = line.spaceBefore + content.baseline;
        for (let i = 0; i < runs.length; i++) {
            const run = runs[i];
            const nextX = i + 1 < runs.length ? runs[i + 1].x : run.x + run.width;
            const effectiveWidth = nextX - run.x;
            const contentHeight = line.height - line.spaceBefore - line.spaceAfter;
            const runEl = buildRunHierarchical(run, baseline, effectiveWidth, contentHeight, scale, pending);
            if (runEl) el.appendChild(runEl);
        }
    } else {
        el.appendChild(buildTable(content, scale, pending));
    }

    return el;
}

// ---------------------------------------------------------------------------
// Run (hierarchical)
// ---------------------------------------------------------------------------

function buildRunHierarchical(
    run: LayoutRun,
    baseline: number,
    effectiveWidth: number,
    lineHeight: number,
    scale: number,
    pending: PendingSpan[],
): HTMLSpanElement | null {
    const c = run.content;

    if (c.type === "glyphs") {
        if (!c.text || c.glyphs.length === 0) return null;

        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = c.text;

        span.style.left = px(run.x * scale);
        span.style.top = px((baseline - c.ascent) * scale);
        span.style.fontSize = px(c.fontSize * scale);
        span.style.lineHeight = px(lineHeight * scale);
        span.style.transformOrigin = "0 0";

        const targetWidth = effectiveWidth * scale;
        pending.push({ span, targetWidth, angle: 0 });

        return span;
    }

    if (c.type === "space" || c.type === "tab") {
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = c.type === "tab" ? "\t" : " ";

        span.style.left = px(run.x * scale);
        span.style.top = px((baseline - c.ascent) * scale);
        span.style.fontSize = px(c.fontSize * scale);
        span.style.lineHeight = px(lineHeight * scale);
        span.style.width = px(effectiveWidth * scale);

        return span;
    }

    if (c.type === "break") {
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\n";
        span.style.left = px(run.x * scale);
        span.style.width = "0";
        span.style.height = "0";
        span.style.overflow = "hidden";

        return span;
    }

    if (c.type === "paragraphEnd") {
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\n";
        span.style.left = px(run.x * scale);
        span.style.width = px(effectiveWidth * scale);
        span.style.fontSize = "1px";
        span.style.lineHeight = px(lineHeight * scale);

        return span;
    }

    if (c.type === "inlineDrawing") {
        const span = document.createElement("span");
        span.className = "udoc-text-run";
        span.textContent = "\uFFFC";
        span.style.left = px(run.x * scale);
        span.style.top = px(baseline * scale);
        span.style.width = px(c.width * scale);
        span.style.height = px(c.height * scale);
        span.style.fontSize = "0";
        return span;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Table → Row → Cell
// ---------------------------------------------------------------------------

function buildTable(table: LayoutTable, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-table";
    el.style.width = px(table.width * scale);
    el.style.height = px(table.height * scale);

    for (const row of table.rows) {
        el.appendChild(buildTableRow(row, table.width, scale, pending));
    }
    return el;
}

function buildTableRow(row: LayoutTableRow, tableWidth: number, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-row";
    el.style.top = px(row.y * scale);
    el.style.width = px(tableWidth * scale);
    el.style.height = px(row.height * scale);

    for (const cell of row.cells) {
        el.appendChild(buildTableCell(cell, row.y, scale, pending));
    }
    return el;
}

function buildTableCell(cell: LayoutTableCell, rowY: number, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-cell";
    el.style.left = px(cell.x * scale);
    // cell.y is absolute within the table; make it relative to the row
    el.style.top = px((cell.y - rowY) * scale);
    el.style.width = px(cell.width * scale);
    el.style.height = px(cell.height * scale);

    if (cell.parcel) {
        buildParcel(el, cell.parcel, scale, pending);
    }
    return el;
}

// ---------------------------------------------------------------------------
// Grid → Row → Cell
// ---------------------------------------------------------------------------

function buildGrid(grid: LayoutGrid, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-grid";
    el.style.left = px(grid.x * scale);
    el.style.top = px(grid.y * scale);
    el.style.width = px(grid.width * scale);
    el.style.height = px(grid.height * scale);
    if (Math.abs(grid.scale - 1) > 0.001) {
        el.style.transform = `scale(${grid.scale})`;
        el.style.transformOrigin = "0 0";
    }

    for (const row of grid.rows) {
        el.appendChild(buildGridRow(row, grid.width, scale, pending));
    }
    return el;
}

function buildGridRow(row: LayoutGridRow, gridWidth: number, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-row";
    el.style.top = px(row.y * scale);
    el.style.width = px(gridWidth * scale);
    el.style.height = px(row.height * scale);

    for (const cell of row.cells) {
        el.appendChild(buildGridCell(cell, row.y, scale, pending));
    }
    return el;
}

function buildGridCell(cell: LayoutGridCell, rowY: number, scale: number, pending: PendingSpan[]): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "udoc-text-cell";
    el.style.left = px(cell.x * scale);
    // cell.y is absolute within the grid; make it relative to the row
    el.style.top = px((cell.y - rowY) * scale);
    el.style.width = px(cell.width * scale);
    el.style.height = px(cell.height * scale);

    if (cell.parcel) {
        buildParcel(el, cell.parcel, scale, pending);
    }
    return el;
}
