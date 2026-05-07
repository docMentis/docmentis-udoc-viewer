# UI Layer Improvement TODO

## Pending

- [ ] **Stamp `name` collision in WASM** — `JsAnnotation.name` (NM identifier) and `StampAnnotation.name` (icon name like "Approved") both serialize to the JSON key `name`, so for stamp annotations the two values clobber each other across a round-trip. Fix in the Rust WASM layer (`docmentis-udoc/libs/docmentis-udoc-wasm/src/annotation.rs`) by renaming the stamp variant's `name` field to `icon_name` (serde rename) and propagating to the public TS `StampAnnotation` type.
- [ ] **Headless annotation editing** — `addAnnotation` / `updateAnnotation` / `removeAnnotation` currently require UI mode because the editing state lives in the UI shell store. Either lift the editing state up so it works without a container, or document headless as read-only.

## Done

- [x] **Keyboard Accessibility** — Full keyboard navigation: Tab through panels, shortcuts for zoom/rotation/layout switching, focus management.
- [x] **ARIA / Screen Reader Support** — Consistent aria-labels, focus traps for dialogs, live regions for search results, landmark roles.
- [x] **Internationalization (i18n)** — Extract all UI strings (tooltips, labels, panel titles, search placeholder, dialogs) into a locale system. Support locale switching and allow embedders to provide custom translations.
- [x] **Annotation Panel** — Filterable list of annotations by type/author/status with click-to-navigate.
- [x] **Comments Panel** — Discussion threads on specific pages/regions.
- [x] **Print Support** — Print-optimized view and browser print integration.
- [x] **Custom Theme API** — CSS variable injection for embedders to match their brand colors.
- [x] **Tooltip Hints** — Consistent tooltips on all toolbar buttons.
