/**
 * "Powered by docMentis" branding component.
 *
 * Hardened against host-page CSS injection that tries to suppress the mark:
 *
 *   - Visual content lives inside a closed shadow root, so external CSS
 *     (including `!important` rules) cannot select anything visible.
 *   - The light-DOM host wrapper carries a per-instance random class name,
 *     so attacker stylesheets cannot statically target it.
 *   - The literal docmentis.com URL is not rendered in any `href` attribute;
 *     a click handler decodes it from a base64 `data-h` attribute at runtime,
 *     defeating `a[href*="docmentis.com"]` selectors.
 *   - A MutationObserver re-inserts the host if it is removed from its parent.
 *   - For the persistent `viewport-corner` variant, a runtime visibility check
 *     (IntersectionObserver + ~2s setInterval inspection of getBoundingClientRect
 *     and getComputedStyle) trips a `udoc:branding-suppressed` CustomEvent and
 *     invokes the caller's onSuppressed hook so a watermark fallback can engage.
 *
 * Defense-in-depth, not silver bullets: a determined attacker with arbitrary
 * JS access to the page can still tamper. The shadow root blocks CSS attacks;
 * the visibility tripwire converts any successful suppression into a signal
 * that downstream code (e.g. a rasterized watermark) can react to.
 */

// Capture `attachShadow` and `getComputedStyle` at module evaluation time so
// later prototype patching by the host page does not affect us. Guarded for
// non-DOM environments (SSR/Node) where the module may be imported but
// `createBranding` will never be invoked.
const __attachShadow: typeof Element.prototype.attachShadow =
    typeof Element !== "undefined" ? Element.prototype.attachShadow : (undefined as never);
const __getComputedStyle: (typeof window)["getComputedStyle"] =
    typeof window !== "undefined" ? window.getComputedStyle.bind(window) : (undefined as never);

// "https://docmentis.com" — held base64 so `a[href*="docmentis.com"]` and
// text-scans of the bundle do not find it on the rendered element.
const ATTRIBUTION_URL_B64 = "aHR0cHM6Ly9kb2NtZW50aXMuY29t";

