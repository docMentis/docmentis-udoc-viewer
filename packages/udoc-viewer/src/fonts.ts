/**
 * Font management for document rendering.
 *
 * - Call `registerFonts()` to provide custom font URLs (resolved first).
 * - Call `enableGoogleFonts()` to enable automatic Google Fonts fetching.
 *
 * Both should be called before loading documents.
 */

import type { WorkerClient, FontEntry } from "./worker/index.js";

export type { FontEntry };

/**
 * Register font URLs.
 *
 * The engine fetches fonts on-demand during layout from the provided URLs.
 * Call this before loading documents. Registered fonts take priority over
 * Google Fonts.
 *
 * @param workerClient - The worker client
 * @param fonts - Array of font entries
 *
 * @example
 * ```ts
 * await registerFonts(workerClient, [
 *   { typeface: "Roboto", bold: false, italic: false, url: "https://cdn.example.com/Roboto-Regular.woff2" },
 *   { typeface: "Roboto", bold: true, italic: false, url: "https://cdn.example.com/Roboto-Bold.woff2" },
 * ]);
 * ```
 */
export async function registerFonts(workerClient: WorkerClient, fonts: FontEntry[]): Promise<void> {
    await workerClient.registerFonts(fonts);
}

/**
 * Enable Google Fonts.
 *
 * When enabled, fonts that are not embedded in the document will be
 * automatically fetched from Google Fonts during rendering. Google Fonts
 * are resolved after any URL fonts registered via `registerFonts`.
 *
 * Call this before loading documents.
 *
 * @param workerClient - The worker client
 *
 * @example
 * ```ts
 * await enableGoogleFonts(workerClient);
 * ```
 */
export async function enableGoogleFonts(workerClient: WorkerClient): Promise<void> {
    await workerClient.enableGoogleFonts();
}
