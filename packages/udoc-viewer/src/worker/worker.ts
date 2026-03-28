/**
 * Web Worker for UDoc document rendering.
 *
 * Handles WASM operations off the main thread to keep the UI responsive.
 */

import init, { Wasm, parseFontInfo } from "../wasm/udoc.js";

let wasm: Wasm | null = null;
let gpuAvailable = false;

/**
 * License validation result from WASM.
 */
export interface LicenseResult {
    valid: boolean;
    error?: string;
    features: string[];
    limits: Record<string, number>;
    organization?: string;
    expiresAt?: number;
}

/**
 * Message types from main thread to worker.
 */
/**
 * A pick specification for compose operations.
 */
export interface ComposePick {
    /** Document index (0-based, referring to documents in docIds array) */
    doc: number;
    /** Page range string (e.g., "0-2,4") - 0-based page indices */
    pages: string;
    /** Optional rotation in degrees (0, 90, 180, or 270) */
    rotation?: 0 | 90 | 180 | 270;
}

/**
 * A composition specification - array of picks that form one output document.
 */
export type Composition = ComposePick[];

/**
 * Outline section info from split_by_outline.
 */
export interface OutlineSection {
    title: string;
    index: number;
}

/**
 * Result from split_by_outline operation.
 */
export interface SplitByOutlineResult {
    documentIds: string[];
    sections: OutlineSection[];
}

/**
 * Extracted image info.
 */
export interface ExtractedImage {
    name: string;
    format: string;
    width: number | null;
    height: number | null;
    data: Uint8Array;
}

/**
 * Extracted font info.
 */
export interface ExtractedFont {
    name: string;
    fontType: string;
    extension: string;
    data: Uint8Array;
}

/**
 * Font entry for registering font URLs.
 *
 * Supported font formats: OTF, TTF, WOFF, and WOFF2.
 */
export interface FontEntry {
    /** Font family name (must match the name used in the document). */
    typeface: string;
    /** Whether this is a bold variant. */
    bold: boolean;
    /** Whether this is an italic variant. */
    italic: boolean;
    /** URL to fetch the font file from. Supports OTF, TTF, WOFF, and WOFF2 formats. */
    url: string;
}

export type WorkerRequest =
    | { type: "init"; wasmUrl?: string; gpu?: boolean }
    | { type: "setup"; domain: string; viewerVersion: string; distinctId: string }
    | { type: "disableTelemetry" }
    | { type: "setLicense"; license: string; domain: string }
    | { type: "getLicenseStatus" }
    | { type: "load"; id: string; bytes: Uint8Array }
    | { type: "loadPdf"; id: string; bytes: Uint8Array }
    | { type: "loadImage"; id: string; bytes: Uint8Array }
    | { type: "loadPptx"; id: string; bytes: Uint8Array }
    | { type: "loadDocx"; id: string; bytes: Uint8Array }
    | { type: "loadXlsx"; id: string; bytes: Uint8Array }
    | { type: "getDocumentFormat"; documentId: string }
    | { type: "unloadPdf"; documentId: string }
    | { type: "needsPassword"; documentId: string }
    | { type: "authenticate"; documentId: string; password: string }
    | { type: "getPageCount"; documentId: string }
    | { type: "getPageInfo"; documentId: string; pageIndex: number }
    | { type: "getAllPageInfo"; documentId: string }
    | { type: "getPageLayout"; documentId: string }
    | { type: "renderPage"; documentId: string; pageIndex: number; width: number; height: number }
    | { type: "getOutline"; documentId: string }
    | { type: "getPageAnnotations"; documentId: string; pageIndex: number }
    | { type: "getAllAnnotations"; documentId: string }
    | { type: "getPageText"; documentId: string; pageIndex: number }
    | { type: "pdfCompose"; compositions: Composition[]; docIds: string[] }
    | { type: "getBytes"; documentId: string }
    | { type: "pdfSplitByOutline"; documentId: string; maxLevel: number; splitMidPage: boolean }
    | { type: "pdfExtractImages"; documentId: string; convertRawToPng: boolean }
    | { type: "pdfExtractFonts"; documentId: string }
    | { type: "pdfCompress"; documentId: string }
    | { type: "pdfDecompress"; documentId: string }
    | { type: "registerFonts"; fonts: FontEntry[] }
    | { type: "enableGoogleFonts" }
    | { type: "getVisibilityGroups"; documentId: string }
    | { type: "setVisibilityGroupVisible"; documentId: string; groupId: string; visible: boolean }
    | { type: "parseFontInfo"; data: Uint8Array };

