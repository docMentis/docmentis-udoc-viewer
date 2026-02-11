# @docmentis/udoc-viewer

Universal Document Viewer built on top of a WebAssembly engine.

**Free. Unlimited. Forever.** Provided by [docMentis.com](https://docmentis.com).

## Supported Formats

| Format | Extensions |
|--------|------------|
| PDF | .pdf |
| PPTX | .pptx |
| Images | .jpg, .jpeg, .png, .gif, .bmp, .tif, .tiff, .webp, .ico, .tga, .ppm, .pgm, .pbm, .hdr, .exr, .qoi |

## Installation

```bash
npm install @docmentis/udoc-viewer
```

## Quick Start

```typescript
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

## Loading Documents

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

## Password-Protected Documents

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

## Client Options

```typescript
const client = await UDocClient.create({
  // Custom base URL for worker and WASM files (optional)
  // Expected files: {baseUrl}/worker.js and {baseUrl}/udoc_bg.wasm
  baseUrl: 'https://cdn.example.com/udoc/',
});
```

## Viewer Options

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

## Navigation

```typescript
// Get current page (1-based)
const page = viewer.currentPage;

// Go to a specific page (1-based)
viewer.goToPage(5);

// Navigate to a destination (from outline)
viewer.goToDestination(destination);
```

## Document Information

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

## Headless Rendering

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

## Document Export

```typescript
// Export document as raw bytes
const bytes = await viewer.toBytes();

// Download document as a file
await viewer.download('document.pdf');
```

## Document Composition

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

## Document Utilities

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

## Events

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

## License

MIT
