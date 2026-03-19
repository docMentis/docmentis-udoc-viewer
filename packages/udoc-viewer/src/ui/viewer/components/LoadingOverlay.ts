/**
 * Loading overlay component with progress bar for document download.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";

export function createLoadingOverlay(showAttribution = true) {
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

    // Attribution logo shown below progress during loading
    let attribution: HTMLAnchorElement | null = null;
    if (showAttribution) {
        attribution = document.createElement("a");
        attribution.className = "udoc-loading-attribution";
        attribution.href = "https://docmentis.com";
        attribution.target = "_blank";
        attribution.rel = "noopener";
        attribution.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.4 11.2 247.3 39.4" width="124" height="20"><path d="M13.92 48.58L13.92 48.58Q10.61 48.58 7.99 46.94Q5.38 45.31 3.89 42.43Q2.40 39.55 2.40 35.95L2.40 35.95Q2.40 32.26 3.91 29.40Q5.42 26.54 8.09 24.89Q10.75 23.23 14.06 23.23L14.06 23.23Q16.66 23.23 18.62 24.19Q20.59 25.15 21.79 26.93L21.79 26.93L21.79 13.44L28.27 13.44L28.27 48L22.51 48L21.79 44.69L21.79 44.69Q21.07 45.70 19.99 46.61Q18.91 47.52 17.42 48.05Q15.94 48.58 13.92 48.58ZM15.46 42.91L15.46 42.91Q17.38 42.91 18.84 42.02Q20.30 41.14 21.12 39.55Q21.94 37.97 21.94 35.90L21.94 35.90Q21.94 33.84 21.12 32.26Q20.30 30.67 18.84 29.78Q17.38 28.90 15.46 28.90L15.46 28.90Q13.63 28.90 12.14 29.78Q10.66 30.67 9.82 32.26Q8.98 33.84 8.98 35.86L8.98 35.86Q8.98 37.97 9.82 39.55Q10.66 41.14 12.12 42.02Q13.58 42.91 15.46 42.91ZM46.03 48.58L46.03 48.58Q42.58 48.58 39.82 46.97Q37.06 45.36 35.45 42.50Q33.84 39.65 33.84 35.95L33.84 35.95Q33.84 32.16 35.45 29.30Q37.06 26.45 39.84 24.84Q42.62 23.23 46.08 23.23L46.08 23.23Q49.58 23.23 52.34 24.84Q55.10 26.45 56.71 29.30Q58.32 32.16 58.32 35.90L58.32 35.90Q58.32 39.65 56.71 42.50Q55.10 45.36 52.32 46.97Q49.54 48.58 46.03 48.58ZM46.03 42.96L46.03 42.96Q47.66 42.96 48.94 42.19Q50.21 41.42 50.95 39.84Q51.70 38.26 51.70 35.90L51.70 35.90Q51.70 33.55 50.95 31.99Q50.21 30.43 48.94 29.64Q47.66 28.85 46.08 28.85L46.08 28.85Q44.54 28.85 43.25 29.64Q41.95 30.43 41.21 31.99Q40.46 33.55 40.46 35.90L40.46 35.90Q40.46 38.26 41.21 39.84Q41.95 41.42 43.22 42.19Q44.50 42.96 46.03 42.96ZM75.60 48.58L75.60 48.58Q71.95 48.58 69.12 46.94Q66.29 45.31 64.70 42.48Q63.12 39.65 63.12 36L63.12 36Q63.12 32.26 64.70 29.40Q66.29 26.54 69.12 24.89Q71.95 23.23 75.60 23.23L75.60 23.23Q80.26 23.23 83.42 25.68Q86.59 28.13 87.46 32.40L87.46 32.40L80.59 32.40Q80.16 30.72 78.79 29.76Q77.42 28.80 75.55 28.80L75.55 28.80Q73.87 28.80 72.55 29.64Q71.23 30.48 70.49 32.09Q69.74 33.70 69.74 35.90L69.74 35.90Q69.74 37.58 70.18 38.90Q70.61 40.22 71.38 41.16Q72.14 42.10 73.22 42.58Q74.30 43.06 75.55 43.06L75.55 43.06Q76.80 43.06 77.83 42.62Q78.86 42.19 79.58 41.40Q80.30 40.61 80.59 39.46L80.59 39.46L87.46 39.46Q86.59 43.63 83.40 46.10Q80.21 48.58 75.60 48.58Z" class="udoc-logo-doc"/><path d="M97.25 48L90.77 48L90.77 14.40L98.50 14.40L108.77 35.38L108.77 35.38L118.94 14.40L126.67 14.40L126.67 48L120.19 48L120.19 25.44L120.19 25.44L111.31 43.30L106.18 43.30L97.25 25.44L97.25 25.44L97.25 48ZM144.77 48.58L144.77 48.58Q141.12 48.58 138.31 47.02Q135.50 45.46 133.94 42.65Q132.38 39.84 132.38 36.14L132.38 36.14Q132.38 32.35 133.94 29.45Q135.50 26.54 138.29 24.89Q141.07 23.23 144.77 23.23L144.77 23.23Q148.37 23.23 151.06 24.82Q153.74 26.40 155.23 29.09Q156.72 31.78 156.72 35.18L156.72 35.18Q156.72 35.66 156.72 36.26Q156.72 36.86 156.62 37.49L156.62 37.49L136.99 37.49L136.99 33.55L150.19 33.55Q150.05 31.20 148.54 29.86Q147.02 28.51 144.77 28.51L144.77 28.51Q143.14 28.51 141.74 29.26Q140.35 30 139.56 31.54Q138.77 33.07 138.77 35.42L138.77 35.42L138.77 36.82Q138.77 38.78 139.51 40.25Q140.26 41.71 141.60 42.50Q142.94 43.30 144.72 43.30L144.72 43.30Q146.50 43.30 147.67 42.53Q148.85 41.76 149.42 40.56L149.42 40.56L156.05 40.56Q155.38 42.82 153.79 44.64Q152.21 46.46 149.90 47.52Q147.60 48.58 144.77 48.58ZM168.53 48L162.05 48L162.05 23.81L167.76 23.81L168.24 27.74L168.24 27.74Q169.34 25.73 171.38 24.48Q173.42 23.23 176.26 23.23L176.26 23.23Q179.28 23.23 181.34 24.48Q183.41 25.73 184.49 28.13Q185.57 30.53 185.57 34.03L185.57 34.03L185.57 48L179.14 48L179.14 34.66Q179.14 31.78 177.91 30.24Q176.69 28.70 174.14 28.70L174.14 28.70Q172.51 28.70 171.24 29.47Q169.97 30.24 169.25 31.66Q168.53 33.07 168.53 35.09L168.53 35.09L168.53 48ZM206.93 48L202.56 48Q200.02 48 198.12 47.21Q196.22 46.42 195.17 44.57Q194.11 42.72 194.11 39.50L194.11 39.50L194.11 29.23L189.98 29.23L189.98 23.81L194.11 23.81L194.83 17.23L200.59 17.23L200.59 23.81L206.98 23.81L206.98 29.23L200.59 29.23L200.59 39.60Q200.59 41.23 201.31 41.86Q202.03 42.48 203.76 42.48L203.76 42.48L206.93 42.48L206.93 48ZM219.07 48L212.59 48L212.59 23.81L219.07 23.81L219.07 48ZM215.86 20.50L215.86 20.50Q214.13 20.50 213.00 19.46Q211.87 18.43 211.87 16.85L211.87 16.85Q211.87 15.26 213.00 14.23Q214.13 13.20 215.86 13.20L215.86 13.20Q217.63 13.20 218.76 14.23Q219.89 15.26 219.89 16.85L219.89 16.85Q219.89 18.43 218.76 19.46Q217.63 20.50 215.86 20.50ZM235.49 48.58L235.49 48.58Q232.18 48.58 229.73 47.52Q227.28 46.46 225.89 44.59Q224.50 42.72 224.30 40.37L224.30 40.37L230.74 40.37Q230.98 41.28 231.55 42.02Q232.13 42.77 233.09 43.20Q234.05 43.63 235.39 43.63L235.39 43.63Q236.69 43.63 237.50 43.27Q238.32 42.91 238.73 42.29Q239.14 41.66 239.14 40.99L239.14 40.99Q239.14 39.98 238.56 39.43Q237.98 38.88 236.88 38.54Q235.78 38.21 234.19 37.87L234.19 37.87Q232.46 37.54 230.81 37.03Q229.15 36.53 227.86 35.76Q226.56 34.99 225.79 33.79Q225.02 32.59 225.02 30.82L225.02 30.82Q225.02 28.66 226.18 26.95Q227.33 25.25 229.54 24.24Q231.74 23.23 234.86 23.23L234.86 23.23Q239.23 23.23 241.78 25.20Q244.32 27.17 244.80 30.62L244.80 30.62L238.70 30.62Q238.42 29.52 237.43 28.87Q236.45 28.22 234.82 28.22L234.82 28.22Q233.09 28.22 232.18 28.85Q231.26 29.47 231.26 30.48L231.26 30.48Q231.26 31.15 231.86 31.68Q232.46 32.21 233.57 32.57Q234.67 32.93 236.26 33.26L236.26 33.26Q239.04 33.84 241.15 34.58Q243.26 35.33 244.46 36.70Q245.66 38.06 245.66 40.66L245.66 40.66Q245.66 42.96 244.42 44.76Q243.17 46.56 240.89 47.57Q238.61 48.58 235.49 48.58Z" class="udoc-logo-mentis"/></svg>`;
    }

    if (attribution) content.appendChild(attribution);
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
