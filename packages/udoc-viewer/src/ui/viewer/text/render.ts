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
 * Detect columns in text layout and sort runs in reading order.
 *
 * Algorithm:
 * 1. Find horizontal gaps that indicate column boundaries
 * 2. Group runs into columns based on X position ranges
 * 3. Sort within each column by Y (top to bottom), then X (left to right)
 * 4. Concatenate columns in left-to-right order
 *
 * @param runs - Processed runs with calculated positions
 * @returns Runs sorted in reading order (column by column)
 */
function sortByReadingOrder(runs: ProcessedRun[]): ProcessedRun[] {
  if (runs.length <= 1) return runs;

  // Calculate average font size for threshold calculations
  const avgFontSize =
    runs.reduce((sum, r) => sum + r.scaledFontSize, 0) / runs.length;

  // Get bounding boxes for each run
  interface RunBounds {
    run: ProcessedRun;
    left: number;
    right: number;
  }

  const runBounds: RunBounds[] = runs.map((run) => {
    const { glyphs } = run.run;
    const lastGlyph = glyphs[glyphs.length - 1];
    const textWidth = (lastGlyph.x + lastGlyph.advance) * run.effectiveScaleX;
    return {
      run,
      left: run.x,
      right: run.x + textWidth * (run.run.transform.scaleX > 0 ? 1 : -1),
    };
  });

  // Find column boundaries by detecting large horizontal gaps
  // Sort all runs by left edge to analyze gaps
  const sortedByLeft = [...runBounds].sort((a, b) => a.left - b.left);

  // Build column ranges by finding significant gaps
  // A gap wider than 2x average font size suggests a column boundary
  const columnGapThreshold = avgFontSize * 2;

  // Find all unique X ranges (potential columns)
  interface ColumnRange {
    left: number;
    right: number;
    runs: ProcessedRun[];
  }

  const columns: ColumnRange[] = [];

  for (const rb of sortedByLeft) {
    // Find if this run belongs to an existing column
    let foundColumn = false;
    for (const col of columns) {
      // Check if run overlaps or is close to this column's range
      const overlaps = rb.left <= col.right + columnGapThreshold &&
                       rb.right >= col.left - columnGapThreshold;
      if (overlaps) {
        // Extend column range and add run
        col.left = Math.min(col.left, rb.left);
        col.right = Math.max(col.right, rb.right);
        col.runs.push(rb.run);
        foundColumn = true;
        break;
      }
    }

    if (!foundColumn) {
      // Create new column
      columns.push({
        left: rb.left,
        right: rb.right,
        runs: [rb.run],
      });
    }
  }

  // Sort columns left to right
  columns.sort((a, b) => a.left - b.left);

  // Sort runs within each column by Y (top to bottom), then X (left to right)
  for (const col of columns) {
    col.runs.sort((a, b) => {
      const yDiff = a.y - b.y;
      const lineThreshold = Math.min(a.scaledFontSize, b.scaledFontSize) * 0.5;
      if (Math.abs(yDiff) < lineThreshold) {
        return a.x - b.x;
      }
      return yDiff;
    });
  }

  // Concatenate all columns in order
  return columns.flatMap((col) => col.runs);
}

/**
 * Render text runs to a text layer element.
 *
 * Creates positioned, invisible text spans that enable native browser selection.
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
  _pageHeight: number
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

    const effectiveScaleX = Math.sqrt(
      transform.scaleX * transform.scaleX + transform.skewY * transform.skewY
    );
    const effectiveScaleY = Math.sqrt(
      transform.scaleY * transform.scaleY + transform.skewX * transform.skewX
    );

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

  // Detect columns and sort text in reading order
  // This prevents selection from jumping between columns
  const sortedRuns = sortByReadingOrder(processedRuns);

  // Replace processedRuns with sorted order
  processedRuns.length = 0;
  processedRuns.push(...sortedRuns);

  // Guard: if sorting resulted in empty array, clear layer and return
  if (processedRuns.length === 0) {
    layer.replaceChildren();
    return;
  }

  // Mark end-of-line runs and calculate span heights to fill gaps
  for (let i = 0; i < processedRuns.length - 1; i++) {
    const current = processedRuns[i];
    const next = processedRuns[i + 1];
    const lineThreshold = current.scaledFontSize * 0.5;

    // If next run is on a different line, current is end of line
    if (Math.abs(next.y - current.y) >= lineThreshold) {
      current.isEndOfLine = true;
      // Calculate height to cover gap to next line
      // From current top (y - ascent) to next line's top (nextY - nextAscent)
      const currentTop = current.y - current.scaledFontSize * 0.8;
      const nextTop = next.y - next.scaledFontSize * 0.8;
      const gapHeight = nextTop - currentTop;
      // Use calculated gap or at least 1.2x font size
      current.spanHeight = Math.max(gapHeight, current.scaledFontSize * 1.2);
    }
  }
  // Last run is always end of line, use generous height
  const lastRun = processedRuns[processedRuns.length - 1];
  lastRun.isEndOfLine = true;
  lastRun.spanHeight = lastRun.scaledFontSize * 1.5;

  // For all runs on the same line, extend their height to match the end-of-line run
  let lineEndIndex = 0;
  for (let i = 0; i < processedRuns.length; i++) {
    if (processedRuns[i].isEndOfLine) {
      const lineHeight = processedRuns[i].spanHeight;
      // Apply this height to all runs from lineEndIndex to i
      for (let j = lineEndIndex; j <= i; j++) {
        processedRuns[j].spanHeight = lineHeight;
      }
      lineEndIndex = i + 1;
    }
  }

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
