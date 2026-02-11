/**
 * Renderer for shape annotations: line, square, circle, polygon, polyLine, ink, redact.
 */
import type {
    LineAnnotation,
    SquareAnnotation,
    CircleAnnotation,
    PolygonAnnotation,
    PolyLineAnnotation,
    InkAnnotation,
    RedactAnnotation,
    LineEnding,
    Quad
} from "./types";
import { colorToRgb, scaleBounds, createSvgOverlay, createSvgElement } from "./utils";

/**
 * Render a line annotation with optional line endings.
 */
export function renderLine(
    layer: HTMLElement,
    annotation: LineAnnotation,
    scale: number
): Element {
    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const interiorColor = colorToRgb(annotation.interiorColor, color);
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    // Scale coordinates
    const startX = annotation.start.x * scale;
    const startY = annotation.start.y * scale;
    const endX = annotation.end.x * scale;
    const endY = annotation.end.y * scale;

    // Create group for line and endings
    const g = createSvgElement("g");
    g.setAttribute("opacity", String(opacity));

    // Draw main line
    const line = createSvgElement("line");
    line.setAttribute("x1", String(startX));
    line.setAttribute("y1", String(startY));
    line.setAttribute("x2", String(endX));
    line.setAttribute("y2", String(endY));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", String(strokeWidth));
    g.appendChild(line);

    // Draw line endings
    const angle = Math.atan2(endY - startY, endX - startX);
    drawLineEnding(g, startX, startY, annotation.startEnding || "None", angle + Math.PI, strokeWidth, color, interiorColor);
    drawLineEnding(g, endX, endY, annotation.endEnding || "None", angle, strokeWidth, color, interiorColor);

    svg.appendChild(g);
    layer.appendChild(svg);
    return svg;
}

/**
 * Draw a line ending at a point.
 */
