import type { UDocViewer } from "@docmentis/udoc-viewer";
import { UDocClient, type PerformanceLogEntry } from "@docmentis/udoc-viewer";
// Styles are auto-injected by the library

interface SampleDocument {
    name: string;
    path: string;
    viewerOptions?: {
        enableTransitions?: boolean;
    };
}

interface SampleCategory {
    name: string;
    description?: string;
    documents: SampleDocument[];
}

const sampleCategories: SampleCategory[] = [
    {
        name: "PDF",
        description: "NASA documents are public-domain.",
        documents: [
            {
                name: "Hubble Fact Sheet: Mission Operations",
                path: "./pdf/nasa-hubble-fact-sheet-mission-operations.pdf",
            },
            { name: "Hubble Focus: Black Holes", path: "./pdf/nasa-hubble-focus-black-holes-ebook.pdf" },
            { name: "Earth Art", path: "./pdf/nasa-earth-art.pdf" },
        ],
    },
    {
        name: "DOCX",
        documents: [{ name: "NASA Artemis Status Report", path: "./nasa-artemis-status-report.docx" }],
    },
    {
        name: "PPTX",
        documents: [
            { name: "James Webb Space Telescope", path: "./james-webb-space-telescope.pptx" },
            {
                name: "Slide Transition Demo (Beta)",
                path: "./transition-demo.pptx",
                viewerOptions: { enableTransitions: true },
            },
        ],
    },
    {
        name: "XLSX",
        documents: [{ name: "NASA Airborne Science Program", path: "./nasa_asp_schedule_2026_01.xlsx" }],
    },
    {
        name: "Image",
        description: "Public-domain NASA/JWST images.",
        documents: [
            { name: "Cosmic Cliffs in Carina Nebula", path: "./cosmic-cliffs-carina-nebula.png" },
            { name: "Pillars of Creation", path: "./pillars-of-creation.png" },
            { name: "Stephan's Quintet", path: "./stephans-quintet.png" },
        ],
    },
];

// DOM elements - Desktop
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const openFileBtn = document.getElementById("open-file-btn")!;
const openUrlBtn = document.getElementById("open-url-btn")!;
const documentList = document.getElementById("document-list")!;
const viewerContainer = document.getElementById("viewer")!;

// DOM elements - Mobile
const mobileOpenFileBtn = document.getElementById("mobile-open-file-btn")!;
const mobileOpenUrlBtn = document.getElementById("mobile-open-url-btn")!;
const docSelector = document.getElementById("doc-selector")!;
const docSelectorBtn = document.getElementById("doc-selector-btn")!;
const docDropdown = document.getElementById("doc-dropdown")!;
const docNameEl = document.getElementById("doc-name")!;

// State
let viewer: UDocViewer | null = null;
let client: UDocClient | null = null;
let gpuEnabled = false;
let memoryOverlayEnabled = false;
let memoryOverlayTimer: ReturnType<typeof setInterval> | null = null;
let memoryOverlayUnsubOOM: (() => void) | null = null;
let oomCount = 0;
let lastOOMMessage: string | null = null;
let hideAttribution = false;
let enableTransitions = false;
let disableViewTools = false;
let disableAnnotateTools = false;
let enableMarkupTools = false;
let currentLocale = "en";
let currentDocSource: string | File | null = null;
let currentDocName: string | null = null;
let activeDesktopDocItem: HTMLButtonElement | null = null;
let activeMobileDocItem: HTMLButtonElement | null = null;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

let lastWasmBytes = 0;

function ensureMemoryOverlayEl(): HTMLDivElement | null {
    // Mount inside the viewer's scrollable content area so the overlay moves
    // with the viewer and doesn't cover the toolbar/panels.
    const host = viewerContainer.querySelector<HTMLElement>(".udoc-viewport__content");
    if (!host) return null;
    let el = host.querySelector<HTMLDivElement>(":scope > .memory-overlay");
    if (!el) {
        el = document.createElement("div");
        el.className = "memory-overlay";
        host.appendChild(el);
    }
    return el;
}

