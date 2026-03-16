# ViewMode Design

## Problem

The viewer today treats **pages** as the universal display primitive. All view options (`layoutMode`, `scrollMode`, `spacingMode`) are variations on how to arrange pages. This works for PDF and print-oriented documents, but breaks down as we support more formats:

- **Excel** renders sheets as multiple pages for print preview, but the natural view is a continuous grid with no page boundaries.
- **PowerPoint** has a presentation/slideshow mode that is fundamentally different from paginated viewing.
- **Word** has a "Web Layout" mode where content flows continuously without headers, footers, or page breaks.
- **Video/audio** needs a playback experience, not a page-based one.

We need a higher-level concept that determines **what the display primitive is**, under which the current page arrangement options become one variant.

## Design

### ViewMode

A new top-level state property `viewMode` with four variants:

```
ViewMode
├── "paged"         Current behavior. Pages with borders, shadows, spacing.
├── "continuous"    Pages stitched together, no page chrome.
├── "presentation"  Single slide/page fullscreen, advance to navigate.
└── "playback"      Media playback with timeline controls.
```

### Variant: Paged

The current viewer behavior, promoted into an explicit mode. All existing sub-options apply:

| Sub-option     | Values                                                                | Description                                 |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| `layoutMode`   | single-page, double-page, double-page-odd-right, double-page-odd-left | Page arrangement within a spread            |
| `scrollMode`   | continuous, spread                                                    | Vertical scrolling vs. one-spread-at-a-time |
| `spacingMode`  | all, none, spread-only, page-only                                     | Gaps between pages/spreads                  |
| `zoomMode`     | fit-spread-width, fit-spread-height, fit-spread, custom, ...          | Zoom behavior                               |
| `pageRotation` | 0, 90, 180, 270                                                       | User rotation                               |

Page slots have white backgrounds, box shadows, and spacing between them. This is the natural mode for PDF, print preview of any format, and Word "Print Layout".

### Variant: Continuous

Pages are rendered by the same WASM engine but displayed as a **stitched continuous strip** with no visible page boundaries.

**Key behaviors:**

- No page shadows or borders (seamless)
- No spacing between pages (`spacingMode: "none"` enforced)
- Header/footer regions of each page are **cropped out** so only body content is visible
- Single-page layout enforced (`layoutMode: "single-page"`)
- Continuous scroll enforced (`scrollMode: "continuous"`)
- Zoom still applies (fit-width is the natural default)

**Requires engine metadata:**

The engine renders pages, but the viewer needs metadata to know **how to stitch them**. Different formats produce different page structures:

```ts
interface ContinuousLayoutMetadata {
    // Grid structure: how pages map to a logical grid.
    // Word: always 1 column (pages stack vertically).
    // Excel: a wide sheet might be 3 columns x N rows of pages.
    grid: {
        columns: number; // number of page columns (e.g., 1 for Word, 3 for wide Excel)
        rows: number; // number of page rows
    };

    // Map each page index to its grid position.
    // Allows sparse grids (not every cell must have a page).
    pageGrid: Array<{
        pageIndex: number;
        row: number; // 0-based grid row
        col: number; // 0-based grid column
    }>;

    // Content bounds per page — the body region to keep after cropping.
    // Everything outside these bounds (headers, footers, print margins) is cropped.
    pageContentBounds: Array<{
        pageIndex: number;
        top: number; // distance from page top to content area (points)
        bottom: number; // distance from page bottom to content area (points)
        left: number; // distance from page left to content area (points)
        right: number; // distance from page right to content area (points)
    }>;
}
```

**Why each field matters:**

| Field               | Word                            | Excel                                       | Why needed                                                               |
| ------------------- | ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `grid.columns`      | Always 1                        | Depends on sheet width vs. print page width | Without this, viewer can't know 6 pages should be 3x2 instead of 6x1     |
| `grid.rows`         | = pageCount                     | Depends on sheet height                     | Determines vertical extent of stitched view                              |
| `pageGrid`          | Trivial (page N = row N, col 0) | Maps pages to grid cells                    | Allows the viewer to position pages in 2D                                |
| `pageContentBounds` | Crop header/footer regions      | Crop print margins/repeating row headers    | Without this, stitched pages show duplicate headers and margins at seams |

**Examples:**

Word document with 5 pages:

