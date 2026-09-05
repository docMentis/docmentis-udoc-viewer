/**
 * Permit-notice overlay for free-tier usage.
 *
 * Shown inside the viewer area when the WASM runtime refuses to open a document
 * over a free-tier permit — either a usage limit was reached, or the permit
 * service could not be reached. Mirrors the PasswordDialog mounting pattern.
 * Renders whatever `permitNotice` the store carries (title + body), so it covers
 * both cases without a blank screen.
 */

import type { Store } from "../../framework/store";
import type { PermitNotice, ViewerState } from "../state";
import type { Action } from "../actions";

/**
 * Quota-exceeded copy. Intentionally avoids hard-coded numbers — both limits are
 * configurable server-side, so the message stays correct if they change. It also
 * avoids naming which of the two ran out: the runtime error carries that detail
 * (and prints it to the console), but the remedy is the same either way.
 */
export const PERMIT_BLOCKED_NOTICE: PermitNotice = {
    title: "Free usage limit exceeded",
    body:
        "docMentis free usage is limited to a set number of document opens per domain, and per IP address, " +
        "per rolling 24 hours. One of those limits has been reached, so the document cannot be rendered. " +
        "Use a commercial license for unlimited offline usage with no dependency on docMentis servers.",
};

/** Verification-unavailable copy (server unreachable / network / misconfig). */
export const PERMIT_UNAVAILABLE_NOTICE: PermitNotice = {
    title: "Couldn't verify free usage",
    body:
        "docMentis couldn't reach the free-usage verification service, so this document can't be rendered right now. " +
        "Check your network connection and try again. " +
        "Commercial licenses work fully offline with no dependency on docMentis servers.",
};

export function createPermitNoticeOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "udoc-permit-notice-overlay";
    overlay.style.display = "none";

    const dialog = document.createElement("div");
    dialog.className = "udoc-permit-notice-dialog";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-labelledby", "udoc-permit-notice-title");
    dialog.innerHTML = `
        <div class="udoc-permit-notice-header">
            <svg class="udoc-permit-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 id="udoc-permit-notice-title" class="udoc-permit-notice-title"></h2>
        </div>
        <p class="udoc-permit-notice-body"></p>
    `;
    overlay.appendChild(dialog);

    const titleEl = dialog.querySelector(".udoc-permit-notice-title") as HTMLHeadingElement;
    const bodyEl = dialog.querySelector(".udoc-permit-notice-body") as HTMLParagraphElement;

    let unsubRender: (() => void) | null = null;

    function apply(notice: PermitNotice | null): void {
        if (notice) {
            titleEl.textContent = notice.title;
            bodyEl.textContent = notice.body;
            overlay.style.display = "";
        } else {
            overlay.style.display = "none";
        }
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(overlay);
        apply(store.getState().permitNotice);
        unsubRender = store.subscribeRender((prev, next) => {
            if (prev.permitNotice !== next.permitNotice) {
                apply(next.permitNotice);
            }
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        unsubRender = null;
        overlay.remove();
    }

    return { el: overlay, mount, destroy };
}
