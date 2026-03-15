# UI Layer Improvement TODO

## High-Value UX Improvements

- [ ] **Pinch-to-Zoom & Touch Gestures** — Add pinch-zoom, swipe-to-navigate, and long-press support for mobile/tablet users.
- [ ] **Keyboard Accessibility** — Full keyboard navigation: Tab through panels, shortcuts for zoom/rotation/layout switching, focus management.
- [ ] **ARIA / Screen Reader Support** — Consistent aria-labels, focus traps for dialogs, live regions for search results, landmark roles.
- [ ] **Search UX Polish** — Whole-word match toggle, regex search, inline match count in search box, search history.
- [ ] **Annotation Panel** — Implement filterable list of annotations by type/author/status with click-to-navigate.
- [ ] **Comments Panel** — Discussion threads on specific pages/regions.
- [ ] **Print Support** — Print-optimized view and browser print integration.
- [ ] **Minimap / Page Overview** — Small zoomed-out preview showing current viewport position within the page.
- [ ] **View Presets** — Save/restore named configurations (zoom + layout + rotation), e.g. "Presentation Mode", "Reading Mode".
- [ ] **Custom Theme API** — Expose CSS variable injection for embedders to match their brand colors.
- [ ] **Drag-to-Pan (Hand Tool)** — Dedicated hand/grab tool mode for mouse-drag panning, separate from scroll-based navigation.
- [ ] **Floating Toolbar Customization** — Configurable position, auto-hide, docking to edges.
- [ ] **Internationalization (i18n)** — Extract all UI strings (tooltips, labels, panel titles, search placeholder, dialogs) into a locale system. Support locale switching and allow embedders to provide custom translations.

## Polish

- [ ] **Loading Skeleton** — Show skeleton placeholders for thumbnails/panels while content loads.
- [ ] **Smooth Zoom Animation** — CSS transitions on zoom level changes.
- [ ] **Breadcrumb Navigation** — Show current position in the outline hierarchy.
- [ ] **Page Transition Animations** — Animate page changes in single-page scroll mode.
- [ ] **Tooltip Hints** — Ensure consistent tooltips on all toolbar buttons.
- [ ] **Context Menu** — Right-click menu with copy, zoom, rotation options.
