/**
 * Print dialog component for selecting page range and quality.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import { trapFocus } from "../a11y";

export type PrintPageRange =
    | { kind: "all" }
    | { kind: "current" }
    | { kind: "fromTo"; from: number; to: number }
    | { kind: "custom"; pages: number[] };

export type PrintQuality = "draft" | "standard" | "high";

export interface PrintDialogResult {
    pageRange: PrintPageRange;
    quality: PrintQuality;
}

export interface PrintDialogCallbacks {
    onPrint: (result: PrintDialogResult) => void;
    onCancel: () => void;
}

/** Parse a page range string like "1,3,5-8,12" into an array of 1-based page numbers. */
function parsePageRange(input: string, maxPage: number): number[] | null {
    const pages = new Set<number>();
    const parts = input.split(",");
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const rangeParts = trimmed.split("-");
        if (rangeParts.length === 1) {
            const n = parseInt(rangeParts[0], 10);
            if (isNaN(n) || n < 1 || n > maxPage) return null;
            pages.add(n);
        } else if (rangeParts.length === 2) {
            const a = parseInt(rangeParts[0], 10);
            const b = parseInt(rangeParts[1], 10);
            if (isNaN(a) || isNaN(b) || a < 1 || b < 1 || a > maxPage || b > maxPage || a > b) return null;
            for (let i = a; i <= b; i++) pages.add(i);
        } else {
            return null;
        }
    }
    if (pages.size === 0) return null;
    return Array.from(pages).sort((a, b) => a - b);
}

