# Nuxt Example

This example demonstrates how to use `@docmentis/udoc-viewer` in a [Nuxt 3](https://nuxt.com) application.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## Project Structure

```
nuxt/
├── app.vue                    # Root component
├── components/
│   └── DocumentViewer.vue     # UDoc viewer component
├── public/
│   └── sample.pdf             # Sample document
├── nuxt.config.ts             # Nuxt configuration
├── package.json
└── tsconfig.json
```

## Key Features

- **Client-side rendering**: SSR is disabled (`ssr: false`) since the viewer requires browser APIs
- **WASM support**: Configured to handle WebAssembly modules
- **TypeScript**: Full TypeScript support
- **Reusable component**: DocumentViewer component can be used throughout your app

## Usage

```vue
<template>
  <DocumentViewer url="/sample.pdf" />
</template>

<script setup lang="ts">
import DocumentViewer from "~/components/DocumentViewer.vue";
</script>
```

## Configuration

The `nuxt.config.ts` file includes:

- `ssr: false` - Client-side only rendering (required for WASM)
- `vite.build.target: 'esnext'` - Modern JavaScript target
- `vite.optimizeDeps` - Pre-bundle udoc-viewer for better compatibility

## Notes

The UDoc viewer uses WebAssembly which requires browser APIs. Therefore, SSR must be disabled for pages that use the viewer component. You can also use `<ClientOnly>` wrapper if you want to keep SSR enabled for other parts of your app:

```vue
<template>
  <ClientOnly>
    <DocumentViewer url="/sample.pdf" />
  </ClientOnly>
</template>
```
