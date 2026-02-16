/**
 * Loading overlay component with progress bar for document download.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";

export function createLoadingOverlay() {
    // Create overlay container
    const overlay = document.createElement("div");
    overlay.className = "udoc-loading-overlay";
    overlay.style.display = "none";

    // Create content container
    const content = document.createElement("div");
    content.className = "udoc-loading-content";

    // Create spinner
    const spinner = document.createElement("div");
    spinner.className = "udoc-loading-spinner";
    spinner.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
        </svg>
    `;

    // Create progress container
    const progressContainer = document.createElement("div");
    progressContainer.className = "udoc-loading-progress-container";

    // Create progress bar track
    const progressTrack = document.createElement("div");
    progressTrack.className = "udoc-loading-progress-track";

    // Create progress bar fill
    const progressFill = document.createElement("div");
    progressFill.className = "udoc-loading-progress-fill";

    progressTrack.appendChild(progressFill);
    progressContainer.appendChild(progressTrack);

    // Create progress text
    const progressText = document.createElement("div");
    progressText.className = "udoc-loading-progress-text";
    progressText.textContent = "Loading...";

    content.append(spinner, progressContainer, progressText);
    overlay.appendChild(content);

    let unsubRender: (() => void) | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    const SHOW_DELAY_MS = 300;

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(overlay);

        unsubRender = store.subscribeRender((prev, next) => {
            // Show/hide overlay (with delay before showing)
            const wasVisible = prev.isDownloading;
            const isVisible = next.isDownloading;

            if (wasVisible !== isVisible) {
                if (isVisible) {
                    showTimer = setTimeout(() => {
                        overlay.style.display = "flex";
                        showTimer = null;
                    }, SHOW_DELAY_MS);
                } else {
                    if (showTimer !== null) {
                        clearTimeout(showTimer);
                        showTimer = null;
                    }
                    overlay.style.display = "none";
                }
            }

            // Update progress
            if (next.isDownloading) {
                const { downloadLoaded, downloadTotal } = next;

                if (downloadLoaded === 0 && downloadTotal === 0) {
                    // Connecting state - show only spinner, hide progress bar
                    progressContainer.style.display = "none";
                    progressText.textContent = "Connecting...";
                } else if (downloadTotal > 0) {
                    // Known total - show determinate progress
                    progressContainer.style.display = "";
                    const percent = Math.round((downloadLoaded / downloadTotal) * 100);
                    progressFill.style.width = `${percent}%`;
                    progressFill.classList.remove("udoc-loading-progress-fill--indeterminate");

                    // Format size display
                    const loadedMB = (downloadLoaded / (1024 * 1024)).toFixed(1);
                    const totalMB = (downloadTotal / (1024 * 1024)).toFixed(1);
                    progressText.textContent = `${loadedMB} / ${totalMB} MB (${percent}%)`;
                } else {
                    // Unknown total but data is flowing - show indeterminate progress
                    progressContainer.style.display = "";
                    progressFill.style.width = "30%";
                    progressFill.classList.add("udoc-loading-progress-fill--indeterminate");

                    const loadedMB = (downloadLoaded / (1024 * 1024)).toFixed(1);
                    progressText.textContent = `${loadedMB} MB loaded...`;
                }
            }
        });
    }

    function destroy(): void {
        if (showTimer !== null) {
            clearTimeout(showTimer);
            showTimer = null;
        }
        if (unsubRender) {
            unsubRender();
            unsubRender = null;
        }
        overlay.remove();
    }

    return { el: overlay, mount, destroy };
}
