import type { Store } from "../../framework/store";
import { subscribeSelector } from "../../framework/selectors";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import type { WorkerClient } from "../../../worker/index.js";
import type { FontUsageEntry, FontSource } from "../../../worker/index.js";
import type { I18n } from "../i18n/index.js";

type FontsSlice = {
    docId: string | null;
};

function selectFontsSlice(state: ViewerState): FontsSlice {
    return { docId: state.doc?.id ?? null };
}

function formatSource(source: FontSource): string {
    if (typeof source === "string") return source;
    return source.custom;
}

export function createFontsPanel() {
    const el = document.createElement("div");
    el.className = "udoc-fonts-panel";

    let workerClientRef: WorkerClient | null = null;
    let i18nRef: I18n | null = null;
    let currentDocId: string | null = null;

    let unsubRender: (() => void) | null = null;
    let unsubFontUsage: (() => void) | null = null;

    function renderEntries(entries: FontUsageEntry[]): void {
        el.innerHTML = "";

        if (entries.length === 0) {
            const empty = document.createElement("div");
            empty.className = "udoc-panel-empty";
            empty.textContent = i18nRef!.t("fonts.empty");
            el.appendChild(empty);
            return;
        }

        for (const entry of entries) {
            const item = document.createElement("div");
            item.className = "udoc-fonts-panel__item";

            // Spec (what the document requested)
            const specEl = document.createElement("div");
            specEl.className = "udoc-fonts-panel__spec";
            if ("typeface" in entry.spec) {
                let name = entry.spec.typeface;
                const styles: string[] = [];
                if (entry.spec.bold) styles.push("Bold");
                if (entry.spec.italic) styles.push("Italic");
                if (styles.length > 0) name += ` ${styles.join(" ")}`;
                specEl.textContent = name;
            } else {
                specEl.textContent = entry.spec.fontId;
            }
            item.appendChild(specEl);

            // Font tree (resolved + fallbacks)
            const treeEl = document.createElement("div");
            treeEl.className = "udoc-fonts-panel__tree";

            // Build resolved font info row
            const allFonts: { info: typeof entry.resolved; primary: boolean }[] = [
                { info: entry.resolved, primary: true },
                ...entry.fallbacks.map((fb) => ({ info: fb, primary: false })),
            ];

            for (const { info, primary } of allFonts) {
                const row = document.createElement("div");
                row.className = `udoc-fonts-panel__font-row${primary ? "" : " udoc-fonts-panel__font-row--fallback"}`;

                const dot = document.createElement("span");
                dot.className = `udoc-fonts-panel__dot${primary ? " udoc-fonts-panel__dot--primary" : ""}`;
                row.appendChild(dot);

                const nameEl = document.createElement("span");
                nameEl.className = "udoc-fonts-panel__font-name";
                let fontName =
                    info.familyName ||
                    info.postscriptName ||
                    ("typeface" in entry.spec ? entry.spec.typeface : entry.spec.fontId);
                if (info.bold) fontName += " Bold";
                if (info.italic) fontName += " Italic";
                nameEl.textContent = fontName;
                row.appendChild(nameEl);

                const sourceEl = document.createElement("span");
                sourceEl.className = "udoc-fonts-panel__source";
                sourceEl.textContent = formatSource(info.source);
                row.appendChild(sourceEl);

                treeEl.appendChild(row);
            }

            item.appendChild(treeEl);

            el.appendChild(item);
        }
    }

    function showLoading(): void {
        el.innerHTML = "";
        const loading = document.createElement("div");
        loading.className = "udoc-fonts-panel__loading";
        loading.textContent = i18nRef!.t("fonts.loading");
        el.appendChild(loading);
    }

    async function loadFontUsage(docId: string): Promise<void> {
        if (!workerClientRef) return;
        try {
            const entries = (await workerClientRef.getFontUsage(docId)) as FontUsageEntry[];
            // Check we're still showing the same doc
            if (currentDocId === docId) {
                renderEntries(entries);
            }
        } catch {
            // Document may have been unloaded
        }
    }

    function applyState(slice: FontsSlice): void {
        if (slice.docId === currentDocId) return;
        currentDocId = slice.docId;

        if (!currentDocId) {
            el.innerHTML = "";
            return;
        }

        showLoading();
        loadFontUsage(currentDocId);
    }

    function mount(
        container: HTMLElement,
        store: Store<ViewerState, Action>,
        workerClient: WorkerClient,
        i18n: I18n,
    ): void {
        container.appendChild(el);
        workerClientRef = workerClient;
        i18nRef = i18n;

        applyState(selectFontsSlice(store.getState()));
        unsubRender = subscribeSelector(store, selectFontsSlice, applyState, {
            equality: (a, b) => a.docId === b.docId,
        });

        // Listen for font usage changes to refresh
        unsubFontUsage = workerClient.onFontUsageChanged((docId) => {
            if (currentDocId === docId) {
                loadFontUsage(docId);
            }
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        if (unsubFontUsage) unsubFontUsage();

        workerClientRef = null;
        currentDocId = null;

        el.remove();
    }

    return { el, mount, destroy };
}

export type FontsPanelComponent = ReturnType<typeof createFontsPanel>;
