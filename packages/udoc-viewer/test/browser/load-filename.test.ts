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

async function bootstrap(loadOptions?: { filename?: string }): Promise<UDocViewer> {
    client = await UDocClient.create({ googleFonts: false, disableUpdateCheck: true });
    viewer = await client.createViewer({ container });
    const loaded = new Promise<void>((resolve) => viewer!.on("document:load", () => resolve()));
    await viewer.load(sampleUrl, loadOptions);
    await loaded;
    return viewer;
}

async function withStubbedAnchorClick(fn: () => Promise<void>): Promise<void> {
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = () => {};
    try {
        await fn();
    } finally {
        HTMLAnchorElement.prototype.click = orig;
    }
}

describe("UDocViewer load() filename option", () => {
    it("uses the load filename as the download default", async () => {
        const v = await bootstrap({ filename: "renamed.pdf" });
        await withStubbedAnchorClick(async () => {
            const downloaded = new Promise<{ filename: string }>((resolve) => v.on("download", resolve));
            await v.download();
            expect((await downloaded).filename).toBe("renamed.pdf");
        });
    });

    it("download(filename) still wins over the load filename", async () => {
        const v = await bootstrap({ filename: "from-load.pdf" });
        await withStubbedAnchorClick(async () => {
            const downloaded = new Promise<{ filename: string }>((resolve) => v.on("download", resolve));
            await v.download("explicit.pdf");
            expect((await downloaded).filename).toBe("explicit.pdf");
        });
    });

    it("falls back to source-derived filename when load option is omitted", async () => {
        const v = await bootstrap();
        await withStubbedAnchorClick(async () => {
            const downloaded = new Promise<{ filename: string }>((resolve) => v.on("download", resolve));
            await v.download();
            expect((await downloaded).filename).toMatch(/\.pdf$/i);
        });
    });
});
