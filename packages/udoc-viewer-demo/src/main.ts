import { UDocClient, UDocViewer, type PerformanceLogEntry } from '@docmentis/udoc-viewer';
// Styles are auto-injected by the library

interface SampleDocument {
    name: string;
    path: string;
}

interface SampleCategory {
    name: string;
    description?: string;
    documents: SampleDocument[];
}

const sampleCategories: SampleCategory[] = [
    {
        name: 'Sample',
        documents: [
            { name: 'Sample PDF', path: './pdf/sample.pdf' },
        ],
    },
    {
        name: 'NASA',
        description: 'Public-domain NASA publications.',
        documents: [
            { name: 'Earth Art', path: './pdf/nasa-earth-art.pdf' },
            { name: 'Hubble Focus: Black Holes', path: './pdf/nasa-hubble-focus-black-holes-ebook.pdf' },
        ],
    },
    {
        name: 'PDF Specification',
        description: 'Hosted by Adobe and accessed via its public website.',
        documents: [
            { name: 'PDF Reference 1.7', path: 'https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf' },
        ],
    },
];

// DOM elements - Desktop
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const openFileBtn = document.getElementById('open-file-btn')!;
const openUrlBtn = document.getElementById('open-url-btn')!;
const documentList = document.getElementById('document-list')!;
const viewerContainer = document.getElementById('viewer')!;

// DOM elements - Mobile
const mobileOpenFileBtn = document.getElementById('mobile-open-file-btn')!;
const mobileOpenUrlBtn = document.getElementById('mobile-open-url-btn')!;
const docSelector = document.getElementById('doc-selector')!;
const docSelectorBtn = document.getElementById('doc-selector-btn')!;
const docDropdown = document.getElementById('doc-dropdown')!;
const docNameEl = document.getElementById('doc-name')!;

// State
let viewer: UDocViewer | null = null;
let client: UDocClient | null = null;
let currentDocPath: string | null = null;
let currentDocName: string | null = null;
let activeDesktopDocItem: HTMLButtonElement | null = null;
let activeMobileDocItem: HTMLButtonElement | null = null;

function formatPerformanceEntry(entry: PerformanceLogEntry): string {
    const ctx = entry.context?.pageIndex !== undefined
        ? ` page=${entry.context.pageIndex + 1}` : '';
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
            license: "eyJ2IjoxLCJpZCI6ImxpY19lMjcyMDFjMyIsImQiOlsiKi5kb2NtZW50aXMuY29tIl0sImYiOlsiY29tcG9zZSJdLCJsIjp7Im1heF9wYWdlcyI6MTAwMDAsIm1heF9kb2N1bWVudHMiOjEwMCwibWF4X2ZpbGVfc2l6ZV9tYiI6NTAwfSwiZSI6MTgwMDY2MjM5OSwiaSI6MTc2OTA1NTM1NSwibyI6IkRvY21lbnRpcyJ9.CG0Vf4kHRKRdniEDTf_y_wbZDqdKu0Q5Ez81xvpy_JBiWPRC-5k42hBjlWmwoZTo4mVai8K1-vDaH0WTH3QCCQ",
        });
    }
    viewer = await client.createViewer({
        container: viewerContainer,
        enablePerformanceCounter: true,
        onPerformanceLog: (entry) => {
            console.log(formatPerformanceEntry(entry));
        },
    });

    // Reload current document if any
    if (currentDocPath) {
        await viewer.load(currentDocPath);
    }
}

function updateActiveStates(desktopBtn: HTMLButtonElement | null, mobileBtn: HTMLButtonElement | null) {
    // Update desktop active state
    if (activeDesktopDocItem) {
        activeDesktopDocItem.classList.remove('active');
    }
    if (desktopBtn) {
        desktopBtn.classList.add('active');
    }
    activeDesktopDocItem = desktopBtn;

    // Update mobile active state
    if (activeMobileDocItem) {
        activeMobileDocItem.classList.remove('active');
    }
    if (mobileBtn) {
        mobileBtn.classList.add('active');
    }
    activeMobileDocItem = mobileBtn;
}

