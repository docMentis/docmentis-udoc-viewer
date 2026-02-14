import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import { on } from "../../framework/events";
import type { ViewerState, ScrollMode, LayoutMode, PageRotation, SpacingMode } from "../state";
import type { Action } from "../actions";
import {
    ICON_VIEW_MODE,
    ICON_SCROLL_SPREAD,
    ICON_SCROLL_CONTINUOUS,
    ICON_LAYOUT_SINGLE,
    ICON_LAYOUT_DOUBLE,
    ICON_LAYOUT_DOUBLE_ODD_RIGHT,
    ICON_LAYOUT_DOUBLE_ODD_LEFT,
    ICON_ROTATE_0,
    ICON_ROTATE_90,
    ICON_ROTATE_180,
    ICON_ROTATE_270,
    ICON_SPACING_ALL,
    ICON_SPACING_NONE,
    ICON_SPACING_SPREAD,
    ICON_SPACING_PAGE
} from "../icons";

interface ViewModeSlice {
    scrollMode: ScrollMode;
    layoutMode: LayoutMode;
    pageRotation: PageRotation;
    spacingMode: SpacingMode;
}

function sliceEqual(a: ViewModeSlice, b: ViewModeSlice): boolean {
    return (
        a.scrollMode === b.scrollMode &&
        a.layoutMode === b.layoutMode &&
        a.pageRotation === b.pageRotation &&
        a.spacingMode === b.spacingMode
    );
}

interface MenuOption<T> {
    value: T;
    icon: string;
    label: string;
}

const SCROLL_OPTIONS: MenuOption<ScrollMode>[] = [
    { value: "spread", icon: ICON_SCROLL_SPREAD, label: "Spread" },
    { value: "continuous", icon: ICON_SCROLL_CONTINUOUS, label: "Continuous" }
];

const LAYOUT_OPTIONS: MenuOption<LayoutMode>[] = [
    { value: "single-page", icon: ICON_LAYOUT_SINGLE, label: "Single" },
    { value: "double-page", icon: ICON_LAYOUT_DOUBLE, label: "Double" },
    { value: "double-page-odd-right", icon: ICON_LAYOUT_DOUBLE_ODD_RIGHT, label: "Cover Right" },
    { value: "double-page-odd-left", icon: ICON_LAYOUT_DOUBLE_ODD_LEFT, label: "Cover Left" }
];

const ROTATION_OPTIONS: MenuOption<PageRotation>[] = [
    { value: 0, icon: ICON_ROTATE_0, label: "0°" },
    { value: 90, icon: ICON_ROTATE_90, label: "90°" },
    { value: 180, icon: ICON_ROTATE_180, label: "180°" },
    { value: 270, icon: ICON_ROTATE_270, label: "270°" }
];

const SPACING_OPTIONS: MenuOption<SpacingMode>[] = [
    { value: "all", icon: ICON_SPACING_ALL, label: "All" },
    { value: "none", icon: ICON_SPACING_NONE, label: "None" },
    { value: "spread-only", icon: ICON_SPACING_SPREAD, label: "Spread" },
    { value: "page-only", icon: ICON_SPACING_PAGE, label: "Page" }
];

