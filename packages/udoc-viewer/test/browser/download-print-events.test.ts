import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { UDocClient } from "../../src/index.js";
import type { UDocViewer } from "../../src/index.js";
import sampleUrl from "../fixtures/sample.pdf?url";

let container: HTMLDivElement;
let client: UDocClient | null = null;
let viewer: UDocViewer | null = null;

beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() => {
    viewer?.destroy();
    viewer = null;
    client?.destroy();
    client = null;
    container.remove();
});

async function bootstrap(): Promise<UDocViewer> {
    client = await UDocClient.create({ googleFonts: false, disableUpdateCheck: true });
    viewer = await client.createViewer({ container });
    const loaded = new Promise<void>((resolve) => viewer!.on("document:load", () => resolve()));
    await viewer.load(sampleUrl);
    await loaded;
    return viewer;
}

// Stub HTMLAnchorElement.click so download() doesn't trigger a real browser download.
async function withStubbedAnchorClick(fn: () => Promise<void>): Promise<void> {
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = () => {};
    try {
        await fn();
    } finally {
        HTMLAnchorElement.prototype.click = orig;
    }
}

describe("UDocViewer download/print events", () => {
    it("emits download with the resolved filename", async () => {
        const v = await bootstrap();
        await withStubbedAnchorClick(async () => {
            const downloaded = new Promise<{ filename: string }>((resolve) => v.on("download", resolve));
            await v.download("test-output.pdf");
            expect((await downloaded).filename).toBe("test-output.pdf");
        });
    });

    it("falls back to the default filename when none is provided", async () => {
        const v = await bootstrap();
        await withStubbedAnchorClick(async () => {
            const downloaded = new Promise<{ filename: string }>((resolve) => v.on("download", resolve));
            await v.download();
            const ev = await downloaded;
            expect(ev.filename).toMatch(/\.[a-z0-9]+$/i);
        });
    });

    it("emits print on print(options) with the resolved page count", async () => {
        const v = await bootstrap();
        const printed = new Promise<{ pageCount: number }>((resolve) => v.on("print", resolve));
        // Fire-and-forget; the event emits before the iframe-based render starts.
        void v.print({ pageRange: { kind: "all" }, quality: "standard" });
        expect((await printed).pageCount).toBe(v.pageCount);
    });

    it("does NOT emit print when print() is called with no args (dialog-only)", async () => {
        const v = await bootstrap();
        let fired = false;
        v.on("print", () => {
            fired = true;
        });
        await v.print();
        await Promise.resolve();
        expect(fired).toBe(false);
    });
});
