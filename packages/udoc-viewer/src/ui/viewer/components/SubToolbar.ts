import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import type { I18n } from "../i18n/index.js";
import type { ViewerState, ActiveTool, SubTool, ToolOptions, LineStyle, ArrowHeadStyle } from "../state";
import { isToolSet, DEFAULT_TOOL_OPTIONS } from "../state";
import type { Action } from "../actions";
import { createNumberInput, type NumberInputInstance } from "./NumberInput";
import { createColorSelect, type ColorSelectInstance } from "./ColorSelect";
import {
    ICON_SUBTOOL_SELECT,
    ICON_SUBTOOL_FREEHAND,
    ICON_SUBTOOL_LINE,
    ICON_SUBTOOL_ARROW,
    ICON_SUBTOOL_RECTANGLE,
    ICON_SUBTOOL_ELLIPSE,
    ICON_SUBTOOL_POLYGON,
    ICON_SUBTOOL_POLYLINE,
    ICON_SUBTOOL_HIGHLIGHT,
    ICON_SUBTOOL_UNDERLINE,
    ICON_SUBTOOL_STRIKETHROUGH,
    ICON_SUBTOOL_SQUIGGLY,
    ICON_LINE_SOLID,
    ICON_LINE_DASHED,
    ICON_LINE_DOTTED,
    ICON_ARROW_NONE,
    ICON_ARROW_OPEN,
    ICON_ARROW_CLOSED,
    ICON_STROKE_WIDTH,
    ICON_OPACITY,
    ICON_FONT_SIZE,
    ICON_DELETE,
} from "../icons";

// ---- Static data ----

interface SubToolDef {
    id: SubTool;
    icon: string;
    labelKey: string;
}

const ANNOTATE_SUB_TOOLS: SubToolDef[] = [
    { id: "select", icon: ICON_SUBTOOL_SELECT, labelKey: "tools.select" },
    { id: "freehand", icon: ICON_SUBTOOL_FREEHAND, labelKey: "tools.freehand" },
    { id: "line", icon: ICON_SUBTOOL_LINE, labelKey: "tools.line" },
    { id: "arrow", icon: ICON_SUBTOOL_ARROW, labelKey: "tools.arrow" },
    { id: "rectangle", icon: ICON_SUBTOOL_RECTANGLE, labelKey: "tools.rectangle" },
    { id: "ellipse", icon: ICON_SUBTOOL_ELLIPSE, labelKey: "tools.ellipse" },
    { id: "polygon", icon: ICON_SUBTOOL_POLYGON, labelKey: "tools.polygon" },
    { id: "polyline", icon: ICON_SUBTOOL_POLYLINE, labelKey: "tools.polyline" },
];

const MARKUP_SUB_TOOLS: SubToolDef[] = [
    { id: "select", icon: ICON_SUBTOOL_SELECT, labelKey: "tools.select" },
    { id: "highlight", icon: ICON_SUBTOOL_HIGHLIGHT, labelKey: "tools.highlight" },
    { id: "underline", icon: ICON_SUBTOOL_UNDERLINE, labelKey: "tools.underline" },
    { id: "strikethrough", icon: ICON_SUBTOOL_STRIKETHROUGH, labelKey: "tools.strikethrough" },
    { id: "squiggly", icon: ICON_SUBTOOL_SQUIGGLY, labelKey: "tools.squiggly" },
];

const SUB_TOOLS_MAP: Record<string, SubToolDef[]> = { annotate: ANNOTATE_SUB_TOOLS, markup: MARKUP_SUB_TOOLS };

type ToolOptionKey = "strokeColor" | "fillColor" | "strokeWidth" | "opacity" | "fontSize" | "lineStyle" | "arrowHead";

