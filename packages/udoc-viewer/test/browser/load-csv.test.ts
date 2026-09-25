import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { UDocClient } from "../../src/index.js";
import type { UDocViewer, LoadOptions } from "../../src/index.js";
import sampleCsvUrl from "../fixtures/sample.csv?url";

// CSV has no magic bytes, so every case below would fail with "Failed to
// detect document format" unless the viewer passes WASM a "csv" hint.

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

/** Fresh copy of the fixture bytes (loading may transfer the buffer to the worker). */
async function csvBytes(): Promise<Uint8Array> {
    return new Uint8Array(await (await fetch(sampleCsvUrl)).arrayBuffer());
}

async function loadAndCountPages(source: string | File | Uint8Array, options?: LoadOptions): Promise<number> {
    client = await UDocClient.create({ googleFonts: false, disableUpdateCheck: true });
    viewer = await client.createViewer({ container });
    const loaded = new Promise<{ pageCount: number }>((resolve) => viewer!.on("document:load", resolve));
    await viewer.load(source, options);
    return (await loaded).pageCount;
}

/** Serve `bytes` with `headers` for `url` only; every other request passes through. */
async function withStubbedFetch(url: string, bytes: Uint8Array, headers: HeadersInit, fn: () => Promise<void>) {
    const orig = globalThis.fetch;
    globalThis.fetch = (input, init) =>
        String(input) === url ? Promise.resolve(new Response(bytes, { headers })) : orig(input, init);
    try {
        await fn();
    } finally {
        globalThis.fetch = orig;
    }
}

describe("UDocViewer CSV format hint", () => {
    it("opens a URL ending in .csv", async () => {
        expect(await loadAndCountPages(sampleCsvUrl)).toBeGreaterThan(0);
    });

    it("opens raw bytes when the format option is given", async () => {
        expect(await loadAndCountPages(await csvBytes(), { format: "csv" })).toBeGreaterThan(0);
    });

    it("opens raw bytes named by the filename option", async () => {
        expect(await loadAndCountPages(await csvBytes(), { filename: "export.csv" })).toBeGreaterThan(0);
    });

    it("opens a File without a .csv name whose type is text/csv", async () => {
        const file = new File([await csvBytes()], "export", { type: "text/csv" });
        expect(await loadAndCountPages(file)).toBeGreaterThan(0);
    });

    it("opens an extensionless URL served as text/csv", async () => {
        const url = URL.createObjectURL(new Blob([await csvBytes()], { type: "text/csv;charset=utf-8" }));
        try {
            expect(await loadAndCountPages(url)).toBeGreaterThan(0);
        } finally {
            URL.revokeObjectURL(url);
        }
    });

    it.each([
        ['attachment; filename="export.csv"'],
        ["attachment; filename*=UTF-8''quarterly%20export.csv"],
        ["attachment; filename=\"export.bin\"; filename*=UTF-8''export.csv"],
    ])("opens an extensionless URL named by Content-Disposition: %s", async (disposition) => {
        const url = "https://files.example.com/download/42";
        const headers = { "Content-Type": "application/octet-stream", "Content-Disposition": disposition };
        await withStubbedFetch(url, await csvBytes(), headers, async () => {
            expect(await loadAndCountPages(url)).toBeGreaterThan(0);
        });
    });
});
