/**
 * Web Worker for UDoc document rendering.
 *
 * Handles WASM operations off the main thread to keep the UI responsive.
 */

import init, { UDoc } from "../wasm/udoc.js";

let udoc: UDoc | null = null;

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
 * Font descriptor for external font requirements.
 */
export interface FontDescriptor {
  typeface: string;
  bold: boolean;
  italic: boolean;
}

export type WorkerRequest =
  | { type: "init"; wasmUrl?: string }
  | { type: "setLicense"; license: string; domain: string }
  | { type: "getLicenseStatus" }
  | { type: "loadPdf"; id: string; bytes: Uint8Array }
  | { type: "loadImage"; id: string; bytes: Uint8Array }
  | { type: "loadPptx"; id: string; bytes: Uint8Array }
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
  | { type: "getRequiredFonts"; documentId: string }
  | { type: "registerFont"; documentId: string; typeface: string; bold: boolean; italic: boolean; bytes: Uint8Array }
  | { type: "hasRegisteredFont"; documentId: string; typeface: string; bold: boolean; italic: boolean }
  | { type: "registeredFontCount"; documentId: string }
  | { type: "enableGoogleFonts"; documentId: string };

/**
 * Message types from worker to main thread.
 */
export type WorkerResponse =
  | { type: "init"; success: true }
  | { type: "init"; success: false; error: string }
  | { type: "setLicense"; success: true; result: LicenseResult }
  | { type: "setLicense"; success: false; error: string }
  | { type: "getLicenseStatus"; success: true; result: LicenseResult }
  | { type: "getLicenseStatus"; success: false; error: string }
  | { type: "loadPdf"; success: true; documentId: string }
  | { type: "loadPdf"; success: false; error: string }
  | { type: "loadImage"; success: true; documentId: string }
  | { type: "loadImage"; success: false; error: string }
  | { type: "loadPptx"; success: true; documentId: string }
  | { type: "loadPptx"; success: false; error: string }
  | { type: "unloadPdf"; success: true; removed: boolean }
  | { type: "unloadPdf"; success: false; error: string }
  | { type: "needsPassword"; success: true; needsPassword: boolean }
  | { type: "needsPassword"; success: false; error: string }
  | { type: "authenticate"; success: true; authenticated: boolean }
  | { type: "authenticate"; success: false; error: string }
  | { type: "getPageCount"; success: true; pageCount: number }
  | { type: "getPageCount"; success: false; error: string }
  | { type: "getPageInfo"; success: true; width: number; height: number; rotation: number }
  | { type: "getPageInfo"; success: false; error: string }
  | { type: "getAllPageInfo"; success: true; pages: Array<{ width: number; height: number; rotation: number }> }
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
  | { type: "getRequiredFonts"; success: true; fonts: FontDescriptor[] }
  | { type: "getRequiredFonts"; success: false; error: string }
  | { type: "registerFont"; success: true }
  | { type: "registerFont"; success: false; error: string }
  | { type: "hasRegisteredFont"; success: true; hasFont: boolean }
  | { type: "hasRegisteredFont"; success: false; error: string }
  | { type: "registeredFontCount"; success: true; count: number }
  | { type: "registeredFontCount"; success: false; error: string }
  | { type: "enableGoogleFonts"; success: true }
  | { type: "enableGoogleFonts"; success: false; error: string };

/** Current request ID for response matching. */
let currentRequestId: number | undefined;

/**
 * Handle incoming messages from main thread.
 */