function renderMemoryOverlay() {
    const el = ensureMemoryOverlayEl();
    if (!el || !client) return;
    const s = client.getRenderCacheStats();
    const pad = (n: number, w: number) => String(n).padStart(w);
    const stats =
        `cache          count    bytes\n` +
        `page       ${pad(s.page.count, 7)}  ${formatBytes(s.page.bytes)}\n` +
        `thumbnail  ${pad(s.thumbnail.count, 7)}  ${formatBytes(s.thumbnail.bytes)}\n` +
        `preview    ${pad(s.preview.count, 7)}  ${formatBytes(s.preview.bytes)}\n` +
        `total      ${pad(s.total.count, 7)}  ${formatBytes(s.total.bytes)}\n` +
        `wasm       ${" ".repeat(7)}  ${lastWasmBytes > 0 ? formatBytes(lastWasmBytes) : "—"}`;
    el.textContent = stats;
    if (oomCount > 0) {
        const oomLine = document.createElement("div");
        oomLine.className = "memory-overlay__oom";
        oomLine.textContent = `OOM fires: ${oomCount}${lastOOMMessage ? ` — ${lastOOMMessage}` : ""}`;
        el.appendChild(document.createElement("br"));
        el.appendChild(oomLine);
    }
}

function startMemoryOverlay() {
    oomCount = 0;
    lastOOMMessage = null;
    lastWasmBytes = 0;
    if (memoryOverlayTimer) clearInterval(memoryOverlayTimer);
    memoryOverlayTimer = setInterval(() => {
        renderMemoryOverlay();
        // WASM memory is async — fire-and-forget so the poll tick stays snappy.
        client
            ?.getWasmMemoryBytes()
            .then((b) => {
                lastWasmBytes = b;
            })
            .catch(() => {
                /* ignore */
            });
    }, 1000);
    renderMemoryOverlay();
    memoryOverlayUnsubOOM?.();
    memoryOverlayUnsubOOM =
        client?.onOOM((err) => {
            oomCount += 1;
            lastOOMMessage = err.message.slice(0, 80);
            renderMemoryOverlay();
        }) ?? null;
}

function stopMemoryOverlay() {
    const host = viewerContainer.querySelector<HTMLElement>(".udoc-viewport__content");
    const el = host?.querySelector<HTMLDivElement>(":scope > .memory-overlay");
    el?.remove();
    if (memoryOverlayTimer) {
        clearInterval(memoryOverlayTimer);
        memoryOverlayTimer = null;
    }
    memoryOverlayUnsubOOM?.();
    memoryOverlayUnsubOOM = null;
}

function formatPerformanceEntry(entry: PerformanceLogEntry): string {
    const ctx = entry.context?.pageIndex !== undefined ? ` page=${entry.context.pageIndex + 1}` : "";
    if (entry.phase === "start") {
        return `[${entry.timestamp.toFixed(0)}ms] START ${entry.type}${ctx}`;
    } else {
        return `[${entry.timestamp.toFixed(0)}ms] END ${entry.type}${ctx} (duration: ${entry.duration?.toFixed(0)}ms)`;
    }
}

async function createViewer() {
    // Destroy existing viewer
    if (viewer) {
        viewer.destroy();
    }

    // Create new viewer
    if (!client) {
        client = await UDocClient.create({
            license:
                "eyJ2IjoxLCJpZCI6ImxpY19jOGNlZjE4ZiIsImQiOlsiZG9jbWVudGlzLmNvbSIsIiouZG9jbWVudGlzLmNvbSJdLCJmIjpbIm5vX2F0dHJpYnV0aW9uIl0sImUiOjE4MDU1MDA3OTksImkiOjE3NzM4ODU1MDYsIm8iOiJkb2NNZW50aXMifQ.E-Wef8w3LnFAbFgZBTrXa4uQ8VMFby59Fg8VLOrm0lNgI4BcLuDxpH_2NheFA89eW8QmKs_vGOdtG619XcOcCg",
            __experimentalGpu: gpuEnabled,
            fonts: [
                {
                    typeface: "Roboto",
                    bold: false,
                    italic: false,
                    url: new URL("../fonts/Roboto-Regular.ttf", import.meta.url).href,
                },
                {
                    typeface: "Roboto",
                    bold: true,
                    italic: false,
                    url: new URL("../fonts/Roboto-Bold.ttf", import.meta.url).href,
                },
                {
                    typeface: "Roboto",
                    bold: false,
                    italic: true,
                    url: new URL("../fonts/Roboto-Italic.ttf", import.meta.url).href,
                },
                {
                    typeface: "Roboto",
                    bold: true,
                    italic: true,
                    url: new URL("../fonts/Roboto-BoldItalic.ttf", import.meta.url).href,
                },
            ],
        });
    }
    viewer = await client.createViewer({
        container: viewerContainer,
        hideAttribution,
        enableTransitions,
        disableViewTools,
        disableAnnotateTools,
        __experimentalDisableMarkupTools: !enableMarkupTools,
        locale: currentLocale,
        enablePerformanceCounter: true,
        onPerformanceLog: (entry) => {
            console.log(formatPerformanceEntry(entry));
        },
    });

    // Expose viewer for devtools debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__viewer = viewer;

    // Reload current document if any
    if (currentDocSource) {
        await viewer.load(currentDocSource);
    }

    // Re-attach memory overlay subscription if it's enabled (client may have been recreated)
    if (memoryOverlayEnabled) {
        startMemoryOverlay();
    }
}

