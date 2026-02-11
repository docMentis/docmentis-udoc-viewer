/**
 * Annotation module - types, utilities, and renderers.
 */

// Types
export type {
    Annotation,
    AnnotationType,
    Rect,
    Point,
    Quad,
    AnnotationColor,
    MarkupMetadata,
    Destination,
    DestinationDisplay,
    LinkAction,
    // Specific annotation types
    LinkAnnotation,
    HighlightAnnotation,
    UnderlineAnnotation,
    StrikeOutAnnotation,
    SquigglyAnnotation,
    TextAnnotation,
    FreeTextAnnotation,
    StampAnnotation,
    CaretAnnotation,
    LineAnnotation,
    SquareAnnotation,
    CircleAnnotation,
    PolygonAnnotation,
    PolyLineAnnotation,
    InkAnnotation,
    RedactAnnotation,
    // Enums
    TextAnnotationIcon,
    TextJustification,
    CaretSymbol,
    LineEnding,
    BorderStyle
} from "./types";

// Utilities
export {
    colorToRgba,
    colorToRgb,
    scalePoint,
    scaleBounds,
    applyBoundsStyle,
    createSvgOverlay,
    createSvgElement,
    boundsMatch
} from "./utils";

// Render functions
export {
    renderAnnotation,
    renderAnnotationsToLayer,
    closeAnnotationPopup,
    showAnnotationPopup
} from "./render";

export type { ShowPopupCallback } from "./render";