const TOOL_OPTIONS_CONFIG: Record<string, ToolOptionKey[]> = {
    freehand: ["strokeColor", "strokeWidth", "opacity"],
    line: ["strokeColor", "strokeWidth", "opacity", "lineStyle"],
    arrow: ["strokeColor", "strokeWidth", "opacity", "lineStyle", "arrowHead"],
    rectangle: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    ellipse: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    polygon: ["strokeColor", "fillColor", "strokeWidth", "opacity", "lineStyle"],
    polyline: ["strokeColor", "strokeWidth", "opacity", "lineStyle"],
    highlight: ["strokeColor", "opacity"],
    underline: ["strokeColor"],
    strikethrough: ["strokeColor"],
    squiggly: ["strokeColor"],
};

const LINE_STYLE_DEFS: { id: LineStyle; icon: string; labelKey: string }[] = [
    { id: "solid", icon: ICON_LINE_SOLID, labelKey: "tools.lineStyleSolid" },
    { id: "dashed", icon: ICON_LINE_DASHED, labelKey: "tools.lineStyleDashed" },
    { id: "dotted", icon: ICON_LINE_DOTTED, labelKey: "tools.lineStyleDotted" },
];

const ARROW_HEAD_DEFS: { id: ArrowHeadStyle; icon: string; labelKey: string }[] = [
    { id: "none", icon: ICON_ARROW_NONE, labelKey: "tools.arrowHeadNone" },
    { id: "open", icon: ICON_ARROW_OPEN, labelKey: "tools.arrowHeadOpen" },
    { id: "closed", icon: ICON_ARROW_CLOSED, labelKey: "tools.arrowHeadClosed" },
];

// ---- State selector ----

interface SubToolbarSlice {
    activeTool: ActiveTool;
    activeSubTool: SubTool | null;
    toolOptions: Record<string, ToolOptions>;
    selectedAnnotation: ViewerState["selectedAnnotation"];
}

function selectSlice(s: ViewerState): SubToolbarSlice {
    return {
        activeTool: s.activeTool,
        activeSubTool: s.activeSubTool,
        toolOptions: s.toolOptions,
        selectedAnnotation: s.selectedAnnotation,
    };
}

function sliceEqual(a: SubToolbarSlice, b: SubToolbarSlice): boolean {
    return (
        a.activeTool === b.activeTool &&
        a.activeSubTool === b.activeSubTool &&
        a.toolOptions === b.toolOptions &&
        a.selectedAnnotation === b.selectedAnnotation
    );
}

// ---- Panel key ----

type PanelKey = "strokeColor" | "fillColor" | "strokeWidth" | "opacity" | "fontSize" | "lineStyle" | "arrowHead";

// ====================================================================================
// createSubToolbar
// ====================================================================================

