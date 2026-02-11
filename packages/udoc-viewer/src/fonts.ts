/**
 * Google Fonts support for document rendering.
 *
 * Call `enableGoogleFonts()` once after loading a document to enable
 * automatic font fetching during rendering.
 */

import type { WorkerClient } from "./worker/index.js";

/**
 * Enable Google Fonts for a document.
 *
 * When enabled, fonts that are not embedded in the document will be
 * automatically fetched from Google Fonts during rendering.
 *
 * @param workerClient - The worker client
 * @param documentId - Document ID to enable Google Fonts for
 *
 * @example
 * ```ts
 * // Load document
 * const docId = await workerClient.loadPdf(bytes);
 *
 * // Enable Google Fonts
 * await enableGoogleFonts(workerClient, docId);
 *
 * // Render - fonts are fetched automatically as needed
 * ```
 */
export async function enableGoogleFonts(
  workerClient: WorkerClient,
  documentId: string
): Promise<void> {
  await workerClient.enableGoogleFonts(documentId);
}