```
grid: { columns: 1, rows: 5 }
pageGrid: [
  { pageIndex: 0, row: 0, col: 0 },
  { pageIndex: 1, row: 1, col: 0 },
  { pageIndex: 2, row: 2, col: 0 },
  ...
]
```

Excel sheet that prints as 3 columns x 4 rows of pages (12 pages total):

```
grid: { columns: 3, rows: 4 }
pageGrid: [
  { pageIndex: 0,  row: 0, col: 0 },
  { pageIndex: 1,  row: 0, col: 1 },
  { pageIndex: 2,  row: 0, col: 2 },
  { pageIndex: 3,  row: 1, col: 0 },
  { pageIndex: 4,  row: 1, col: 1 },
  ...
  { pageIndex: 11, row: 3, col: 2 },
]
```

**Viewer stitching behavior:**

- Arranges cropped page bitmaps according to `pageGrid` positions
- No gaps, no borders, no shadows between adjacent pages
- Horizontal scrolling enabled when grid width exceeds viewport (common for Excel)
- Virtual scrolling applies to both axes (row-based visibility for vertical, column-based for horizontal)

**Applicable sub-options:**

| Sub-option    | Behavior                                              |
| ------------- | ----------------------------------------------------- |
| `zoomMode`    | All zoom modes still apply                            |
| `layoutMode`  | Locked to `single-page` (grid determines arrangement) |
| `scrollMode`  | Locked to `continuous`                                |
| `spacingMode` | Locked to `none`                                      |

**Use cases:**

- Word "Web Layout" (1-column vertical stitching, headers/footers cropped)
- Excel sheet view (multi-column grid stitching, print margins cropped)
- Long-form reading without page distractions

### Variant: Presentation

A fullscreen, one-slide-at-a-time display optimized for slideshow delivery.

**Key behaviors:**

- Viewport shows exactly one page/slide, scaled to fill the screen
- Black (or theme-colored) background surrounding the slide
- Navigate via keyboard (arrow keys, space), click, touch swipe, or presenter remote
- No toolbar, no panels (minimal chrome, or auto-hide controls)
- Optional: transition animations between slides
- Optional: presenter notes view (dual-screen)
- ESC exits presentation mode

**Applicable sub-options:**

| Sub-option   | Behavior                               |
| ------------ | -------------------------------------- |
| `zoomMode`   | Locked to `fit-spread` (fill viewport) |
| `layoutMode` | Locked to `single-page`                |
| `scrollMode` | Locked to `spread` (one at a time)     |
| All spacing  | N/A                                    |

**Use cases:**

- PowerPoint slideshow
- PDF presentation
- Image gallery fullscreen

### Variant: Playback

A media playback experience for time-based content.

**Key behaviors:**

- Central media player (video/audio element)
- Playback controls: play/pause, seek, volume, speed, fullscreen
- Timeline/scrubber
- No page-based navigation
- Optional: chapter markers, subtitles/captions

**Applicable sub-options:**

| Sub-option       | Behavior                  |
| ---------------- | ------------------------- |
| All page options | N/A                       |
| `zoomMode`       | Fit-to-viewport or custom |

**Use cases:**

- Video files
- Audio files with waveform visualization

## State

### New state property

```ts
type ViewMode = "paged" | "continuous" | "presentation" | "playback";

interface ViewerState {
    viewMode: ViewMode; // new
    layoutMode: LayoutMode; // existing, relevant in paged mode
    scrollMode: ScrollMode; // existing, relevant in paged mode
    spacingMode: SpacingMode; // existing, relevant in paged mode
    zoomMode: ZoomMode; // existing, applies to most modes
    // ... rest unchanged
}
```

### New action

```ts
{
    type: "SET_VIEW_MODE";
    payload: {
        viewMode: ViewMode;
    }
}
```

The reducer enforces constraints when switching modes:

```ts
case 'SET_VIEW_MODE':
  switch (action.payload.viewMode) {
    case 'continuous':
      return {
        ...state,
        viewMode: 'continuous',
        layoutMode: 'single-page',
        scrollMode: 'continuous',
        spacingMode: 'none',
      };
    case 'presentation':
      return {
        ...state,
        viewMode: 'presentation',
        layoutMode: 'single-page',
        scrollMode: 'spread',
        zoomMode: 'fit-spread',
      };
    case 'paged':
      // Restore previous paged sub-options or format defaults
      return { ...state, viewMode: 'paged', ...savedPagedOptions };
    case 'playback':
      return { ...state, viewMode: 'playback' };
  }
```