/**
 * Message types from worker to main thread.
 */
export type WorkerResponse =
    | { type: "init"; success: true }
    | { type: "init"; success: false; error: string }
    | { type: "setup"; success: true }
    | { type: "setup"; success: false; error: string }
    | { type: "disableTelemetry"; success: true; disabled: boolean }
    | { type: "disableTelemetry"; success: false; error: string }
    | { type: "setLicense"; success: true; result: LicenseResult }
    | { type: "setLicense"; success: false; error: string }
    | { type: "getLicenseStatus"; success: true; result: LicenseResult }
    | { type: "getLicenseStatus"; success: false; error: string }
    | { type: "load"; success: true; documentId: string }
    | { type: "load"; success: false; error: string }
    | { type: "getDocumentFormat"; success: true; format: string }
    | { type: "getDocumentFormat"; success: false; error: string }
    | { type: "loadPdf"; success: true; documentId: string }
    | { type: "loadPdf"; success: false; error: string }
    | { type: "loadImage"; success: true; documentId: string }
    | { type: "loadImage"; success: false; error: string }
    | { type: "loadPptx"; success: true; documentId: string }
    | { type: "loadPptx"; success: false; error: string }
    | { type: "loadDocx"; success: true; documentId: string }
    | { type: "loadDocx"; success: false; error: string }
    | { type: "loadXlsx"; success: true; documentId: string }
    | { type: "loadXlsx"; success: false; error: string }
    | { type: "unloadPdf"; success: true; removed: boolean }
    | { type: "unloadPdf"; success: false; error: string }
    | { type: "needsPassword"; success: true; needsPassword: boolean }
    | { type: "needsPassword"; success: false; error: string }
    | { type: "authenticate"; success: true; authenticated: boolean }
    | { type: "authenticate"; success: false; error: string }
    | { type: "getPageCount"; success: true; pageCount: number }
    | { type: "getPageCount"; success: false; error: string }
    | { type: "getPageInfo"; success: true; width: number; height: number; rotation: number; transition?: unknown }
    | { type: "getPageInfo"; success: false; error: string }
    | {
          type: "getAllPageInfo";
          success: true;
          pages: Array<{ width: number; height: number; rotation: number; transition?: unknown }>;
      }
    | { type: "getAllPageInfo"; success: false; error: string }
    | { type: "getPageLayout"; success: true; layout: string }
    | { type: "getPageLayout"; success: false; error: string }
    | { type: "renderPage"; success: true; rgba: Uint8Array; width: number; height: number }
    | { type: "renderPage"; success: false; error: string }
    | { type: "getOutline"; success: true; outline: unknown[] }
    | { type: "getOutline"; success: false; error: string }
    | { type: "getPageAnnotations"; success: true; annotations: unknown[] }
    | { type: "getPageAnnotations"; success: false; error: string }
    | { type: "getAllAnnotations"; success: true; annotations: Record<string, unknown[]> }
    | { type: "getAllAnnotations"; success: false; error: string }
    | { type: "getPageText"; success: true; text: unknown[] }
    | { type: "getPageText"; success: false; error: string }
    | { type: "pdfCompose"; success: true; documentIds: string[] }
    | { type: "pdfCompose"; success: false; error: string }
    | { type: "getBytes"; success: true; bytes: Uint8Array }
    | { type: "getBytes"; success: false; error: string }
    | { type: "pdfSplitByOutline"; success: true; result: SplitByOutlineResult }
    | { type: "pdfSplitByOutline"; success: false; error: string }
    | { type: "pdfExtractImages"; success: true; images: ExtractedImage[] }
    | { type: "pdfExtractImages"; success: false; error: string }
    | { type: "pdfExtractFonts"; success: true; fonts: ExtractedFont[] }
    | { type: "pdfExtractFonts"; success: false; error: string }
    | { type: "pdfCompress"; success: true; bytes: Uint8Array }
    | { type: "pdfCompress"; success: false; error: string }
    | { type: "pdfDecompress"; success: true; bytes: Uint8Array }
    | { type: "pdfDecompress"; success: false; error: string }
    | { type: "registerFonts"; success: true }
    | { type: "registerFonts"; success: false; error: string }
    | { type: "enableGoogleFonts"; success: true }
    | { type: "enableGoogleFonts"; success: false; error: string }
    | { type: "getVisibilityGroups"; success: true; groups: unknown[] }
    | { type: "getVisibilityGroups"; success: false; error: string }
    | { type: "setVisibilityGroupVisible"; success: true; updated: boolean }
    | { type: "setVisibilityGroupVisible"; success: false; error: string }
    | { type: "parseFontInfo"; success: true; info: { typeface: string; bold: boolean; italic: boolean } }
    | { type: "parseFontInfo"; success: false; error: string };

