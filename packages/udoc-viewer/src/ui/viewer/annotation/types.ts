/**
 * Annotation type definitions.
 *
 * Uses discriminated union types for type-safe annotation handling.
 */

// =============================================================================
// Common Types
// =============================================================================

/** Rectangle in page coordinates (points). */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Point in page coordinates (points). */
export interface Point {
    x: number;
    y: number;
}

/**
 * Quadrilateral defined by 4 corner points.
 * Points are ordered: [bottom-left, bottom-right, top-right, top-left]
 */
export interface Quad {
    points: [Point, Point, Point, Point];
}

/** RGB color with components in range 0.0-1.0. */
export interface AnnotationColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Metadata for markup annotations (author, subject, contents, state).
 * Displayed in annotation popups and comment threads.
 */
export interface MarkupMetadata {
    author?: string;
    subject?: string;
    contents?: string;
    state?: string;
    stateModel?: string;
}

// =============================================================================
// Base Annotation
// =============================================================================

/** Base annotation properties shared by all annotation types. */
interface BaseAnnotation {
    /** Bounding rectangle in page coordinates. */
    bounds: Rect;
    /** Reply annotations nested under this annotation. */
    replies?: Annotation[];
    /** Metadata for markup annotations. */
    metadata?: MarkupMetadata;
}

// =============================================================================
// Link Annotation
// =============================================================================

/** Destination within a document. */
export interface Destination {
    pageIndex: number;
    display: DestinationDisplay;
}

export type DestinationDisplay =
    | { type: "xyz"; left?: number; top?: number; zoom?: number }
    | { type: "fit" }
    | { type: "fitH"; top?: number }
    | { type: "fitV"; left?: number }
    | { type: "fitR"; left: number; top: number; right: number; bottom: number }
    | { type: "fitB" }
    | { type: "fitBH"; top?: number }
    | { type: "fitBV"; left?: number };

/** Link action type. */
export type LinkAction =
    | { actionType: "goTo"; destination: Destination }
    | { actionType: "uri"; uri: string };

/** Link annotation that navigates to a destination or opens a URI. */
export interface LinkAnnotation extends BaseAnnotation {
    type: "link";
    action: LinkAction;
}

// =============================================================================
// Markup Annotations (Text Highlighting)
// =============================================================================

/** Highlight annotation. */
export interface HighlightAnnotation extends BaseAnnotation {
    type: "highlight";
    quads: Quad[];
    color?: AnnotationColor;
    opacity?: number;
}

/** Underline annotation. */
export interface UnderlineAnnotation extends BaseAnnotation {
    type: "underline";
    quads: Quad[];
    color?: AnnotationColor;
    opacity?: number;
}

/** Strikeout annotation. */
export interface StrikeOutAnnotation extends BaseAnnotation {
    type: "strikeOut";
    quads: Quad[];
    color?: AnnotationColor;
    opacity?: number;
}

/** Squiggly underline annotation. */
export interface SquigglyAnnotation extends BaseAnnotation {
    type: "squiggly";
    quads: Quad[];
    color?: AnnotationColor;
    opacity?: number;
}

// =============================================================================
// Text Annotations
// =============================================================================

/** Icon type for text (sticky note) annotations. */
export type TextAnnotationIcon =
    | "Comment"
    | "Key"
    | "Note"
    | "Help"
    | "NewParagraph"
    | "Paragraph"
    | "Insert";

/** Text justification. */
export type TextJustification = "left" | "center" | "right";

/** Text (sticky note) annotation. */
export interface TextAnnotation extends BaseAnnotation {
    type: "text";
    icon?: TextAnnotationIcon;
    open?: boolean;
    contents?: string;
    color?: AnnotationColor;
}

/** Free text (typewriter/text box) annotation. */
export interface FreeTextAnnotation extends BaseAnnotation {
    type: "freeText";
    contents?: string;
    justification?: TextJustification;
    defaultAppearance?: string;
    color?: AnnotationColor;
    borderColor?: AnnotationColor;
    calloutLine?: Point[];
}

/** Stamp annotation. */
export interface StampAnnotation extends BaseAnnotation {
    type: "stamp";
    name?: string;
    hasCustomAppearance?: boolean;
    color?: AnnotationColor;
}

/** Symbol type for caret annotations. */
export type CaretSymbol = "None" | "P";

/** Caret (text insertion point) annotation. */
export interface CaretAnnotation extends BaseAnnotation {
    type: "caret";
    symbol?: CaretSymbol;
    color?: AnnotationColor;
    opacity?: number;
}

// =============================================================================
// Shape Annotations
// =============================================================================

/** Line ending style. */
export type LineEnding =
    | "None"
    | "Square"
    | "Circle"
    | "Diamond"
    | "OpenArrow"
    | "ClosedArrow"
    | "Butt"
    | "ROpenArrow"
    | "RClosedArrow"
    | "Slash";

/** Border style. */
export type BorderStyle = "solid" | "dashed" | "beveled" | "inset" | "underline";

/** Line annotation. */
export interface LineAnnotation extends BaseAnnotation {
    type: "line";
    start: Point;
    end: Point;
    startEnding?: LineEnding;
    endEnding?: LineEnding;
    color?: AnnotationColor;
    interiorColor?: AnnotationColor;
    borderWidth?: number;
    opacity?: number;
}

/** Square/rectangle annotation. */
export interface SquareAnnotation extends BaseAnnotation {
    type: "square";
    color?: AnnotationColor;
    interiorColor?: AnnotationColor;
    borderWidth?: number;
    borderStyle?: BorderStyle;
    opacity?: number;
}

/** Circle/ellipse annotation. */
export interface CircleAnnotation extends BaseAnnotation {
    type: "circle";
    color?: AnnotationColor;
    interiorColor?: AnnotationColor;
    borderWidth?: number;
    borderStyle?: BorderStyle;
    opacity?: number;
}

/** Polygon annotation (closed shape). */
export interface PolygonAnnotation extends BaseAnnotation {
    type: "polygon";
    vertices: Point[];
    color?: AnnotationColor;
    interiorColor?: AnnotationColor;
    borderWidth?: number;
    opacity?: number;
}

/** Polyline annotation (open path). */
export interface PolyLineAnnotation extends BaseAnnotation {
    type: "polyLine";
    vertices: Point[];
    color?: AnnotationColor;
    interiorColor?: AnnotationColor;
    borderWidth?: number;
    opacity?: number;
}

/** Ink (freehand drawing) annotation. */
export interface InkAnnotation extends BaseAnnotation {
    type: "ink";
    inkList: Point[][];
    color?: AnnotationColor;
    borderWidth?: number;
    opacity?: number;
}

/** Redact annotation (marks content for removal). */
export interface RedactAnnotation extends BaseAnnotation {
    type: "redact";
    quads?: Quad[];
    interiorColor?: AnnotationColor;
    overlayText?: string;
    justification?: TextJustification;
    repeat?: boolean;
    color?: AnnotationColor;
    opacity?: number;
}

// =============================================================================
// Union Type
// =============================================================================

/** All supported annotation types. */
export type Annotation =
    | LinkAnnotation
    | HighlightAnnotation
    | UnderlineAnnotation
    | StrikeOutAnnotation
    | SquigglyAnnotation
    | TextAnnotation
    | FreeTextAnnotation
    | StampAnnotation
    | CaretAnnotation
    | LineAnnotation
    | SquareAnnotation
    | CircleAnnotation
    | PolygonAnnotation
    | PolyLineAnnotation
    | InkAnnotation
    | RedactAnnotation;

/** Annotation type string. */
export type AnnotationType = Annotation["type"];
