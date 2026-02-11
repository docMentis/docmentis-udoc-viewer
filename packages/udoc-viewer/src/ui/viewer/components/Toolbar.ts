import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import { ICON_MENU, ICON_SEARCH, ICON_COMMENTS, ICON_FULLSCREEN, ICON_FULLSCREEN_EXIT } from "../icons";

function createButton(className: string, label: string, iconSvg: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = `udoc-toolbar__btn ${className}`;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = iconSvg;
    return btn;
}

export function createToolbar() {
    const el = document.createElement("div");
    el.className = "udoc-toolbar";

    // Left section
    const leftSection = document.createElement("div");
    leftSection.className = "udoc-toolbar__left";
    const menuBtn = createButton("udoc-toolbar__btn--menu", "Menu", ICON_MENU);
    leftSection.appendChild(menuBtn);

    // Spacer
    const spacer = document.createElement("div");
    spacer.className = "udoc-toolbar__spacer";

    // Right section
    const rightSection = document.createElement("div");
    rightSection.className = "udoc-toolbar__right";
    const searchBtn = createButton("udoc-toolbar__btn--search", "Search", ICON_SEARCH);
    const commentsBtn = createButton("udoc-toolbar__btn--comments", "Comments", ICON_COMMENTS);
    const fullscreenBtn = createButton("udoc-toolbar__btn--fullscreen", "Fullscreen", ICON_FULLSCREEN);
    rightSection.append(searchBtn, commentsBtn, fullscreenBtn);

    el.append(leftSection, spacer, rightSection);

    const unsubEvents: Array<() => void> = [];
    let unsubRender: (() => void) | null = null;

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(el);

        // Wire menu button to toggle thumbnails panel
        const onMenuClick = () => {
            store.dispatch({ type: "TOGGLE_PANEL", panel: "thumbnail" });
        };
        menuBtn.addEventListener("click", onMenuClick);
        unsubEvents.push(() => menuBtn.removeEventListener("click", onMenuClick));

        // Wire search button to toggle search panel
        const onSearchClick = () => {
            store.dispatch({ type: "TOGGLE_PANEL", panel: "search" });
        };
        searchBtn.addEventListener("click", onSearchClick);
        unsubEvents.push(() => searchBtn.removeEventListener("click", onSearchClick));

        // Wire comments button to toggle comments panel
        const onCommentsClick = () => {
            store.dispatch({ type: "TOGGLE_PANEL", panel: "comments" });
        };
        commentsBtn.addEventListener("click", onCommentsClick);
        unsubEvents.push(() => commentsBtn.removeEventListener("click", onCommentsClick));

        // Wire fullscreen button
        const onFullscreenClick = () => {
            const root = el.closest(".udoc-viewer-root") as HTMLElement | null;
            if (!root) return;

            if (!document.fullscreenElement) {
                root.requestFullscreen().catch(() => {
                    // Fullscreen request failed (e.g., not allowed by browser)
                });
            } else {
                document.exitFullscreen().catch(() => {
                    // Exit fullscreen failed
                });
            }
        };
        fullscreenBtn.addEventListener("click", onFullscreenClick);
        unsubEvents.push(() => fullscreenBtn.removeEventListener("click", onFullscreenClick));

        // Listen for fullscreen change events to sync state
        const onFullscreenChange = () => {
            const root = el.closest(".udoc-viewer-root");
            const isFullscreen = document.fullscreenElement === root;
            store.dispatch({ type: "SET_FULLSCREEN", isFullscreen });
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        unsubEvents.push(() => document.removeEventListener("fullscreenchange", onFullscreenChange));

        // Subscribe to state to update fullscreen button icon
        unsubRender = store.subscribeRender((prev, next) => {
            if (prev.isFullscreen !== next.isFullscreen) {
                fullscreenBtn.innerHTML = next.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN;
                fullscreenBtn.setAttribute("aria-label", next.isFullscreen ? "Exit fullscreen" : "Fullscreen");
            }
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        el.remove();
    }

    return { el, mount, destroy };
}
