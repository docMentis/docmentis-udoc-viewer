/**
 * Text layer rendering for text selection.
 *
 * Creates invisible text spans positioned over the rendered page,
 * allowing native browser text selection.
 */
import type { TextRun } from "./types";

interface ProcessedRun {
    run: TextRun;
    y: number;
    x: number;
    scaledFontSize: number;
    effectiveScaleX: number;
    effectiveScaleY: number;
    isEndOfLine: boolean;
    spanHeight: number; // Height to cover gap to next line
}

interface PendingSpan {
    span: HTMLSpanElement;
    targetWidth: number;
    angle: number;
}

/**
 * Render text runs to a text layer element.
 *
 * Creates positioned, invisible text spans that enable native browser selection.
 * Text runs are rendered in the order provided (content stream order from the
 * document), which preserves the correct reading order for multi-column layouts.
 *
 * @param layer - The text layer element to render into
 * @param textRuns - Text runs with position and font information
 * @param scale - Scale factor (pointsToPixels * zoom)
 * @param pageHeight - Page height in points (unused, kept for API compatibility)
 */
export function renderTextToLayer(
    layer: HTMLDivElement,
    textRuns: TextRun[],
    scale: number,
    _pageHeight: number,
): void {
    // Early exit: clear layer and return if no text
    if (textRuns.length === 0) {
        layer.replaceChildren();
        return;
    }

    // First pass: calculate positions and detect line boundaries
    const processedRuns: ProcessedRun[] = [];

    for (const run of textRuns) {
        if (!run.text || run.glyphs.length === 0) continue;

        const { transform, fontSize } = run;

        const effectiveScaleX = Math.sqrt(transform.scaleX * transform.scaleX + transform.skewY * transform.skewY);
        const effectiveScaleY = Math.sqrt(transform.scaleY * transform.scaleY + transform.skewX * transform.skewX);

        const scaledFontSize = fontSize * effectiveScaleY * scale;
        const x = transform.translateX * scale;
        const y = transform.translateY * scale;

        processedRuns.push({
            run,
            y,
            x,
            scaledFontSize,
            effectiveScaleX,
            effectiveScaleY,
            isEndOfLine: false, // Will be set in the next pass
            spanHeight: scaledFontSize, // Will be adjusted in the next pass
        });
    }

    if (processedRuns.length === 0) {
        layer.replaceChildren();
        return;
    }

    // Calculate span heights spatially.
    // Group runs into lines by Y proximity, sort lines by Y, then set each
    // line's height to cover the gap to the next line below.  This is done
    // spatially so it works regardless of content stream order.

    // 1. Group runs into lines (runs whose Y values are within 0.5× font-size)
    interface Line {
        y: number; // representative Y (baseline) of the line
        top: number; // y - ascent
        fontSize: number; // max font size on the line
        runs: ProcessedRun[];
    }
    const lines: Line[] = [];
    // Sort a shallow copy by Y for grouping; original processedRuns order is preserved.
    const byY = processedRuns.slice().sort((a, b) => a.y - b.y);
    for (const run of byY) {
        const threshold = run.scaledFontSize * 0.5;
        const last = lines[lines.length - 1];
        if (last && Math.abs(run.y - last.y) < threshold) {
            last.runs.push(run);
            last.fontSize = Math.max(last.fontSize, run.scaledFontSize);
        } else {
            lines.push({
                y: run.y,
                top: run.y - run.scaledFontSize * 0.8,
                fontSize: run.scaledFontSize,
                runs: [run],
            });
        }
    }

    // 2. For each line, compute height from its top to the next line's top.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let spanHeight: number;
        if (i + 1 < lines.length) {
            const nextTop = lines[i + 1].top;
            const gap = nextTop - line.top;
            // Clamp: at least 1.2× font size, at most 3× font size
            // (prevents huge spans when lines are far apart, e.g. across columns)
            spanHeight = Math.max(line.fontSize * 1.2, Math.min(gap, line.fontSize * 3));
        } else {
            spanHeight = line.fontSize * 1.5;
        }
        for (const run of line.runs) {
            run.spanHeight = spanHeight;
        }
    }

    // 3. Mark end-of-line in content stream order (for \n insertion when copying)
    for (let i = 0; i < processedRuns.length - 1; i++) {
        const current = processedRuns[i];
        const next = processedRuns[i + 1];
        if (Math.abs(next.y - current.y) >= current.scaledFontSize * 0.5) {
            current.isEndOfLine = true;
        }
    }
    processedRuns[processedRuns.length - 1].isEndOfLine = true;

    // Collect spans that need width scaling
    const pendingSpans: PendingSpan[] = [];

    // Use DocumentFragment for batched DOM insertion (avoids multiple reflows)
    const fragment = document.createDocumentFragment();

    for (const processed of processedRuns) {
        const { run, scaledFontSize, effectiveScaleX, isEndOfLine, spanHeight } = processed;
        const { transform, glyphs } = run;

        // Create span for this text run
        const span = document.createElement("span");
        span.className = "udoc-text-span";
        // Add newline only at end of lines for proper line breaks when copying
        const text = run.text ?? "";
        span.textContent = isEndOfLine ? text + "\n" : text;

        // Calculate the actual text width from glyph advances
        const lastGlyph = glyphs[glyphs.length - 1];
        const textWidthInTextSpace = lastGlyph.x + lastGlyph.advance;
        const targetWidth = textWidthInTextSpace * effectiveScaleX * scale;

        // Position
        const x = transform.translateX * scale;
        const ascent = scaledFontSize * 0.8;
        const y = transform.translateY * scale - ascent;

        // Calculate rotation angle from transform
        const angle = Math.atan2(transform.skewY, transform.scaleX) * (180 / Math.PI);

        // Position the span
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        span.style.fontSize = `${scaledFontSize}px`;
        span.style.lineHeight = "1";
        span.style.whiteSpace = "pre"; // Preserve spaces
        span.style.height = `${spanHeight}px`; // Fill gap to next line

        fragment.appendChild(span);
        pendingSpans.push({ span, targetWidth, angle });
    }

    // Single DOM operation: clear old content and insert all new spans
    layer.replaceChildren(fragment);

    // PERFORMANCE: Batch all reads before writes to avoid layout thrashing.
    // Reading offsetWidth forces synchronous layout. If we interleave reads and writes,
    // each read triggers a new layout calculation. By reading all widths first,
    // we only trigger one layout instead of N layouts.
    if (pendingSpans.length > 0) {
        // Phase 1: Read all natural widths (single layout calculation)
        const measurements: number[] = new Array(pendingSpans.length);
        for (let i = 0; i < pendingSpans.length; i++) {
            measurements[i] = pendingSpans[i].span.offsetWidth;
        }

        // Phase 2: Write all transforms (no layout forced, only style changes batched)
        for (let i = 0; i < pendingSpans.length; i++) {
            const { span, targetWidth, angle } = pendingSpans[i];
            const naturalWidth = measurements[i];

            if (naturalWidth > 0 && targetWidth > 0) {
                const scaleX = targetWidth / naturalWidth;

                const transforms: string[] = [];
                if (Math.abs(scaleX - 1) > 0.001) {
                    transforms.push(`scaleX(${scaleX})`);
                }
                if (Math.abs(angle) > 0.1) {
                    transforms.push(`rotate(${angle}deg)`);
                }

                if (transforms.length > 0) {
                    span.style.transform = transforms.join(" ");
                    span.style.transformOrigin = "left top";
                }
            }
        }
    }
}
