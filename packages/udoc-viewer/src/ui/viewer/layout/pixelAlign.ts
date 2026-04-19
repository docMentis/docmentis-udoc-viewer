export function getDevicePixelRatio(): number {
    if (typeof window === "undefined") return 1;
    const dpr = window.devicePixelRatio || 1;
    return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
}

export function toDevicePixels(value: number, dpr: number = getDevicePixelRatio()): number {
    return Math.round(value * dpr);
}

export function toDevicePixelsCeil(value: number, dpr: number = getDevicePixelRatio()): number {
    return Math.ceil(value * dpr);
}

export function toCssPixels(value: number, dpr: number = getDevicePixelRatio()): number {
    return value / dpr;
}

export function snapToDevice(value: number, dpr: number = getDevicePixelRatio()): number {
    return toCssPixels(toDevicePixels(value, dpr), dpr);
}

export function snapToDeviceCeil(value: number, dpr: number = getDevicePixelRatio()): number {
    return toCssPixels(toDevicePixelsCeil(value, dpr), dpr);
}

const MAX_CANVAS_AREA = 16_777_216;
const MAX_CANVAS_DIMENSION = 4096;

export function getEffectiveDpr(cssWidth: number, cssHeight: number, dpr: number = getDevicePixelRatio()): number {
    if (cssWidth <= 0 || cssHeight <= 0) return dpr;
    const targetWidth = cssWidth * dpr;
    const targetHeight = cssHeight * dpr;
    let factor = 1;
    const area = targetWidth * targetHeight;
    if (area > MAX_CANVAS_AREA) {
        factor = Math.sqrt(MAX_CANVAS_AREA / area);
    }
    if (targetWidth * factor > MAX_CANVAS_DIMENSION) {
        factor = Math.min(factor, MAX_CANVAS_DIMENSION / targetWidth);
    }
    if (targetHeight * factor > MAX_CANVAS_DIMENSION) {
        factor = Math.min(factor, MAX_CANVAS_DIMENSION / targetHeight);
    }
    return factor < 1 ? dpr * factor : dpr;
}