### Format defaults

```ts
function getFormatDefaults(format: DocumentFormat) {
  switch (format) {
    case 'pdf':
    case 'docx':
      return { viewMode: 'paged', ... };
    case 'xlsx':
      return { viewMode: 'continuous', ... };
    case 'pptx':
      return { viewMode: 'paged', ... }; // paged by default, presentation available
    case 'mp4':
    case 'webm':
      return { viewMode: 'playback', ... };
    default:
      return { viewMode: 'paged', ... };
  }
}
```

## Public API

```ts
// New methods on UDocViewer
setViewMode(mode: ViewMode): void;
getViewMode(): ViewMode;

// ViewerOptions extension
interface ViewerOptions {
  viewMode?: ViewMode;
  // ... existing options
}
```

## UI

### ViewModeMenu changes

The existing `ViewModeMenu` dropdown gains a top-level section for switching `viewMode`. Sub-options (layout, scroll, spacing, rotation) are shown/hidden based on the active view mode.

```
┌─────────────────────────┐
│ View                     │
│  ○ Paged                │  ← viewMode selector
│  ● Continuous           │
│  ○ Presentation         │
├─────────────────────────┤
│ Zoom                     │  ← always visible
│  ○ Fit Width            │
│  ○ Fit Page             │
│  ○ Custom               │
├─────────────────────────┤
│ Layout           (paged) │  ← only shown in paged mode
│  ○ Single Page          │
│  ○ Double Page          │
├─────────────────────────┤
│ Scroll           (paged) │  ← only shown in paged mode
│  ○ Continuous           │
│  ○ Page by Page         │
├─────────────────────────┤
│ Rotation                 │  ← paged + continuous
│  0° 90° 180° 270°      │
└─────────────────────────┘
```

Not all view modes are available for every format. The menu only shows modes that apply:

| Format    | Available ViewModes               |
| --------- | --------------------------------- |
| PDF, DOCX | paged, continuous                 |
| XLSX      | paged (print preview), continuous |
| PPTX      | paged, presentation               |
| Video     | playback                          |
| Image     | paged, presentation               |

## Architecture

### ViewMode-aware Viewport (not an adapter pattern)

The three page-based modes (paged, continuous, presentation) all do the same fundamental thing: render page bitmaps from WASM and arrange them. They share the vast majority of code:

- Render pipeline (request bitmap from WASM, draw to canvas)
- Text layer, annotation layer, search highlight layer
- Virtual scrolling (visibility detection, lazy render/destroy)
- Zoom calculation
- Store integration

Extracting separate `DisplayAdapter` implementations would duplicate all of this shared code. Instead, the existing Viewport and spread layout system becomes **viewMode-aware** — the mode acts as a parameter that changes layout calculation, styling, and scroll behavior within the same component tree.

```
Viewer Shell (toolbar, panels — shared)
│
├── viewMode: 'paged' | 'continuous' | 'presentation'
│   └── Viewport (single component, viewMode-aware)
│       ├── spreadLayout.ts  — calculates positions based on viewMode
│       ├── Spread.ts        — renders pages, crops in continuous mode
│       └── Viewport.ts      — adjusts scroll/chrome per mode
│
└── viewMode: 'playback'
    └── PlaybackView (separate component, no pages at all)
```

Only Playback is a genuinely different component — no page bitmaps, no spreads, completely different DOM and interaction model. It gets swapped in at the shell level.

### What changes per mode within Viewport

**`spreadLayout.ts`** — gains `viewMode` as input to layout calculation:

| Mode         | Layout behavior                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| paged        | Current behavior: spreads with spacing, shadows, page borders                                                     |
| continuous   | Grid-based layout from `ContinuousLayoutMetadata`. Cropped page heights. No spacing. Horizontal + vertical extent |
| presentation | Single page, centered in viewport, no spacing, fit-to-viewport                                                    |

**`Spread.ts`** — gains cropping support:

