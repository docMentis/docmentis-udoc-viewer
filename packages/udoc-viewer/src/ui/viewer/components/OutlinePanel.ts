import type { Store } from "../../framework/store";
import { subscribeSelector, shallowEqual } from "../../framework/selectors";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import type { OutlineItem, Destination } from "../navigation";

type OutlineSlice = {
    outline: OutlineItem[] | null;
    outlineLoading: boolean;
    currentPage: number;
};

function selectOutlineSlice(state: ViewerState): OutlineSlice {
    return {
        outline: state.outline,
        outlineLoading: state.outlineLoading,
        currentPage: state.page
    };
}

export function createOutlinePanel() {
    const el = document.createElement("div");
    el.className = "udoc-outline-panel";

    let storeRef: Store<ViewerState, Action> | null = null;
    let currentSlice: OutlineSlice | null = null;
    /** Track collapsed items by path (collapsed if in set) */
    let collapsedItems = new Set<string>();

    let unsubRender: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];

    function createOutlineItemElement(
        item: OutlineItem,
        path: string,
        depth: number
    ): HTMLElement {
        const container = document.createElement("div");
        container.className = "udoc-outline-item";
        container.dataset.path = path;

        const header = document.createElement("div");
        header.className = "udoc-outline-item__header";
        header.style.paddingLeft = `${8 + depth * 16}px`;

        // Expand/collapse toggle (only if has children)
        if (item.children.length > 0) {
            const toggle = document.createElement("button");
            toggle.className = "udoc-outline-item__toggle";
            toggle.type = "button";
            toggle.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;

            // Determine initial expanded state
            const isCollapsed = item.initiallyCollapsed || collapsedItems.has(path);
            if (isCollapsed) {
                collapsedItems.add(path);
            }
            toggle.classList.toggle("udoc-outline-item__toggle--expanded", !isCollapsed);

            const onToggle = (e: Event) => {
                e.stopPropagation();
                if (collapsedItems.has(path)) {
                    collapsedItems.delete(path);
                } else {
                    collapsedItems.add(path);
                }
                updateExpandState(container, path);
            };
            toggle.addEventListener("click", onToggle);
            unsubEvents.push(() => toggle.removeEventListener("click", onToggle));

            header.appendChild(toggle);
        } else {
            // Spacer for alignment
            const spacer = document.createElement("span");
            spacer.className = "udoc-outline-item__spacer";
            header.appendChild(spacer);
        }

        // Title
        const title = document.createElement("span");
        title.className = "udoc-outline-item__title";
        title.textContent = item.title;
        header.appendChild(title);

        container.appendChild(header);

        // Click handler for navigation
        if (item.destination) {
            header.classList.add("udoc-outline-item__header--clickable");
            const dest: Destination = item.destination;
            const onClick = () => {
                if (storeRef) {
                    storeRef.dispatch({
                        type: "NAVIGATE_TO_DESTINATION",
                        destination: dest
                    });
                }
            };
            header.addEventListener("click", onClick);
            unsubEvents.push(() => header.removeEventListener("click", onClick));
        }

        // Children container
        if (item.children.length > 0) {
            const childrenContainer = document.createElement("div");
            childrenContainer.className = "udoc-outline-item__children";

            const isCollapsed = collapsedItems.has(path);
            childrenContainer.style.display = isCollapsed ? "none" : "block";

            // Recursively build children
            item.children.forEach((child, index) => {
                const childPath = `${path}/${index}`;
                const childEl = createOutlineItemElement(child, childPath, depth + 1);
                childrenContainer.appendChild(childEl);
            });

            container.appendChild(childrenContainer);
        }

        return container;
    }

    function updateExpandState(container: HTMLElement, path: string): void {
        const toggle = container.querySelector(":scope > .udoc-outline-item__header > .udoc-outline-item__toggle");
        const children = container.querySelector(":scope > .udoc-outline-item__children") as HTMLElement | null;

        if (!toggle || !children) return;

        const isCollapsed = collapsedItems.has(path);
        toggle.classList.toggle("udoc-outline-item__toggle--expanded", !isCollapsed);
        children.style.display = isCollapsed ? "none" : "block";
    }

    function buildOutlineTree(outline: OutlineItem[]): void {
        // Clear existing content but preserve event cleanup
        el.innerHTML = "";

        if (outline.length === 0) {
            const empty = document.createElement("div");
            empty.className = "udoc-outline-panel__empty";
            empty.textContent = "No outline available";
            el.appendChild(empty);
            return;
        }

        // Build outline items
        outline.forEach((item, index) => {
            const path = String(index);
            const itemEl = createOutlineItemElement(item, path, 0);
            el.appendChild(itemEl);
        });
    }

    function showLoading(): void {
        el.innerHTML = "";
        const loading = document.createElement("div");
        loading.className = "udoc-outline-panel__loading";
        loading.textContent = "Loading outline...";
        el.appendChild(loading);
    }

    function applyState(slice: OutlineSlice): void {
        const outlineChanged = !currentSlice ||
            slice.outline !== currentSlice.outline ||
            slice.outlineLoading !== currentSlice.outlineLoading;

        if (outlineChanged) {
            // Clear old event listeners when rebuilding
            for (const off of unsubEvents) off();
            unsubEvents.length = 0;

            if (slice.outlineLoading) {
                showLoading();
            } else if (slice.outline === null) {
                // Not loaded yet and not loading - effect will trigger shortly
                el.innerHTML = "";
            } else {
                buildOutlineTree(slice.outline);
            }
        }

        currentSlice = slice;
    }

    function mount(
        container: HTMLElement,
        store: Store<ViewerState, Action>
    ): void {
        container.appendChild(el);
        storeRef = store;

        // Apply initial state
        applyState(selectOutlineSlice(store.getState()));

        unsubRender = subscribeSelector(
            store,
            selectOutlineSlice,
            applyState,
            { equality: shallowEqual }
        );
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        unsubEvents.length = 0;

        collapsedItems.clear();
        storeRef = null;
        currentSlice = null;

        el.remove();
    }

    return { el, mount, destroy };
}

export type OutlinePanelComponent = ReturnType<typeof createOutlinePanel>;