function updateActiveStates(desktopBtn: HTMLButtonElement | null, mobileBtn: HTMLButtonElement | null) {
    // Update desktop active state
    if (activeDesktopDocItem) {
        activeDesktopDocItem.classList.remove("active");
    }
    if (desktopBtn) {
        desktopBtn.classList.add("active");
    }
    activeDesktopDocItem = desktopBtn;

    // Update mobile active state
    if (activeMobileDocItem) {
        activeMobileDocItem.classList.remove("active");
    }
    if (mobileBtn) {
        mobileBtn.classList.add("active");
    }
    activeMobileDocItem = mobileBtn;
}

async function loadDocument(
    doc: SampleDocument,
    desktopBtn: HTMLButtonElement | null,
    mobileBtn: HTMLButtonElement | null,
) {
    currentDocSource = doc.path;
    currentDocName = doc.name;

    updateActiveStates(desktopBtn, mobileBtn);

    // Update mobile document name display
    docNameEl.textContent = doc.name;

    // Apply per-document viewer options
    if (doc.viewerOptions?.enableTransitions !== undefined) {
        enableTransitions = doc.viewerOptions.enableTransitions;
        const cb = document.querySelector<HTMLInputElement>('[data-option-id="transitions"]');
        if (cb) cb.checked = enableTransitions;
    }

    // Always recreate viewer; createViewer() reloads currentDocSource
    await createViewer();

    // Close mobile dropdown
    closeDocDropdown();
}

function closeDocDropdown() {
    docSelector.classList.remove("open");
}

function toggleDocDropdown() {
    const isOpen = docSelector.classList.contains("open");
    if (!isOpen) {
        docSelector.classList.add("open");
    } else {
        closeDocDropdown();
    }
}

// Store button pairs for syncing selection between desktop and mobile
const documentButtonPairs: Map<string, { desktop: HTMLButtonElement; mobile: HTMLButtonElement }> = new Map();

const DOC_TYPE_ICONS: Record<string, string> = {
    // PDF: document with lines
    pdf: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>',
    // DOCX: document with A text
    docx: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/><path d="M9.5 13.5L12 19l2.5-5.5h1.3L12.7 20h-1.4L8.2 13.5z"/>',
    // PPTX: presentation/slides
    pptx: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 17h10v-2H7v2zm5-10l-5 8h10l-5-8z"/>',
    // XLSX: spreadsheet/table grid
    xlsx: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H5V5h14zM5 19v-9h6v9H5zm8 0v-9h6v9h-6z"/>',
    // Image: landscape photo
    img: '<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>',
};

function populateDocumentLists() {
    for (const category of sampleCategories) {
        // Desktop: Add category header
        const desktopHeader = document.createElement("div");
        desktopHeader.className = "category-header";
        desktopHeader.textContent = category.name;
        documentList.appendChild(desktopHeader);

        // Mobile: Add category header
        const mobileHeader = document.createElement("div");
        mobileHeader.className = "doc-dropdown-category";
        mobileHeader.textContent = category.name;
        docDropdown.appendChild(mobileHeader);

        // Add category description if present
        if (category.description) {
            const desktopDesc = document.createElement("div");
            desktopDesc.className = "category-description";
            desktopDesc.textContent = category.description;
            documentList.appendChild(desktopDesc);

            const mobileDesc = document.createElement("div");
            mobileDesc.className = "doc-dropdown-desc";
            mobileDesc.textContent = category.description;
            docDropdown.appendChild(mobileDesc);
        }

        // Add documents in this category
        const iconType = category.name === "Image" ? "img" : category.name.toLowerCase();
        for (const doc of category.documents) {
            // Desktop button
            const desktopBtn = document.createElement("button");
            desktopBtn.className = "document-item";
            const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            icon.setAttribute("viewBox", "0 0 24 24");
            icon.setAttribute("fill", "currentColor");
            icon.classList.add("doc-icon", iconType);
            icon.innerHTML = DOC_TYPE_ICONS[iconType] ?? DOC_TYPE_ICONS.pdf;
            const nameSpan = document.createElement("span");
            nameSpan.textContent = doc.name;
            desktopBtn.append(icon, nameSpan);

            // Mobile button
            const mobileBtn = document.createElement("button");
            mobileBtn.className = "doc-dropdown-item";
            mobileBtn.textContent = doc.name;

            // Store the pair
            documentButtonPairs.set(doc.path, { desktop: desktopBtn, mobile: mobileBtn });

            // Wire up click handlers
            desktopBtn.addEventListener("click", () => {
                void loadDocument(doc, desktopBtn, mobileBtn);
            });
            mobileBtn.addEventListener("click", () => {
                void loadDocument(doc, desktopBtn, mobileBtn);
            });

            documentList.appendChild(desktopBtn);
            docDropdown.appendChild(mobileBtn);
        }
    }
}

