/**
 * Shared accessibility utilities for the viewer UI.
 */

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a container element (for modal dialogs).
 * Returns a cleanup function to remove the event listener.
 */
export function trapFocus(container: HTMLElement): () => void {
    const handler = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => el.offsetParent !== null,
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    container.addEventListener("keydown", handler);
    return () => container.removeEventListener("keydown", handler);
}

/**
 * Creates a visually-hidden live region for screen reader announcements.
 */
export function createLiveRegion(): {
    announce: (msg: string) => void;
    el: HTMLElement;
    destroy: () => void;
} {
    const el = document.createElement("div");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.setAttribute("role", "status");
    el.className = "udoc-sr-only";

    let timer: ReturnType<typeof setTimeout> | null = null;

    function announce(msg: string): void {
        // Clear first so repeated identical messages still fire
        el.textContent = "";
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            el.textContent = msg;
        }, 50);
    }

    function destroy(): void {
        if (timer) clearTimeout(timer);
        el.remove();
    }

    return { announce, el, destroy };
}

/**
 * Sets up roving tabindex on a toolbar or group of items.
 * Only one item has tabindex="0" at a time; arrow keys move between items.
 * Call `refresh()` after showing/hiding items so the active index stays valid.
 */
export function setupRovingTabindex(
    container: HTMLElement,
    itemSelector: string,
    direction: "horizontal" | "vertical" = "horizontal",
): { refresh: () => void; destroy: () => void } {
    let activeIndex = 0;

    function getItems(): HTMLElement[] {
        return Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).filter(
            (el) => el.offsetParent !== null && !el.hasAttribute("disabled"),
        );
    }

    function refresh(): void {
        const items = getItems();
        if (items.length === 0) return;

        // Clamp active index
        if (activeIndex >= items.length) activeIndex = 0;

        for (let i = 0; i < items.length; i++) {
            items[i].setAttribute("tabindex", i === activeIndex ? "0" : "-1");
        }
    }

    function handler(e: KeyboardEvent): void {
        const prevKey = direction === "horizontal" ? "ArrowLeft" : "ArrowUp";
        const nextKey = direction === "horizontal" ? "ArrowRight" : "ArrowDown";

        if (e.key !== prevKey && e.key !== nextKey && e.key !== "Home" && e.key !== "End") return;

        const items = getItems();
        if (items.length === 0) return;

        e.preventDefault();

        const currentIndex = items.findIndex((item) => item === document.activeElement);
        let nextIndex: number;

        if (e.key === "Home") {
            nextIndex = 0;
        } else if (e.key === "End") {
            nextIndex = items.length - 1;
        } else if (e.key === nextKey) {
            nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        items[currentIndex]?.setAttribute("tabindex", "-1");
        items[nextIndex].setAttribute("tabindex", "0");
        items[nextIndex].focus();
        activeIndex = nextIndex;
    }

    container.addEventListener("keydown", handler);
    refresh();

    return {
        refresh,
        destroy: () => container.removeEventListener("keydown", handler),
    };
}
