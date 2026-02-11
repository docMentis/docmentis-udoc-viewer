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