function openFile() {
    fileInput.click();
}

async function openUrl() {
    const url = prompt("Enter document URL:");
    if (url) {
        currentDocSource = url;
        currentDocName = url.split("/").pop() || url;
        updateActiveStates(null, null);
        docNameEl.textContent = currentDocName;
        await createViewer();
    }
}

function setupEventListeners() {
    // Desktop: File buttons
    openFileBtn.addEventListener("click", openFile);
    openUrlBtn.addEventListener("click", () => {
        void openUrl();
    });

    // Mobile: File buttons
    mobileOpenFileBtn.addEventListener("click", openFile);
    mobileOpenUrlBtn.addEventListener("click", () => {
        void openUrl();
    });

    // Mobile: Document selector dropdown
    docSelectorBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDocDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!docSelector.contains(e.target as Node)) {
            closeDocDropdown();
        }
    });

    // File input change
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (file) {
            currentDocSource = file;
            currentDocName = file.name;
            updateActiveStates(null, null);
            docNameEl.textContent = file.name;
            await createViewer();
            fileInput.value = "";
        }
    });
}

interface ToggleOption {
    id?: string;
    label: string;
    hint?: string;
    onChange: (checked: boolean, v: UDocViewer) => void | Promise<void>;
}

interface ToggleGroup {
    title: string;
    options: ToggleOption[];
}

const LOCALES = [
    { value: "en", label: "English" },
    { value: "zh-CN", label: "中文 (简体)" },
    { value: "zh-TW", label: "中文 (繁體)" },
    { value: "ja", label: "日本語" },
    { value: "ko", label: "한국어" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "pt-BR", label: "Português (Brasil)" },
    { value: "ar", label: "العربية" },
    { value: "ru", label: "Русский" },
];

const OPTION_GROUPS: ToggleGroup[] = [
    {
        title: "Branding",
        options: [
            {
                label: "Hide Attribution",
                hint: "Requires license",
                onChange: async (checked) => {
                    hideAttribution = checked;
                    // Attribution is set at viewer creation — must recreate
                    await createViewer();
                },
            },
        ],
    },
    {
        title: "Toolbar",
        options: [
            { label: "Hide Toolbar", onChange: (c, v) => v.setToolbarVisible(!c) },
            { label: "Hide Floating Toolbar", onChange: (c, v) => v.setFloatingToolbarVisible(!c) },
            { label: "Disable Fullscreen", onChange: (c, v) => v.setFullscreenEnabled(!c) },
            { label: "Disable Download", onChange: (c, v) => v.setDownloadEnabled(!c) },
            { label: "Disable Print", onChange: (c, v) => v.setPrintEnabled(!c) },
        ],
    },
    {
        title: "Tools",
        options: [
            {
                label: "Disable View Tools",
                hint: "Pointer, hand, zoom",
                onChange: async (checked) => {
                    disableViewTools = checked;
                    await createViewer();
                },
            },
            {
                label: "Disable Annotation Tools",
                onChange: async (checked) => {
                    disableAnnotateTools = checked;
                    await createViewer();
                },
            },
            {
                label: "Markup Tools (Beta)",
                onChange: async (checked) => {
                    enableMarkupTools = checked;
                    await createViewer();
                },
            },
        ],
    },
    {
        title: "Left Panel",
        options: [
            { label: "Disable Left Panel", onChange: (c, v) => v.setLeftPanelEnabled(!c) },
            { label: "Disable Thumbnails", onChange: (c, v) => v.setPanelEnabled("thumbnail", !c) },
            { label: "Disable Outline", onChange: (c, v) => v.setPanelEnabled("outline", !c) },
            { label: "Disable Bookmarks", onChange: (c, v) => v.setPanelEnabled("bookmarks", !c) },
            { label: "Disable Layers", onChange: (c, v) => v.setPanelEnabled("layers", !c) },
            { label: "Disable Attachments", onChange: (c, v) => v.setPanelEnabled("attachments", !c) },
        ],
    },
    {
        title: "Right Panel",
        options: [
            { label: "Disable Right Panel", onChange: (c, v) => v.setRightPanelEnabled(!c) },
            { label: "Disable Search", onChange: (c, v) => v.setPanelEnabled("search", !c) },
            { label: "Disable Comments", onChange: (c, v) => v.setPanelEnabled("comments", !c) },
        ],
    },
    {
        title: "Rendering",
        options: [
            {
                label: "GPU Acceleration (Beta)",
                onChange: async (checked) => {
                    gpuEnabled = checked;
                    // GPU init happens at client creation — must recreate
                    if (client) {
                        client.destroy();
                        client = null;
                        viewer = null;
                    }
                    await createViewer();
                },
            },
            {
                id: "transitions",
                label: "Slide Transitions (Beta)",
                hint: "PPTX only",
                onChange: async (checked) => {
                    enableTransitions = checked;
                    // Transition setting is applied at viewer creation — must recreate
                    await createViewer();
                },
            },
            {
                label: "Memory Overlay (Debug)",
                hint: "Shows render cache size & OOM fires",
                onChange: (checked) => {
                    memoryOverlayEnabled = checked;
                    if (checked) startMemoryOverlay();
                    else stopMemoryOverlay();
                },
            },
        ],
    },
];

