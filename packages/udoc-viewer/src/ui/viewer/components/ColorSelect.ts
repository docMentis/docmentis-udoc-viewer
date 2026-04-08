/**
 * Reusable color select component with a trigger button and floating panel.
 * Supports "stroke" variant (outlined rings) and "fill" variant (solid discs).
 */

const COLOR_PRESETS: { hex: string; name: string }[] = [
    { hex: "#ff0000", name: "Red" },
    { hex: "#ff8800", name: "Orange" },
    { hex: "#ffcc00", name: "Yellow" },
    { hex: "#00cc00", name: "Green" },
    { hex: "#0088ff", name: "Blue" },
    { hex: "#8800ff", name: "Purple" },
    { hex: "#000000", name: "Black" },
    { hex: "#ffffff", name: "White" },
];

export interface ColorSelectConfig {
    variant: "stroke" | "fill";
    label: string;
    noneLabel: string;
    onChange: (color: string | null) => void;
    /** Called when a color is selected (to close external panel state, etc.) */
    onSelect?: () => void;
}

export interface ColorSelectInstance {
    /** Trigger button — place in the subtoolbar */
    el: HTMLButtonElement;
    /** Floating panel — mount to subtoolbar-slot container */
    panel: HTMLElement;
    /** Update displayed color without firing onChange */
    update(color: string | null): void;
    open(anchorRect: DOMRect, containerRect: DOMRect): void;
    close(): void;
    isOpen(): boolean;
    destroy(): void;
}

export function createColorSelect(config: ColorSelectConfig): ColorSelectInstance {
    let currentColor: string | null = null;

    // ---- Trigger button ----
    const el = document.createElement("button");
    el.className = "udoc-subtoolbar__dropdown-trigger";
    el.title = config.label;

    const swatch = document.createElement("span");
    swatch.className = "udoc-subtoolbar__color-swatch";
    const arrow = document.createElement("span");
    arrow.className = "udoc-subtoolbar__dropdown-arrow";
    arrow.textContent = "\u25BE";
    el.append(swatch, arrow);

    // ---- Floating panel ----
    const panel = document.createElement("div");
    panel.className = "udoc-color-panel";
    panel.addEventListener("click", (e) => e.stopPropagation());

    // ---- Update trigger swatch ----

    function updateSwatch(color: string | null): void {
        swatch.classList.remove(
            "udoc-subtoolbar__color-swatch--stroke",
            "udoc-subtoolbar__color-swatch--stroke-none",
            "udoc-subtoolbar__color-swatch--fill",
            "udoc-subtoolbar__color-swatch--fill-none",
        );
        swatch.style.removeProperty("--swatch-color");

        if (config.variant === "stroke") {
            swatch.classList.add("udoc-subtoolbar__color-swatch--stroke");
            if (color) swatch.style.setProperty("--swatch-color", color);
            else swatch.classList.add("udoc-subtoolbar__color-swatch--stroke-none");
        } else {
            swatch.classList.add("udoc-subtoolbar__color-swatch--fill");
            if (color) swatch.style.setProperty("--swatch-color", color);
            else swatch.classList.add("udoc-subtoolbar__color-swatch--fill-none");
        }

        el.setAttribute("aria-label", `${config.label} ${color ?? "none"}`);
    }

    // ---- Rebuild panel grid ----

    function rebuildPanel(color: string | null): void {
        panel.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "udoc-color-panel__grid";
        grid.classList.add(
            config.variant === "stroke" ? "udoc-color-panel__grid--stroke" : "udoc-color-panel__grid--fill",
        );

        // None option
        const noBtn = document.createElement("button");
        noBtn.className = "udoc-color-panel__swatch udoc-color-panel__swatch--none";
        noBtn.classList.add(
            config.variant === "stroke"
                ? "udoc-color-panel__swatch--none-stroke"
                : "udoc-color-panel__swatch--none-fill",
        );
        if (color === null) noBtn.classList.add("udoc-color-panel__swatch--active");
        noBtn.title = config.noneLabel;
        noBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            config.onSelect?.();
            config.onChange(null);
        });
        grid.appendChild(noBtn);

        for (const preset of COLOR_PRESETS) {
            const sw = document.createElement("button");
            sw.className = "udoc-color-panel__swatch";
            if (color === preset.hex) sw.classList.add("udoc-color-panel__swatch--active");
            sw.style.setProperty("--swatch-color", preset.hex);
            sw.title = preset.name;
            sw.addEventListener("click", (e) => {
                e.stopPropagation();
                config.onSelect?.();
                config.onChange(preset.hex);
            });
            grid.appendChild(sw);
        }

        panel.appendChild(grid);
    }

    // ---- Public API ----

    function update(color: string | null): void {
        currentColor = color;
        updateSwatch(color);
        rebuildPanel(color);
    }

    function open(anchorRect: DOMRect, containerRect: DOMRect): void {
        panel.style.left = `${anchorRect.left - containerRect.left}px`;
        panel.classList.add("udoc-color-panel--open");
    }

    function close(): void {
        panel.classList.remove("udoc-color-panel--open");
    }

    function isOpen(): boolean {
        return panel.classList.contains("udoc-color-panel--open");
    }

    function destroy(): void {
        el.remove();
        panel.remove();
    }

    // Initial render
    updateSwatch(currentColor);
    rebuildPanel(currentColor);

    return { el, panel, update, open, close, isOpen, destroy };
}
