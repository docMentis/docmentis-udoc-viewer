/**
 * Conversion utilities between ToolOptions (UI) and Annotation properties (data model).
 *
 * Shared by AnnotationDrawController (creating annotations) and SubToolbar (editing existing ones).
 */

import type { AnnotationColor, Annotation, BorderStyle, LineEnding } from "./types";
import type { ToolOptions, LineStyle, ArrowHeadStyle } from "../state";
import { DEFAULT_TOOL_OPTIONS } from "../state";

// =============================================================================
// Primitive conversions
// =============================================================================

/** Parse hex color (#rrggbb) to AnnotationColor (0-1 range). */
export function parseHexColor(hex: string): AnnotationColor {
    const h = hex.replace("#", "");
    return {
        r: parseInt(h.substring(0, 2), 16) / 255,
        g: parseInt(h.substring(2, 4), 16) / 255,
        b: parseInt(h.substring(4, 6), 16) / 255,
    };
}

/** Convert AnnotationColor (0-1 range) to hex string (#rrggbb). */
export function annotationColorToHex(color: AnnotationColor): string {
    const r = Math.round(color.r * 255)
        .toString(16)
        .padStart(2, "0");
    const g = Math.round(color.g * 255)
        .toString(16)
        .padStart(2, "0");
    const b = Math.round(color.b * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${r}${g}${b}`;
}

/** Map ArrowHeadStyle (UI) to PDF LineEnding. */
export function toLineEnding(style: ArrowHeadStyle): LineEnding {
    switch (style) {
        case "open":
            return "OpenArrow";
        case "closed":
            return "ClosedArrow";
        default:
            return "None";
    }
}

/** Map PDF LineEnding to ArrowHeadStyle (UI). */
export function fromLineEnding(ending: LineEnding | undefined): ArrowHeadStyle {
    switch (ending) {
        case "OpenArrow":
        case "ROpenArrow":
            return "open";
        case "ClosedArrow":
        case "RClosedArrow":
            return "closed";
        default:
            return "none";
    }
}

/** Map tool LineStyle (UI) to PDF BorderStyle. */
export function toBorderStyle(lineStyle: LineStyle): BorderStyle {
    if (lineStyle === "dashed" || lineStyle === "dotted") return "dashed";
    return "solid";
}

/** Map PDF BorderStyle to tool LineStyle (UI). */
export function fromBorderStyle(borderStyle: BorderStyle | undefined): LineStyle {
    switch (borderStyle) {
        case "dashed":
        case "dotted":
            return "dashed";
        default:
            return "solid";
    }
}

// =============================================================================
// Annotation <-> ToolOptions
// =============================================================================

/** Which ToolOptions keys are editable for each annotation type. */
type ToolOptionKey = "strokeColor" | "fillColor" | "strokeWidth" | "opacity" | "lineStyle" | "arrowHead";

const ANNOTATION_EDITABLE_OPTIONS: Record<string, ToolOptionKey[]> = {
    ink: ["strokeColor", "strokeWidth", "opacity", "lineStyle"],
    line: ["strokeColor", "strokeWidth", "opacity", "lineStyle", "arrowHead"],
    square: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    circle: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    polygon: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    polyLine: ["strokeColor", "strokeWidth", "opacity", "lineStyle"],
    highlight: ["strokeColor", "opacity"],
    underline: ["strokeColor"],
    strikeOut: ["strokeColor"],
    squiggly: ["strokeColor"],
};

/** Get the list of editable option keys for an annotation, or null if not editable. */
export function getEditableOptionsForAnnotation(annotation: Annotation): ToolOptionKey[] | null {
    return ANNOTATION_EDITABLE_OPTIONS[annotation.type] ?? null;
}

/** Extract ToolOptions from an existing annotation (for display in SubToolbar). */
export function annotationToToolOptions(annotation: Annotation): ToolOptions {
    const opts: ToolOptions = { ...DEFAULT_TOOL_OPTIONS };

    // Color (all editable types have it)
    if ("color" in annotation && annotation.color) {
        opts.strokeColor = annotationColorToHex(annotation.color);
    }

    // Fill color
    if ("interiorColor" in annotation && annotation.interiorColor) {
        opts.fillColor = annotationColorToHex(annotation.interiorColor);
    } else {
        opts.fillColor = null;
    }

    // Border width
    if ("borderWidth" in annotation && annotation.borderWidth != null) {
        opts.strokeWidth = annotation.borderWidth;
    }

    // Opacity
    if ("opacity" in annotation && annotation.opacity != null) {
        opts.opacity = annotation.opacity;
    }

    // Border style -> line style
    if ("borderStyle" in annotation) {
        opts.lineStyle = fromBorderStyle(annotation.borderStyle);
    }

    // Line endings -> arrow heads
    if ("startEnding" in annotation) {
        opts.arrowHeadStart = fromLineEnding(annotation.startEnding);
    }
    if ("endEnding" in annotation) {
        opts.arrowHeadEnd = fromLineEnding(annotation.endEnding);
    }

    return opts;
}

/** Apply a partial set of ToolOptions changes to an annotation, returning a new annotation. */
export function applyToolOptionsToAnnotation(annotation: Annotation, changed: Partial<ToolOptions>): Annotation {
    // Shallow clone — use `any` to allow property assignment across the union
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated: any = { ...annotation };

    if ("strokeColor" in changed && changed.strokeColor != null) {
        updated.color = parseHexColor(changed.strokeColor);
    }

    if ("fillColor" in changed) {
        updated.interiorColor = changed.fillColor ? parseHexColor(changed.fillColor) : undefined;
    }

    if ("strokeWidth" in changed && changed.strokeWidth != null) {
        updated.borderWidth = changed.strokeWidth;
    }

    if ("opacity" in changed && changed.opacity != null) {
        updated.opacity = changed.opacity;
    }

    if ("lineStyle" in changed && changed.lineStyle != null) {
        updated.borderStyle = toBorderStyle(changed.lineStyle);
    }

    if ("arrowHeadStart" in changed && changed.arrowHeadStart != null) {
        updated.startEnding = toLineEnding(changed.arrowHeadStart);
    }

    if ("arrowHeadEnd" in changed && changed.arrowHeadEnd != null) {
        updated.endEnding = toLineEnding(changed.arrowHeadEnd);
    }

    return updated as Annotation;
}