// SVG of the "docMentis" wordmark; used by the loading and spread variants.
// Inside the closed shadow root, stable class names are fine.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.4 11.2 247.3 39.4" width="124" height="20" aria-hidden="true"><path d="M13.92 48.58L13.92 48.58Q10.61 48.58 7.99 46.94Q5.38 45.31 3.89 42.43Q2.40 39.55 2.40 35.95L2.40 35.95Q2.40 32.26 3.91 29.40Q5.42 26.54 8.09 24.89Q10.75 23.23 14.06 23.23L14.06 23.23Q16.66 23.23 18.62 24.19Q20.59 25.15 21.79 26.93L21.79 26.93L21.79 13.44L28.27 13.44L28.27 48L22.51 48L21.79 44.69L21.79 44.69Q21.07 45.70 19.99 46.61Q18.91 47.52 17.42 48.05Q15.94 48.58 13.92 48.58ZM15.46 42.91L15.46 42.91Q17.38 42.91 18.84 42.02Q20.30 41.14 21.12 39.55Q21.94 37.97 21.94 35.90L21.94 35.90Q21.94 33.84 21.12 32.26Q20.30 30.67 18.84 29.78Q17.38 28.90 15.46 28.90L15.46 28.90Q13.63 28.90 12.14 29.78Q10.66 30.67 9.82 32.26Q8.98 33.84 8.98 35.86L8.98 35.86Q8.98 37.97 9.82 39.55Q10.66 41.14 12.12 42.02Q13.58 42.91 15.46 42.91ZM46.03 48.58L46.03 48.58Q42.58 48.58 39.82 46.97Q37.06 45.36 35.45 42.50Q33.84 39.65 33.84 35.95L33.84 35.95Q33.84 32.16 35.45 29.30Q37.06 26.45 39.84 24.84Q42.62 23.23 46.08 23.23L46.08 23.23Q49.58 23.23 52.34 24.84Q55.10 26.45 56.71 29.30Q58.32 32.16 58.32 35.90L58.32 35.90Q58.32 39.65 56.71 42.50Q55.10 45.36 52.32 46.97Q49.54 48.58 46.03 48.58ZM46.03 42.96L46.03 42.96Q47.66 42.96 48.94 42.19Q50.21 41.42 50.95 39.84Q51.70 38.26 51.70 35.90L51.70 35.90Q51.70 33.55 50.95 31.99Q50.21 30.43 48.94 29.64Q47.66 28.85 46.08 28.85L46.08 28.85Q44.54 28.85 43.25 29.64Q41.95 30.43 41.21 31.99Q40.46 33.55 40.46 35.90L40.46 35.90Q40.46 38.26 41.21 39.84Q41.95 41.42 43.22 42.19Q44.50 42.96 46.03 42.96ZM75.60 48.58L75.60 48.58Q71.95 48.58 69.12 46.94Q66.29 45.31 64.70 42.48Q63.12 39.65 63.12 36L63.12 36Q63.12 32.26 64.70 29.40Q66.29 26.54 69.12 24.89Q71.95 23.23 75.60 23.23L75.60 23.23Q80.26 23.23 83.42 25.68Q86.59 28.13 87.46 32.40L87.46 32.40L80.59 32.40Q80.16 30.72 78.79 29.76Q77.42 28.80 75.55 28.80L75.55 28.80Q73.87 28.80 72.55 29.64Q71.23 30.48 70.49 32.09Q69.74 33.70 69.74 35.90L69.74 35.90Q69.74 37.58 70.18 38.90Q70.61 40.22 71.38 41.16Q72.14 42.10 73.22 42.58Q74.30 43.06 75.55 43.06L75.55 43.06Q76.80 43.06 77.83 42.62Q78.86 42.19 79.58 41.40Q80.30 40.61 80.59 39.46L80.59 39.46L87.46 39.46Q86.59 43.63 83.40 46.10Q80.21 48.58 75.60 48.58Z" class="logo-doc"/><path d="M97.25 48L90.77 48L90.77 14.40L98.50 14.40L108.77 35.38L108.77 35.38L118.94 14.40L126.67 14.40L126.67 48L120.19 48L120.19 25.44L120.19 25.44L111.31 43.30L106.18 43.30L97.25 25.44L97.25 25.44L97.25 48ZM144.77 48.58L144.77 48.58Q141.12 48.58 138.31 47.02Q135.50 45.46 133.94 42.65Q132.38 39.84 132.38 36.14L132.38 36.14Q132.38 32.35 133.94 29.45Q135.50 26.54 138.29 24.89Q141.07 23.23 144.77 23.23L144.77 23.23Q148.37 23.23 151.06 24.82Q153.74 26.40 155.23 29.09Q156.72 31.78 156.72 35.18L156.72 35.18Q156.72 35.66 156.72 36.26Q156.72 36.86 156.62 37.49L156.62 37.49L136.99 37.49L136.99 33.55L150.19 33.55Q150.05 31.20 148.54 29.86Q147.02 28.51 144.77 28.51L144.77 28.51Q143.14 28.51 141.74 29.26Q140.35 30 139.56 31.54Q138.77 33.07 138.77 35.42L138.77 35.42L138.77 36.82Q138.77 38.78 139.51 40.25Q140.26 41.71 141.60 42.50Q142.94 43.30 144.72 43.30L144.72 43.30Q146.50 43.30 147.67 42.53Q148.85 41.76 149.42 40.56L149.42 40.56L156.05 40.56Q155.38 42.82 153.79 44.64Q152.21 46.46 149.90 47.52Q147.60 48.58 144.77 48.58ZM168.53 48L162.05 48L162.05 23.81L167.76 23.81L168.24 27.74L168.24 27.74Q169.34 25.73 171.38 24.48Q173.42 23.23 176.26 23.23L176.26 23.23Q179.28 23.23 181.34 24.48Q183.41 25.73 184.49 28.13Q185.57 30.53 185.57 34.03L185.57 34.03L185.57 48L179.14 48L179.14 34.66Q179.14 31.78 177.91 30.24Q176.69 28.70 174.14 28.70L174.14 28.70Q172.51 28.70 171.24 29.47Q169.97 30.24 169.25 31.66Q168.53 33.07 168.53 35.09L168.53 35.09L168.53 48ZM206.93 48L202.56 48Q200.02 48 198.12 47.21Q196.22 46.42 195.17 44.57Q194.11 42.72 194.11 39.50L194.11 39.50L194.11 29.23L189.98 29.23L189.98 23.81L194.11 23.81L194.83 17.23L200.59 17.23L200.59 23.81L206.98 23.81L206.98 29.23L200.59 29.23L200.59 39.60Q200.59 41.23 201.31 41.86Q202.03 42.48 203.76 42.48L203.76 42.48L206.93 42.48L206.93 48ZM219.07 48L212.59 48L212.59 23.81L219.07 23.81L219.07 48ZM215.86 20.50L215.86 20.50Q214.13 20.50 213.00 19.46Q211.87 18.43 211.87 16.85L211.87 16.85Q211.87 15.26 213.00 14.23Q214.13 13.20 215.86 13.20L215.86 13.20Q217.63 13.20 218.76 14.23Q219.89 15.26 219.89 16.85L219.89 16.85Q219.89 18.43 218.76 19.46Q217.63 20.50 215.86 20.50ZM235.49 48.58L235.49 48.58Q232.18 48.58 229.73 47.52Q227.28 46.46 225.89 44.59Q224.50 42.72 224.30 40.37L224.30 40.37L230.74 40.37Q230.98 41.28 231.55 42.02Q232.13 42.77 233.09 43.20Q234.05 43.63 235.39 43.63L235.39 43.63Q236.69 43.63 237.50 43.27Q238.32 42.91 238.73 42.29Q239.14 41.66 239.14 40.99L239.14 40.99Q239.14 39.98 238.56 39.43Q237.98 38.88 236.88 38.54Q235.78 38.21 234.19 37.87L234.19 37.87Q232.46 37.54 230.81 37.03Q229.15 36.53 227.86 35.76Q226.56 34.99 225.79 33.79Q225.02 32.59 225.02 30.82L225.02 30.82Q225.02 28.66 226.18 26.95Q227.33 25.25 229.54 24.24Q231.74 23.23 234.86 23.23L234.86 23.23Q239.23 23.23 241.78 25.20Q244.32 27.17 244.80 30.62L244.80 30.62L238.70 30.62Q238.42 29.52 237.43 28.87Q236.45 28.22 234.82 28.22L234.82 28.22Q233.09 28.22 232.18 28.85Q231.26 29.47 231.26 30.48L231.26 30.48Q231.26 31.15 231.86 31.68Q232.46 32.21 233.57 32.57Q234.67 32.93 236.26 33.26L236.26 33.26Q239.04 33.84 241.15 34.58Q243.26 35.33 244.46 36.70Q245.66 38.06 245.66 40.66L245.66 40.66Q245.66 42.96 244.42 44.76Q243.17 46.56 240.89 47.57Q238.61 48.58 235.49 48.58Z" class="logo-mentis"/></svg>`;