| Mode         | Render behavior                                                                          |
| ------------ | ---------------------------------------------------------------------------------------- |
| paged        | Draw full page bitmap to canvas (current behavior)                                       |
| continuous   | Clip bitmap to `pageContentBounds` before drawing. Container sized to cropped dimensions |
| presentation | Draw full page bitmap (same as paged)                                                    |

**`Viewport.ts`** — adjusts chrome and scroll:

| Mode         | Viewport behavior                                                                |
| ------------ | -------------------------------------------------------------------------------- |
| paged        | Current behavior: shadows, spacing, scroll                                       |
| continuous   | Seamless class (no shadows), continuous scroll, horizontal scroll for wide grids |
| presentation | No scroll. Page navigation via keyboard/click. Black background. Minimal chrome  |

**CSS** — mode-specific classes:

```css
.udoc-viewport--paged {
    /* current default styles */
}
.udoc-viewport--continuous {
    /* seamless, no shadows, no gaps */
}
.udoc-viewport--presentation {
    /* black bg, centered, no chrome */
}
```

### Why not adapters

- **80% shared code.** Paged, continuous, and presentation all render page bitmaps, manage text/annotation/search layers, do virtual scrolling, and handle zoom. Forking into separate classes means maintaining three copies.
- **Tight store integration.** The current Viewport is deeply wired into the store. Extracting a clean adapter interface means either a massive refactor or a leaky abstraction.
- **Switching cost.** Adapters require detach/attach on mode switch — tearing down and rebuilding DOM, losing scroll position, re-rendering all visible pages. ViewMode-aware Viewport just recalculates layout and updates styles in place.
- **Only Playback is different.** It has no pages, no bitmaps, no spreads. A separate component at the shell level is the right boundary.

## Implementation Plan

### Phase 1: State + API (no visual change)

Add `viewMode` to the system with `'paged'` as the only active mode. This is pure plumbing — zero behavior change, fully backward compatible.

1. Add `ViewMode` type and `viewMode` to `ViewerState` in `state.ts`
2. Add `SET_VIEW_MODE` action to `actions.ts`
3. Handle `SET_VIEW_MODE` in `reducer.ts` with constraint enforcement
4. Add `viewMode` to `getFormatDefaults()`
5. Add `setViewMode()` / `getViewMode()` to `UDocViewer.ts`
6. Add `viewMode` to `ViewerOptions`

### Phase 2: ViewModeMenu UI

Update the menu to show `viewMode` as a top-level section, with sub-options conditionally visible.

7. Add View section to `ViewModeMenu` (paged / continuous / presentation radio buttons)
8. Conditionally show/hide Layout, Scroll, Spacing sections based on `viewMode`
9. Filter available view modes based on document format

### Phase 3: Continuous mode

Requires engine metadata. This is the highest-value new mode (unblocks Excel sheet view and Word web layout).

10. Define `ContinuousLayoutMetadata` interface in shared types
11. Engine work: WASM exposes `getContinuousLayoutMetadata()` per document
12. Extend `spreadLayout.ts` to calculate grid-based layout when `viewMode === 'continuous'`
13. Extend `Spread.ts` to crop bitmaps to `pageContentBounds`
14. Extend `Viewport.ts` to apply seamless styling and enable horizontal scroll
15. Wire up: when `viewMode` switches to `'continuous'`, fetch metadata and recalculate layout

### Phase 4: Presentation mode

16. Extend `spreadLayout.ts` for single-page-centered layout
17. Extend `Viewport.ts` for no-scroll, keyboard/click navigation, black background
18. Add presentation-specific CSS
19. Integrate with browser Fullscreen API
20. ESC to exit back to previous mode

### Phase 5: Playback (future)

21. Build `PlaybackView` component (HTML5 media element + controls)
22. Shell-level swap: mount `PlaybackView` instead of `Viewport` when `viewMode === 'playback'`

## Open Questions

- **Remembering paged sub-options**: When switching from paged to continuous and back, should we restore the user's previous paged settings (layout, scroll, spacing)?
- **Continuous + double page**: Should continuous mode ever support side-by-side stitching (e.g., Excel with two sheet columns)?
- **Presentation presenter notes**: Dual-screen presenter view — is this in scope?
- **Animation/transitions**: Should presentation mode support slide transitions? How are they defined?
- **Toolbar behavior**: In presentation mode, should the toolbar auto-hide, or should we enter browser fullscreen with overlay controls?