function drawLineEnding(
    g: SVGGElement,
    x: number,
    y: number,
    ending: LineEnding,
    angle: number,
    strokeWidth: number,
    color: string,
    interiorColor: string
): void {
    if (ending === "None") return;

    const size = strokeWidth * 4;

    switch (ending) {
        case "OpenArrow": {
            const p1x = x - size * Math.cos(angle - Math.PI / 6);
            const p1y = y - size * Math.sin(angle - Math.PI / 6);
            const p2x = x - size * Math.cos(angle + Math.PI / 6);
            const p2y = y - size * Math.sin(angle + Math.PI / 6);
            const path = createSvgElement("path");
            path.setAttribute("d", `M ${p1x} ${p1y} L ${x} ${y} L ${p2x} ${p2y}`);
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", String(strokeWidth));
            path.setAttribute("fill", "none");
            g.appendChild(path);
            break;
        }
        case "ClosedArrow": {
            const p1x = x - size * Math.cos(angle - Math.PI / 6);
            const p1y = y - size * Math.sin(angle - Math.PI / 6);
            const p2x = x - size * Math.cos(angle + Math.PI / 6);
            const p2y = y - size * Math.sin(angle + Math.PI / 6);
            const polygon = createSvgElement("polygon");
            polygon.setAttribute("points", `${x},${y} ${p1x},${p1y} ${p2x},${p2y}`);
            polygon.setAttribute("fill", interiorColor);
            polygon.setAttribute("stroke", color);
            polygon.setAttribute("stroke-width", String(strokeWidth * 0.5));
            g.appendChild(polygon);
            break;
        }
        case "Circle": {
            const circle = createSvgElement("circle");
            circle.setAttribute("cx", String(x));
            circle.setAttribute("cy", String(y));
            circle.setAttribute("r", String(size / 2));
            circle.setAttribute("fill", interiorColor);
            circle.setAttribute("stroke", color);
            circle.setAttribute("stroke-width", String(strokeWidth * 0.5));
            g.appendChild(circle);
            break;
        }
        case "Square": {
            const rect = createSvgElement("rect");
            rect.setAttribute("x", String(x - size / 2));
            rect.setAttribute("y", String(y - size / 2));
            rect.setAttribute("width", String(size));
            rect.setAttribute("height", String(size));
            rect.setAttribute("fill", interiorColor);
            rect.setAttribute("stroke", color);
            rect.setAttribute("stroke-width", String(strokeWidth * 0.5));
            g.appendChild(rect);
            break;
        }
        case "Diamond": {
            const dx = size / 2;
            const points = `${x},${y - dx} ${x + dx},${y} ${x},${y + dx} ${x - dx},${y}`;
            const polygon = createSvgElement("polygon");
            polygon.setAttribute("points", points);
            polygon.setAttribute("fill", interiorColor);
            polygon.setAttribute("stroke", color);
            polygon.setAttribute("stroke-width", String(strokeWidth * 0.5));
            g.appendChild(polygon);
            break;
        }
        case "Butt": {
            // Perpendicular line
            const perpAngle = angle + Math.PI / 2;
            const p1x = x + (size / 2) * Math.cos(perpAngle);
            const p1y = y + (size / 2) * Math.sin(perpAngle);
            const p2x = x - (size / 2) * Math.cos(perpAngle);
            const p2y = y - (size / 2) * Math.sin(perpAngle);
            const line = createSvgElement("line");
            line.setAttribute("x1", String(p1x));
            line.setAttribute("y1", String(p1y));
            line.setAttribute("x2", String(p2x));
            line.setAttribute("y2", String(p2y));
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", String(strokeWidth));
            g.appendChild(line);
            break;
        }
        case "ROpenArrow": {
            // Reversed open arrow
            const p1x = x + size * Math.cos(angle - Math.PI / 6);
            const p1y = y + size * Math.sin(angle - Math.PI / 6);
            const p2x = x + size * Math.cos(angle + Math.PI / 6);
            const p2y = y + size * Math.sin(angle + Math.PI / 6);
            const path = createSvgElement("path");
            path.setAttribute("d", `M ${p1x} ${p1y} L ${x} ${y} L ${p2x} ${p2y}`);
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", String(strokeWidth));
            path.setAttribute("fill", "none");
            g.appendChild(path);
            break;
        }
        case "RClosedArrow": {
            // Reversed closed arrow
            const p1x = x + size * Math.cos(angle - Math.PI / 6);
            const p1y = y + size * Math.sin(angle - Math.PI / 6);
            const p2x = x + size * Math.cos(angle + Math.PI / 6);
            const p2y = y + size * Math.sin(angle + Math.PI / 6);
            const polygon = createSvgElement("polygon");
            polygon.setAttribute("points", `${x},${y} ${p1x},${p1y} ${p2x},${p2y}`);
            polygon.setAttribute("fill", interiorColor);
            polygon.setAttribute("stroke", color);
            polygon.setAttribute("stroke-width", String(strokeWidth * 0.5));
            g.appendChild(polygon);
            break;
        }
        case "Slash": {
            // Slash line
            const slashAngle = angle + Math.PI / 4;
            const p1x = x + (size / 2) * Math.cos(slashAngle);
            const p1y = y + (size / 2) * Math.sin(slashAngle);
            const p2x = x - (size / 2) * Math.cos(slashAngle);
            const p2y = y - (size / 2) * Math.sin(slashAngle);
            const line = createSvgElement("line");
            line.setAttribute("x1", String(p1x));
            line.setAttribute("y1", String(p1y));
            line.setAttribute("x2", String(p2x));
            line.setAttribute("y2", String(p2y));
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", String(strokeWidth));
            g.appendChild(line);
            break;
        }
    }
}

/**
 * Render a square/rectangle annotation.
 */