function setupOptionsPanel() {
    const container = document.getElementById("options-section")!;

    // Locale selector
    const localeGroup = document.createElement("div");
    localeGroup.className = "options-group";

    const localeTitle = document.createElement("div");
    localeTitle.className = "options-group-title";
    localeTitle.textContent = "Locale";
    localeGroup.appendChild(localeTitle);

    const localeRow = document.createElement("div");
    localeRow.className = "option-row";

    const localeLabel = document.createElement("label");
    localeLabel.className = "option-label";
    localeLabel.textContent = "Language";

    const localeSelect = document.createElement("select");
    localeSelect.className = "option-select";
    for (const loc of LOCALES) {
        const option = document.createElement("option");
        option.value = loc.value;
        option.textContent = loc.label;
        if (loc.value === currentLocale) option.selected = true;
        localeSelect.appendChild(option);
    }
    localeSelect.addEventListener("change", async () => {
        currentLocale = localeSelect.value;
        await createViewer();
    });

    localeRow.append(localeLabel, localeSelect);
    localeGroup.appendChild(localeRow);
    container.appendChild(localeGroup);

    for (const group of OPTION_GROUPS) {
        const groupEl = document.createElement("div");
        groupEl.className = "options-group";

        const title = document.createElement("div");
        title.className = "options-group-title";
        title.textContent = group.title;
        groupEl.appendChild(title);

        for (const opt of group.options) {
            const row = document.createElement("div");
            row.className = "option-row";

            const label = document.createElement("label");
            label.className = "option-label";
            label.textContent = opt.label;
            if (opt.hint) {
                const hint = document.createElement("span");
                hint.className = "option-hint";
                hint.textContent = `(${opt.hint})`;
                label.appendChild(hint);
            }

            const toggle = document.createElement("label");
            toggle.className = "option-toggle";

            const input = document.createElement("input");
            input.type = "checkbox";
            if (opt.id) input.dataset.optionId = opt.id;
            input.addEventListener("change", () => {
                if (viewer) {
                    opt.onChange(input.checked, viewer);
                }
            });

            const slider = document.createElement("span");
            slider.className = "slider";

            toggle.append(input, slider);
            row.append(label, toggle);
            groupEl.appendChild(row);
        }

        container.appendChild(groupEl);
    }
}

function setupOptionsModal() {
    const overlay = document.getElementById("options-overlay")!;
    const closeBtn = document.getElementById("options-modal-close")!;
    const desktopOpenBtn = document.getElementById("options-open-btn")!;
    const mobileOpenBtn = document.getElementById("mobile-options-btn")!;

    function openModal() {
        overlay.classList.add("open");
    }
    function closeModal() {
        overlay.classList.remove("open");
    }

    desktopOpenBtn.addEventListener("click", openModal);
    mobileOpenBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });
}

async function main() {
    populateDocumentLists();
    setupEventListeners();
    setupOptionsPanel();
    setupOptionsModal();

    // Create initial viewer
    await createViewer();

    // Load first document
    const firstDoc = sampleCategories[0].documents[0];
    const pair = documentButtonPairs.get(firstDoc.path);
    if (pair) {
        await loadDocument(firstDoc, pair.desktop, pair.mobile);
    }
}

void main();

// HMR handling - recreate client when modules change
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        // Destroy old client to terminate the stale worker
        if (client) {
            client.destroy();
            client = null;
            viewer = null;
        }
        // Full page reload to get fresh state
        window.location.reload();
    });
}
