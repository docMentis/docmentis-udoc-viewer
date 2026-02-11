# docmentis-udoc-viewer

Universal Document Viewer for the web, powered by a WebAssembly engine.

**Free. Unlimited. Forever.** Provided by [docMentis.com](https://docmentis.com).

## Packages

| Package | Description |
|---------|-------------|
| [@docmentis/udoc-viewer](packages/udoc-viewer/) | Document viewer SDK (npm package) |
| [@docmentis/udoc-viewer-demo](packages/udoc-viewer-demo/) | Demo application |

## Supported Formats

| Format | Extensions |
|--------|------------|
| PDF | .pdf |
| PPTX | .pptx |
| Images | .jpg, .jpeg, .png, .gif, .bmp, .tif, .tiff, .webp, .ico, .tga, .ppm, .pgm, .pbm, .hdr, .exr, .qoi |

## Quick Start

```bash
npm install @docmentis/udoc-viewer
```

```typescript
import { UDocClient } from '@docmentis/udoc-viewer';

const client = await UDocClient.create();
const viewer = await client.createViewer({ container: '#viewer' });
await viewer.load('https://example.com/document.pdf');
```

See the [full API documentation](packages/udoc-viewer/README.md) for details.

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run demo (localhost:5173)
npm run dev -w @docmentis/udoc-viewer-demo
```

### Updating the WASM engine

The WASM binary is pre-built from the private `docmentis-udoc` repository and checked into this repo. To update it after a new Rust build:

```bash
# In the docmentis-udoc repo
just build-wasm

# In this repo
npm run copy-wasm
```

## License

The JavaScript/TypeScript source code is licensed under the [MIT License](LICENSE).

The WebAssembly binary (`packages/udoc-viewer/src/wasm/udoc_bg.wasm`) is distributed under the [docMentis WASM Runtime License](packages/udoc-viewer/src/wasm/LICENSE). It is free to use with the docMentis Viewer in commercial and non-commercial applications.