export function renderSquare(
    layer: HTMLElement,
    annotation: SquareAnnotation,
    scale: number
): Element {
    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const interiorColor = annotation.interiorColor
        ? colorToRgb(annotation.interiorColor, "none")
        : "none";
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    const scaled = scaleBounds(annotation.bounds, scale);

    const rect = createSvgElement("rect");
    rect.setAttribute("x", String(scaled.x + strokeWidth / 2));
    rect.setAttribute("y", String(scaled.y + strokeWidth / 2));
    rect.setAttribute("width", String(Math.max(0, scaled.width - strokeWidth)));
    rect.setAttribute("height", String(Math.max(0, scaled.height - strokeWidth)));
    rect.setAttribute("fill", interiorColor);
    rect.setAttribute("stroke", color);
    rect.setAttribute("stroke-width", String(strokeWidth));
    rect.setAttribute("opacity", String(opacity));

    // Apply dash pattern for dashed style
    if (annotation.borderStyle === "dashed") {
        rect.setAttribute("stroke-dasharray", `${strokeWidth * 3} ${strokeWidth * 2}`);
    }

    svg.appendChild(rect);
    layer.appendChild(svg);
    return svg;
}

/**
 * Render a circle/ellipse annotation.
 */
export function renderCircle(
    layer: HTMLElement,
    annotation: CircleAnnotation,
    scale: number
): Element {
    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const interiorColor = annotation.interiorColor
        ? colorToRgb(annotation.interiorColor, "none")
        : "none";
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    const scaled = scaleBounds(annotation.bounds, scale);

    const cx = scaled.x + scaled.width / 2;
    const cy = scaled.y + scaled.height / 2;
    const rx = (scaled.width - strokeWidth) / 2;
    const ry = (scaled.height - strokeWidth) / 2;

    const ellipse = createSvgElement("ellipse");
    ellipse.setAttribute("cx", String(cx));
    ellipse.setAttribute("cy", String(cy));
    ellipse.setAttribute("rx", String(Math.max(0, rx)));
    ellipse.setAttribute("ry", String(Math.max(0, ry)));
    ellipse.setAttribute("fill", interiorColor);
    ellipse.setAttribute("stroke", color);
    ellipse.setAttribute("stroke-width", String(strokeWidth));
    ellipse.setAttribute("opacity", String(opacity));

    // Apply dash pattern for dashed style
    if (annotation.borderStyle === "dashed") {
        ellipse.setAttribute("stroke-dasharray", `${strokeWidth * 3} ${strokeWidth * 2}`);
    }

    svg.appendChild(ellipse);
    layer.appendChild(svg);
    return svg;
}

/**
 * Render a polygon annotation (closed shape).
 */
export function renderPolygon(
    layer: HTMLElement,
    annotation: PolygonAnnotation,
    scale: number
): Element {
    if (!annotation.vertices || annotation.vertices.length < 3) {
        return document.createElement("div");
    }

    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const interiorColor = annotation.interiorColor
        ? colorToRgb(annotation.interiorColor, "none")
        : "none";
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    const scaledPoints = annotation.vertices.map(p => ({
        x: p.x * scale,
        y: p.y * scale
    }));

    const polygon = createSvgElement("polygon");
    polygon.setAttribute("points", scaledPoints.map(p => `${p.x},${p.y}`).join(" "));
    polygon.setAttribute("fill", interiorColor);
    polygon.setAttribute("stroke", color);
    polygon.setAttribute("stroke-width", String(strokeWidth));
    polygon.setAttribute("opacity", String(opacity));

    svg.appendChild(polygon);
    layer.appendChild(svg);
    return svg;
}

/**
 * Render a polyline annotation (open path).
 */
export function renderPolyLine(
    layer: HTMLElement,
    annotation: PolyLineAnnotation,
    scale: number
): Element {
    if (!annotation.vertices || annotation.vertices.length < 2) {
        return document.createElement("div");
    }

    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    const scaledPoints = annotation.vertices.map(p => ({
        x: p.x * scale,
        y: p.y * scale
    }));

    const polyline = createSvgElement("polyline");
    polyline.setAttribute("points", scaledPoints.map(p => `${p.x},${p.y}`).join(" "));
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", color);
    polyline.setAttribute("stroke-width", String(strokeWidth));
    polyline.setAttribute("opacity", String(opacity));

    svg.appendChild(polyline);
    layer.appendChild(svg);
    return svg;
}