const LIGHT_DOC_FILL = "#0f172a";
const LIGHT_MENTIS_FILL = "#4f46e5";
const DARK_DOC_FILL = "#e2e8f0";
const DARK_MENTIS_FILL = "#818cf8";

export type BrandingVariant =
    /** Persistent corner badge in the viewport. Tripwire-monitored. */
    | "viewport-corner"
    /** Block shown under the loading-overlay progress bar. */
    | "loading-block"
    /** Logo-only mark for the in-page "rendering" indicator (positioning and
     *  slot-state visibility are handled by the caller). */
    | "spread-indicator";

export interface BrandingOptions {
    variant: BrandingVariant;
    /** Invoked the first time suppression is detected. Only fires for variants
     * that run a visibility tripwire. */
    onSuppressed?: (detail: { reason: string }) => void;
}

export interface BrandingHandle {
    /** Light-DOM host element to append where the branding should appear. */
    el: HTMLElement;
    /** Call after the host is in the document to start protection. */
    start(): void;
    /** Stop observers/intervals and remove the host. */
    destroy(): void;
}

const SUPPRESSED_EVENT = "udoc:branding-suppressed";
const TRIPWIRE_INTERVAL_MS = 2000;
// Thresholds for "this is too small / faded to count as visible".
const MIN_VISIBLE_OPACITY = 0.05;
const MIN_VISIBLE_WIDTH_PX = 24;
const MIN_VISIBLE_HEIGHT_PX = 8;