export function createPrintDialog() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "udoc-print-overlay";
    overlay.style.display = "none";

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "udoc-print-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-labelledby", "udoc-print-title");
    dialog.setAttribute("aria-modal", "true");

    dialog.innerHTML = `
        <h2 id="udoc-print-title" class="udoc-print-title">Print</h2>

        <div class="udoc-print-section">
            <label class="udoc-print-section-label">Pages</label>
            <div class="udoc-print-radios">
                <label class="udoc-print-radio">
                    <input type="radio" name="udoc-print-range" value="all" checked>
                    <span>All pages</span>
                </label>
                <label class="udoc-print-radio">
                    <input type="radio" name="udoc-print-range" value="current">
                    <span>Current page (<span class="udoc-print-current-page">1</span>)</span>
                </label>
                <label class="udoc-print-radio">
                    <input type="radio" name="udoc-print-range" value="fromTo">
                    <span>Pages</span>
                    <input type="number" class="udoc-print-input udoc-print-from" min="1" value="1" disabled>
                    <span>to</span>
                    <input type="number" class="udoc-print-input udoc-print-to" min="1" value="1" disabled>
                </label>
                <label class="udoc-print-radio">
                    <input type="radio" name="udoc-print-range" value="custom">
                    <span>Custom</span>
                    <input type="text" class="udoc-print-input udoc-print-custom" placeholder="e.g. 1,3,5-8" disabled>
                </label>
            </div>
        </div>

        <div class="udoc-print-section">
            <label class="udoc-print-section-label" for="udoc-print-quality">Quality</label>
            <select id="udoc-print-quality" class="udoc-print-select">
                <option value="draft">Draft (150 DPI)</option>
                <option value="standard" selected>Standard (300 DPI)</option>
                <option value="high">High (600 DPI)</option>
            </select>
        </div>

        <p class="udoc-print-error" aria-live="polite"></p>

        <div class="udoc-print-actions">
            <button type="button" class="udoc-print-btn udoc-print-btn--cancel">Cancel</button>
            <button type="button" class="udoc-print-btn udoc-print-btn--print">Print</button>
        </div>
    `;

    overlay.appendChild(dialog);

    // Query elements
    const radios = dialog.querySelectorAll<HTMLInputElement>('input[name="udoc-print-range"]');
    const currentPageSpan = dialog.querySelector(".udoc-print-current-page") as HTMLSpanElement;
    const fromInput = dialog.querySelector(".udoc-print-from") as HTMLInputElement;
    const toInput = dialog.querySelector(".udoc-print-to") as HTMLInputElement;
    const customInput = dialog.querySelector(".udoc-print-custom") as HTMLInputElement;
    const qualitySelect = dialog.querySelector("#udoc-print-quality") as HTMLSelectElement;
    const errorEl = dialog.querySelector(".udoc-print-error") as HTMLParagraphElement;
    const cancelBtn = dialog.querySelector(".udoc-print-btn--cancel") as HTMLButtonElement;
    const printBtn = dialog.querySelector(".udoc-print-btn--print") as HTMLButtonElement;

    let callbacks: PrintDialogCallbacks | null = null;
    let unsubRender: (() => void) | null = null;
    let cleanupTrap: (() => void) | null = null;
    let previousFocus: HTMLElement | null = null;
    let pageCount = 1;

    function getSelectedRange(): string {
        for (const r of radios) {
            if (r.checked) return r.value;
        }
        return "all";
    }

    function updateInputStates(): void {
        const selected = getSelectedRange();
        fromInput.disabled = selected !== "fromTo";
        toInput.disabled = selected !== "fromTo";
        customInput.disabled = selected !== "custom";
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }

    // Wire radio change
    for (const r of radios) {
        r.addEventListener("change", updateInputStates);
    }

    // Auto-select radio when clicking into inputs
    fromInput.addEventListener("focus", () => {
        const radio = dialog.querySelector<HTMLInputElement>('input[value="fromTo"]');
        if (radio) radio.checked = true;
        updateInputStates();
    });
    toInput.addEventListener("focus", () => {
        const radio = dialog.querySelector<HTMLInputElement>('input[value="fromTo"]');
        if (radio) radio.checked = true;
        updateInputStates();
    });
    customInput.addEventListener("focus", () => {
        const radio = dialog.querySelector<HTMLInputElement>('input[value="custom"]');
        if (radio) radio.checked = true;
        updateInputStates();
    });

    function showError(msg: string): void {
        errorEl.textContent = msg;
        errorEl.style.display = "";
    }

    function handlePrint(): void {
        const selected = getSelectedRange();
        const quality = qualitySelect.value as PrintQuality;
        let pageRange: PrintPageRange;

        switch (selected) {
            case "all":
                pageRange = { kind: "all" };
                break;
            case "current":
                pageRange = { kind: "current" };
                break;
            case "fromTo": {
                const from = parseInt(fromInput.value, 10);
                const to = parseInt(toInput.value, 10);
                if (isNaN(from) || isNaN(to) || from < 1 || to < 1 || from > pageCount || to > pageCount) {
                    showError(`Please enter page numbers between 1 and ${pageCount}.`);
                    return;
                }
                if (from > to) {
                    showError("Start page must be less than or equal to end page.");
                    return;
                }
                pageRange = { kind: "fromTo", from, to };
                break;
            }
            case "custom": {
                const parsed = parsePageRange(customInput.value, pageCount);
                if (!parsed) {
                    showError(`Invalid range. Use format like "1,3,5-8". Pages must be between 1 and ${pageCount}.`);
                    return;
                }
                pageRange = { kind: "custom", pages: parsed };
                break;
            }
            default:
                pageRange = { kind: "all" };
        }

        callbacks?.onPrint({ pageRange, quality });
    }

    printBtn.addEventListener("click", handlePrint);
    cancelBtn.addEventListener("click", () => callbacks?.onCancel());

    // Close on overlay click (outside dialog)
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) callbacks?.onCancel();
    });

    // Close on Escape
    overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.stopPropagation();
            callbacks?.onCancel();
        }
    });

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, cb: PrintDialogCallbacks): void {
        container.appendChild(overlay);
        callbacks = cb;

        unsubRender = store.subscribeRender((prev, next) => {
            const wasVisible = prev.showPrintDialog;
            const isVisible = next.showPrintDialog;

            if (wasVisible !== isVisible) {
                overlay.style.display = isVisible ? "" : "none";
                if (isVisible) {
                    // Save focus to restore on close
                    previousFocus = document.activeElement as HTMLElement | null;
                    // Reset state
                    const allRadio = dialog.querySelector<HTMLInputElement>('input[value="all"]');
                    if (allRadio) allRadio.checked = true;
                    fromInput.value = "1";
                    toInput.value = String(next.pageCount);
                    customInput.value = "";
                    qualitySelect.value = "standard";
                    errorEl.textContent = "";
                    errorEl.style.display = "none";
                    updateInputStates();
                    // Focus the print button
                    setTimeout(() => printBtn.focus(), 0);
                    // Trap focus inside dialog
                    cleanupTrap = trapFocus(dialog);
                } else {
                    if (cleanupTrap) {
                        cleanupTrap();
                        cleanupTrap = null;
                    }
                    // Restore focus to the element that opened the dialog
                    if (previousFocus && previousFocus.focus) {
                        previousFocus.focus();
                        previousFocus = null;
                    }
                }
            }

            // Update current page display and max values
            if (prev.page !== next.page || prev.pageCount !== next.pageCount) {
                currentPageSpan.textContent = String(next.page);
                pageCount = next.pageCount;
                fromInput.max = String(next.pageCount);
                toInput.max = String(next.pageCount);
            }
        });

        // Set initial values from state
        const state = store.getState();
        currentPageSpan.textContent = String(state.page);
        pageCount = state.pageCount;
        fromInput.max = String(state.pageCount);
        toInput.max = String(state.pageCount);
        toInput.value = String(state.pageCount);
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        if (cleanupTrap) {
            cleanupTrap();
            cleanupTrap = null;
        }
        callbacks = null;
        previousFocus = null;
        overlay.remove();
    }

    return { el: overlay, mount, destroy };
}