async function loadDocument(path: string, name: string, desktopBtn: HTMLButtonElement | null, mobileBtn: HTMLButtonElement | null) {
    currentDocPath = path;
    currentDocName = name;

    updateActiveStates(desktopBtn, mobileBtn);

    // Update mobile document name display
    docNameEl.textContent = name;

    // Load document
    await viewer?.load(path);

    // Close mobile dropdown
    closeDocDropdown();
}

function closeDocDropdown() {
    docSelector.classList.remove('open');
}

function toggleDocDropdown() {
    const isOpen = docSelector.classList.contains('open');
    if (!isOpen) {
        docSelector.classList.add('open');
    } else {
        closeDocDropdown();
    }
}

// Store button pairs for syncing selection between desktop and mobile
const documentButtonPairs: Map<string, { desktop: HTMLButtonElement; mobile: HTMLButtonElement }> = new Map();

function populateDocumentLists() {
    for (const category of sampleCategories) {
        // Desktop: Add category header
        const desktopHeader = document.createElement('div');
        desktopHeader.className = 'category-header';
        desktopHeader.textContent = category.name;
        documentList.appendChild(desktopHeader);

        // Mobile: Add category header
        const mobileHeader = document.createElement('div');
        mobileHeader.className = 'doc-dropdown-category';
        mobileHeader.textContent = category.name;
        docDropdown.appendChild(mobileHeader);

        // Add category description if present
        if (category.description) {
            const desktopDesc = document.createElement('div');
            desktopDesc.className = 'category-description';
            desktopDesc.textContent = category.description;
            documentList.appendChild(desktopDesc);

            const mobileDesc = document.createElement('div');
            mobileDesc.className = 'doc-dropdown-desc';
            mobileDesc.textContent = category.description;
            docDropdown.appendChild(mobileDesc);
        }

        // Add documents in this category
        for (const doc of category.documents) {
            // Desktop button
            const desktopBtn = document.createElement('button');
            desktopBtn.className = 'document-item';
            desktopBtn.textContent = doc.name;

            // Mobile button
            const mobileBtn = document.createElement('button');
            mobileBtn.className = 'doc-dropdown-item';
            mobileBtn.textContent = doc.name;

            // Store the pair
            documentButtonPairs.set(doc.path, { desktop: desktopBtn, mobile: mobileBtn });

            // Wire up click handlers
            desktopBtn.addEventListener('click', () => { void loadDocument(doc.path, doc.name, desktopBtn, mobileBtn); });
            mobileBtn.addEventListener('click', () => { void loadDocument(doc.path, doc.name, desktopBtn, mobileBtn); });

            documentList.appendChild(desktopBtn);
            docDropdown.appendChild(mobileBtn);
        }
    }
}

function openFile() {
    fileInput.click();
}

async function openUrl() {
    const url = prompt('Enter document URL:');
    if (url) {
        currentDocPath = url;
        currentDocName = url.split('/').pop() || url;
        updateActiveStates(null, null);
        docNameEl.textContent = currentDocName;
        await viewer?.load(url);
    }
}

function setupEventListeners() {
    // Desktop: File buttons
    openFileBtn.addEventListener('click', openFile);
    openUrlBtn.addEventListener('click', () => { void openUrl(); });

    // Mobile: File buttons
    mobileOpenFileBtn.addEventListener('click', openFile);
    mobileOpenUrlBtn.addEventListener('click', () => { void openUrl(); });

    // Mobile: Document selector dropdown
    docSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDocDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!docSelector.contains(e.target as Node)) {
            closeDocDropdown();
        }
    });

    // File input change
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (file) {
            currentDocPath = null;
            currentDocName = file.name;
            updateActiveStates(null, null);
            docNameEl.textContent = file.name;
            await viewer?.load(file);
            fileInput.value = '';
        }
    });
}

async function main() {
    populateDocumentLists();
    setupEventListeners();

    // Create initial viewer
    await createViewer();

    // Load first document
    const firstDoc = sampleCategories[0].documents[0];
    const pair = documentButtonPairs.get(firstDoc.path);
    if (pair) {
        await loadDocument(firstDoc.path, firstDoc.name, pair.desktop, pair.mobile);
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
