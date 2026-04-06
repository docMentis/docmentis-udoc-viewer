import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import type { I18n } from "../i18n/index.js";
import type { ViewerState, ActiveTool, SubTool, ToolOptions } from "../state";
import { isToolSet, DEFAULT_TOOL_OPTIONS } from "../state";
import type { Action } from "../actions";
import {
    ICON_SUBTOOL_FREEHAND,
    ICON_SUBTOOL_LINE,
    ICON_SUBTOOL_ARROW,
    ICON_SUBTOOL_RECTANGLE,
    ICON_SUBTOOL_ELLIPSE,
    ICON_SUBTOOL_POLYGON,
    ICON_SUBTOOL_TEXTBOX,
    ICON_SUBTOOL_HIGHLIGHT,
    ICON_SUBTOOL_UNDERLINE,
    ICON_SUBTOOL_STRIKETHROUGH,
    ICON_SUBTOOL_SQUIGGLY,
} from "../icons";

interface SubToolDef {
    id: SubTool;
    icon: string;
    labelKey: string;
}

const ANNOTATE_SUB_TOOLS: SubToolDef[] = [
    { id: "freehand", icon: ICON_SUBTOOL_FREEHAND, labelKey: "tools.freehand" },
    { id: "line", icon: ICON_SUBTOOL_LINE, labelKey: "tools.line" },
    { id: "arrow", icon: ICON_SUBTOOL_ARROW, labelKey: "tools.arrow" },
    { id: "rectangle", icon: ICON_SUBTOOL_RECTANGLE, labelKey: "tools.rectangle" },
    { id: "ellipse", icon: ICON_SUBTOOL_ELLIPSE, labelKey: "tools.ellipse" },
    { id: "polygon", icon: ICON_SUBTOOL_POLYGON, labelKey: "tools.polygon" },
    { id: "textbox", icon: ICON_SUBTOOL_TEXTBOX, labelKey: "tools.textbox" },
];

const MARKUP_SUB_TOOLS: SubToolDef[] = [
    { id: "highlight", icon: ICON_SUBTOOL_HIGHLIGHT, labelKey: "tools.highlight" },
    { id: "underline", icon: ICON_SUBTOOL_UNDERLINE, labelKey: "tools.underline" },
    { id: "strikethrough", icon: ICON_SUBTOOL_STRIKETHROUGH, labelKey: "tools.strikethrough" },
    { id: "squiggly", icon: ICON_SUBTOOL_SQUIGGLY, labelKey: "tools.squiggly" },
];

const SUB_TOOLS_MAP: Record<string, SubToolDef[]> = {
    annotate: ANNOTATE_SUB_TOOLS,
    markup: MARKUP_SUB_TOOLS,
};

/** Which options each sub-tool supports */
const TOOL_OPTIONS_CONFIG: Record<string, Array<"strokeColor" | "fillColor" | "strokeWidth" | "opacity">> = {
    freehand: ["strokeColor", "strokeWidth", "opacity"],
    line: ["strokeColor", "strokeWidth", "opacity"],
    arrow: ["strokeColor", "strokeWidth", "opacity"],
    rectangle: ["strokeColor", "fillColor", "strokeWidth", "opacity"],
    ellipse: ["strokeColor", "fillColor", "strokeWidth", "opacity"],
    polygon: ["strokeColor", "fillColor", "strokeWidth", "opacity"],
    textbox: ["strokeColor", "opacity"],
    highlight: ["strokeColor", "opacity"],
    underline: ["strokeColor"],
    strikethrough: ["strokeColor"],
    squiggly: ["strokeColor"],
};

const STROKE_WIDTHS = [1, 2, 4, 8];

const COLOR_PRESETS = ["#ff0000", "#ff8800", "#ffcc00", "#00cc00", "#0088ff", "#8800ff", "#000000", "#ffffff"];

interface SubToolbarSlice {
    activeTool: ActiveTool;
    activeSubTool: SubTool | null;
    toolOptions: Record<string, ToolOptions>;
}

function selectSlice(state: ViewerState): SubToolbarSlice {
    return {
        activeTool: state.activeTool,
        activeSubTool: state.activeSubTool,
        toolOptions: state.toolOptions,
    };
}

function sliceEqual(a: SubToolbarSlice, b: SubToolbarSlice): boolean {
    return a.activeTool === b.activeTool && a.activeSubTool === b.activeSubTool && a.toolOptions === b.toolOptions;
}