/**
 * Render an ink (freehand) annotation.
 */
export function renderInk(
    layer: HTMLElement,
    annotation: InkAnnotation,
    scale: number
): Element {
    if (!annotation.inkList || annotation.inkList.length === 0) {
        return document.createElement("div");
    }

    const svg = createSvgOverlay();
    const color = colorToRgb(annotation.color, "rgb(0, 0, 0)");
    const strokeWidth = (annotation.borderWidth ?? 1) * scale;
    const opacity = annotation.opacity ?? 1;

    const g = createSvgElement("g");
    g.setAttribute("opacity", String(opacity));

    for (const stroke of annotation.inkList) {
        if (stroke.length < 2) continue;

        const pathData = stroke
            .map((p, i) => {
                const x = p.x * scale;
                const y = p.y * scale;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

        const path = createSvgElement("path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", String(strokeWidth));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        g.appendChild(path);
    }

    svg.appendChild(g);
    layer.appendChild(svg);
    return svg;
}

/**
 * Render a redact annotation (marks content for removal).
 */
export function renderRedact(
    layer: HTMLElement,
    annotation: RedactAnnotation,
    scale: number
): Element {
    const svg = createSvgOverlay();
    const borderColor = colorToRgb(annotation.color, "rgb(255, 0, 0)");
    const fillColor = colorToRgb(annotation.interiorColor, "rgb(0, 0, 0)");
    const opacity = annotation.opacity ?? 1;
    const strokeWidth = 2 * scale;

    const g = createSvgElement("g");
    g.setAttribute("opacity", String(opacity));

    // If we have quads, draw each quad region
    if (annotation.quads && annotation.quads.length > 0) {
        for (const quad of annotation.quads) {
            const scaledPoints = quad.points.map(p => ({
                x: p.x * scale,
                y: p.y * scale
            }));
            const polygon = createSvgElement("polygon");
            polygon.setAttribute("points", scaledPoints.map(p => `${p.x},${p.y}`).join(" "));
            polygon.setAttribute("fill", fillColor);
            polygon.setAttribute("fill-opacity", "0.3");
            polygon.setAttribute("stroke", borderColor);
            polygon.setAttribute("stroke-width", String(strokeWidth));
            polygon.setAttribute("stroke-dasharray", `${4 * scale} ${2 * scale}`);
            g.appendChild(polygon);
        }
    } else {
        // Draw the entire bounds as a redaction area
        const scaled = scaleBounds(annotation.bounds, scale);

        const rect = createSvgElement("rect");
        rect.setAttribute("x", String(scaled.x));
        rect.setAttribute("y", String(scaled.y));
        rect.setAttribute("width", String(scaled.width));
        rect.setAttribute("height", String(scaled.height));
        rect.setAttribute("fill", fillColor);
        rect.setAttribute("fill-opacity", "0.3");
        rect.setAttribute("stroke", borderColor);
        rect.setAttribute("stroke-width", String(strokeWidth));
        rect.setAttribute("stroke-dasharray", `${4 * scale} ${2 * scale}`);
        g.appendChild(rect);

        // Add overlay text if present
        if (annotation.overlayText) {
            const text = createSvgElement("text");
            text.setAttribute("x", String(scaled.x + scaled.width / 2));
            text.setAttribute("y", String(scaled.y + scaled.height / 2));
            text.setAttribute("fill", borderColor);
            text.setAttribute("font-size", String(Math.min(scaled.height * 0.6, 14 * scale)));
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.textContent = annotation.overlayText;
            g.appendChild(text);
        }
    }

    svg.appendChild(g);
    layer.appendChild(svg);
    return svg;
}
