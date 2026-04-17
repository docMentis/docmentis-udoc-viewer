import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import type { PageGroup } from "../../../worker/index.js";

interface SheetTabBarSlice {
    pageGroups: readonly PageGroup[];
    activeGroupIndex: number;
    isXlsx: boolean;
}

function selectSheetTabBar(state: ViewerState): SheetTabBarSlice {
    return {
        pageGroups: state.pageGroups,
        activeGroupIndex: state.activeGroupIndex,
        isXlsx: state.documentFormat === "xlsx",
    };
}

function sliceEqual(a: SheetTabBarSlice, b: SheetTabBarSlice): boolean {
    return a.pageGroups === b.pageGroups && a.activeGroupIndex === b.activeGroupIndex && a.isXlsx === b.isXlsx;
}

export function createSheetTabBar() {
    const el = document.createElement("div");
    el.className = "udoc-sheet-tabs";
    el.setAttribute("role", "tablist");
    el.style.display = "none";

    let unsub: (() => void) | null = null;

    function render(slice: SheetTabBarSlice, store: Store<ViewerState, Action>): void {
        const shouldShow = slice.isXlsx && slice.pageGroups.length > 0;
        el.style.display = shouldShow ? "flex" : "none";
        if (!shouldShow) {
            el.replaceChildren();
            return;
        }

        el.replaceChildren();
        slice.pageGroups.forEach((group, index) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "udoc-sheet-tab";
            btn.setAttribute("role", "tab");
            btn.textContent = group.name ?? `Sheet ${index + 1}`;
            btn.title = btn.textContent;
            const isActive = index === slice.activeGroupIndex;
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
            btn.tabIndex = isActive ? 0 : -1;
            if (isActive) btn.classList.add("udoc-sheet-tab--active");
            btn.addEventListener("click", () => {
                store.dispatch({ type: "SET_ACTIVE_GROUP", groupIndex: index });
            });
            el.appendChild(btn);
        });
    }

    function mount(parent: HTMLElement, store: Store<ViewerState, Action>): void {
        parent.appendChild(el);
        render(selectSheetTabBar(store.getState()), store);
        unsub = subscribeSelector(store, selectSheetTabBar, (slice) => render(slice, store), { equality: sliceEqual });
    }

    function destroy(): void {
        unsub?.();
        unsub = null;
        el.remove();
    }

    return { el, mount, destroy };
}