export function createSubToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-subtoolbar";
    el.setAttribute("role", "toolbar");
    el.style.display = "none";

    // Left: sub-tool buttons
    const toolsSection = document.createElement("div");
    toolsSection.className = "udoc-subtoolbar__tools";

    // Divider
    const divider = document.createElement("div");
    divider.className = "udoc-subtoolbar__divider";

    // Right: options
    const optionsSection = document.createElement("div");
    optionsSection.className = "udoc-subtoolbar__options";

    el.append(toolsSection, divider, optionsSection);

    let unsubRender: (() => void) | null = null;
    const currentToolBtns: Map<string, HTMLButtonElement> = new Map();
    let currentToolSet: string | null = null;

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, i18n: I18n): void {
        container.appendChild(el);
        el.setAttribute("aria-label", i18n.t("tools.subtoolbar"));

        const applyState = (slice: SubToolbarSlice) => {
            const visible = isToolSet(slice.activeTool);
            el.style.display = visible ? "flex" : "none";

            if (!visible) return;

            const toolSet = slice.activeTool as string;
            const subTools = SUB_TOOLS_MAP[toolSet];
            if (!subTools) return;

            // Rebuild tool buttons if tool set changed
            if (currentToolSet !== toolSet) {
                currentToolSet = toolSet;
                toolsSection.innerHTML = "";
                currentToolBtns.clear();

                for (const def of subTools) {
                    const btn = document.createElement("button");
                    btn.className = "udoc-subtoolbar__btn";
                    btn.innerHTML = def.icon;
                    btn.title = i18n.t(def.labelKey as keyof typeof i18n.t);
                    btn.setAttribute("aria-label", i18n.t(def.labelKey as keyof typeof i18n.t));
                    btn.addEventListener("click", () => {
                        store.dispatch({ type: "SET_SUB_TOOL", subTool: def.id });
                    });
                    toolsSection.appendChild(btn);
                    currentToolBtns.set(def.id, btn);
                }
            }

            // Update active state on buttons
            for (const [id, btn] of currentToolBtns) {
                btn.classList.toggle("udoc-subtoolbar__btn--active", id === slice.activeSubTool);
            }

            // Build options for the active sub-tool
            buildOptions(slice, store, i18n);
        };

        applyState(selectSlice(store.getState()));

        unsubRender = subscribeSelector(store, selectSlice, applyState, {
            equality: sliceEqual,
        });
    }

    function buildOptions(slice: SubToolbarSlice, store: Store<ViewerState, Action>, i18n: I18n): void {
        optionsSection.innerHTML = "";
        if (!slice.activeSubTool) return;

        const supportedOptions = TOOL_OPTIONS_CONFIG[slice.activeSubTool];
        if (!supportedOptions || supportedOptions.length === 0) return;

        const opts = slice.toolOptions[slice.activeSubTool] ?? { ...DEFAULT_TOOL_OPTIONS };
        const subTool = slice.activeSubTool;

        for (const optKey of supportedOptions) {
            if (optKey === "strokeColor" || optKey === "fillColor") {
                const colorGroup = document.createElement("div");
                colorGroup.className = "udoc-subtoolbar__option-group";

                const label = document.createElement("span");
                label.className = "udoc-subtoolbar__option-label";
                label.textContent = i18n.t(optKey === "strokeColor" ? "tools.strokeColor" : "tools.fillColor");
                colorGroup.appendChild(label);

                const currentColor = optKey === "strokeColor" ? opts.strokeColor : opts.fillColor;

                for (const color of COLOR_PRESETS) {
                    const swatch = document.createElement("button");
                    swatch.className = "udoc-subtoolbar__color-swatch";
                    if (currentColor === color) {
                        swatch.classList.add("udoc-subtoolbar__color-swatch--active");
                    }
                    swatch.style.setProperty("--swatch-color", color);
                    swatch.title = color;
                    swatch.setAttribute(
                        "aria-label",
                        `${i18n.t(optKey === "strokeColor" ? "tools.strokeColor" : "tools.fillColor")} ${color}`,
                    );
                    swatch.addEventListener("click", () => {
                        store.dispatch({ type: "SET_TOOL_OPTION", subTool, key: optKey, value: color });
                    });
                    colorGroup.appendChild(swatch);
                }

                optionsSection.appendChild(colorGroup);
            } else if (optKey === "strokeWidth") {
                const widthGroup = document.createElement("div");
                widthGroup.className = "udoc-subtoolbar__option-group";

                const label = document.createElement("span");
                label.className = "udoc-subtoolbar__option-label";
                label.textContent = i18n.t("tools.strokeWidth");
                widthGroup.appendChild(label);

                for (const w of STROKE_WIDTHS) {
                    const btn = document.createElement("button");
                    btn.className = "udoc-subtoolbar__width-btn";
                    if (opts.strokeWidth === w) {
                        btn.classList.add("udoc-subtoolbar__width-btn--active");
                    }
                    // Visual indicator: a horizontal line of the given width
                    const line = document.createElement("span");
                    line.className = "udoc-subtoolbar__width-line";
                    line.style.height = `${w}px`;
                    btn.appendChild(line);
                    btn.title = `${w}px`;
                    btn.setAttribute("aria-label", `${i18n.t("tools.strokeWidth")} ${w}px`);
                    btn.addEventListener("click", () => {
                        store.dispatch({ type: "SET_TOOL_OPTION", subTool, key: "strokeWidth", value: w });
                    });
                    widthGroup.appendChild(btn);
                }

                optionsSection.appendChild(widthGroup);
            } else if (optKey === "opacity") {
                const opacityGroup = document.createElement("div");
                opacityGroup.className = "udoc-subtoolbar__option-group";

                const label = document.createElement("span");
                label.className = "udoc-subtoolbar__option-label";
                label.textContent = i18n.t("tools.opacity");
                opacityGroup.appendChild(label);

                const slider = document.createElement("input");
                slider.type = "range";
                slider.className = "udoc-subtoolbar__opacity-slider";
                slider.min = "0.1";
                slider.max = "1";
                slider.step = "0.1";
                slider.value = String(opts.opacity);
                slider.title = `${Math.round(opts.opacity * 100)}%`;
                slider.setAttribute("aria-label", i18n.t("tools.opacity"));
                slider.addEventListener("input", () => {
                    const value = parseFloat(slider.value);
                    store.dispatch({ type: "SET_TOOL_OPTION", subTool, key: "opacity", value });
                });
                opacityGroup.appendChild(slider);

                optionsSection.appendChild(opacityGroup);
            }
        }
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        currentToolBtns.clear();
        el.remove();
    }

    return { el, mount, destroy };
}