export function createBranding(opts: BrandingOptions): BrandingHandle {
    // Per-instance random class — defeats static `.<known-name> { display: none }`
    // attacks against the light-DOM wrapper.
    const hostClass = "_b" + Math.random().toString(36).slice(2, 11);

    const host = document.createElement("div");
    host.className = hostClass;

    const shadow = __attachShadow.call(host, { mode: "closed" });
    const style = document.createElement("style");
    style.textContent = buildShadowCss(opts.variant);
    shadow.appendChild(style);

    // The visible link: a <button role="link"> rather than <a href> so that
    // `a[href*="docmentis.com"]` selectors find nothing even if the attacker
    // pierces the shadow boundary.
    const link = document.createElement("button");
    link.type = "button";
    link.className = "link";
    link.setAttribute("role", "link");
    link.setAttribute("aria-label", "Powered by docMentis");
    link.setAttribute("part", "link");
    link.dataset.h = ATTRIBUTION_URL_B64;
    link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const url = atob(link.dataset.h ?? "");
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            // ignore decode failures
        }
    });

    if (opts.variant === "viewport-corner") {
        // Compact "Powered by docMentis" text badge.
        link.innerHTML = `Powered by <span class="logo-doc">doc</span><span class="logo-mentis">Mentis</span>`;
        shadow.appendChild(link);
    } else if (opts.variant === "loading-block") {
        link.innerHTML = LOGO_SVG;
        shadow.appendChild(link);
    } else {
        // spread-indicator: logo-only, non-interactive. The caller wraps this
        // alongside a "Rendering..." label in its own indicator container.
        link.innerHTML = LOGO_SVG;
        link.setAttribute("tabindex", "-1");
        shadow.appendChild(link);
    }

    // ---- Light-DOM hardening on the host ----

    // Inline !important styles win against external !important rules (CSS spec).
    // We re-apply these whenever the host's style attribute is touched.
    function applyHostInlineStyles(): void {
        const decls: string[] = [
            "visibility: visible !important",
            "opacity: 1 !important",
            "clip: auto !important",
            "clip-path: none !important",
            "filter: none !important",
            "pointer-events: auto !important",
            // Variant-specific layout. Crucially these include !important `display`
            // so that an external `display: none !important` cannot collapse us.
        ];
        if (opts.variant === "viewport-corner") {
            decls.push(
                "display: inline-flex !important",
                "position: absolute !important",
                "right: 18px !important",
                "bottom: 4px !important",
                "z-index: 10 !important",
            );
        } else if (opts.variant === "loading-block") {
            decls.push("display: inline-flex !important", "margin-top: 12px !important");
        } else {
            // spread-indicator: the host has no positioning of its own; the
            // caller's wrapper handles placement and visibility.
            decls.push("display: inline-flex !important");
        }
        host.style.cssText = decls.join(";");
    }
    applyHostInlineStyles();

    // ---- Theme sync ----
    // Custom properties inside the shadow read theme colors. We mirror the
    // viewer's `udoc-viewer-dark` class onto a `data-dark` attribute on the
    // host so `:host([data-dark])` shadow rules can pick it up.
    let themeObserver: MutationObserver | null = null;
    function setupThemeSync(): void {
        const root = host.closest(".udoc-viewer-root");
        if (!root) return;
        const apply = () => {
            if (root.classList.contains("udoc-viewer-dark")) {
                host.setAttribute("data-dark", "");
            } else {
                host.removeAttribute("data-dark");
            }
        };
        apply();
        themeObserver = new MutationObserver(apply);
        themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });
    }

    // ---- Tamper restoration ----
    // Re-insert the host if the attacker (or our own re-render) removes it.
    // We deliberately do NOT observe attribute mutations on the host: doing so
    // creates a feedback loop because our own `style.cssText` writes count as
    // mutations. The closed shadow root blocks the CSS-injection attack we
    // care about, and the periodic tripwire check (viewport-corner only)
    // re-applies inline styles every 2s if anything has drifted.
    let parentRef: Node | null = null;
    let parentObserver: MutationObserver | null = null;
    function setupTamperProtection(): void {
        parentRef = host.parentNode;
        if (!parentRef) return;

        parentObserver = new MutationObserver(() => {
            if (parentRef && !parentRef.contains(host)) {
                parentRef.appendChild(host);
                applyHostInlineStyles();
            }
        });
        parentObserver.observe(parentRef, { childList: true });
    }

    // ---- Visibility tripwire ----
    let tripwireInterval: ReturnType<typeof setInterval> | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let suppressed = false;

    function trigger(reason: string): void {
        if (suppressed) return;
        suppressed = true;
        try {
            host.dispatchEvent(
                new CustomEvent(SUPPRESSED_EVENT, {
                    bubbles: true,
                    composed: true,
                    detail: { reason, variant: opts.variant },
                }),
            );
        } catch {
            // ignore
        }
        try {
            opts.onSuppressed?.({ reason });
        } catch {
            // ignore handler errors
        }
    }

    function checkVisibility(): void {
        if (suppressed) return;
        if (!host.isConnected) {
            trigger("host-disconnected");
            return;
        }
        // Reapply hardening before measuring so we don't flag transient drift.
        if (host.className !== hostClass) host.className = hostClass;
        applyHostInlineStyles();

        const cs = __getComputedStyle(host);
        const rect = host.getBoundingClientRect();

        if (cs.display === "none") return trigger("display:none");
        if (cs.visibility === "hidden" || cs.visibility === "collapse") return trigger(`visibility:${cs.visibility}`);
        if (parseFloat(cs.opacity) < MIN_VISIBLE_OPACITY) return trigger(`opacity:${cs.opacity}`);
        if (cs.clip !== "auto" && cs.clip !== "") return trigger(`clip:${cs.clip}`);
        if (cs.clipPath && cs.clipPath !== "none") return trigger(`clip-path:${cs.clipPath}`);
        if (rect.width < MIN_VISIBLE_WIDTH_PX) return trigger(`width:${rect.width}`);
        if (rect.height < MIN_VISIBLE_HEIGHT_PX) return trigger(`height:${rect.height}`);
        // font-size collapse hides the viewport-corner text badge specifically.
        if (opts.variant === "viewport-corner" && parseFloat(cs.fontSize) < 6)
            return trigger(`font-size:${cs.fontSize}`);
        // transform: scale(0) reduces the painted area to a point.
        if (cs.transform && cs.transform !== "none") {
            const m = cs.transform.match(/matrix\(([-0-9.,\s]+)\)/);
            if (m) {
                const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
                const a = parts[0];
                const d = parts[3];
                if (Math.abs(a) < 0.05 || Math.abs(d) < 0.05) return trigger(`transform:${cs.transform}`);
            }
        }
    }

    function setupTripwire(): void {
        if (opts.variant !== "viewport-corner") return;
        // Initial check after a frame so layout has settled.
        requestAnimationFrame(checkVisibility);
        tripwireInterval = setInterval(checkVisibility, TRIPWIRE_INTERVAL_MS);
        try {
            intersectionObserver = new IntersectionObserver(() => checkVisibility(), {
                threshold: [0, 0.01, 0.5, 1],
            });
            intersectionObserver.observe(host);
        } catch {
            // IntersectionObserver should be available in all supported browsers
            // (Chrome 51+, Firefox 55+, Safari 12.1+); ignore if not.
        }
    }

    function start(): void {
        setupThemeSync();
        setupTamperProtection();
        setupTripwire();
    }

    function destroy(): void {
        themeObserver?.disconnect();
        parentObserver?.disconnect();
        intersectionObserver?.disconnect();
        if (tripwireInterval !== null) clearInterval(tripwireInterval);
        host.remove();
    }

    return { el: host, start, destroy };
}