export function createViewModeMenu() {
    const el = document.createElement("div");
    el.className = "udoc-view-mode-menu";

    // Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "udoc-floating-toolbar__btn";
    toggleBtn.innerHTML = ICON_VIEW_MODE;
    toggleBtn.title = "View settings";
    el.appendChild(toggleBtn);

    // Dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "udoc-view-mode-menu__dropdown";
    dropdown.style.display = "none";
    el.appendChild(dropdown);

    let unsub: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];
    /** Listeners created inside buildDropdown; cleared on each rebuild */
    let dropdownListeners: Array<() => void> = [];
    let storeRef: Store<ViewerState, Action> | null = null;
    let isOpen = false;

    interface SectionOptions {
        disabled?: boolean;
        /** When true, currentValue may not match any option */
        allowNoSelection?: boolean;
    }

    function createSection<T>(
        title: string,
        options: MenuOption<T>[],
        currentValue: T,
        onSelect: (value: T) => void,
        sectionOptions: SectionOptions = {}
    ): HTMLElement {
        const section = document.createElement("div");
        section.className = "udoc-view-mode-menu__section";

        const titleEl = document.createElement("div");
        titleEl.className = "udoc-view-mode-menu__title";
        titleEl.textContent = title;
        section.appendChild(titleEl);

        const optionsContainer = document.createElement("div");
        optionsContainer.className = "udoc-view-mode-menu__options";

        for (const opt of options) {
            const btn = document.createElement("button");
            btn.className = "udoc-view-mode-menu__option";

            // Only mark active if value matches and not in "no selection" state
            const isActive = opt.value === currentValue && !sectionOptions.allowNoSelection;
            if (isActive) {
                btn.classList.add("udoc-view-mode-menu__option--active");
            }

            if (sectionOptions.disabled) {
                btn.disabled = true;
                btn.classList.add("udoc-view-mode-menu__option--disabled");
            }

            btn.title = opt.label;

            const iconSpan = document.createElement("span");
            iconSpan.className = "udoc-view-mode-menu__option-icon";
            iconSpan.innerHTML = opt.icon;
            btn.appendChild(iconSpan);

            if (!sectionOptions.disabled) {
                dropdownListeners.push(
                    on(btn, "click", (e: MouseEvent) => {
                        e.stopPropagation();
                        onSelect(opt.value);
                    })
                );
            }

            optionsContainer.appendChild(btn);
        }

        section.appendChild(optionsContainer);
        return section;
    }

    function buildDropdown(slice: ViewModeSlice): void {
        // Clean up listeners from previous build
        for (const off of dropdownListeners) off();
        dropdownListeners = [];

        // Clear existing content
        dropdown.innerHTML = "";

        // Scroll mode section
        dropdown.appendChild(
            createSection("Scroll", SCROLL_OPTIONS, slice.scrollMode, (mode) => {
                storeRef?.dispatch({ type: "SET_SCROLL_MODE", mode });
            })
        );

        // Layout mode section
        dropdown.appendChild(
            createSection("Layout", LAYOUT_OPTIONS, slice.layoutMode, (mode) => {
                storeRef?.dispatch({ type: "SET_LAYOUT_MODE", mode });
            })
        );

        // Page rotation section
        dropdown.appendChild(
            createSection("Rotation", ROTATION_OPTIONS, slice.pageRotation, (rotation) => {
                storeRef?.dispatch({ type: "SET_PAGE_ROTATION", rotation });
            })
        );

        // Spacing section
        dropdown.appendChild(
            createSection("Spacing", SPACING_OPTIONS, slice.spacingMode, (mode) => {
                storeRef?.dispatch({ type: "SET_SPACING_MODE", mode });
            })
        );
    }

    function toggleDropdown(): void {
        isOpen = !isOpen;
        dropdown.style.display = isOpen ? "block" : "none";
        toggleBtn.classList.toggle("udoc-floating-toolbar__btn--active", isOpen);
    }

    function closeDropdown(): void {
        if (isOpen) {
            isOpen = false;
            dropdown.style.display = "none";
            toggleBtn.classList.remove("udoc-floating-toolbar__btn--active");
        }
    }

    function mount(store: Store<ViewerState, Action>): void {
        storeRef = store;

        // Toggle button click
        unsubEvents.push(on(toggleBtn, "click", (e: MouseEvent) => {
            e.stopPropagation();
            toggleDropdown();
        }));

        // Close on outside click
        const handleOutsideClick = (e: MouseEvent) => {
            if (!el.contains(e.target as Node)) {
                closeDropdown();
            }
        };
        document.addEventListener("click", handleOutsideClick);
        unsubEvents.push(() => document.removeEventListener("click", handleOutsideClick));

        // Close on escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeDropdown();
            }
        };
        document.addEventListener("keydown", handleEscape);
        unsubEvents.push(() => document.removeEventListener("keydown", handleEscape));

        const applyState = (slice: ViewModeSlice) => {
            buildDropdown(slice);
        };

        // Initial build
        applyState(selectSlice(store.getState()));

        // Subscribe to changes
        unsub = subscribeSelector(store, selectSlice, applyState, {
            equality: sliceEqual
        });
    }

    function destroy(): void {
        if (unsub) unsub();
        for (const off of dropdownListeners) off();
        dropdownListeners = [];
        for (const off of unsubEvents) off();
        el.remove();
    }

    return { el, mount, destroy };
}

function selectSlice(state: ViewerState): ViewModeSlice {
    return {
        scrollMode: state.scrollMode,
        layoutMode: state.layoutMode,
        pageRotation: state.pageRotation,
        spacingMode: state.spacingMode
    };
}
