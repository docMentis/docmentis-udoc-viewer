# Contributing to udoc-viewer

Thank you for your interest in contributing to udoc-viewer! This guide will help you get started.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9 or later (comes with Node.js)

### Setup

```bash
# Clone the repository
git clone https://github.com/docMentis/docmentis-udoc-viewer.git
cd docmentis-udoc-viewer

# Install dependencies
npm install

# Build all packages
npm run build

# Run the demo app (http://localhost:5173)
npm run dev
```

### Project Structure

```
docmentis-udoc-viewer/
├── packages/
│   ├── udoc-viewer/          # Main SDK package (@docmentis/udoc-viewer)
│   │   ├── src/
│   │   │   ├── UDocClient.ts # Client that manages the WASM engine
│   │   │   ├── UDocViewer.ts # Viewer that renders documents
│   │   │   ├── ui/           # Toolbar, thumbnails, and viewer UI
│   │   │   ├── worker/       # Web Worker for WASM processing
│   │   │   ├── wasm/         # Pre-built WASM binary (do not modify)
│   │   │   └── ...
│   │   └── scripts/          # Build scripts (styles, worker bundling)
│   └── udoc-viewer-demo/     # Demo application
├── examples/                 # Framework integration examples
└── .github/                  # CI/CD workflows
```

### Key Commands

```bash
# Build all packages
npm run build

# Build only the SDK
npm run build -w @docmentis/udoc-viewer

# Run the demo app
npm run dev

# Clean build outputs
npm run clean
```

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/docMentis/docmentis-udoc-viewer/issues) first to avoid duplicates.
2. Use the **Bug Report** issue template.
3. Include a minimal reproduction (a code snippet, a link to a repo, or a failing example).
4. Specify the browser, OS, and udoc-viewer version.

### Suggesting Features

1. Check [existing discussions](https://github.com/docMentis/docmentis-udoc-viewer/discussions) to see if the feature has been discussed.
2. Use the **Feature Request** issue template.
3. Explain the use case and why it would benefit the project.

### Submitting Pull Requests

1. **Open an issue first** — for non-trivial changes, discuss the approach before writing code.
2. **Fork the repository** and create your branch from `main`.
3. **Make your changes** — keep the scope focused; one feature or fix per PR.
4. **Build and verify** — run `npm run build` and test your changes against the demo app.
5. **Write a clear PR description** — explain what changed and why.
6. **Submit the PR** — a maintainer will review it.

### Branch Naming

Use descriptive branch names with a prefix:

- `fix/` — bug fixes (e.g., `fix/toolbar-zoom-button`)
- `feat/` — new features (e.g., `feat/keyboard-shortcuts`)
- `docs/` — documentation changes (e.g., `docs/react-example`)
- `refactor/` — code refactoring (e.g., `refactor/viewer-lifecycle`)

### Commit Messages

Write clear, concise commit messages:

```
fix: Correct zoom level calculation on mobile

The zoom level was not accounting for device pixel ratio on mobile
browsers, causing blurry rendering at non-default zoom levels.
```

Use a prefix: `fix:`, `feat:`, `docs:`, `refactor:`, `chore:`, `test:`.

## What You Can Contribute To

The JavaScript/TypeScript wrapper and all surrounding code are open source (MIT). Here are areas where contributions are welcome:

- **Bug fixes** — rendering issues, UI glitches, lifecycle bugs
- **Framework examples** — new or improved examples in `examples/`
- **Documentation** — README improvements, inline docs, guides
- **UI enhancements** — toolbar, thumbnails, navigation
- **Performance** — optimizations in the JS layer
- **Accessibility** — keyboard navigation, screen reader support, ARIA attributes
- **TypeScript types** — improved type definitions and exports

### Out of Scope

The WASM binary (`packages/udoc-viewer/src/wasm/`) is built from a separate private repository and is **not** modifiable through this repo. If you encounter a rendering issue that appears to originate in the WASM engine, please open an issue and we will investigate.

## Code Style

- **TypeScript** — all source code is TypeScript with `strict` mode enabled.
- **ES modules** — use `import`/`export`, not `require`.
- **No external runtime dependencies** — the SDK has zero production dependencies. Avoid adding new ones unless absolutely necessary.
- **Keep it simple** — prefer straightforward code over clever abstractions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
