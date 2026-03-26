import type { I18n } from "../i18n/index.js";

export function createAttachmentsPanel() {
    const el = document.createElement("div");
    el.className = "udoc-attachments-panel";

    function mount(container: HTMLElement, i18n: I18n): void {
        const empty = document.createElement("div");
        empty.className = "udoc-panel-empty";
        empty.textContent = i18n.t("attachments.empty");
        el.appendChild(empty);
        container.appendChild(el);
    }

    function destroy(): void {
        el.remove();
    }

    return { el, mount, destroy };
}

export type AttachmentsPanelComponent = ReturnType<typeof createAttachmentsPanel>;
