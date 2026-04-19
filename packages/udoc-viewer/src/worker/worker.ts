/**
 * Web Worker for UDoc document rendering.
 *
 * Handles WASM operations off the main thread to keep the UI responsive.
 */

import init, { Wasm, parseFontInfo } from "../wasm/udoc.js";
import type {
    LicenseResult,
    JsOutlineSection as OutlineSection,
    JsSplitByOutlineResult as SplitByOutlineResult,
    JsFontRegistration as FontEntry,
    JsAnnotation as Annotation,
    JsAnnotationsByPage as AnnotationsByPage,
    JsOutlineItem as OutlineItem,
    JsVisibilityGroup as VisibilityGroup,
    JsFontUsageEntry as FontUsageEntry,
    JsLayoutPage as LayoutPage,
    JsPageInfo as PageInfo,
    JsPageTransition as PageTransition,
    JsPageGroup as PageGroup,
    JsPageGroupLayout as PageGroupLayout,
} from "../wasm/udoc.js";

export type {
    LicenseResult,
    OutlineSection,
    SplitByOutlineResult,
    FontEntry,
    Annotation,
    AnnotationsByPage,
    OutlineItem,
    VisibilityGroup,
    FontUsageEntry,
    LayoutPage,
    PageInfo,
    PageTransition,
    PageGroup,
    PageGroupLayout,
};

let wasm: Wasm | null = null;
let wasmMemory: WebAssembly.Memory | null = null;
let gpuAvailable = false;

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
 * Extracted image info.
 * Uses Uint8Array (copied from WASM memory) for safe transfer across worker boundary.
 */
export interface ExtractedImage {
    name: string;
    format: string;
    width: number | undefined;
    height: number | undefined;
    data: Uint8Array;
}

/**
 * Extracted font info.
 * Uses Uint8Array (copied from WASM memory) for safe transfer across worker boundary.
 */
export interface ExtractedFont {
    name: string;
    fontType: string;
    extension: string;
    data: Uint8Array;
}

export type WorkerRequest =
    | { type: "init"; wasmUrl?: string; gpu?: boolean; domain: string; viewerVersion: string }
    | { type: "setupTelemetry"; distinctId: string }
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
    | { type: "getPageGroups"; documentId: string }
    | { type: "renderPage"; documentId: string; pageIndex: number; width: number; height: number }
    | { type: "getOutline"; documentId: string }
    | { type: "getPageAnnotations"; documentId: string; pageIndex: number }
    | { type: "getAllAnnotations"; documentId: string }
    | { type: "getLayoutPage"; documentId: string; pageIndex: number }
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
    | { type: "parseFontInfo"; data: Uint8Array }
    | { type: "getFontUsage"; documentId: string }
    | { type: "pdfSaveAnnotations"; documentId: string; annotationsByPage: AnnotationsByPage }
    | { type: "getWasmMemoryBytes" };

/**
 * Message types from worker to main thread.
 */
