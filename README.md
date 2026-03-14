# @docmentis/udoc-viewer

Universal document viewer for the web.

Open-source, framework-agnostic viewer powered by a built-from-scratch WebAssembly engine for high-fidelity rendering across PDF, DOCX, PPTX, and images.

[![npm version](https://img.shields.io/npm/v/@docmentis/udoc-viewer)](https://www.npmjs.com/package/@docmentis/udoc-viewer)
[![license](https://img.shields.io/npm/l/@docmentis/udoc-viewer)](./LICENSE)

**[Live Demo](https://docmentis.com/viewer/demo)** · **[Guide](https://docmentis.com/viewer/guide)** · **[Changelog](./CHANGELOG.md)** · **[Report Issue](https://github.com/docmentis/docmentis-udoc-viewer/issues)**

---

## Why udoc-viewer?

Most web document viewers only handle PDF, rely on server-side rendering, or require expensive commercial licenses. udoc-viewer is different:

- **Truly universal** — PDF, Word, PowerPoint, and images in a single viewer, with more formats coming
- **High fidelity** — powered by a custom Rust/WebAssembly rendering engine, not PDF.js
- **Client-side only** — everything runs in the browser, no server round-trips
- **Framework agnostic** — works with React, Vue, Angular, Svelte, or plain HTML
- **Free for commercial use** — MIT-licensed wrapper, free WASM engine

## Packages

| Package                                                   | Description                       |
| --------------------------------------------------------- | --------------------------------- |
| [@docmentis/udoc-viewer](packages/udoc-viewer/)           | Document viewer SDK (npm package) |
| [@docmentis/udoc-viewer-demo](packages/udoc-viewer-demo/) | Demo application                  |

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

Working examples for every major framework:

| Example                                        | Stack               | Run           |
| ---------------------------------------------- | ------------------- | ------------- |
| [vanilla](examples/vanilla/)                   | TypeScript + Vite   | `npm run dev` |
| [react-vite](examples/react-vite/)             | React + Vite        | `npm run dev` |
| [vue-vite](examples/vue-vite/)                 | Vue + Vite          | `npm run dev` |
| [svelte-vite](examples/svelte-vite/)           | Svelte 5 + Vite     | `npm run dev` |
| [angular](examples/angular/)                   | Angular 19          | `npm run dev` |
| [nextjs-webpack](examples/nextjs-webpack/)     | Next.js + Webpack   | `npm run dev` |
| [nextjs-turbopack](examples/nextjs-turbopack/) | Next.js + Turbopack | `npm run dev` |
| [nuxt](examples/nuxt/)                         | Nuxt 3              | `npm run dev` |

```bash
cd examples/react-vite
npm install
npm run dev
```

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

| Field            | Description                                            | Example        |
| ---------------- | ------------------------------------------------------ | -------------- |
| `domain`         | Hostname of the embedding website                      | `example.com`  |
| `format`         | Document format                                        | `pdf`          |
| `size_bucket`    | File size in units of 100 KB (`floor(bytes / 100000)`) | `3`            |
| `viewer_version` | SDK version string                                     | `0.5.19`       |
| `license_hash`   | SHA-256 hash of the license key (empty if none)        | `a1b2c3...`    |
| `distinct_id`    | Anonymous random UUID stored in localStorage           | `f47ac10b-...` |

**What we do NOT collect:**

- Document content, filenames, or URLs
- User identity, cookies, or session data (the UUID above is random and not linked to any account)
- IP addresses (disabled at the collection endpoint)
- Any other personally identifiable information

## Branding & Attribution

udoc-viewer is free to use, including in commercial applications. A "Powered by docMentis" attribution link is shown by default.

To remove the attribution, contact [licensing@docmentis.com](mailto:licensing@docmentis.com) to obtain a license key, then pass it when creating the client:

```typescript
const client = await UDocClient.create({ license: "eyJ2Ijox..." });
const viewer = await client.createViewer({
    container: "#viewer",
    hideAttribution: true,
});
```

The `hideAttribution` option is only honored when the license includes the `no_attribution` feature. Without a valid license, the attribution link will remain visible.

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

## Contributing

We welcome bug reports, feature requests, and pull requests. Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issues**: [github.com/docmentis/docmentis-udoc-viewer/issues](https://github.com/docmentis/docmentis-udoc-viewer/issues)
- **Discussions**: [github.com/docmentis/docmentis-udoc-viewer/discussions](https://github.com/docmentis/docmentis-udoc-viewer/discussions)
- **Security**: [SECURITY.md](SECURITY.md)

## License

The JavaScript/TypeScript source code is licensed under the [MIT License](LICENSE).

The WebAssembly binary (`packages/udoc-viewer/src/wasm/udoc_bg.wasm`) is distributed under the [docMentis WASM Runtime License](packages/udoc-viewer/src/wasm/LICENSE). It is free to use with the docMentis Viewer in commercial and non-commercial applications.

## Links

- 🌐 [docmentis.com](https://docmentis.com)
- 📦 [npm package](https://www.npmjs.com/package/@docmentis/udoc-viewer)
- 📂 [GitHub](https://github.com/docmentis/docmentis-udoc-viewer)
- 💬 [Report an issue](https://github.com/docmentis/docmentis-udoc-viewer/issues)
