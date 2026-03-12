# @docmentis/udoc-viewer

Universal document viewer for the web.

Open-source, framework-agnostic viewer powered by a built-from-scratch WebAssembly engine for high-fidelity rendering across PDF, DOCX, PPTX, and images.

[![npm version](https://img.shields.io/npm/v/@docmentis/udoc-viewer)](https://www.npmjs.com/package/@docmentis/udoc-viewer)
[![license](https://img.shields.io/npm/l/@docmentis/udoc-viewer)](./LICENSE)

**[Live Demo](https://docmentis.com/viewer/demo)** · **[Guide](https://docmentis.com/viewer/guide)** · **[Changelog](https://github.com/docmentis/docmentis-udoc-viewer/blob/main/CHANGELOG.md)** · **[Report Issue](https://github.com/docmentis/docmentis-udoc-viewer/issues)**

---

## Why udoc-viewer?

Most web document viewers only handle PDF, rely on server-side rendering, or require expensive commercial licenses. udoc-viewer is different:

- **Truly universal** — PDF, Word, PowerPoint, and images in a single viewer, with more formats coming
- **High fidelity** — powered by a custom Rust/WebAssembly rendering engine, not PDF.js
- **Client-side only** — everything runs in the browser, no server round-trips
- **Framework agnostic** — works with React, Vue, Angular, Svelte, or plain HTML
- **Free for commercial use** — MIT-licensed wrapper, free WASM engine

## Supported Formats

| Format | Extensions                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------- |
| PDF    | .pdf                                                                                              |
| DOCX   | .docx                                                                                             |
| PPTX   | .pptx                                                                                             |
| Images | .png, .jpg, .jpeg, .gif, .webp, .bmp, .tif, .tiff, .ico, .tga, .ppm, .pgm, .pbm, .hdr, .exr, .qoi |

## Quick Start

### Install

```bash
npm install @docmentis/udoc-viewer
```

### Basic Usage

```js
import { UDocClient } from "@docmentis/udoc-viewer";

// Create a client (loads the WASM engine)
const client = await UDocClient.create();

// Create a viewer attached to a container element
const viewer = await client.createViewer({
    container: "#viewer",
});

// Load a document
await viewer.load("https://example.com/document.pdf");

// Clean up when done
viewer.destroy();
client.destroy();
```

### HTML

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script type="module">
    import { UDocClient } from "@docmentis/udoc-viewer";

    const client = await UDocClient.create();
    const viewer = await client.createViewer({ container: "#viewer" });
    await viewer.load("/path/to/document.pdf");
</script>
```

### React

```jsx
import { useEffect, useRef } from "react";
import { UDocClient } from "@docmentis/udoc-viewer";

function DocumentViewer({ src }) {
    const containerRef = useRef(null);

    useEffect(() => {
        let client, viewer;

        (async () => {
            client = await UDocClient.create();
            viewer = await client.createViewer({
                container: containerRef.current,
            });
            await viewer.load(src);
        })();

        return () => {
            viewer?.destroy();
            client?.destroy();
        };
    }, [src]);

    return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
}
```

## Examples

Full working examples for every major framework are in the [`examples/`](../../examples/) directory:

| Example                                              | Stack               |
| ---------------------------------------------------- | ------------------- |
| [vanilla](../../examples/vanilla/)                   | TypeScript + Vite   |
| [react-vite](../../examples/react-vite/)             | React + Vite        |
| [vue-vite](../../examples/vue-vite/)                 | Vue + Vite          |
| [svelte-vite](../../examples/svelte-vite/)           | Svelte 5 + Vite     |
| [angular](../../examples/angular/)                   | Angular 19          |
| [nextjs-webpack](../../examples/nextjs-webpack/)     | Next.js + Webpack   |
| [nextjs-turbopack](../../examples/nextjs-turbopack/) | Next.js + Turbopack |
| [nuxt](../../examples/nuxt/)                         | Nuxt 3              |

## Features

- 📄 **Multi-format rendering** — PDF, DOCX, PPTX, and images in one unified viewer
- 🎯 **High-fidelity output** — custom Rust rendering engine compiled to WebAssembly
- 🔍 **Zoom & navigation** — toolbar with zoom controls, page thumbnails, and keyboard navigation
- 🔎 **Full-text search** — search with match highlighting and navigation
- 🌓 **Dark mode** — built-in light/dark theme with system preference support
- 🎨 **Customizable** — override colors and styles via CSS variables
- 📱 **Responsive** — works on desktop and mobile browsers
- 🌊 **Streaming** — pages render progressively as the document loads
- 🔒 **Private** — documents never leave the browser; no server upload required

## API Reference

### Client Options

```typescript
const client = await UDocClient.create({
    // License key for commercial use (optional)
    // Enables licensed features such as hiding the attribution link
    license: "eyJ2Ijox...",

    // Custom base URL for worker and WASM files (optional)
    // Expected files: {baseUrl}/worker.js and {baseUrl}/udoc_bg.wasm
    baseUrl: "https://cdn.example.com/udoc/",
});
```

### Viewer Options

```typescript
const viewer = await client.createViewer({
    // Container element or CSS selector (required for UI mode, omit for headless)
    container: "#viewer",

    // --- View modes ---

    // Scroll mode: 'continuous' or 'spread' (default: 'continuous')
    scrollMode: "continuous",

    // Layout mode: 'single-page', 'double-page', 'double-page-odd-right', 'double-page-odd-left'
    // (default: 'single-page')
    layoutMode: "single-page",

    // Initial page rotation: 0, 90, 180, or 270 (default: 0)
    pageRotation: 0,

    // Spacing mode: 'all', 'none', 'spread-only', 'page-only' (default: 'all')
    spacingMode: "all",

    // --- Zoom ---

    // Zoom mode: 'fit-spread-width', 'fit-spread-width-max', 'fit-spread-height', 'fit-spread', 'custom'
    // (default: 'fit-spread-width')
    zoomMode: "fit-spread-width",

    // Initial zoom level (when zoomMode is 'custom', default: 1)
    zoom: 1,

    // Custom zoom steps for zoom in/out
    // (default: [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5])
    zoomSteps: [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5],

    // Zoom range limits (default: 0.1 and 5)
    minZoom: 0.1,
    maxZoom: 5,

    // --- Spacing & layout ---

    // Spacing between pages in pixels (default: 10)
    pageSpacing: 10,

    // Spacing between spreads in pixels (default: 20)
    spreadSpacing: 20,

    // Width of thumbnail images in pixels (default: 150)
    // Height is derived automatically from the page aspect ratio
    thumbnailWidth: 150,

    // Target display DPI (default: 96)
    dpi: 96,

    // --- Theme ---

    // Color theme: 'light', 'dark', or 'system' (default: 'light')
    theme: "light",

    // Hide the theme toggle button (default: false)
    disableThemeSwitching: false,

    // --- Features ---

    // Disable text selection and copying (default: false)
    disableTextSelection: false,

    // Enable Google Fonts for automatic font fetching (default: true)
    googleFonts: true,

    // --- Panels ---

    // Initially active panel, or null for no panel (default: null)
    // Left panels: 'thumbnail', 'outline', 'bookmarks', 'layers', 'attachments'
    // Right panels: 'search', 'comments'
    activePanel: null,

    // Disable individual panel tabs (all default to false)
    disableLeftPanel: false, // Disable the entire left panel area
    disableRightPanel: false, // Disable the entire right panel area
    disableThumbnails: false, // Disable the thumbnails tab
    disableOutline: false, // Disable the outline tab
    disableBookmarks: false, // Disable the bookmarks tab
    disableLayers: false, // Disable the layers tab
    disableAttachments: false, // Disable the attachments tab
    disableSearch: false, // Disable the search panel
    disableComments: false, // Disable the comments panel

    // --- UI visibility ---

    // Hide the top toolbar (default: false)
    hideToolbar: false,

    // Hide the floating toolbar (page nav, zoom, view mode) (default: false)
    hideFloatingToolbar: false,

    // Remove the fullscreen button (default: false)
    disableFullscreen: false,

    // --- Advanced ---

    // Enable performance tracking (default: false)
    enablePerformanceCounter: false,

    // Callback for performance log entries (called when enablePerformanceCounter is true)
    onPerformanceLog: (entry) => console.log(entry),

    // Hide the "Powered by docMentis" attribution link (default: false)
    // Requires a valid license with the "no_attribution" feature
    hideAttribution: true,
});
```

### Loading Documents

The viewer accepts multiple document sources:

```typescript
// From URL
await viewer.load("https://example.com/document.pdf");

// From File object (e.g., from file input)
await viewer.load(file);

// From raw bytes
await viewer.load(new Uint8Array(buffer));

// Close current document
viewer.close();
```

### Navigation

```typescript
// Get current page (1-based)
const page = viewer.currentPage;

// Go to a specific page (1-based)
viewer.goToPage(5);

// Navigate to next/previous page
viewer.nextPage();
viewer.previousPage();

// Navigate to a destination (from outline)
viewer.goToDestination(destination);
```

### Document Information

```typescript
// Check if document is loaded
if (viewer.isLoaded) {
    // Get page count
    const total = viewer.pageCount;

    // Get document metadata
    const meta = viewer.metadata;
    console.log(meta?.title, meta?.author);

    // Get page dimensions (0-based index)
    const info = await viewer.getPageInfo(0);
    console.log(`Page 1: ${info.width} x ${info.height} points`);

    // Get document outline (table of contents)
    const outline = await viewer.getOutline();

    // Get annotations on a page (0-based index)
    const annotations = await viewer.getPageAnnotations(0);
}
```

### Programmatic Viewer Control

Control zoom, view modes, and fullscreen programmatically — useful when toolbars are hidden:

```typescript
// Zoom
viewer.zoomIn();
viewer.zoomOut();
viewer.setZoom(1.5); // 150%
viewer.setZoomMode("fit-spread-width");
viewer.setMinZoom(0.5); // clamp minimum to 50%
viewer.setMaxZoom(3); // clamp maximum to 300%
console.log(viewer.zoom); // current zoom level
console.log(viewer.zoomMode); // current zoom mode

// View modes
viewer.setScrollMode("continuous"); // 'continuous' | 'spread'
viewer.setLayoutMode("double-page"); // 'single-page' | 'double-page' | ...
viewer.setPageRotation(90); // 0 | 90 | 180 | 270
viewer.setSpacingMode("none"); // 'all' | 'none' | 'spread-only' | 'page-only'

// Theme
viewer.setTheme("dark"); // 'light' | 'dark' | 'system'
viewer.setThemeSwitchingEnabled(false); // hide theme toggle button
console.log(viewer.theme); // current theme

// Text selection
viewer.setTextSelectionEnabled(false); // disable text selection

// Fullscreen
viewer.setFullscreen(true);
console.log(viewer.isFullscreen);
```

### UI Visibility Control

Show, hide, or disable UI components at runtime:

```typescript
// Toolbar visibility
viewer.setToolbarVisible(false);
viewer.setFloatingToolbarVisible(false);

// Fullscreen button
viewer.setFullscreenEnabled(false);

// Disable entire panel areas
viewer.setLeftPanelEnabled(false);
viewer.setRightPanelEnabled(false);

// Disable individual panel tabs
// Panels: 'thumbnail', 'outline', 'bookmarks', 'layers', 'attachments', 'search', 'comments'
viewer.setPanelEnabled("thumbnail", false);
viewer.setPanelEnabled("search", false);

// Open/close panels programmatically
viewer.openPanel("outline");
viewer.closePanel();
```

### Programmatic Search

Search document text programmatically — useful for custom search UIs:

```typescript
// Open search panel and search for text
viewer.search("hello world");

// Search with options
viewer.search("hello", { caseSensitive: true });

// Navigate between matches
viewer.searchNext();
viewer.searchPrev();

// Clear search
viewer.clearSearch();
```

### CSS Customization

The viewer uses CSS custom properties (variables) for all colors, shadows, and borders. Since no Shadow DOM is used, you can override any variable from your own stylesheet:

```css
/* Override the primary color */
.udoc-viewer-root {
    --udoc-primary: #e91e63;
    --udoc-primary-hover: #c2185b;
}

/* Override dark theme colors */
.udoc-viewer-root.udoc-viewer-dark {
    --udoc-primary: #f48fb1;
    --udoc-primary-hover: #f06292;
}
```

#### Available CSS Variables

| Variable                         | Description            | Light Default                 | Dark Default                 |
| -------------------------------- | ---------------------- | ----------------------------- | ---------------------------- |
| **Backgrounds**                  |                        |                               |                              |
| `--udoc-bg-viewport`             | Viewport background    | `#e0e0e0`                     | `#1a1a1a`                    |
| `--udoc-bg-surface`              | Page / card surface    | `#fff`                        | `#2d2d2d`                    |
| `--udoc-bg-panel`                | Side panel background  | `#f5f5f5`                     | `#252525`                    |
| `--udoc-bg-panel-tabs`           | Panel tab bar          | `#e8e8e8`                     | `#1e1e1e`                    |
| `--udoc-bg-input`                | Input fields           | `#fff`                        | `#3a3a3a`                    |
| `--udoc-bg-overlay`              | Modal overlay          | `rgba(0,0,0,0.5)`             | `rgba(0,0,0,0.7)`            |
| **Text**                         |                        |                               |                              |
| `--udoc-text-primary`            | Primary text           | `rgba(0,0,0,0.8)`             | `rgba(255,255,255,0.87)`     |
| `--udoc-text-secondary`          | Secondary text         | `rgba(0,0,0,0.7)`             | `rgba(255,255,255,0.7)`      |
| `--udoc-text-muted`              | Muted text             | `rgba(0,0,0,0.5)`             | `rgba(255,255,255,0.5)`      |
| `--udoc-text-disabled`           | Disabled text          | `rgba(0,0,0,0.25)`            | `rgba(255,255,255,0.25)`     |
| `--udoc-text-placeholder`        | Placeholder text       | `#999`                        | `#777`                       |
| `--udoc-text-on-primary`         | Text on primary color  | `#fff`                        | `#fff`                       |
| **Primary color**                |                        |                               |                              |
| `--udoc-primary`                 | Primary / accent color | `#0066cc`                     | `#4da6ff`                    |
| `--udoc-primary-hover`           | Primary hover state    | `#0052a3`                     | `#80bfff`                    |
| `--udoc-primary-focus-ring`      | Focus ring color       | `rgba(0,102,204,0.2)`         | `rgba(77,166,255,0.25)`      |
| **Borders**                      |                        |                               |                              |
| `--udoc-border`                  | Default border         | `#ddd`                        | `#444`                       |
| `--udoc-border-input`            | Input border           | `#ccc`                        | `#555`                       |
| `--udoc-border-light`            | Light border           | `#eee`                        | `#3a3a3a`                    |
| **Shadows**                      |                        |                               |                              |
| `--udoc-shadow-page`             | Page shadow            | `0 2px 8px rgba(0,0,0,0.15)`  | `0 2px 8px rgba(0,0,0,0.4)`  |
| `--udoc-shadow-toolbar`          | Toolbar shadow         | `0 2px 12px rgba(0,0,0,0.15)` | `0 2px 12px rgba(0,0,0,0.4)` |
| `--udoc-shadow-dropdown`         | Dropdown shadow        | `0 4px 16px rgba(0,0,0,0.2)`  | `0 4px 16px rgba(0,0,0,0.5)` |
| **Search**                       |                        |                               |                              |
| `--udoc-search-highlight`        | Search match highlight | `rgba(255,200,0,0.35)`        | `rgba(255,200,0,0.4)`        |
| `--udoc-search-highlight-active` | Active match highlight | `rgba(255,140,0,0.6)`         | `rgba(255,140,0,0.65)`       |
| **Selection**                    |                        |                               |                              |
| `--udoc-text-selection`          | Text selection color   | `rgba(0,120,215,0.3)`         | `rgba(77,166,255,0.35)`      |
| **Scrollbar**                    |                        |                               |                              |
| `--udoc-scrollbar-thumb`         | Scrollbar thumb        | `rgba(0,0,0,0.3)`             | `rgba(255,255,255,0.3)`      |
| `--udoc-scrollbar-thumb-hover`   | Scrollbar thumb hover  | `rgba(0,0,0,0.5)`             | `rgba(255,255,255,0.5)`      |
| **Errors**                       |                        |                               |                              |
| `--udoc-error-bg`                | Error background       | `#fef2f2`                     | `#3a1c1c`                    |
| `--udoc-error-border`            | Error border           | `#fecaca`                     | `#6b2c2c`                    |
| `--udoc-error-text`              | Error text             | `#dc2626`                     | `#f87171`                    |
| **Progress**                     |                        |                               |                              |
| `--udoc-progress-track`          | Progress bar track     | `#e5e7eb`                     | `#404040`                    |
| `--udoc-progress-fill`           | Progress bar fill      | `#0066cc`                     | `#4da6ff`                    |

> The full list of variables is defined in `src/ui/viewer/styles.css`. All viewer styles are scoped under `.udoc-viewer-root`, so your overrides won't leak into the rest of the page.

### Events

```typescript
// Document loaded
const unsubscribe = viewer.on("document:load", ({ pageCount }) => {
    console.log(`Loaded ${pageCount} pages`);
});

// Document closed
viewer.on("document:close", () => {
    console.log("Document closed");
});

// Page changed
viewer.on("page:change", ({ page, previousPage }) => {
    console.log(`Page ${previousPage} -> ${page}`);
});

// Panel opened/closed
viewer.on("panel:change", ({ panel, previousPanel }) => {
    console.log(`Panel: ${previousPanel} -> ${panel}`);
});

// UI component visibility changed
viewer.on("ui:visibilityChange", ({ component, visible }) => {
    console.log(`${component} is now ${visible ? "visible" : "hidden"}`);
});

// Download progress
viewer.on("download:progress", ({ loaded, total, percent }) => {
    console.log(`Downloaded ${loaded}/${total} bytes (${percent}%)`);
});

// Error occurred
viewer.on("error", ({ error, phase }) => {
    console.error(`Error during ${phase}:`, error);
});

// Unsubscribe
unsubscribe();
```

### Document Export

```typescript
// Export document as raw bytes
const bytes = await viewer.toBytes();

// Download document as a file
await viewer.download("document.pdf");
```

### Document Composition

Compose new documents by cherry-picking and rotating pages:

```typescript
// Create a new document from pages of existing documents
const [newDoc] = await client.compose([
    [
        { doc: viewerA, pages: "1-3" },
        { doc: viewerB, pages: "5", rotation: 90 },
    ],
]);

// Export the composed document
const bytes = await newDoc.toBytes();
await newDoc.download("composed.pdf");
```

### Document Utilities

```typescript
// Split a document by its outline (table of contents)
const { viewers, sections } = await client.splitByOutline(source, {
    maxLevel: 2,
    splitMidPage: false,
});

// Extract images from a document
const images = await client.extractImages(source, {
    convertRawToPng: true,
});

// Extract fonts from a document
const fonts = await client.extractFonts(source);

// Compress a document
const compressed = await client.compress(source);

// Decompress a document
const decompressed = await client.decompress(source);
```

### Headless Rendering

Render pages to images without UI:

```typescript
// Create headless viewer (no container)
const viewer = await client.createViewer();
await viewer.load(pdfBytes);

// Render page to ImageData (0-based page index)
const imageData = await viewer.renderPage(0, { scale: 2 });

// Render to Blob
const blob = await viewer.renderPage(0, {
    format: "blob",
    imageType: "image/png",
});

// Render to data URL
const dataUrl = await viewer.renderPage(0, {
    format: "data-url",
    imageType: "image/jpeg",
    quality: 0.9,
});

// Render thumbnail
const thumb = await viewer.renderThumbnail(0, { scale: 1 });
```

### Password-Protected Documents

When a password-protected document is loaded in UI mode, the viewer automatically prompts the user to enter the password. For headless mode, you can handle it programmatically:

```typescript
await viewer.load(source);

if (await viewer.needsPassword()) {
    const success = await viewer.authenticate("my-password");
    if (!success) {
        console.error("Incorrect password");
    }
}
```

## How It Works

udoc-viewer uses a custom document processing engine written in Rust, compiled to WebAssembly. Documents are parsed and rendered entirely in the browser with near-native performance — no PDF.js, no iframe hacks, no server-side conversion.

The JavaScript wrapper (`@docmentis/udoc-viewer`) is MIT-licensed and open source. The WASM rendering engine is free to use, including in commercial applications. See [LICENSE](./LICENSE) for details.

## Browser Support

| Browser       | Supported |
| ------------- | --------- |
| Chrome / Edge | ✅ 80+    |
| Firefox       | ✅ 80+    |
| Safari        | ✅ 15+    |

Requires WebAssembly support.

## Telemetry

udoc-viewer collects anonymous, non-personally-identifiable usage data to help us understand SDK adoption and prioritize format support. Telemetry fires once per document open.

**What we collect:**

| Field            | Description                                            | Example       |
| ---------------- | ------------------------------------------------------ | ------------- |
| `domain`         | Hostname of the embedding website                      | `example.com` |
| `format`         | Document format                                        | `pdf`         |
| `size_bucket`    | File size in units of 100 KB (`floor(bytes / 100000)`) | `3`           |
| `viewer_version` | SDK version string                                     | `0.5.19`      |
| `license_hash`   | SHA-256 hash of the license key (empty if none)        | `a1b2c3...`   |

**What we do NOT collect:**

- Document content, filenames, or URLs
- User identity, cookies, or session data
- IP addresses (disabled at the collection endpoint)
- Any other personally identifiable information

## Licensing

udoc-viewer is free to use, including in commercial applications. A "Powered by docMentis" attribution link is shown by default.

To remove the attribution, contact [licensing@docmentis.com](mailto:licensing@docmentis.com) to purchase a license, then pass it when creating the client:

```typescript
const client = await UDocClient.create({
    license: "eyJ2Ijox...",
});

const viewer = await client.createViewer({
    container: "#viewer",
    hideAttribution: true,
});
```

The `hideAttribution` option is only honored when the license includes the `no_attribution` feature. Without a valid license, the attribution link will remain visible.

You can check license status programmatically:

```typescript
console.log(client.license);
// { valid: true, tier: "licensed", features: ["no_attribution"], ... }

console.log(client.hasFeature("no_attribution")); // true
```

## Contributing

We welcome bug reports, feature requests, and pull requests.

- **Issues**: [github.com/docmentis/docmentis-udoc-viewer/issues](https://github.com/docmentis/docmentis-udoc-viewer/issues)
- **Discussions**: [github.com/docmentis/docmentis-udoc-viewer/discussions](https://github.com/docmentis/docmentis-udoc-viewer/discussions)

## License

The JavaScript/TypeScript source code is licensed under the [MIT License](../../LICENSE).

The WebAssembly binary (`src/wasm/udoc_bg.wasm`) is distributed under the [docMentis WASM Runtime License](src/wasm/LICENSE) -- free to use with the docMentis Viewer in commercial and non-commercial applications.

## Links

- 🌐 [docmentis.com](https://docmentis.com)
- 📦 [npm package](https://www.npmjs.com/package/@docmentis/udoc-viewer)
- 📂 [GitHub](https://github.com/docmentis/docmentis-udoc-viewer)
- 💬 [Report an issue](https://github.com/docmentis/docmentis-udoc-viewer/issues)