self.onmessage = async (event: MessageEvent<WorkerRequest & { _id?: number }>) => {
  const { _id, ...request } = event.data;
  currentRequestId = _id;

  try {
    switch (request.type) {
      case "init": {
        await init(request.wasmUrl);
        udoc = new UDoc();
        respond({ type: "init", success: true });
        break;
      }

      case "setLicense": {
        ensureInitialized();
        const result = udoc!.set_license(request.license, request.domain) as LicenseResult;
        respond({ type: "setLicense", success: true, result });
        break;
      }

      case "getLicenseStatus": {
        ensureInitialized();
        const result = udoc!.license_status() as LicenseResult;
        respond({ type: "getLicenseStatus", success: true, result });
        break;
      }

      case "loadPdf": {
        ensureInitialized();
        const documentId = udoc!.load_pdf(request.bytes);
        respond({ type: "loadPdf", success: true, documentId });
        break;
      }

      case "loadImage": {
        ensureInitialized();
        const documentId = udoc!.load_image(request.bytes);
        respond({ type: "loadImage", success: true, documentId });
        break;
      }

      case "loadPptx": {
        ensureInitialized();
        const documentId = udoc!.load_pptx(request.bytes);
        respond({ type: "loadPptx", success: true, documentId });
        break;
      }

      case "unloadPdf": {
        ensureInitialized();
        const removed = udoc!.remove_document(request.documentId);
        respond({ type: "unloadPdf", success: true, removed });
        break;
      }

      case "needsPassword": {
        ensureInitialized();
        const needsPassword = udoc!.needs_password(request.documentId);
        respond({ type: "needsPassword", success: true, needsPassword });
        break;
      }

      case "authenticate": {
        ensureInitialized();
        const authenticated = udoc!.authenticate(request.documentId, request.password);
        respond({ type: "authenticate", success: true, authenticated });
        break;
      }

      case "getPageCount": {
        ensureInitialized();
        const pageCount = udoc!.page_count(request.documentId);
        respond({ type: "getPageCount", success: true, pageCount });
        break;
      }

      case "getPageInfo": {
        ensureInitialized();
        const info = udoc!.page_info(request.documentId, request.pageIndex) as { width: number; height: number; rotation: number };
        respond({ type: "getPageInfo", success: true, width: info.width, height: info.height, rotation: info.rotation });
        break;
      }

      case "getAllPageInfo": {
        ensureInitialized();
        const pages = udoc!.all_page_info(request.documentId) as Array<{ width: number; height: number; rotation: number }>;
        respond({ type: "getAllPageInfo", success: true, pages });
        break;
      }

      case "getPageLayout": {
        ensureInitialized();
        const layout = udoc!.page_layout(request.documentId);
        respond({ type: "getPageLayout", success: true, layout });
        break;
      }

      case "renderPage": {
        ensureInitialized();
        const rgba = udoc!.render_page_to_rgba(
          request.documentId,
          request.pageIndex,
          request.width,
          request.height
        );
        respond(
          { type: "renderPage", success: true, rgba, width: request.width, height: request.height },
          [rgba.buffer]
        );
        break;
      }

      case "getOutline": {
        ensureInitialized();
        const outline = udoc!.get_outline(request.documentId) as unknown[];
        respond({ type: "getOutline", success: true, outline });
        break;
      }

      case "getPageAnnotations": {
        ensureInitialized();
        const annotations = udoc!.get_page_annotations(request.documentId, request.pageIndex) as unknown[];
        respond({ type: "getPageAnnotations", success: true, annotations });
        break;
      }

      case "getPageText": {
        ensureInitialized();
        const text = udoc!.get_page_text(request.documentId, request.pageIndex) as unknown[];
        respond({ type: "getPageText", success: true, text });
        break;
      }

      case "getAllAnnotations": {
        ensureInitialized();
        const annotations = udoc!.get_all_annotations(request.documentId) as Record<string, unknown[]>;
        respond({ type: "getAllAnnotations", success: true, annotations });
        break;
      }

      case "pdfCompose": {
        ensureInitialized();
        const documentIds = udoc!.pdf_compose(request.compositions, request.docIds) as string[];
        respond({ type: "pdfCompose", success: true, documentIds });
        break;
      }

      case "getBytes": {
        ensureInitialized();
        const bytes = udoc!.get_bytes(request.documentId) as Uint8Array;
        respond({ type: "getBytes", success: true, bytes }, [bytes.buffer]);
        break;
      }

      case "pdfSplitByOutline": {
        ensureInitialized();
        const result = udoc!.pdf_split_by_outline(request.documentId, request.maxLevel, request.splitMidPage) as SplitByOutlineResult;
        respond({ type: "pdfSplitByOutline", success: true, result });
        break;
      }

      case "pdfExtractImages": {
        ensureInitialized();
        const rawImages = udoc!.pdf_extract_images(request.documentId, request.convertRawToPng) as ExtractedImage[];
        // Copy Uint8Array data to ensure proper transfer across worker boundary
        // (WASM memory views don't survive structured clone when nested in objects)
        const images = rawImages.map(img => ({
          ...img,
          data: new Uint8Array(img.data)
        }));
        const transfers = images.map(img => img.data.buffer);
        respond({ type: "pdfExtractImages", success: true, images }, transfers);
        break;
      }

      case "pdfExtractFonts": {
        ensureInitialized();
        const rawFonts = udoc!.pdf_extract_fonts(request.documentId) as ExtractedFont[];
        // Copy Uint8Array data to ensure proper transfer across worker boundary
        // (WASM memory views don't survive structured clone when nested in objects)
        const fonts = rawFonts.map(font => ({
          ...font,
          data: new Uint8Array(font.data)
        }));
        const transfers = fonts.map(font => font.data.buffer);
        respond({ type: "pdfExtractFonts", success: true, fonts }, transfers);
        break;
      }

      case "pdfCompress": {
        ensureInitialized();
        const compressedBytes = udoc!.pdf_compress(request.documentId) as Uint8Array;
        respond({ type: "pdfCompress", success: true, bytes: compressedBytes }, [compressedBytes.buffer]);
        break;
      }

      case "pdfDecompress": {
        ensureInitialized();
        const decompressedBytes = udoc!.pdf_decompress(request.documentId) as Uint8Array;
        respond({ type: "pdfDecompress", success: true, bytes: decompressedBytes }, [decompressedBytes.buffer]);
        break;
      }

      case "getRequiredFonts": {
        ensureInitialized();
        const fonts = udoc!.getRequiredFonts(request.documentId) as FontDescriptor[];
        respond({ type: "getRequiredFonts", success: true, fonts });
        break;
      }

      case "registerFont": {
        ensureInitialized();
        udoc!.registerFont(request.documentId, request.typeface, request.bold, request.italic, request.bytes);
        respond({ type: "registerFont", success: true });
        break;
      }

      case "hasRegisteredFont": {
        ensureInitialized();
        const hasFont = udoc!.hasRegisteredFont(request.documentId, request.typeface, request.bold, request.italic);
        respond({ type: "hasRegisteredFont", success: true, hasFont });
        break;
      }

      case "registeredFontCount": {
        ensureInitialized();
        const count = udoc!.registeredFontCount(request.documentId);
        respond({ type: "registeredFontCount", success: true, count });
        break;
      }

      case "enableGoogleFonts": {
        ensureInitialized();
        udoc!.enableGoogleFonts(request.documentId);
        respond({ type: "enableGoogleFonts", success: true });
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
};

function ensureInitialized(): void {
  if (!udoc) {
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
