/**
 * TypeScript types for text selection.
 *
 * These types mirror the Rust JsTextRun/JsPositionedGlyph/JsTransform structures.
 */

/** Positioned glyph with character mapping. */
export interface PositionedGlyph {
  /** X position in text space. */
  x: number;
  /** Y position in text space. */
  y: number;
  /** Horizontal advance width. */
  advance: number;
  /** Unicode character for this glyph. */
  char?: string;
}

/** Transform matrix. */
export interface TextTransform {
  scaleX: number;
  skewY: number;
  skewX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
}

/** Text run containing positioned glyphs. */
export interface TextRun {
  /** Unicode text for this run. */
  text?: string;
  /** Positioned glyphs with character mappings. */
  glyphs: PositionedGlyph[];
  /** Font size in points. */
  fontSize: number;
  /** Combined transform (frame transform * text transform). */
  transform: TextTransform;
}
