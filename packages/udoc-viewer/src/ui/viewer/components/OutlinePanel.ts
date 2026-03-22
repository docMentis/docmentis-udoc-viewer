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
        currentPage: state.page,
    };
}

export function createOutlinePanel() {
    const el = document.createElement("div");
    el.className = "udoc-outline-panel";

    let storeRef: Store<ViewerState, Action> | null = null;
    let currentSlice: OutlineSlice | null = null;
    /** Track collapsed items by path (collapsed if in set) */
    const collapsedItems = new Set<string>();

    let unsubRender: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];

    function createOutlineItemElement(item: OutlineItem, path: string, depth: number): HTMLElement {
        const container = document.createElement("div");
        container.className = "udoc-outline-item";
        container.dataset.path = path;
        container.setAttribute("role", "treeitem");
        container.setAttribute("aria-label", item.title);

        const header = document.createElement("div");
        header.className = "udoc-outline-item__header";
        header.style.paddingLeft = `${8 + depth * 16}px`;
        header.setAttribute("tabindex", "-1");

        // Expand/collapse toggle (only if has children)
        if (item.children.length > 0) {
            const toggle = document.createElement("button");
            toggle.className = "udoc-outline-item__toggle";
            toggle.type = "button";
            toggle.setAttribute("tabindex", "-1");
            toggle.setAttribute("aria-hidden", "true");
            toggle.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;

            // Determine initial expanded state
            const isCollapsed = item.initiallyCollapsed || collapsedItems.has(path);
            if (isCollapsed) {
                collapsedItems.add(path);
            }
            toggle.classList.toggle("udoc-outline-item__toggle--expanded", !isCollapsed);
            container.setAttribute("aria-expanded", String(!isCollapsed));

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
                        destination: dest,
                    });
                }
            };
            header.addEventListener("click", onClick);
            unsubEvents.push(() => header.removeEventListener("click", onClick));
        }

        // Keyboard handler for tree navigation
        const onKeyDown = (e: KeyboardEvent) => {
            const handled = handleTreeKeyDown(e, container, path);
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        header.addEventListener("keydown", onKeyDown);
        unsubEvents.push(() => header.removeEventListener("keydown", onKeyDown));

        // Children container
        if (item.children.length > 0) {
            const childrenContainer = document.createElement("div");
            childrenContainer.className = "udoc-outline-item__children";
            childrenContainer.setAttribute("role", "group");

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

    function handleTreeKeyDown(e: KeyboardEvent, container: HTMLElement, path: string): boolean {
        const hasChildren = container.querySelector(":scope > .udoc-outline-item__children") !== null;
        const isExpanded = hasChildren && !collapsedItems.has(path);

        switch (e.key) {
            case "ArrowDown": {
                const next = getNextVisibleTreeItem(container);
                if (next) focusTreeItem(next);
                return true;
            }
            case "ArrowUp": {
                const prev = getPrevVisibleTreeItem(container);
                if (prev) focusTreeItem(prev);
                return true;
            }
            case "ArrowRight": {
                if (hasChildren && !isExpanded) {
                    collapsedItems.delete(path);
                    updateExpandState(container, path);
                } else if (hasChildren && isExpanded) {
                    const firstChild = container.querySelector(
                        ":scope > .udoc-outline-item__children > .udoc-outline-item",
                    ) as HTMLElement | null;
                    if (firstChild) focusTreeItem(firstChild);
                }
                return true;
            }
            case "ArrowLeft": {
                if (hasChildren && isExpanded) {
                    collapsedItems.add(path);
                    updateExpandState(container, path);
                } else {
                    const parent = container.parentElement?.closest(".udoc-outline-item") as HTMLElement | null;
                    if (parent) focusTreeItem(parent);
                }
                return true;
            }
            case "Home": {
                const first = el.querySelector(".udoc-outline-item") as HTMLElement | null;
                if (first) focusTreeItem(first);
                return true;
            }
            case "End": {
                const allVisible = el.querySelectorAll<HTMLElement>(".udoc-outline-item");
                for (let i = allVisible.length - 1; i >= 0; i--) {
                    const item = allVisible[i];
                    if (item.offsetParent !== null) {
                        focusTreeItem(item);
                        break;
                    }
                }
                return true;
            }
            case "Enter":
            case " ": {
                const header = container.querySelector(":scope > .udoc-outline-item__header") as HTMLElement | null;
                if (header) header.click();
                return true;
            }
            default:
                return false;
        }
    }

    function focusTreeItem(item: HTMLElement): void {
        const header = item.querySelector(":scope > .udoc-outline-item__header") as HTMLElement | null;
        if (header) header.focus();
    }

    function getNextVisibleTreeItem(current: HTMLElement): HTMLElement | null {
        // If expanded, first child
        const children = current.querySelector(":scope > .udoc-outline-item__children") as HTMLElement | null;
        if (children && children.style.display !== "none") {
            const firstChild = children.querySelector(":scope > .udoc-outline-item") as HTMLElement | null;
            if (firstChild) return firstChild;
        }
        // Next sibling
        let node: HTMLElement | null = current;
        while (node) {
            const next = node.nextElementSibling as HTMLElement | null;
            if (next && next.classList.contains("udoc-outline-item")) return next;
            // Go up to parent's next sibling
            node = node.parentElement?.closest(".udoc-outline-item") as HTMLElement | null;
        }
        return null;
    }

    function getPrevVisibleTreeItem(current: HTMLElement): HTMLElement | null {
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev && prev.classList.contains("udoc-outline-item")) {
            // Go to deepest last visible descendant
            return getLastVisibleDescendant(prev);
        }
        // Go to parent
        const parent = current.parentElement?.closest(".udoc-outline-item") as HTMLElement | null;
        return parent;
    }

    function getLastVisibleDescendant(item: HTMLElement): HTMLElement {
        const children = item.querySelector(":scope > .udoc-outline-item__children") as HTMLElement | null;
        if (children && children.style.display !== "none") {
            const lastChild = children.querySelector(":scope > .udoc-outline-item:last-child") as HTMLElement | null;
            if (lastChild) return getLastVisibleDescendant(lastChild);
        }
        return item;
    }

    function updateExpandState(container: HTMLElement, path: string): void {
        const toggle = container.querySelector(":scope > .udoc-outline-item__header > .udoc-outline-item__toggle");
        const children = container.querySelector(":scope > .udoc-outline-item__children") as HTMLElement | null;

        if (!toggle || !children) return;

        const isCollapsed = collapsedItems.has(path);
        toggle.classList.toggle("udoc-outline-item__toggle--expanded", !isCollapsed);
        children.style.display = isCollapsed ? "none" : "block";
        container.setAttribute("aria-expanded", String(!isCollapsed));
    }

    function buildOutlineTree(outline: OutlineItem[]): void {
        // Clear existing content but preserve event cleanup
        el.innerHTML = "";

        if (outline.length === 0) {
            el.removeAttribute("role");
            const empty = document.createElement("div");
            empty.className = "udoc-outline-panel__empty";
            empty.textContent = "No outline available";
            el.appendChild(empty);
            return;
        }

        el.setAttribute("role", "tree");
        el.setAttribute("aria-label", "Document outline");

        // Build outline items
        outline.forEach((item, index) => {
            const path = String(index);
            const itemEl = createOutlineItemElement(item, path, 0);
            el.appendChild(itemEl);
        });

        // Focus first item for keyboard navigation entry
        const firstHeader = el.querySelector<HTMLElement>(".udoc-outline-item__header");
        if (firstHeader) firstHeader.setAttribute("tabindex", "0");
    }

    function showLoading(): void {
        el.innerHTML = "";
        const loading = document.createElement("div");
        loading.className = "udoc-outline-panel__loading";
        loading.textContent = "Loading outline...";
        el.appendChild(loading);
    }

    function applyState(slice: OutlineSlice): void {
        const outlineChanged =
            !currentSlice ||
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

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(el);
        storeRef = store;

        // Apply initial state
        applyState(selectOutlineSlice(store.getState()));

        unsubRender = subscribeSelector(store, selectOutlineSlice, applyState, { equality: shallowEqual });
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
