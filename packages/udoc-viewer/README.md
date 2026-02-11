# @docmentis/udoc-viewer

A free, open-source, universal document viewer for the web. Render PDF, PPTX, and images with high fidelity — no server required.

[![npm version](https://img.shields.io/npm/v/@docmentis/udoc-viewer)](https://www.npmjs.com/package/@docmentis/udoc-viewer)
[![license](https://img.shields.io/npm/l/@docmentis/udoc-viewer)](./LICENSE)

**[Live Demo](https://docmentis.com/viewer/demo)** · **[Guide](https://docmentis.com/viewer/guide)** · **[Report Issue](https://github.com/docmentis/docmentis-udoc-viewer/issues)**

---

## Why udoc-viewer?

Most web document viewers only handle PDF, rely on server-side rendering, or require expensive commercial licenses. udoc-viewer is different:

- **Truly universal** — PDF, PowerPoint, and images in a single viewer, with more formats coming
- **High fidelity** — powered by a custom Rust/WebAssembly rendering engine, not PDF.js
- **Client-side only** — everything runs in the browser, no server round-trips
- **Framework agnostic** — works with React, Vue, Angular, Svelte, or plain HTML
- **Free for commercial use** — MIT-licensed wrapper, free WASM engine

## Supported Formats

| Format | Extensions |
|--------|------------|
| PDF | .pdf |
| PPTX | .pptx |
| Images | .png, .jpg, .jpeg, .gif, .webp, .bmp, .tif, .tiff, .ico, .tga, .ppm, .pgm, .pbm, .hdr, .exr, .qoi |

## Quick Start

### Install

```bash
npm install @docmentis/udoc-viewer
```

### Basic Usage

```js
import { UDocClient } from '@docmentis/udoc-viewer';

// Create a client (loads the WASM engine)
const client = await UDocClient.create();

// Create a viewer attached to a container element
const viewer = await client.createViewer({
  container: '#viewer',
});

// Load a document
await viewer.load('https://example.com/document.pdf');

// Clean up when done
viewer.destroy();
client.destroy();
```

### HTML

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script type="module">
  import { UDocClient } from '@docmentis/udoc-viewer';

  const client = await UDocClient.create();
  const viewer = await client.createViewer({ container: '#viewer' });
  await viewer.load('/path/to/document.pdf');
</script>
```

### React

```jsx
import { useEffect, useRef } from 'react';
import { UDocClient } from '@docmentis/udoc-viewer';

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

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

## Features

- 📄 **Multi-format rendering** — PDF, PPTX, and images in one unified viewer
- 🎯 **High-fidelity output** — custom Rust rendering engine compiled to WebAssembly
- 🔍 **Zoom & navigation** — toolbar with zoom controls, page thumbnails, and keyboard navigation
- 📱 **Responsive** — works on desktop and mobile browsers
- 🌊 **Streaming** — pages render progressively as the document loads
- 🔒 **Private** — documents never leave the browser; no server upload required

## API Reference

### Loading Documents

The viewer accepts multiple document sources:

```typescript
// From URL
await viewer.load('https://example.com/document.pdf');

// From File object (e.g., from file input)
await viewer.load(file);

// From raw bytes
await viewer.load(new Uint8Array(buffer));

// Close current document
viewer.close();
```

### Password-Protected Documents

When a password-protected document is loaded in UI mode, the viewer automatically prompts the user to enter the password. For headless mode, you can handle it programmatically:

```typescript
await viewer.load(source);

if (await viewer.needsPassword()) {
  const success = await viewer.authenticate('my-password');
  if (!success) {
    console.error('Incorrect password');
  }
}
```

### Client Options

```typescript
const client = await UDocClient.create({
  // Custom base URL for worker and WASM files (optional)
  // Expected files: {baseUrl}/worker.js and {baseUrl}/udoc_bg.wasm
  baseUrl: 'https://cdn.example.com/udoc/',
});
```

### Viewer Options

```typescript
const viewer = await client.createViewer({
  // Container element or CSS selector (required for UI mode, omit for headless)
  container: '#viewer',

  // Scroll mode: 'continuous' or 'spread' (default: 'continuous')
  scrollMode: 'continuous',

  // Layout mode: 'single-page', 'double-page', 'double-page-odd-right', 'double-page-odd-left'
  // (default: 'single-page')
  layoutMode: 'single-page',

  // Zoom mode: 'fit-spread-width', 'fit-spread-height', 'fit-spread', 'custom'
  // (default: 'fit-spread-width')
  zoomMode: 'fit-spread-width',

  // Initial zoom level (when zoomMode is 'custom', default: 1)
  zoom: 1,

  // Custom zoom steps for zoom in/out
  // (default: [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5])
  zoomSteps: [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5],

  // Spacing between pages in pixels (default: 10)
  pageSpacing: 10,

  // Spacing between spreads in pixels (default: 20)
  spreadSpacing: 20,

  // Initially active panel, or null for no panel (default: null)
  // Left panels: 'thumbnail', 'outline', 'bookmarks', 'layers', 'attachments'
  // Right panels: 'search', 'comments'
  activePanel: null,

  // Target display DPI (default: 96)
  dpi: 96,

  // Enable Google Fonts for automatic font fetching (default: true)
  googleFonts: true,

  // Enable performance tracking (default: false)
  enablePerformanceCounter: false,
});
```

### Navigation

```typescript
// Get current page (1-based)
const page = viewer.currentPage;

// Go to a specific page (1-based)
viewer.goToPage(5);

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
  format: 'blob',
  imageType: 'image/png',
});

// Render to data URL
const dataUrl = await viewer.renderPage(0, {
  format: 'data-url',
  imageType: 'image/jpeg',
  quality: 0.9,
});

// Render thumbnail
const thumb = await viewer.renderThumbnail(0, { scale: 1 });
```

### Document Export

```typescript
// Export document as raw bytes
const bytes = await viewer.toBytes();

// Download document as a file
await viewer.download('document.pdf');
```

### Document Composition

Compose new documents by cherry-picking and rotating pages:

```typescript
// Create a new document from pages of existing documents
const [newDoc] = await client.compose([
  [
    { doc: viewerA, pages: '1-3' },
    { doc: viewerB, pages: '5', rotation: 90 },
  ],
]);

// Export the composed document
const bytes = await newDoc.toBytes();
await newDoc.download('composed.pdf');
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

### Events

```typescript
// Document loaded
const unsubscribe = viewer.on('document:load', ({ pageCount }) => {
  console.log(`Loaded ${pageCount} pages`);
});

// Document closed
viewer.on('document:close', () => {
  console.log('Document closed');
});

// Download progress
viewer.on('download:progress', ({ loaded, total, percent }) => {
  console.log(`Downloaded ${loaded}/${total} bytes (${percent}%)`);
});

// Error occurred
viewer.on('error', ({ error, phase }) => {
  console.error(`Error during ${phase}:`, error);
});

// Unsubscribe
unsubscribe();
```

## How It Works

udoc-viewer uses a custom document processing engine written in Rust, compiled to WebAssembly. Documents are parsed and rendered entirely in the browser with near-native performance — no PDF.js, no iframe hacks, no server-side conversion.

The JavaScript wrapper (`@docmentis/udoc-viewer`) is MIT-licensed and open source. The WASM rendering engine is free to use, including in commercial applications. See [LICENSE](./LICENSE) for details.

## Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome / Edge | ✅ 80+ |
| Firefox | ✅ 80+ |
| Safari | ✅ 15+ |

Requires WebAssembly support.

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