export function createSubToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-subtoolbar";
    el.setAttribute("role", "toolbar");
    el.style.display = "none";

    const toolsSection = document.createElement("div");
    toolsSection.className = "udoc-subtoolbar__tools";
    const dividerEl = document.createElement("div");
    dividerEl.className = "udoc-subtoolbar__divider";
    const optionsSection = document.createElement("div");
    optionsSection.className = "udoc-subtoolbar__options";
    el.append(toolsSection, dividerEl, optionsSection);

    // ---- Mutable state ----
    let containerRef: HTMLElement | null = null;
    let unsubRender: (() => void) | null = null;
    const currentToolBtns: Map<string, HTMLButtonElement> = new Map();
    let currentToolSet: string | null = null;
    let builtSubTool: SubTool | null = null;
    let activeSubTool: SubTool | null = null;
    let openPanel: PanelKey | null = null;

    // ---- Lazy-created option controls ----

    let strokeColorSelect: ColorSelectInstance | null = null;
    let fillColorSelect: ColorSelectInstance | null = null;
    let strokeWidthInput: NumberInputInstance | null = null;
    let opacityInput: NumberInputInstance | null = null;
    let fontSizeInput: NumberInputInstance | null = null;

    // Delete button for select tool
    let deleteBtn: HTMLButtonElement | null = null;

    // Line style & arrow head (panels + triggers)
    const lineStylePanel = document.createElement("div");
    lineStylePanel.className = "udoc-linestyle-panel";
    lineStylePanel.addEventListener("click", (e) => e.stopPropagation());

    const arrowHeadPanel = document.createElement("div");
    arrowHeadPanel.className = "udoc-arrowhead-panel";
    arrowHeadPanel.addEventListener("click", (e) => e.stopPropagation());

    let lineStyleTrigger: HTMLButtonElement | null = null;
    let arrowHeadTrigger: HTMLButtonElement | null = null;

    // ---- Panel management ----

    function closeAllPanels(): void {
        openPanel = null;
        strokeColorSelect?.close();
        fillColorSelect?.close();
        lineStylePanel.classList.remove("udoc-linestyle-panel--open");
        arrowHeadPanel.classList.remove("udoc-arrowhead-panel--open");
        strokeWidthInput?.close();
        opacityInput?.close();
        fontSizeInput?.close();
    }

    const onDocumentClick = () => closeAllPanels();

    function openPanelAt(key: PanelKey, trigger: HTMLElement): void {
        const wasOpen = openPanel === key;
        closeAllPanels();
        if (wasOpen) return;

        const rect = trigger.getBoundingClientRect();
        const cRect = containerRef!.getBoundingClientRect();
        const left = `${rect.left - cRect.left}px`;

        if (key === "strokeColor") strokeColorSelect?.open(rect, cRect);
        else if (key === "fillColor") fillColorSelect?.open(rect, cRect);
        else if (key === "strokeWidth") strokeWidthInput?.open(rect, cRect);
        else if (key === "opacity") opacityInput?.open(rect, cRect);
        else if (key === "fontSize") fontSizeInput?.open(rect, cRect);
        else if (key === "lineStyle") {
            lineStylePanel.style.left = left;
            lineStylePanel.classList.add("udoc-linestyle-panel--open");
        } else if (key === "arrowHead") {
            arrowHeadPanel.style.left = left;
            arrowHeadPanel.classList.add("udoc-arrowhead-panel--open");
        }

        openPanel = key;
    }

    // ---- Dispatch helper ----

    function dispatchOpt(store: Store<ViewerState, Action>, key: string, value: string | number | null): void {
        if (activeSubTool) store.dispatch({ type: "SET_TOOL_OPTION", subTool: activeSubTool, key, value });
    }

    // ---- Mount ----

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, i18n: I18n): void {
        containerRef = container;
        container.appendChild(el);
        container.appendChild(lineStylePanel);
        container.appendChild(arrowHeadPanel);
        el.setAttribute("aria-label", i18n.t("tools.subtoolbar"));
        document.addEventListener("click", onDocumentClick);

        const applyState = (slice: SubToolbarSlice) => {
            const visible = isToolSet(slice.activeTool);
            el.style.display = visible ? "flex" : "none";
            if (!visible) {
                closeAllPanels();
                return;
            }

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
                    btn.addEventListener("click", () => store.dispatch({ type: "SET_SUB_TOOL", subTool: def.id }));
                    toolsSection.appendChild(btn);
                    currentToolBtns.set(def.id, btn);
                }
            }

            for (const [id, btn] of currentToolBtns) {
                btn.classList.toggle("udoc-subtoolbar__btn--active", id === slice.activeSubTool);
            }

            if (!slice.activeSubTool) {
                optionsSection.innerHTML = "";
                builtSubTool = null;
                return;
            }

            activeSubTool = slice.activeSubTool;
            const opts = slice.toolOptions[slice.activeSubTool] ?? { ...DEFAULT_TOOL_OPTIONS };

            // If sub-tool changed, rebuild the set of option controls in the toolbar
            if (builtSubTool !== slice.activeSubTool) {
                closeAllPanels();
                buildControls(slice.activeSubTool, opts, store, i18n);
                builtSubTool = slice.activeSubTool;
            }

            // Always update values in-place
            updateValues(opts, store, i18n);

            // Update delete button state for select tool
            if (deleteBtn) {
                deleteBtn.disabled = !slice.selectedAnnotation;
            }
        };

        applyState(selectSlice(store.getState()));
        unsubRender = subscribeSelector(store, selectSlice, applyState, { equality: sliceEqual });
    }

    // ====================================================================
    // buildControls — called ONLY when active sub-tool changes
    // ====================================================================

    function buildControls(subTool: SubTool, opts: ToolOptions, store: Store<ViewerState, Action>, i18n: I18n): void {
        optionsSection.innerHTML = "";
        lineStyleTrigger = null;
        arrowHeadTrigger = null;
        deleteBtn = null;

        // Select tool shows a delete button instead of drawing options
        if (subTool === "select") {
            deleteBtn = document.createElement("button");
            deleteBtn.className = "udoc-subtoolbar__btn udoc-subtoolbar__btn--delete";
            deleteBtn.innerHTML = ICON_DELETE;
            deleteBtn.title = i18n.t("tools.deleteAnnotation" as keyof typeof i18n.t);
            deleteBtn.setAttribute("aria-label", i18n.t("tools.deleteAnnotation" as keyof typeof i18n.t));
            deleteBtn.disabled = true;
            deleteBtn.addEventListener("click", () => {
                const sel = store.getState().selectedAnnotation;
                if (sel) {
                    store.dispatch({
                        type: "REMOVE_ANNOTATION",
                        pageIndex: sel.pageIndex,
                        annotationIndex: sel.annotationIndex,
                    });
                }
            });
            optionsSection.appendChild(deleteBtn);
            return;
        }

        const supported = TOOL_OPTIONS_CONFIG[subTool];
        if (!supported || supported.length === 0) return;

        for (const optKey of supported) {
            if (optKey === "strokeColor") {
                if (!strokeColorSelect) {
                    strokeColorSelect = createColorSelect({
                        variant: "stroke",
                        label: i18n.t("tools.strokeColor"),
                        noneLabel: i18n.t("tools.noFill"),
                        onSelect: () => closeAllPanels(),
                        onChange: (color) => dispatchOpt(store, "strokeColor", color),
                    });
                    containerRef!.appendChild(strokeColorSelect.panel);
                    strokeColorSelect.el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openPanelAt("strokeColor", strokeColorSelect!.el);
                    });
                }
                optionsSection.appendChild(strokeColorSelect.el);
            } else if (optKey === "fillColor") {
                if (!fillColorSelect) {
                    fillColorSelect = createColorSelect({
                        variant: "fill",
                        label: i18n.t("tools.fillColor"),
                        noneLabel: i18n.t("tools.noFill"),
                        onSelect: () => closeAllPanels(),
                        onChange: (color) => dispatchOpt(store, "fillColor", color),
                    });
                    containerRef!.appendChild(fillColorSelect.panel);
                    fillColorSelect.el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openPanelAt("fillColor", fillColorSelect!.el);
                    });
                }
                optionsSection.appendChild(fillColorSelect.el);
            } else if (optKey === "strokeWidth") {
                if (!strokeWidthInput) {
                    strokeWidthInput = createNumberInput({
                        min: 0.5,
                        max: 12,
                        step: 0.5,
                        value: opts.strokeWidth,
                        icon: ICON_STROKE_WIDTH,
                        formatValue: (v) => `${v}pt`,
                        parseValue: (s) => {
                            const n = parseFloat(s.replace(/pt$/i, ""));
                            return isNaN(n) ? null : n;
                        },
                        label: i18n.t("tools.strokeWidth"),
                        onChange: (v) => dispatchOpt(store, "strokeWidth", v),
                    });
                    containerRef!.appendChild(strokeWidthInput.panel);
                    strokeWidthInput.el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openPanelAt("strokeWidth", strokeWidthInput!.el);
                    });
                }
                optionsSection.appendChild(strokeWidthInput.el);
            } else if (optKey === "opacity") {
                if (!opacityInput) {
                    opacityInput = createNumberInput({
                        min: 10,
                        max: 100,
                        step: 10,
                        value: Math.round(opts.opacity * 100),
                        icon: ICON_OPACITY,
                        formatValue: (v) => `${Math.round(v)}%`,
                        parseValue: (s) => {
                            const n = parseFloat(s.replace(/%$/i, ""));
                            return isNaN(n) ? null : n;
                        },
                        label: i18n.t("tools.opacity"),
                        onChange: (v) => dispatchOpt(store, "opacity", v / 100),
                    });
                    containerRef!.appendChild(opacityInput.panel);
                    opacityInput.el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openPanelAt("opacity", opacityInput!.el);
                    });
                }
                optionsSection.appendChild(opacityInput.el);
            } else if (optKey === "fontSize") {
                if (!fontSizeInput) {
                    fontSizeInput = createNumberInput({
                        min: 8,
                        max: 144,
                        step: 1,
                        value: opts.fontSize,
                        icon: ICON_FONT_SIZE,
                        formatValue: (v) => `${v}pt`,
                        parseValue: (s) => {
                            const n = parseFloat(s.replace(/pt$/i, ""));
                            return isNaN(n) ? null : n;
                        },
                        label: i18n.t("tools.fontSize"),
                        onChange: (v) => dispatchOpt(store, "fontSize", v),
                    });
                    containerRef!.appendChild(fontSizeInput.panel);
                    fontSizeInput.el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openPanelAt("fontSize", fontSizeInput!.el);
                    });
                }
                optionsSection.appendChild(fontSizeInput.el);
            } else if (optKey === "lineStyle") {
                lineStyleTrigger = document.createElement("button");
                lineStyleTrigger.className =
                    "udoc-subtoolbar__dropdown-trigger udoc-subtoolbar__dropdown-trigger--icon";
                lineStyleTrigger.title = i18n.t("tools.lineStyle");
                const arrow = document.createElement("span");
                arrow.className = "udoc-subtoolbar__dropdown-arrow";
                arrow.textContent = "\u25BE";
                lineStyleTrigger.appendChild(arrow);
                lineStyleTrigger.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openPanelAt("lineStyle", lineStyleTrigger!);
                });
                optionsSection.appendChild(lineStyleTrigger);
            } else if (optKey === "arrowHead") {
                arrowHeadTrigger = document.createElement("button");
                arrowHeadTrigger.className =
                    "udoc-subtoolbar__dropdown-trigger udoc-subtoolbar__dropdown-trigger--icon";
                arrowHeadTrigger.title = i18n.t("tools.arrowHeadEnd");
                const arrow = document.createElement("span");
                arrow.className = "udoc-subtoolbar__dropdown-arrow";
                arrow.textContent = "\u25BE";
                arrowHeadTrigger.appendChild(arrow);
                arrowHeadTrigger.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openPanelAt("arrowHead", arrowHeadTrigger!);
                });
                optionsSection.appendChild(arrowHeadTrigger);
            }
        }
    }

    // ====================================================================
    // updateValues — called on EVERY state change, updates in-place
    // ====================================================================

    function updateValues(opts: ToolOptions, store: Store<ViewerState, Action>, i18n: I18n): void {
        // Color selects
        strokeColorSelect?.update(opts.strokeColor);
        fillColorSelect?.update(opts.fillColor);

        // Number inputs
        strokeWidthInput?.update(opts.strokeWidth);
        opacityInput?.update(Math.round(opts.opacity * 100));
        fontSizeInput?.update(opts.fontSize);

        // Line style trigger + panel
        if (lineStyleTrigger) {
            const def = LINE_STYLE_DEFS.find((s) => s.id === opts.lineStyle) ?? LINE_STYLE_DEFS[0];
            const arrowEl = lineStyleTrigger.lastElementChild;
            lineStyleTrigger.innerHTML = def.icon;
            if (arrowEl) lineStyleTrigger.appendChild(arrowEl);
            lineStyleTrigger.setAttribute(
                "aria-label",
                `${i18n.t("tools.lineStyle")}: ${i18n.t(def.labelKey as keyof typeof i18n.t)}`,
            );
        }
        rebuildLineStylePanel(opts.lineStyle, store, i18n);

        // Arrow head trigger + panel
        if (arrowHeadTrigger) {
            const endDef = ARROW_HEAD_DEFS.find((a) => a.id === opts.arrowHeadEnd) ?? ARROW_HEAD_DEFS[0];
            const arrowEl = arrowHeadTrigger.lastElementChild;
            arrowHeadTrigger.innerHTML = endDef.icon;
            if (arrowEl) arrowHeadTrigger.appendChild(arrowEl);
        }
        rebuildArrowHeadPanel(opts.arrowHeadStart, opts.arrowHeadEnd, store, i18n);
    }

    // ---- Line style panel ----

    function rebuildLineStylePanel(current: LineStyle, store: Store<ViewerState, Action>, i18n: I18n): void {
        lineStylePanel.innerHTML = "";
        for (const def of LINE_STYLE_DEFS) {
            const item = document.createElement("button");
            item.className = "udoc-linestyle-panel__item";
            if (current === def.id) item.classList.add("udoc-linestyle-panel__item--active");
            const icon = document.createElement("span");
            icon.className = "udoc-linestyle-panel__icon";
            icon.innerHTML = def.icon;
            const label = document.createElement("span");
            label.className = "udoc-linestyle-panel__label";
            label.textContent = i18n.t(def.labelKey as keyof typeof i18n.t);
            item.append(icon, label);
            item.title = i18n.t(def.labelKey as keyof typeof i18n.t);
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                closeAllPanels();
                dispatchOpt(store, "lineStyle", def.id);
            });
            lineStylePanel.appendChild(item);
        }
    }

    // ---- Arrow head panel ----

    function rebuildArrowHeadPanel(
        startVal: ArrowHeadStyle,
        endVal: ArrowHeadStyle,
        store: Store<ViewerState, Action>,
        i18n: I18n,
    ): void {
        arrowHeadPanel.innerHTML = "";
        for (const [rowKey, rowLabel, currentVal] of [
            ["arrowHeadStart", i18n.t("tools.arrowHeadStart"), startVal],
            ["arrowHeadEnd", i18n.t("tools.arrowHeadEnd"), endVal],
        ] as const) {
            const row = document.createElement("div");
            row.className = "udoc-arrowhead-panel__row";
            const lbl = document.createElement("span");
            lbl.className = "udoc-arrowhead-panel__row-label";
            lbl.textContent = rowLabel;
            row.appendChild(lbl);
            for (const def of ARROW_HEAD_DEFS) {
                const btn = document.createElement("button");
                btn.className = "udoc-arrowhead-panel__btn";
                if (currentVal === def.id) btn.classList.add("udoc-arrowhead-panel__btn--active");
                btn.innerHTML = def.icon;
                btn.title = i18n.t(def.labelKey as keyof typeof i18n.t);
                if (rowKey === "arrowHeadStart") btn.style.transform = "scaleX(-1)";
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dispatchOpt(store, rowKey, def.id);
                });
                row.appendChild(btn);
            }
            arrowHeadPanel.appendChild(row);
        }
    }

    // ---- Destroy ----

    function destroy(): void {
        if (unsubRender) unsubRender();
        document.removeEventListener("click", onDocumentClick);
        currentToolBtns.clear();
        strokeColorSelect?.destroy();
        fillColorSelect?.destroy();
        strokeWidthInput?.destroy();
        opacityInput?.destroy();
        fontSizeInput?.destroy();
        lineStylePanel.remove();
        arrowHeadPanel.remove();
        el.remove();
    }

    return { el, mount, destroy };
}
