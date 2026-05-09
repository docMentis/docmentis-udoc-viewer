import { describe, it, expect } from "vitest";
import type { ActiveTool } from "../src/ui/viewer/state";

describe("Tool Change Event", () => {
    describe("ActiveTool type safety", () => {
        it("should accept simple tools without sub", () => {
            const pointer: ActiveTool = { kind: "pointer" };
            const hand: ActiveTool = { kind: "hand" };
            const zoom: ActiveTool = { kind: "zoom" };

            expect(pointer.kind).toBe("pointer");
            expect(hand.kind).toBe("hand");
            expect(zoom.kind).toBe("zoom");
        });

        it("should require sub for tool sets", () => {
            const annotate: ActiveTool = { kind: "annotate", sub: "freehand" };
            const markup: ActiveTool = { kind: "markup", sub: "highlight" };

            expect(annotate.kind).toBe("annotate");
            expect(annotate.sub).toBe("freehand");
            expect(markup.kind).toBe("markup");
            expect(markup.sub).toBe("highlight");
        });

        it("should support all annotate sub-tools", () => {
            const subTools = [
                "select",
                "freehand",
                "line",
                "arrow",
                "rectangle",
                "ellipse",
                "polygon",
                "polyline",
            ] as const;

            subTools.forEach((sub) => {
                const tool: ActiveTool = { kind: "annotate", sub };
                expect(tool.kind).toBe("annotate");
                expect(tool.sub).toBe(sub);
            });
        });

        it("should support all markup sub-tools", () => {
            const subTools = ["select", "highlight", "underline", "strikethrough", "squiggly"] as const;

            subTools.forEach((sub) => {
                const tool: ActiveTool = { kind: "markup", sub };
                expect(tool.kind).toBe("markup");
                expect(tool.sub).toBe(sub);
            });
        });
    });

    describe("Tool equality", () => {
        it("should correctly compare simple tools", () => {
            const tool1: ActiveTool = { kind: "pointer" };
            const tool2: ActiveTool = { kind: "pointer" };
            const tool3: ActiveTool = { kind: "hand" };

            expect(tool1).toEqual(tool2);
            expect(tool1).not.toEqual(tool3);
        });

        it("should correctly compare tool sets", () => {
            const tool1: ActiveTool = { kind: "annotate", sub: "rectangle" };
            const tool2: ActiveTool = { kind: "annotate", sub: "rectangle" };
            const tool3: ActiveTool = { kind: "annotate", sub: "freehand" };
            const tool4: ActiveTool = { kind: "markup", sub: "highlight" };

            expect(tool1).toEqual(tool2);
            expect(tool1).not.toEqual(tool3);
            expect(tool1).not.toEqual(tool4);
        });
    });

    describe("Event payload structure", () => {
        it("should have correct event payload structure", () => {
            const previousTool: ActiveTool = { kind: "pointer" };
            const tool: ActiveTool = { kind: "annotate", sub: "rectangle" };

            const eventPayload = {
                tool,
                previousTool,
            };

            expect(eventPayload.tool).toEqual(tool);
            expect(eventPayload.previousTool).toEqual(previousTool);
            expect(eventPayload.tool.kind).toBe("annotate");
            if (eventPayload.tool.kind === "annotate") {
                expect(eventPayload.tool.sub).toBe("rectangle");
            }
        });
    });
});