/** Current request ID for response matching. */
let currentRequestId: number | undefined;

/**
 * Message queue to serialize processing.
 * GPU render is async and yields to the browser event loop.
 * Without serialization, a new message arriving during a yield would
 * trigger a concurrent &mut self borrow on the WASM UDoc instance.
 */
let processing = false;
const messageQueue: MessageEvent<WorkerRequest & { _id?: number }>[] = [];

self.onmessage = (event: MessageEvent<WorkerRequest & { _id?: number }>) => {
    messageQueue.push(event);
    if (!processing) {
        processQueue();
    }
};

async function processQueue(): Promise<void> {
    processing = true;
    while (messageQueue.length > 0) {
        const event = messageQueue.shift()!;
        await handleMessage(event);
    }
    processing = false;
}

/**
 * Handle incoming messages from main thread.
 */
async function handleMessage(event: MessageEvent<WorkerRequest & { _id?: number }>): Promise<void> {
    const { _id, ...request } = event.data;
    currentRequestId = _id;

    try {
        switch (request.type) {
            case "init": {
                await init(request.wasmUrl ? { module_or_path: request.wasmUrl } : undefined);
                wasm = new Wasm();
                if (request.gpu) {
                    try {
                        gpuAvailable = await wasm.init_gpu();
                    } catch {
                        gpuAvailable = false;
                    }
                }
                respond({ type: "init", success: true });
                break;
            }

            case "setup": {
                ensureInitialized();
                wasm!.setup(request.domain, request.viewerVersion, request.distinctId);
                respond({ type: "setup", success: true });
                break;
            }

            case "disableTelemetry": {
                ensureInitialized();
                const disabled = wasm!.disable_telemetry();
                respond({ type: "disableTelemetry", success: true, disabled });
                break;
            }

            case "setLicense": {
                ensureInitialized();
                const result = wasm!.set_license(request.license) as LicenseResult;
                respond({ type: "setLicense", success: true, result });
                break;
            }

            case "getLicenseStatus": {
                ensureInitialized();
                const result = wasm!.license_status() as LicenseResult;
                respond({ type: "getLicenseStatus", success: true, result });
                break;
            }

            case "load": {
                ensureInitialized();
                const documentId = wasm!.load(request.bytes);
                respond({ type: "load", success: true, documentId });
                break;
            }

            case "getDocumentFormat": {
                ensureInitialized();
                const format = wasm!.document_format(request.documentId);
                respond({ type: "getDocumentFormat", success: true, format });
                break;
            }

            case "loadPdf": {
                ensureInitialized();
                const documentId = wasm!.load_pdf(request.bytes);
                respond({ type: "loadPdf", success: true, documentId });
                break;
            }

            case "loadImage": {
                ensureInitialized();
                const documentId = wasm!.load_image(request.bytes);
                respond({ type: "loadImage", success: true, documentId });
                break;
            }

            case "loadPptx": {
                ensureInitialized();
                const documentId = wasm!.load_pptx(request.bytes);
                respond({ type: "loadPptx", success: true, documentId });
                break;
            }

            case "loadDocx": {
                ensureInitialized();
                const documentId = wasm!.load_docx(request.bytes);
                respond({ type: "loadDocx", success: true, documentId });
                break;
            }

            case "loadXlsx": {
                ensureInitialized();
                const documentId = wasm!.load_xlsx(request.bytes);
                respond({ type: "loadXlsx", success: true, documentId });
                break;
            }

            case "unloadPdf": {
                ensureInitialized();
                const removed = wasm!.remove_document(request.documentId);
                respond({ type: "unloadPdf", success: true, removed });
                break;
            }

            case "needsPassword": {
                ensureInitialized();
                const needsPassword = wasm!.needs_password(request.documentId);
                respond({ type: "needsPassword", success: true, needsPassword });
                break;
            }

            case "authenticate": {
                ensureInitialized();
                const authenticated = wasm!.authenticate(request.documentId, request.password);
                respond({ type: "authenticate", success: true, authenticated });
                break;
            }

            case "getPageCount": {
                ensureInitialized();
                const pageCount = wasm!.page_count(request.documentId);
                respond({ type: "getPageCount", success: true, pageCount });
                break;
            }

            case "getPageInfo": {
                ensureInitialized();
                const info = wasm!.page_info(request.documentId, request.pageIndex);
                respond({
                    type: "getPageInfo",
                    success: true,
                    width: info.width,
                    height: info.height,
                    rotation: info.rotation,
                    transition: info.transition,
                });
                break;
            }

            case "getAllPageInfo": {
                ensureInitialized();
                const pages = wasm!.all_page_info(request.documentId);
                respond({ type: "getAllPageInfo", success: true, pages });
                break;
            }

            case "getPageLayout": {
                ensureInitialized();
                const layout = wasm!.page_layout(request.documentId);
                respond({ type: "getPageLayout", success: true, layout });
                break;
            }

            case "renderPage": {
                ensureInitialized();
                // Skip renders for documents that were unloaded while queued
                if (!wasm!.has_document(request.documentId)) {
                    respond({ type: "renderPage", success: false, error: `Document not found: ${request.documentId}` });
                    break;
                }
                let rgba: Uint8Array;
                if (gpuAvailable) {
                    const gpuResult = await wasm!.render_page_gpu(
                        request.documentId,
                        request.pageIndex,
                        request.width,
                        request.height,
                    );
                    // Copy to own buffer — GPU result may be a view into WASM memory
                    rgba = new Uint8Array(gpuResult);
                } else {
                    rgba = wasm!.render_page_to_rgba(
                        request.documentId,
                        request.pageIndex,
                        request.width,
                        request.height,
                    );
                }
                respond({ type: "renderPage", success: true, rgba, width: request.width, height: request.height }, [
                    rgba.buffer,
                ]);
                break;
            }

            case "getOutline": {
                ensureInitialized();
                const outline = wasm!.get_outline(request.documentId) as unknown[];
                respond({ type: "getOutline", success: true, outline });
                break;
            }

            case "getPageAnnotations": {
                ensureInitialized();
                const annotations = wasm!.get_page_annotations(request.documentId, request.pageIndex) as unknown[];
                respond({ type: "getPageAnnotations", success: true, annotations });
                break;
            }

            case "getPageText": {
                ensureInitialized();
                const text = wasm!.get_page_text(request.documentId, request.pageIndex) as unknown[];
                respond({ type: "getPageText", success: true, text });
                break;
            }

            case "getAllAnnotations": {
                ensureInitialized();
                const annotations = wasm!.get_all_annotations(request.documentId) as Record<string, unknown[]>;
                respond({ type: "getAllAnnotations", success: true, annotations });
                break;
            }

            case "pdfCompose": {
                ensureInitialized();
                const documentIds = wasm!.pdf_compose(request.compositions, request.docIds) as string[];
                respond({ type: "pdfCompose", success: true, documentIds });
                break;
            }

            case "getBytes": {
                ensureInitialized();
                const bytes = wasm!.get_bytes(request.documentId) as Uint8Array;
                respond({ type: "getBytes", success: true, bytes }, [bytes.buffer]);
                break;
            }

            case "pdfSplitByOutline": {
                ensureInitialized();
                const result = wasm!.pdf_split_by_outline(
                    request.documentId,
                    request.maxLevel,
                    request.splitMidPage,
                ) as SplitByOutlineResult;
                respond({ type: "pdfSplitByOutline", success: true, result });
                break;
            }

            case "pdfExtractImages": {
                ensureInitialized();
                const rawImages = wasm!.pdf_extract_images(
                    request.documentId,
                    request.convertRawToPng,
                ) as ExtractedImage[];
                // Copy Uint8Array data to ensure proper transfer across worker boundary
                // (WASM memory views don't survive structured clone when nested in objects)
                const images = rawImages.map((img) => ({
                    ...img,
                    data: new Uint8Array(img.data),
                }));
                const transfers = images.map((img) => img.data.buffer);
                respond({ type: "pdfExtractImages", success: true, images }, transfers);
                break;
            }

            case "pdfExtractFonts": {
                ensureInitialized();
                const rawFonts = wasm!.pdf_extract_fonts(request.documentId) as ExtractedFont[];
                // Copy Uint8Array data to ensure proper transfer across worker boundary
                // (WASM memory views don't survive structured clone when nested in objects)
                const fonts = rawFonts.map((font) => ({
                    ...font,
                    data: new Uint8Array(font.data),
                }));
                const transfers = fonts.map((font) => font.data.buffer);
                respond({ type: "pdfExtractFonts", success: true, fonts }, transfers);
                break;
            }

            case "pdfCompress": {
                ensureInitialized();
                const compressedBytes = wasm!.pdf_compress(request.documentId) as Uint8Array;
                respond({ type: "pdfCompress", success: true, bytes: compressedBytes }, [compressedBytes.buffer]);
                break;
            }

            case "pdfDecompress": {
                ensureInitialized();
                const decompressedBytes = wasm!.pdf_decompress(request.documentId) as Uint8Array;
                respond({ type: "pdfDecompress", success: true, bytes: decompressedBytes }, [decompressedBytes.buffer]);
                break;
            }

            case "registerFonts": {
                ensureInitialized();
                wasm!.registerFonts(request.fonts);
                respond({ type: "registerFonts", success: true });
                break;
            }

            case "enableGoogleFonts": {
                ensureInitialized();
                wasm!.enableGoogleFonts();
                respond({ type: "enableGoogleFonts", success: true });
                break;
            }

            case "getVisibilityGroups": {
                ensureInitialized();
                const groups = wasm!.get_visibility_groups(request.documentId) as unknown[];
                respond({ type: "getVisibilityGroups", success: true, groups });
                break;
            }

            case "setVisibilityGroupVisible": {
                ensureInitialized();
                const updated = wasm!.set_visibility_group_visible(
                    request.documentId,
                    request.groupId,
                    request.visible,
                );
                respond({ type: "setVisibilityGroupVisible", success: true, updated });
                break;
            }

            case "parseFontInfo": {
                ensureInitialized();
                const info = parseFontInfo(request.data) as { typeface: string; bold: boolean; italic: boolean };
                respond({ type: "parseFontInfo", success: true, info });
                break;
            }

            default: {
                const _exhaustive: never = request;
                throw new Error(`Unknown request type: ${(request as WorkerRequest).type}`);
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        respond({ type: request.type, success: false, error: errorMessage } as WorkerResponse);
    }
}

function ensureInitialized(): void {
    if (!wasm) {
        throw new Error("Worker not initialized. Call init first.");
    }
}

function respond(response: WorkerResponse, transfer?: Transferable[]): void {
    const message = currentRequestId !== undefined ? { ...response, _id: currentRequestId } : response;
    if (transfer) {
        (self as unknown as Worker).postMessage(message, transfer);
    } else {
        self.postMessage(message);
    }
}