export type WorkerResponse =
    | { type: "init"; success: true }
    | { type: "init"; success: false; error: string }
    | { type: "setupTelemetry"; success: true }
    | { type: "setupTelemetry"; success: false; error: string }
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
    | {
          type: "getPageInfo";
          success: true;
          width: number;
          height: number;
          rotation: number;
          transition?: PageTransition;
      }
    | { type: "getPageInfo"; success: false; error: string }
    | { type: "getAllPageInfo"; success: true; pages: PageInfo[] }
    | { type: "getAllPageInfo"; success: false; error: string }
    | { type: "getPageGroups"; success: true; groups: PageGroup[] }
    | { type: "getPageGroups"; success: false; error: string }
    | { type: "renderPage"; success: true; rgba: Uint8Array; width: number; height: number }
    | { type: "renderPage"; success: false; error: string }
    | { type: "getOutline"; success: true; outline: OutlineItem[] }
    | { type: "getOutline"; success: false; error: string }
    | { type: "getPageAnnotations"; success: true; annotations: Annotation[] }
    | { type: "getPageAnnotations"; success: false; error: string }
    | { type: "getAllAnnotations"; success: true; annotations: AnnotationsByPage }
    | { type: "getAllAnnotations"; success: false; error: string }
    | { type: "getLayoutPage"; success: true; layout: LayoutPage }
    | { type: "getLayoutPage"; success: false; error: string }
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
    | { type: "getVisibilityGroups"; success: true; groups: VisibilityGroup[] }
    | { type: "getVisibilityGroups"; success: false; error: string }
    | { type: "setVisibilityGroupVisible"; success: true; updated: boolean }
    | { type: "setVisibilityGroupVisible"; success: false; error: string }
    | { type: "parseFontInfo"; success: true; info: { typeface: string; bold: boolean; italic: boolean } }
    | { type: "parseFontInfo"; success: false; error: string }
    | { type: "getFontUsage"; success: true; entries: FontUsageEntry[] }
    | { type: "getFontUsage"; success: false; error: string }
    | { type: "pdfSaveAnnotations"; success: true; bytes: Uint8Array }
    | { type: "pdfSaveAnnotations"; success: false; error: string }
    | { type: "getWasmMemoryBytes"; success: true; bytes: number }
    | { type: "getWasmMemoryBytes"; success: false; error: string };

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
                const exports = await init(request.wasmUrl ? { module_or_path: request.wasmUrl } : undefined);
                wasmMemory = (exports as { memory?: WebAssembly.Memory }).memory ?? null;
                wasm = new Wasm(request.domain, request.viewerVersion);
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

            case "setupTelemetry": {
                ensureInitialized();
                wasm!.setup_telemetry(request.distinctId);
                respond({ type: "setupTelemetry", success: true });
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
                const result = wasm!.set_license(request.license);
                respond({ type: "setLicense", success: true, result });
                break;
            }

            case "getLicenseStatus": {
                ensureInitialized();
                const result = wasm!.license_status();
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

            case "getPageGroups": {
                ensureInitialized();
                const groups = wasm!.page_groups(request.documentId);
                respond({ type: "getPageGroups", success: true, groups });
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
                const outline = wasm!.get_outline(request.documentId);
                respond({ type: "getOutline", success: true, outline });
                break;
            }

            case "getPageAnnotations": {
                ensureInitialized();
                const annotations = wasm!.get_page_annotations(request.documentId, request.pageIndex);
                respond({ type: "getPageAnnotations", success: true, annotations });
                break;
            }

            case "getLayoutPage": {
                ensureInitialized();
                const layout = wasm!.get_layout_page(request.documentId, request.pageIndex);
                respond({ type: "getLayoutPage", success: true, layout });
                break;
            }

            case "getAllAnnotations": {
                ensureInitialized();
                const annotations = wasm!.get_all_annotations(request.documentId);
                respond({ type: "getAllAnnotations", success: true, annotations });
                break;
            }

            case "pdfCompose": {
                ensureInitialized();
                const documentIds = wasm!.pdf_compose(
                    request.compositions.map((comp) =>
                        comp.map((pick) => ({ ...pick, rotation: pick.rotation ?? undefined })),
                    ),
                    request.docIds,
                );
                respond({ type: "pdfCompose", success: true, documentIds });
                break;
            }

            case "getBytes": {
                ensureInitialized();
                const bytes = wasm!.get_bytes(request.documentId);
                respond({ type: "getBytes", success: true, bytes }, [bytes.buffer]);
                break;
            }

            case "pdfSplitByOutline": {
                ensureInitialized();
                const result = wasm!.pdf_split_by_outline(request.documentId, request.maxLevel, request.splitMidPage);
                respond({ type: "pdfSplitByOutline", success: true, result });
                break;
            }

            case "pdfExtractImages": {
                ensureInitialized();
                const rawImages = wasm!.pdf_extract_images(request.documentId, request.convertRawToPng);
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
                const rawFonts = wasm!.pdf_extract_fonts(request.documentId);
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
                const compressedBytes = wasm!.pdf_compress(request.documentId);
                respond({ type: "pdfCompress", success: true, bytes: compressedBytes }, [compressedBytes.buffer]);
                break;
            }

            case "pdfDecompress": {
                ensureInitialized();
                const decompressedBytes = wasm!.pdf_decompress(request.documentId);
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
                const groups = wasm!.get_visibility_groups(request.documentId);
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
                const info = parseFontInfo(request.data);
                respond({ type: "parseFontInfo", success: true, info });
                break;
            }

            case "getFontUsage": {
                ensureInitialized();
                const entries = wasm!.get_font_usage(request.documentId);
                respond({ type: "getFontUsage", success: true, entries });
                break;
            }

            case "pdfSaveAnnotations": {
                ensureInitialized();
                const bytes = wasm!.pdf_save_annotations(request.documentId, request.annotationsByPage) as Uint8Array;
                respond({ type: "pdfSaveAnnotations", success: true, bytes }, [bytes.buffer]);
                break;
            }

            case "getWasmMemoryBytes": {
                respond({ type: "getWasmMemoryBytes", success: true, bytes: wasmMemory?.buffer.byteLength ?? 0 });
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
