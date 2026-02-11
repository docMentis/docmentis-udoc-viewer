/**
 * Text selection controller for the text layer.
 *
 * Works together with CSS (user-select: none on layer, user-select: text on spans)
 * to prevent selection issues when mouse moves through gaps between text.
 */

/**
 * Attach selection handling to a text layer element.
 * Returns a cleanup function to remove event listeners.
 */
export function attachSelectionController(layer: HTMLDivElement): () => void {
  let isSelecting = false;
  let lastValidRange: Range | null = null;

  function handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    isSelecting = true;
    lastValidRange = null;
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isSelecting || e.buttons !== 1) {
      return;
    }

    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if we're over a text span
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const isOverSpan = target?.classList.contains("udoc-text-span");

    if (isOverSpan) {
      // Save the current valid selection
      try {
        lastValidRange = selection.getRangeAt(0).cloneRange();
      } catch {
        // Ignore errors
      }
    } else if (lastValidRange) {
      // In a gap - restore last valid selection to prevent collapse/reversal
      try {
        const currentRange = selection.getRangeAt(0);
        // Only restore if the selection has collapsed or changed unexpectedly
        if (selection.isCollapsed ||
            (currentRange.toString().length < lastValidRange.toString().length * 0.5)) {
          selection.removeAllRanges();
          selection.addRange(lastValidRange.cloneRange());
        }
      } catch {
        // Ignore errors
      }
    }
  }

  function handleMouseUp(): void {
    isSelecting = false;
    lastValidRange = null;
  }

  // Attach listeners
  layer.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Return cleanup function
  return () => {
    layer.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}
