import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { UDocClient } from "../../src/index.js";
import type { UDocViewer, LayoutPage } from "../../src/index.js";
import spacingUrl from "../fixtures/positional-spacing.pdf?url";

/**
 * Reproduction: PDFs that encode word spacing positionally lose every space.
 *
 * A PDF may separate words by moving the text cursor — offsets inside a `TJ`
 * array, or separately positioned runs — rather than by drawing a space glyph.
 * For those files the layout model emits no `space` run, so consecutive glyph
 * runs concatenate and `getPageText` returns
 *
 *     "Table1:Maximumpathlengths,per-layercomplexityandminimum..."
 *
 * The fixture is page 6 of arXiv 1706.03762 ("Attention Is All You Need",
 * https://arxiv.org/pdf/1706.03762v7), extracted to a single page. It is a
 * LaTeX/dvips-produced PDF, which is a common shape for this. Reproduced
 * against the engine bundled in `src/wasm` — 194 glyph runs on that page, and
 * zero space runs.
 *
 * Recovering the spacing means comparing each glyph run's start against the
 * previous run's advance and inserting a space when the gap exceeds some
 * fraction of the font's space width — which needs the font metrics, so it
 * belongs in the engine rather than in a consumer.
 *
 * Impact is not only extraction: `getPageText` is documented as matching what
 * the search engine sees, so on these documents in-viewer search cannot match
 * any multi-word phrase, and single words only match when they happen to fall
 * at a run boundary.
 */

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

async function open(url: string): Promise<UDocViewer> {
    client = await UDocClient.create({
        googleFonts: false,
        disableUpdateCheck: true,
    });
    viewer = await client.createViewer({ container });
    const loaded = new Promise<void>((resolve) => {
        viewer!.on("document:load", () => resolve());
    });
    await viewer.load(url);
    await loaded;
    return viewer;
}

/** Count runs by kind across every frame on a page. */
function countRuns(layout: LayoutPage): { glyphs: number; spaces: number } {
    let glyphs = 0;
    let spaces = 0;
    for (const frame of layout.frames ?? []) {
        for (const line of frame.parcel?.lines ?? []) {
            const content = line.content as { runs?: { content?: { type?: string } }[] };
            for (const run of content?.runs ?? []) {
                if (run.content?.type === "glyphs") glyphs++;
                else if (run.content?.type === "space") spaces++;
            }
        }
    }
    return { glyphs, spaces };
}

describe("PDF word spacing", () => {
    it("emits space runs for positionally-spaced text", async () => {
        const v = await open(spacingUrl);
        const { glyphs, spaces } = countRuns(await v.getLayoutPage(0));

        expect(glyphs).toBeGreaterThan(0);
        // Currently 0. Any page with this much text has word gaps somewhere.
        expect(spaces).toBeGreaterThan(0);
    });

    it("separates words in getPageText", async () => {
        const v = await open(spacingUrl);
        const text = await v.getPageText(0);

        // The heading reads "3.5 Positional Encoding" on the page; today the
        // extracted text contains "3.5PositionalEncoding".
        expect(text).toContain("3.5 Positional Encoding");
        expect(text).not.toContain("3.5PositionalEncoding");
    });

    it("keeps text searchable by phrase", async () => {
        const v = await open(spacingUrl);
        const text = await v.getPageText(0);

        // A reader searching the viewer for any of these would find nothing.
        for (const phrase of ["Positional Encoding", "Why Self-Attention", "path lengths"]) {
            expect(text).toContain(phrase);
        }
    });
});