function buildShadowCss(variant: BrandingVariant): string {
    // Let font-family / line-height inherit naturally from the host page so
    // the branding visually matches the rest of the viewer (which also inherits).
    const common = `
        :host, :host * {
            box-sizing: border-box;
        }
        .link {
            all: unset;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: ${LIGHT_DOC_FILL};
            text-decoration: none;
        }
        :host([data-dark]) .link {
            color: ${DARK_DOC_FILL};
        }
        .logo-doc { fill: ${LIGHT_DOC_FILL}; }
        .logo-mentis { fill: ${LIGHT_MENTIS_FILL}; font-weight: 700; }
        :host([data-dark]) .logo-doc { fill: ${DARK_DOC_FILL}; }
        :host([data-dark]) .logo-mentis { fill: ${DARK_MENTIS_FILL}; }
    `;

    if (variant === "viewport-corner") {
        return `${common}
            .link {
                display: inline-block;
                padding: 2px 6px;
                opacity: 0.5;
                text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
                white-space: nowrap;
                transition: opacity 0.15s ease;
            }
            .link:hover, .link:focus-visible { opacity: 1.0; }
            :host([data-dark]) .link { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
            .logo-doc, .logo-mentis { font-weight: 700; }
            .logo-doc { color: ${LIGHT_DOC_FILL}; fill: ${LIGHT_DOC_FILL}; }
            .logo-mentis { color: ${LIGHT_MENTIS_FILL}; fill: ${LIGHT_MENTIS_FILL}; }
            :host([data-dark]) .logo-doc { color: ${DARK_DOC_FILL}; fill: ${DARK_DOC_FILL}; }
            :host([data-dark]) .logo-mentis { color: ${DARK_MENTIS_FILL}; fill: ${DARK_MENTIS_FILL}; }
        `;
    }
    if (variant === "loading-block") {
        return `${common}
            .link {
                display: inline-block;
                margin: 0;
                padding: 0;
            }
            svg {
                display: block;
                width: 124px;
                height: 20px;
            }
        `;
    }
    // spread-indicator (logo only)
    return `${common}
        .link {
            display: inline-block;
            cursor: default;
            pointer-events: none;
            padding: 0;
            margin: 0;
        }
        svg {
            display: block;
            width: 124px;
            height: 20px;
        }
    `;
}
