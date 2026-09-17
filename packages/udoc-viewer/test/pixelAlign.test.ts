import { describe, it, expect, vi } from "vitest";
import {
    getDevicePixelRatio,
    toDevicePixels,
    toDevicePixelsCeil,
    toCssPixels,
    snapToDevice,
    snapToDeviceCeil,
} from "../src/ui/viewer/layout/pixelAlign";

describe("pixelAlign", () => {
    describe("getDevicePixelRatio", () => {
        it("should return 1 in non-browser environment", () => {
            vi.stubGlobal("window", undefined);
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should return window.devicePixelRatio when available", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(getDevicePixelRatio()).toBe(2);
            vi.unstubAllGlobals();
        });

        it("should return 1 when window.devicePixelRatio is undefined", () => {
            vi.stubGlobal("window", {});
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should return 1 for invalid DPR values (NaN)", () => {
            vi.stubGlobal("window", { devicePixelRatio: NaN });
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should return 1 for invalid DPR values (negative)", () => {
            vi.stubGlobal("window", { devicePixelRatio: -1 });
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should return 1 for invalid DPR values (zero)", () => {
            vi.stubGlobal("window", { devicePixelRatio: 0 });
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should return 1 for invalid DPR values (Infinity)", () => {
            vi.stubGlobal("window", { devicePixelRatio: Infinity });
            expect(getDevicePixelRatio()).toBe(1);
            vi.unstubAllGlobals();
        });

        it("should handle fractional DPR values", () => {
            vi.stubGlobal("window", { devicePixelRatio: 1.5 });
            expect(getDevicePixelRatio()).toBe(1.5);
            vi.unstubAllGlobals();
        });
    });

    describe("toDevicePixels", () => {
        it("should convert CSS pixels to device pixels with rounding", () => {
            expect(toDevicePixels(100, 1)).toBe(100);
            expect(toDevicePixels(100, 2)).toBe(200);
            expect(toDevicePixels(100, 1.5)).toBe(150);
        });

        it("should round to nearest integer", () => {
            expect(toDevicePixels(100.4, 1)).toBe(100);
            expect(toDevicePixels(100.5, 1)).toBe(101);
            expect(toDevicePixels(100.6, 1)).toBe(101);
        });

        it("should use default DPR when not specified", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(toDevicePixels(100)).toBe(200);
            vi.unstubAllGlobals();
        });

        it("should handle zero value", () => {
            expect(toDevicePixels(0, 1)).toBe(0);
            expect(toDevicePixels(0, 2)).toBe(0);
        });

        it("should handle negative values", () => {
            expect(toDevicePixels(-100, 1)).toBe(-100);
            expect(toDevicePixels(-100, 2)).toBe(-200);
        });

        it("should handle very large values", () => {
            expect(toDevicePixels(1000000, 2)).toBe(2000000);
        });
    });

    describe("toDevicePixelsCeil", () => {
        it("should convert CSS pixels to device pixels with ceiling", () => {
            expect(toDevicePixelsCeil(100, 1)).toBe(100);
            expect(toDevicePixelsCeil(100, 2)).toBe(200);
        });

        it("should always round up", () => {
            expect(toDevicePixelsCeil(100.1, 1)).toBe(101);
            expect(toDevicePixelsCeil(100.9, 1)).toBe(101);
            expect(toDevicePixelsCeil(100.1, 2)).toBe(201);
        });

        it("should use default DPR when not specified", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(toDevicePixelsCeil(100)).toBe(200);
            vi.unstubAllGlobals();
        });

        it("should handle zero value", () => {
            expect(toDevicePixelsCeil(0, 1)).toBe(0);
            expect(toDevicePixelsCeil(0, 2)).toBe(0);
        });

        it("should handle negative values", () => {
            expect(toDevicePixelsCeil(-100.1, 1)).toBe(-100);
            expect(toDevicePixelsCeil(-100.9, 1)).toBe(-100);
        });
    });

    describe("toCssPixels", () => {
        it("should convert device pixels to CSS pixels", () => {
            expect(toCssPixels(100, 1)).toBe(100);
            expect(toCssPixels(200, 2)).toBe(100);
            expect(toCssPixels(150, 1.5)).toBe(100);
        });

        it("should handle fractional results", () => {
            expect(toCssPixels(100, 3)).toBeCloseTo(33.333, 2);
            expect(toCssPixels(100, 1.5)).toBeCloseTo(66.666, 2);
        });

        it("should use default DPR when not specified", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(toCssPixels(200)).toBe(100);
            vi.unstubAllGlobals();
        });

        it("should handle zero value", () => {
            expect(toCssPixels(0, 1)).toBe(0);
            expect(toCssPixels(0, 2)).toBe(0);
        });

        it("should handle negative values", () => {
            expect(toCssPixels(-100, 1)).toBe(-100);
            expect(toCssPixels(-200, 2)).toBe(-100);
        });
    });

    describe("snapToDevice", () => {
        it("should snap value to nearest device pixel", () => {
            expect(snapToDevice(100, 1)).toBe(100);
            expect(snapToDevice(100.4, 1)).toBe(100);
            expect(snapToDevice(100.5, 1)).toBe(101);
        });

        it("should return consistent results for same input", () => {
            const result1 = snapToDevice(100.5, 1);
            const result2 = snapToDevice(100.5, 1);
            expect(result1).toBe(result2);
        });

        it("should handle different DPR values", () => {
            expect(snapToDevice(100, 2)).toBe(100);
            expect(snapToDevice(100.25, 2)).toBe(100.5);
            expect(snapToDevice(100.5, 2)).toBe(100.5);
            expect(snapToDevice(100.75, 2)).toBe(101);
        });

        it("should use default DPR when not specified", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(snapToDevice(100.25)).toBe(100.5);
            vi.unstubAllGlobals();
        });

        it("should be reversible with toDevicePixels and toCssPixels", () => {
            const original = 100.5;
            const snapped = snapToDevice(original, 2);
            const devicePixels = toDevicePixels(snapped, 2);
            const backToCss = toCssPixels(devicePixels, 2);
            expect(backToCss).toBe(snapped);
        });

        it("should handle zero value", () => {
            expect(snapToDevice(0, 1)).toBe(0);
            expect(snapToDevice(0, 2)).toBe(0);
        });

        it("should handle negative values", () => {
            expect(snapToDevice(-100.4, 1)).toBe(-100);
            expect(snapToDevice(-100.5, 1)).toBe(-100);
            expect(snapToDevice(-100.6, 1)).toBe(-101);
        });
    });

    describe("snapToDeviceCeil", () => {
        it("should snap value to next device pixel boundary", () => {
            expect(snapToDeviceCeil(100, 1)).toBe(100);
            expect(snapToDeviceCeil(100.1, 1)).toBe(101);
            expect(snapToDeviceCeil(100.9, 1)).toBe(101);
        });

        it("should handle different DPR values", () => {
            expect(snapToDeviceCeil(100, 2)).toBe(100);
            expect(snapToDeviceCeil(100.1, 2)).toBe(100.5);
            expect(snapToDeviceCeil(100.5, 2)).toBe(100.5);
            expect(snapToDeviceCeil(100.6, 2)).toBe(101);
        });

        it("should use default DPR when not specified", () => {
            vi.stubGlobal("window", { devicePixelRatio: 2 });
            expect(snapToDeviceCeil(100.1)).toBe(100.5);
            vi.unstubAllGlobals();
        });

        it("should handle zero value", () => {
            expect(snapToDeviceCeil(0, 1)).toBe(0);
            expect(snapToDeviceCeil(0, 2)).toBe(0);
        });

        it("should handle negative values", () => {
            expect(snapToDeviceCeil(-100.1, 1)).toBe(-100);
            expect(snapToDeviceCeil(-100.9, 1)).toBe(-100);
        });
    });

    describe("integration tests", () => {
        it("should maintain consistency between all functions at DPR 1", () => {
            const cssValue = 100.5;
            const devicePixels = toDevicePixels(cssValue, 1);
            const backToCss = toCssPixels(devicePixels, 1);
            const snapped = snapToDevice(cssValue, 1);
            expect(backToCss).toBe(snapped);
        });

        it("should maintain consistency between all functions at DPR 2", () => {
            const cssValue = 100.5;
            const devicePixels = toDevicePixels(cssValue, 2);
            const backToCss = toCssPixels(devicePixels, 2);
            const snapped = snapToDevice(cssValue, 2);
            expect(backToCss).toBe(snapped);
        });

        it("should maintain consistency between all functions at fractional DPR", () => {
            const cssValue = 100.5;
            const dpr = 1.5;
            const devicePixels = toDevicePixels(cssValue, dpr);
            const backToCss = toCssPixels(devicePixels, dpr);
            const snapped = snapToDevice(cssValue, dpr);
            expect(backToCss).toBe(snapped);
        });
    });
});
