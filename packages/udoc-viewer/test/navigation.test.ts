import { describe, it, expect } from "vitest";
import { destinationToNavigationTarget, type Destination, type DestinationDisplay } from "../src/ui/viewer/navigation";

describe("navigation", () => {
    describe("destinationToNavigationTarget", () => {
        describe("xyz destination", () => {
            it("should convert xyz destination with all parameters", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: 100, top: 200, zoom: 1.5 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
                expect(result.scrollTo).toEqual({ x: 100, y: 200 });
                expect(result.zoom).toBe(1.5);
            });

            it("should convert xyz destination with partial parameters (only left)", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: 100 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
                expect(result.scrollTo).toEqual({ x: 100 });
                expect(result.zoom).toBeUndefined();
            });

            it("should convert xyz destination with partial parameters (only top)", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", top: 200 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
                expect(result.scrollTo).toEqual({ y: 200 });
                expect(result.zoom).toBeUndefined();
            });

            it("should convert xyz destination with partial parameters (only zoom)", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 2 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
                expect(result.scrollTo).toBeUndefined();
                expect(result.zoom).toBe(2);
            });

            it("should ignore zero zoom", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 0 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBeUndefined();
            });

            it("should ignore negative zoom", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: -1 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBeUndefined();
            });

            it("should handle xyz destination without any optional parameters", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
                expect(result.scrollTo).toBeUndefined();
                expect(result.zoom).toBeUndefined();
            });
        });

        describe("fitH destination", () => {
            it("should convert fitH destination with top", () => {
                const dest: Destination = {
                    pageIndex: 2,
                    display: { type: "fitH", top: 300 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(3);
                expect(result.scrollTo).toEqual({ y: 300 });
            });

            it("should convert fitH destination without top", () => {
                const dest: Destination = {
                    pageIndex: 2,
                    display: { type: "fitH" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(3);
                expect(result.scrollTo).toBeUndefined();
            });
        });

        describe("fitV destination", () => {
            it("should convert fitV destination with left", () => {
                const dest: Destination = {
                    pageIndex: 1,
                    display: { type: "fitV", left: 150 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(2);
                expect(result.scrollTo).toEqual({ x: 150 });
            });

            it("should convert fitV destination without left", () => {
                const dest: Destination = {
                    pageIndex: 1,
                    display: { type: "fitV" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(2);
                expect(result.scrollTo).toBeUndefined();
            });
        });

        describe("fitBH destination", () => {
            it("should convert fitBH destination with top", () => {
                const dest: Destination = {
                    pageIndex: 3,
                    display: { type: "fitBH", top: 400 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(4);
                expect(result.scrollTo).toEqual({ y: 400 });
            });

            it("should convert fitBH destination without top", () => {
                const dest: Destination = {
                    pageIndex: 3,
                    display: { type: "fitBH" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(4);
                expect(result.scrollTo).toBeUndefined();
            });
        });

        describe("fitBV destination", () => {
            it("should convert fitBV destination with left", () => {
                const dest: Destination = {
                    pageIndex: 4,
                    display: { type: "fitBV", left: 250 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(5);
                expect(result.scrollTo).toEqual({ x: 250 });
            });

            it("should convert fitBV destination without left", () => {
                const dest: Destination = {
                    pageIndex: 4,
                    display: { type: "fitBV" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(5);
                expect(result.scrollTo).toBeUndefined();
            });
        });

        describe("fit destination", () => {
            it("should convert fit destination", () => {
                const dest: Destination = {
                    pageIndex: 5,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(6);
                expect(result.scrollTo).toBeUndefined();
                expect(result.zoom).toBeUndefined();
            });
        });

        describe("fitB destination", () => {
            it("should convert fitB destination", () => {
                const dest: Destination = {
                    pageIndex: 6,
                    display: { type: "fitB" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(7);
                expect(result.scrollTo).toBeUndefined();
                expect(result.zoom).toBeUndefined();
            });
        });

        describe("fitR destination", () => {
            it("should convert fitR destination", () => {
                const dest: Destination = {
                    pageIndex: 7,
                    display: { type: "fitR", left: 10, top: 20, right: 100, bottom: 200 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(8);
                expect(result.scrollTo).toBeUndefined();
                expect(result.zoom).toBeUndefined();
            });
        });

        describe("page index clamping", () => {
            it("should clamp page index to valid range (lower bound)", () => {
                const dest: Destination = {
                    pageIndex: -5,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
            });

            it("should clamp page index to valid range (upper bound)", () => {
                const dest: Destination = {
                    pageIndex: 100,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(10);
            });

            it("should handle zero page index", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
            });

            it("should handle last valid page index", () => {
                const dest: Destination = {
                    pageIndex: 9,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(10);
            });
        });

        describe("page count edge cases", () => {
            it("should handle zero page count", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 0);
                expect(result.page).toBe(1);
            });

            it("should handle single page document", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 1);
                expect(result.page).toBe(1);
            });

            it("should handle large page count", () => {
                const dest: Destination = {
                    pageIndex: 999,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 1000);
                expect(result.page).toBe(1000);
            });
        });

        describe("conversion consistency", () => {
            it("should convert 0-based pageIndex to 1-based page", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(1);
            });

            it("should convert pageIndex 5 to page 6", () => {
                const dest: Destination = {
                    pageIndex: 5,
                    display: { type: "fit" },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.page).toBe(6);
            });
        });

        describe("scroll position handling", () => {
            it("should handle zero scroll position", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: 0, top: 0 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.scrollTo).toEqual({ x: 0, y: 0 });
            });

            it("should handle negative scroll position", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: -10, top: -20 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.scrollTo).toEqual({ x: -10, y: -20 });
            });

            it("should handle large scroll position", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: 10000, top: 20000 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.scrollTo).toEqual({ x: 10000, y: 20000 });
            });

            it("should handle fractional scroll position", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", left: 10.5, top: 20.7 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.scrollTo).toEqual({ x: 10.5, y: 20.7 });
            });
        });

        describe("zoom handling", () => {
            it("should handle zoom = 1", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 1 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBe(1);
            });

            it("should handle fractional zoom", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 1.25 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBe(1.25);
            });

            it("should handle large zoom", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 10 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBe(10);
            });

            it("should handle very small positive zoom", () => {
                const dest: Destination = {
                    pageIndex: 0,
                    display: { type: "xyz", zoom: 0.001 },
                };
                const result = destinationToNavigationTarget(dest, 10);
                expect(result.zoom).toBe(0.001);
            });
        });

        describe("all destination display types", () => {
            const displayTypes: DestinationDisplay[] = [
                { type: "xyz", left: 100, top: 200, zoom: 1.5 },
                { type: "fit" },
                { type: "fitH", top: 100 },
                { type: "fitV", left: 100 },
                { type: "fitR", left: 10, top: 20, right: 100, bottom: 200 },
                { type: "fitB" },
                { type: "fitBH", top: 100 },
                { type: "fitBV", left: 100 },
            ];

            displayTypes.forEach((display) => {
                it(`should handle ${display.type} destination type`, () => {
                    const dest: Destination = {
                        pageIndex: 0,
                        display,
                    };
                    const result = destinationToNavigationTarget(dest, 10);
                    expect(result.page).toBeGreaterThanOrEqual(1);
                    expect(result.page).toBeLessThanOrEqual(10);
                });
            });
        });
    });
});
