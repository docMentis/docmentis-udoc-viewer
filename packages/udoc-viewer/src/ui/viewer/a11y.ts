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
