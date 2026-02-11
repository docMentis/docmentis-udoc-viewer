/**
 * Password dialog component for encrypted PDF documents.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";

export interface PasswordDialogCallbacks {
    onSubmit: (password: string) => void;
}

export function createPasswordDialog() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "udoc-password-overlay";

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "udoc-password-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-labelledby", "udoc-password-title");
    dialog.setAttribute("aria-modal", "true");

    // Dialog content
    dialog.innerHTML = `
        <div class="udoc-password-header">
            <svg class="udoc-password-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <h2 id="udoc-password-title" class="udoc-password-title">Password Required</h2>
        </div>
        <p class="udoc-password-message">This document is protected. Please enter the password to open it.</p>
        <form class="udoc-password-form">
            <div class="udoc-password-input-wrapper">
                <input
                    type="password"
                    class="udoc-password-input"
                    placeholder="Enter password"
                    autocomplete="off"
                    aria-label="Password"
                />
                <button type="button" class="udoc-password-toggle" aria-label="Show password">
                    <svg class="udoc-password-eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg class="udoc-password-eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                </button>
            </div>
            <p class="udoc-password-error" aria-live="polite"></p>
            <button type="submit" class="udoc-password-submit">
                <span class="udoc-password-submit-text">Unlock</span>
                <span class="udoc-password-submit-spinner" style="display:none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                </span>
            </button>
        </form>
    `;

    overlay.appendChild(dialog);

    // Get elements
    const form = dialog.querySelector(".udoc-password-form") as HTMLFormElement;
    const input = dialog.querySelector(".udoc-password-input") as HTMLInputElement;
    const toggleBtn = dialog.querySelector(".udoc-password-toggle") as HTMLButtonElement;
    const eyeOpen = dialog.querySelector(".udoc-password-eye-open") as SVGElement;
    const eyeClosed = dialog.querySelector(".udoc-password-eye-closed") as SVGElement;
    const errorEl = dialog.querySelector(".udoc-password-error") as HTMLParagraphElement;
    const submitBtn = dialog.querySelector(".udoc-password-submit") as HTMLButtonElement;
    const submitText = dialog.querySelector(".udoc-password-submit-text") as HTMLSpanElement;
    const submitSpinner = dialog.querySelector(".udoc-password-submit-spinner") as HTMLSpanElement;

    let callbacks: PasswordDialogCallbacks | null = null;
    let unsubRender: (() => void) | null = null;

    // Toggle password visibility
    toggleBtn.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        eyeOpen.style.display = isPassword ? "none" : "";
        eyeClosed.style.display = isPassword ? "" : "none";
        toggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });

    // Handle form submit
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const password = input.value;
        if (password && callbacks?.onSubmit) {
            callbacks.onSubmit(password);
        }
    });

    // Clear error when typing
    input.addEventListener("input", () => {
        if (errorEl.textContent) {
            errorEl.textContent = "";
            errorEl.style.display = "none";
        }
    });

    function mount(
        container: HTMLElement,
        store: Store<ViewerState, Action>,
        cb: PasswordDialogCallbacks
    ): void {
        container.appendChild(overlay);
        callbacks = cb;

        unsubRender = store.subscribeRender((prev, next) => {
            // Show/hide dialog based on needsPassword state
            const wasVisible = prev.needsPassword && prev.doc !== null;
            const isVisible = next.needsPassword && next.doc !== null;

            if (wasVisible !== isVisible) {
                overlay.style.display = isVisible ? "" : "none";
                if (isVisible) {
                    // Focus input when dialog appears
                    setTimeout(() => input.focus(), 0);
                    // Reset input
                    input.value = "";
                    input.type = "password";
                    eyeOpen.style.display = "";
                    eyeClosed.style.display = "none";
                }
            }

            // Update error message
            if (prev.passwordError !== next.passwordError) {
                errorEl.textContent = next.passwordError ?? "";
                errorEl.style.display = next.passwordError ? "" : "none";
            }

            // Update loading state
            if (prev.isAuthenticating !== next.isAuthenticating) {
                submitBtn.disabled = next.isAuthenticating;
                input.disabled = next.isAuthenticating;
                submitText.style.display = next.isAuthenticating ? "none" : "";
                submitSpinner.style.display = next.isAuthenticating ? "" : "none";
            }
        });

        // Check initial state
        const initialState = store.getState();
        const isVisible = initialState.needsPassword && initialState.doc !== null;
        overlay.style.display = isVisible ? "" : "none";
        errorEl.style.display = initialState.passwordError ? "" : "none";
        errorEl.textContent = initialState.passwordError ?? "";

        if (isVisible) {
            setTimeout(() => input.focus(), 0);
        }
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        callbacks = null;
        overlay.remove();
    }

    return { el: overlay, mount, destroy };
}
