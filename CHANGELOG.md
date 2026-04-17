# Changelog

All notable changes to the udoc-viewer project will be documented in this file.

This project includes changes from both the **viewer** (this repo) and the **engine** (docmentis-udoc core).

## [Unreleased]

### Features

- Fuzzy search mode for AI-citation matching
- Render SmartArt diagrams via pre-rendered fallback (engine)
- Apply shape effects (shadows, glows) to picture frames (engine)
- Bundle Liberation font family as built-in fonts, replacing Noto Sans (engine)

### Bug Fixes

- Suppress errors from in-flight worker requests during viewer teardown
- Avoid unhandled rejection in work-queue cleanup chain
- Render DOCX inline pictures at extent size instead of shape transform size (engine)
- Namespace DOCX image IDs by source part to avoid cross-part rId collisions (engine)
- Recurse into nested DOCX hyperlink elements (engine)
- DOCX table background precedence: cell shading overrides table-level, row-level `tblPrEx` shading respected (engine)
- Treat spanned cell outer edges correctly for border conflict resolution (engine)
- Scale WPG group child positions and stop shrinking positioned runs (engine)
- Render DOCX WPS line connectors with theme-inherited strokes (engine)
- Preserve PPTX table background underlay beneath semi-transparent cell fills (engine)
- Allow negative paragraph left margin to extend past the container (engine)
- Render empty major gridlines and scale chart tick intervals to plot size (engine)
- Ignore PowerPoint rotation sentinel and fix radar chart tick scaling (engine)

## [0.6.28] - 2026-04-16

### Features

- `UDocViewer.getPageText(page)` API returning the exact text that the search engine indexes
- `pageRange` option on the search API to restrict matching to a page range
- Default `searchScrollAlignment` to `'center'` so jumped-to matches land mid-viewport
- Log license hash in the `udoc-wasm-license create` command (engine)
- Record license id, org, validity, and expiry in telemetry (engine)

### Bug Fixes

- Stabilize search UX and reduce render cost while text is still loading
- Suppress render errors logged after the viewer unmounts
- Apply chart axis title rotation and reserve space for it in the plot area (engine)
- Inherit chart-level `txPr` for axis and legend labels (engine)
- Suppress chart auto-title when multi-series and no explicit title is set (engine)
- Apply PPTX paragraph-level `defRPr` to run property inheritance (engine)
- Correct 3D bevel lighting for the Contrasting rig with reversed rotation (engine)
- Inherit PPTX bullet from master `bodyStyle` for paragraphs without `lvl` (engine)
- Extend underline and strikethrough across whitespace runs (engine)
- Exclude trailing whitespace from the flush-time line overflow check (engine)
- Fall back to presentation `defaultTextStyle` for PPTX table cell font size (engine)
- Extend `EXTRA_GOOGLE_FONTS` with Standard 14 and common Microsoft fonts (engine)

## [0.6.27] - 2026-04-12

### Features

- Add `hideLoadingOverlay` option to suppress the loading screen
- GPU-accelerated vortex slide transition via WebGL2
- WebGL2 switch slide transition with 3D depth swap effect
- Skip Google Fonts requests for fonts not in their catalog (engine)

### Bug Fixes

- Finish polygon/polyline drawing when switching tools or re-clicking the active tool
- Per-point data label overrides, no-stroke for chart data points, and balanced legend rows (engine)
- Use effective inherited resources for PDF page rendering (engine)

## [0.6.26] - 2026-04-09

### Features

- Continuous view mode with linear and grid stitch layouts
- Auto-hide floating toolbar after 3 seconds of inactivity
- Content rect and tile position info for continuous mode pages (engine)

### Bug Fixes

- Zoom tool now scrolls to keep the clicked point under the cursor
- Enable annotation tools on mobile by setting touch-action: none
- Use paragraph default run properties for runs without explicit styling in PPTX text (engine)
- Improve chart title, data labels, legend overlay, and number format handling (engine)
- Add built-in PPTX table styles and fix empty line after forced break (engine)
- Exclude formatting-only rows and column defs from XLSX used range (engine)
- Normalize content rect height across pages in same XLSX tile row (engine)
- Use tight-fit content rect for DOCX continuous mode (engine)

### Refactors

- Rename beta flags with `__experimental` prefix for visibility

## [0.6.25] - 2026-04-08

### Features

- Undo/redo support for annotation editing
- Edit properties of selected annotations in the subtoolbar

### Bug Fixes

- Annotations saved to PDF not showing when reopened in viewer
- Top resize handle moving at 2x mouse speed due to duplicate north-handle adjustment
- Use tsify hashmap_as_object to serialize maps as plain JS objects (engine)

## [0.6.24] - 2026-04-08

### Bug Fixes

- Improve delete button appearance in dark theme
- Add missing i18n translations for tool names across all 10 locales (ar, de, es, fr, ja, ko, pt-BR, ru, zh-CN, zh-TW)
- Skip decode array for indexed colorspace images (engine)

## [0.6.23] - 2026-04-08

### Features

- Annotation drawing support for PDF documents with polygon, polyline, and freeform tools
- Annotation select tool with move, resize handles, and delete
- Overlay annotations on printed pages in rendered print path
- Annotation subtoolbar overhaul with reusable components and expanded 15-color preset grid
- Strong WASM types adopted in worker layer for type-safe annotation data
- Border style support for annotations
- Radar chart rendering with spider web axes (engine)
- Stock chart rendering with dual-axis combo support (engine)
- PDF writer module with round-trip test infrastructure (engine)
- Gradient fills, tiling patterns, and JPEG filter in PDF writer (engine)
- PDF appearance streams (AP/N) for saved annotations (engine)
- Complete PDF annotation field coverage for lossless round-trip (engine)
- `pdf_save_annotations` WASM API for annotation editing (engine)
- Strong TypeScript types for all WASM/JS API boundaries (engine)
- Uniform `LayoutNode` trait across layout tree (engine)

### Bug Fixes

- Pixel-perfect PDF writer round-trip tests (engine)
- Align AP stream rendering with viewer JS visuals (engine)
- Line ending arrows and actual dash patterns in AP streams (engine)

## [0.6.22] - 2026-04-06

### Features

- Add startup version check with opt-out via `disableUpdateCheck`
- Enable view tools by default with pointer, hand pan, and zoom click modes
- Implement view tools toolbar with pointer split button, annotation and markup tool sets
- Bar and column chart rendering with stacked/percent-stacked layouts (engine)
- Line and area chart rendering (engine)
- Pie, doughnut, Pie of Pie, and Bar of Pie chart rendering (engine)
- Scatter and bubble chart rendering (engine)
- Chart title rendering with real glyph measurement (engine)
- Data label rendering on bar charts with formatting (engine)
- Per-data-point legend entries with grid layout and row wrapping (engine)
- Chart style and color style (`cs:chartStyle`, `cs:colorStyle`) support (engine)
- Background fill support for chart titles and axis labels (engine)
- Multi-level category labels (`multiLvlStrRef`) and right-aligned bar chart labels (engine)

### Bug Fixes

- Raise toolbar slot z-index so view tools dropdown appears above subtoolbar
- Standardize active tool styles to match existing design pattern
- Allow viewer's own panels to cover attribution logo
- Remove box-shadow from footer toolbar on mobile
- Isolate viewer stacking context to prevent z-index leaking into host page
- Reverse secondary chart order in OfPie to match PowerPoint (engine)
- Connect OfPie lines to top/bottom of secondary chart (engine)
- Tune chart layout margins, padding, and legend sizing for better fidelity (engine)
- Align legend swatches to text baseline and use actual label height (engine)
- Suppress axis line when spPr has noFill stroke (engine)
- Use series name as auto-title for single-series charts and add pie plot padding (engine)
- Apply defRPr styling to chart-generated text (engine)
- Correct bottom axis space for horizontal bar charts (engine)
- Reverse category axis direction for horizontal bar charts (engine)

### Refactors

- Replace blue primary color with monochrome neutrals
- Unify toolbar styles and standardize button sizes to 32px
- Normalize z-index scale to 10-step increments with gaps for future layers

## [0.6.21] - 2026-04-02

### Features

- Add configurable scroll alignment for navigation and search (`navigationScrollAlignment`, `searchScrollAlignment`). Supports `top`, `center`, `bottom`, and `nearest` (minimal scroll). Configurable via `ViewerOptions`, runtime setters, and per-call overrides on `goToDestination`, `searchNext`, `searchPrev`, and `setSearchActiveIndex`.
- Add WMF and EMF vector image format support
- Support opening standalone EMF and WMF files (engine)
- Support SVG text rendering with document fonts and bundled Noto Sans fallback (engine)

### Bug Fixes

- Preserve spaces around match text in search preview context
- Route all SVG rasterization through ImageRasterizer for proper font access (engine)
- Register Noto Sans as serif/sans-serif fallback in SVG loading (engine)

## [0.6.20] - 2026-04-01

### Features

- Add getLayoutPage API to retrieve page layout structure
- Add paragraph end run to text selection layer
- Support wildcard domain matching at any position in license verification (engine)
- Catch panics in WASM entry points to prevent module poisoning (engine)
- Add widow control to prevent single lines at top of next page (engine)
- Support srcRect image cropping in DOCX and move crop logic to shared draw module (engine)

### Bug Fixes

- Prevent infinite retry loop when getLayoutPage fails
- Truncate search context at paragraph boundaries
- Emit newline for paragraph end in search text extraction
- Navigate to search match even when active index is unchanged
- Account for spaceBefore in search highlight baseline position
- Handle rotated text in text overlay and search highlights
- Flatten group text frames into WASM layout output (engine)
- Prevent unlinked variant placeholders from inheriting wrong layout lstStyle (engine)
- Handle negative table indent to prevent WASM overflow panic (engine)
- Give forced line breaks proper line height so break-only lines produce vertical space (engine)
- Add Arial to font fallback chain for box-drawing characters (engine)

### Performance

- Cache glyph fallback resolution to avoid repeated chain traversal (engine)

## [0.6.19] - 2026-04-01

### Features

- Replace flat TextRun model with hierarchical JsLayoutPage for text overlay and search
- Text overlay DOM now mirrors layout structure (frame, parcel, line, run, table, grid) for structured formats
- Flat decomposed-transform rendering path for PDF text selection
- Handle all run content types in text overlay: glyphs, space, tab, break, inline drawing (U+FFFC)
- Ctrl+A / Cmd+A selects only page text, not UI components
- Improved text selection visibility (increased opacity and selection color)
- Replace get_page_text with get_layout_page exposing full layout model (engine)
- Enrich layout model with dimensions on all elements: line, run list, run, table (engine)
- Expose spaceBefore/spaceAfter on layout lines for paragraph spacing (engine)
- Add break, inline drawing, and paragraph end run content variants (engine)
- Include space characters in layout output for text selection (engine)

### Bug Fixes

- Only trigger search on Enter key instead of every keystroke
- Correct table/grid cell vertical positioning (cell y relative to row)
- Exclude paragraph spacing from text selection highlight height
- Correct EMF header field offsets and heuristic device-to-pixel mapping (engine)

### Performance

- Optimize layout composition pipeline: shaping cache, merge macro, text region, shrink-to-fit (engine)
- Use BTreeMap index for O(log n) LRU eviction in SizedLruCache (engine)

## [0.6.18] - 2026-03-30

### Features

- Decouple search API from right panel to support custom search UI
- Disable low-res preview rendering with PREVIEW_ENABLED flag
- Add performance counters for preview renders and font usage queries
- Implement 3D vortex slide transition with tile-based animation

### Bug Fixes

- Correct zoom/box-out transition to expand incoming slide from center
- Correct zoom/box-in transition to shrink outgoing slide to center
- Reduce wheel transition feather significantly
- Restrict transition feather to moving edges only
- Fix ImageMask stencil painting with current nonstroking color (engine)
- Correct soft mask handling per PDF spec 8.4 and 8.9.5.4 (engine)
- Align soft mask coordinate space with masked content's GroupPlacement (engine)
- Resolve pixmap/mask size mismatch in soft mask rendering (engine)
- Render tensor-product mesh shadings with sub-pixel patches (engine)

### Performance

- Optimize shading rasterization and adopt page-level BBox clipping (engine)
- Optimize patch mesh shading color conversion (engine)
- Scope soft mask pixmaps to effective bounds intersection (engine)

## [0.6.17] - 2026-03-29

### Bug Fixes

- Store rasterized shadings in per-render ephemeral store instead of LRU cache (engine)

## [0.6.16] - 2026-03-29

### Features

- Add fonts panel to left sidebar showing font usage in a tree view with primary/fallback indicators and source badges
- Expose `getFontUsage()` API and `font:usageChange` event for programmatic font usage inspection
- Export `FontUsageEntry`, `ResolvedFontInfo`, and `FontSource` types
- Add `disableFonts` viewer option to hide the fonts panel
- Enable XLSX spreadsheet support
- Add `disableTelemetry` client option
- Implement 3D box-rotation blinds transition matching PowerPoint
- Rewrite checker transition as 3D tile flip with sub-pixel seam fix
- Add feathered edges to strip, split, wedge, wheel, and wipe transitions
- Expose font usage information from engine (engine)
- Deferred EMF rasterization with text rendering via FontSystem (engine)
- Support VML objects and pictures in DOCX (engine)
- Support anchor drawings in headers/footers with dynamic header height (engine)
- Split DOCX tables across pages at row boundaries (engine)
- Add `disable_telemetry()` option gated by license feature flag (engine)

### Bug Fixes

- Align blind/checker transition strips to device-pixel grid
- Preserve current page when toggling side panels in single spread mode
- Fix wipe up/down direction and stop reversing push/wipe on backward nav
- Push transition slides incoming with outgoing, pull only moves outgoing
- Rewrite newsflash transition as scale+rotate expand from center
- Add feathered edge to plus and diamond transitions
- Fix circle transition using invalid radial-gradient syntax
- Use static shadow element for consistent page shadow during transitions
- Move image effect application from OOXML loader into core rendering pipeline (engine)
- Don't clip table cell text in AtLeast-height rows (engine)
- Use frame dimensions for EMF device-to-pixel mapping (engine)
- Render anchor drawings in DOCX table cells (engine)
- Auto-contrast text color in table cells with dark backgrounds (engine)
- Apply table indent to column positions (engine)
- Apply full logical-to-pixel scale chain to EMF pen width (engine)
- Exclude bullet spacer from justify spacing expansion (engine)
- Emit Tab suffix for numbered paragraphs instead of thin spacer (engine)
- Use lvlText character for DOCX bullet format instead of hardcoded default (engine)
- Fix justify spacing for Space runs and center bullet alignment (engine)
- Apply default paragraph style when no explicit style_id is set (engine)
- Add Roboto to general text fallback fonts (engine)
- Add direct PolyBezier16 stroke and EMR_ARCTO support in EMF (engine)

### Refactors

- Simplify transition snapshot to a positioned div with canvas

## [0.6.15] - 2026-03-26

### Bug Fixes

- Add Roboto to bullet text fallback fonts for geometric shape glyphs (engine)

## [0.6.14] - 2026-03-26

### Features

- Expose `parseFontInfo` API for extracting font metadata from raw binary files
- Add mobile toolbar overflow menu for better small-screen usability
- Font metadata extraction via WASM for binary font files (engine)
- Kern attribute support for improved PPTX text spacing (engine)
- Persist search results across panel close/reopen and add clear button

### Bug Fixes

- Unify empty state UI across all panels
- Remove panel shadow bleed and match mobile toolbar colors
- Sort render queue by page proximity for faster visible-page rendering
- Fix search panel layout and interaction issues on mobile
- Comprehensive Noto Sans glyph fallback for text and bullet characters (engine)
- Move ICC transform caches from thread-local to render session scope (engine)
- Prevent WASM out-of-memory on large documents with LRU cache eviction (engine)
- Disable anti-aliasing for axis-aligned rectangle fills (engine)
- Fix row height calculation in grid layout (engine)
- Fix XLSX column width formula and theme font resolution (engine)
- Detect and break form XObject cycles in PDF loader (engine)
- Support grayscale decode arrays for correct image inversion (engine)

## [0.6.13] - 2026-03-24

### Features

- Floating toolbar becomes a layout footer on small screens instead of an overlay, eliminating the need for scroll padding and conditional attribution positioning

### Bug Fixes

- Fix toolbar button and zoom chevron sizing on touch devices — `pointer: coarse` min-size overrides caused buttons to overflow the 40px toolbar
- Fix dropdown menu z-index for zoom and view mode menus in both the floating toolbar footer and the header toolbar
- Left-align inline toolbar controls when floating toolbar is hidden
- Correct XLSX row height, cell margins, and text alignment (engine)
- Align right/center text within cell bounds instead of overflow area in XLSX (engine)
- Default vertical alignment to bottom for XLSX cells (engine)
- Implement StUniversalMeasure parsing across all OOXML call sites (engine)

## [0.6.12] - 2026-03-24

### Features

- PPTX slide transition support with animated playback including blinds, comb, wheel, wedge, checker, and randomBar transitions
- PPTX 2010+ (p14) and 2015+ (p159) extended transition types
- Viewer options moved to a modal dialog with refined demo UI
- Unified work queue to prioritize renders over annotations and text extraction
- Redesigned demo UI to match docmentis.com site style
- Strongly typed TypeScript definitions for the page transition API (engine)
- Page transition model with PPTX and PDF loader support (engine)
- PowerPoint 2010+ and 2015+ transition support (engine)

### Bug Fixes

- Normalize floating toolbar height to 40px across all screen sizes
- Fix crossfade, fade, cut, blinds, checker, circle, and cover transition fidelity
- Improve dissolve, strips, and checker transitions to match PowerPoint behavior
- Handle negative srcRect crop values in PPTX image placement (engine)
- Force character-level line break for oversized words in text layout (engine)
- Improve PPTX line spacing and baseline positioning (engine)
- Separate default paragraph properties (defPPr) from level-specific text properties (engine)

## [0.6.11] - 2026-03-22

### Features

- SVG format support in viewer, demo, and WordPress block
- Internationalization (i18n) with 11 built-in locales and browser language detection
- Comprehensive accessibility: ARIA patterns, roving tabindex, resize handles, keyboard shortcut help
- Style attribution "docMentis" with brand colors
- SVG image support for OOXML documents (svgBlip) (engine)
- SVG format detection in WASM document loader (engine)
- Deferred SVG rasterization at render time for sharp zoom (engine)
- PPTX color map (p:clrMap) and background inheritance (engine)
- Complete placeholder inheritance for bodyPr, shape style, xfrm, geometry, and more (engine)
- Cursor-based z-order compositing for PPTX layout/slide shapes (engine)

### Bug Fixes

- Missing tooltips and hardcoded labels in applyState
- Chrome placeholder properties leaking into content placeholders (engine)
- Text outline (a:ln on defRPr) for outlined/stroked text (engine)
- Inherit custGeom clip path from layout placeholder for pictures (engine)
- Inherit placeholder fill, bounds, and table GraphicFrame bounds from layout (engine)
- Non-trailing decor z-order compositing for correct slide rendering (engine)

## [0.6.10] - 2026-03-20

### Features

- Font registration API for loading custom fonts via `registerFont()`
- Move `googleFonts` configuration to client level for more flexible font management

### Bug Fixes

- Replace corrupt demo font files and use `import.meta.url` for correct font paths

## [0.6.9] - 2026-03-20

### Features

- Add print dialog with page range and quality options
- Add print button to toolbar with native PDF and rendered fallback
- Add download button to toolbar with multi-format support
- Add keyboard shortcuts for search and zoom operations
- Show processing overlay during WASM load and page info extraction
- Evaluate datetime and slidenum/PAGE fields with actual values (engine)

### Bug Fixes

- Remove `now_utc()` fallback that panics on WASM (engine)
- Close panels instantly without animation when opening a new document
- Scope keyboard shortcuts to viewer and fix aria-keyshortcuts format
- Correct nested group transform positioning and rotation offset scaling in PPTX (engine)
- Counter-flip text in PPTX groups with flipH/flipV (engine)
- Use group-scaled rect for text wrapping in PPTX grouped shapes (engine)
- Resolve nested grpFill inheritance in PPTX group shapes (engine)
- Skip all hidden shape types in PPTX rendering (engine)
- Correct EMF alpha handling, EMR_ALPHABLEND support, and luminance in sRGB space (engine)
- Support gradient fill backgrounds and scaled gradient geometry in PPTX (engine)
- Apply luminance effect in linear light space for correct washout (engine)

## [0.6.7] - 2026-03-19

### Features

- Add WordPress plugin for embedding UDoc Viewer via shortcode or Gutenberg block
- Add docMentis logo branding to loading overlay and page rendering
- Add hide-attribution toggle to demo viewer options
- Script-aware font fallback for CJK and other non-Latin scripts (engine)
- Shared blip image effects: duotone, alphaModFix, grayscale, biLevel, luminance (engine)

### Bug Fixes

- Prevent viewport scroll area from overflowing container when padded
- Load themes from all slide masters in multi-master PPTX files (engine)
- Correct EMF rendering for content at non-zero device coordinates (engine)
- Support grpFill to inherit fill from parent group in PPTX shapes (engine)
- Rewrite clrChange to decode and replace pixels directly (engine)
- Fix table cell merge layout, border conflict resolution, and corner gaps (engine)
- Preserve leading spaces on first line of paragraphs and fix PPTX col_idx tracking (engine)
- Resolve PPTX table style colors against the correct per-slide theme (engine)
- Support pattern fill backgrounds and fix pattern scale to 1pt/pixel (engine)

## [0.6.6] - 2026-03-17

### Features

- GPU-accelerated rendering via WebGPU
- Low-res preview with fade-in transition for smoother page loading UX
- Vello GPU render backend with async WebGPU rendering in WASM (engine)
- Soft mask (SMask) support for PDF transparency effects (engine)
- XLSX spreadsheet support with table styles, number formatting, rich text, and full pagination (engine)
- DOCX/PPTX table migration to universal Table model with style chain resolution (engine)
- Anti-aliasing-aware pixel comparison for visual regression tests (engine)
- Inline table style support for per-table overrides in composition (engine)
- Rich text support in XLSX shared and inline strings (engine)
- Shrink-to-fit and cell indent for XLSX grid table cells (engine)

### Bug Fixes

- Fix white screen when toggling GPU option after opening an external file
- Replace broken CMYK ICC profile with Adobe USWebCoatedSWOP for accurate color (engine)
- Apply blend modes for non-group content in Vello GPU backend (engine)
- Correct CMYK color accuracy with full ICC profile and correct rendering intent (engine)
- Support DeviceN/Separation color spaces in shading conversion (engine)
- Correct XLSX style resolution per ECMA-376 spec (engine)
- Fix XLSX scale, print area, color fallback, pagination, borders, and table width (engine)
- Correct XLSX table overlay stripe cycle, region exclusion, and style mappings (engine)
- Correct table border conflict resolution and expansion (engine)
- Fix DOCX table style inheritance for borders and margins (engine)
- Correct run/paragraph property merge order and DOCX nil border handling (engine)

### Performance

- Cache tint-to-sRGB lookup for DeviceN/Separation shadings (engine)
- Reuse thread-local PostScript VM for function evaluation (engine)

## [0.6.5] - 2026-03-14

### Features

- Visibility groups (layers) panel UI for toggling Optional Content Groups
- PDF Optional Content Group (OCG) support with visibility queries and toggling (engine)
- Locked visibility groups from PDF OCG configuration (engine)

### Bug Fixes

- Resolve OCG visibility on Form XObjects via /OC entry (engine)
- Treat intra-item breaks after hyphens as strong break candidates (engine)
- Apply text alignment for PPTX wrap=none text bodies (engine)
- Improve Exact line spacing baseline positioning for PPTX (engine)
- Use proportional baseline positioning for PPTX Percent spacing > 1.0 (engine)
- Round fontScale-applied font sizes to nearest integer point (engine)
- Exclude trailing space_after from paragraph overflow check (engine)
- Don't apply lnSpcReduction to paragraph spacing (spcBef/spcAft) (engine)
- Inherit bodyPr text insets (lIns/tIns/rIns/bIns) from layout/master placeholders (engine)
- Exclude ParagraphEnd from line metrics when text runs are present (engine)
- Add placeholder type fallback for ctrTitle→title and subTitle→body inheritance (engine)

## [0.6.4] - 2026-03-13

### Features

- Move telemetry from client-side JS to WASM with server-side proxy
- Auto-detect document format on load (engine)
- Expose document format getter from engine (engine)

### Bug Fixes

- Move document format detection from JS to WASM, fixing incorrect format reports (#15)
- Add computed-visibility and occlusion checks to attribution tamper protection
- Fix continuous section header/footer bugs and move inheritance to layout time (engine)

## [0.6.3] - 2026-03-11

### Bug Fixes

- Use ICC profile for YCCK JPEG CMYK-to-sRGB color conversion (engine)

### Performance

- Introduce glyph rasterization cache for text rendering (engine)
- Share rendering backend across page renders for glyph cache reuse (engine)

## [0.6.2] - 2026-03-09

### Features

- Auto-space insertion for CJK ↔ Latin/digit boundaries (engine)
- Background style reference (bgRef) support for PPTX slides (engine)

### Bug Fixes

- Use viewport center instead of top edge for current page detection

## [0.6.1] - 2026-03-08

### Features

- UAX #14 Unicode line breaking in compose pipeline (engine)
- Intra-shaped-item line breaking with UAX #14 compliance (engine)

### Bug Fixes

- Default to theme minor font for PPTX text without explicit typeface (engine)
- Skip text alignment when available width is infinite (engine)
- Handle overflow in carried-over items at paragraph flush (engine)
- Break overflowing first item on line via intra-item CJK breaks (engine)
- Route Common-script fullwidth characters to East Asian font slot (engine)
- Correct shape_bullet metrics, PUA fallback, and glyph-to-char mapping (engine)
- Correct paragraph end mark byte span in layout (engine)

## [0.6.0] - 2026-03-06

### Features

- DOCX rendering support with demo sample
- DOCX document support (viewer adapter)
- Full-text search with match highlighting and navigation
- Dark mode support with theme toggle and public API
- Viewer options for text selection, theme switching, rotation, spacing, and zoom limits
- License hash telemetry
- Style resolution in the composition engine (engine)
- FlowSection layout engine with pagination and dual-dispatch rendering (engine)
- DOCX adapter with text rendering support — Phase 1 MVP (engine)
- Paragraph borders and inline image rendering for DOCX (engine)
- DOCX table support with style loading and resolution (engine)
- DOCX table rendering in composed frames (engine)
- End mark properties and empty paragraph line height fix (engine)
- Line metrics rewrite to match Pathfinder model (engine)
- Format-specific leading in line height model (engine)
- Orphan control for DOCX page breaks (engine)
- Page break support for DOCX (pageBreakBefore and w:br) (engine)
- DOCX paragraph/run properties in layout engine (engine)
- DOCX run-level properties: width_scale, underline_fill, border, shading (engine)
- DOCX section break types (EvenPage, OddPage, Continuous) in layout (engine)
- LocalFontsProvider for loading fonts from a local directory (engine)
- Paragraph spacing collapse and contextual spacing for DOCX (engine)
- ComposeSettings for format-specific layout behavior (engine)
- Column break support in layout engine (engine)
- PAGE field evaluation during layout (engine)
- Field support with cached values (engine)
- DOCX table border and cell margin resolution from style chain (engine)
- Tab leader rendering — dot leaders, hyphens, etc. (engine)
- DOCX header/footer inheritance across sections (engine)
- Multi-column layout and right-aligned tab stops for DOCX (engine)
- Glyph-level font fallback for Google Fonts unicode-range subsets (engine)
- Multilingual font substitution for CJK, Arabic, Hebrew, Thai, and Indic scripts (engine)
- Picture border/effect support for DOCX inline drawings (engine)
- Page border rendering for DOCX (engine)
- Multi-interval line breaking for BothSides text wrapping (engine)
- Text wrapping for DOCX anchored objects (engine)
- Layout and render text in resource frames (engine)
- DOCX anchor drawing composition and rendering (engine)
- DOCX TextAnchorDrawing model and wp:anchor converter (engine)

### Bug Fixes

- Clear search highlights when closing or switching away from search panel
- Remove column re-sorting, use content stream order for text selection
- Prevent overlapping text selection highlights from double-darkening
- Exclude inline images from line-spacing scaling (engine)
- Stop using endParaRPr as fallback for paragraph default_run_properties (engine)
- DOCX theme colors use HSL luminance instead of RGB tint/shade (engine)
- Add Paint::Image for blipFill and outward stroke for p:pic borders (engine)
- DOCX table row height rules (Exact/AtLeast/Auto) (engine)
- Expand paragraph space_after to accommodate bottom border extent (engine)
- Offset paragraph border stroke by half-width for correct spacing (engine)
- Include end mark in last line height for all paragraphs (engine)
- Offset table cell content by border inset to avoid overlap (engine)
- Inherit table-level cell margins for partial tcMar overrides (engine)
- Add bounds checks for sub-byte image converters to prevent panic (engine)
- Prevent compose overflow from resetting story position (engine)
- Don't fallback to default header/footer on title page when first-page variant is missing (engine)
- Implement lvlJc number alignment for DOCX numbered lists (engine)
- Support DOCX multi-level list numbering with correct counter tracking (engine)
- Apply table style paragraph properties and vertical centering in DOCX tables (engine)
- Render DOCX numbered lists and fix bullet overflow pagination (engine)
- Collect inline image resource IDs from table cells (engine)
- Suppress paragraph spacing at top of overflow pages in DOCX (engine)
- Correct DOCX footer positioning and paragraph shading rendering (engine)
- Correct paragraph bottom border spacing (engine)
- Use text run font for auto-numbered bullet lists (engine)
- Correct hanging indent positioning for numbered lists (engine)
- Improve PPTX text baseline by pinning descent at bottom of leading (engine)
- Resolve connector stroke from style matrix when line has no fill (engine)
- Extend paragraph shading through space_before when previous paragraph has shading (engine)
- Per-character subset resolution for CJK Google Fonts (engine)
- PUA symbol font fallback and Google Fonts subset coverage (engine)
- Handle DOCX trHeight default (engine)
- Resolve table cell resolution (engine)
- PUA→Unicode fallback for symbol fonts in regular text shaping (engine)
- Suppress Hyperlink style and end mark overrides in TOC-like fields (engine)
- Inherit headers/footers from previous section for continuous sections (engine)
- Resolve DOCX header/footer images using correct OPC part relationships (engine)
- Fix small caps horizontal character overlap in rendering (engine)
- Fix text wrapping for tight/through wrap polygons (engine)
- Preserve rotation for DOCX anchored pictures (engine)
- Parse DOCX wps shapes (engine)
- Handle SDT in table cells and fix DOCX default font size (engine)
- DOCX composition bugs for lists, continuations, headers, and widow control (engine)

### Performance

- Cache codepoint-to-subset index lookups in GoogleFontsProvider (engine)

## [0.5.24] - 2026-02-27

### Bug Fixes

- Use top-biased heuristic for current page detection in scroll mode
- Make demo viewer options panel collapsible to free space for doc selectors

## [0.5.23] - 2026-02-27

### Features

- Optimize spread layout search with binary search

### Bug Fixes

- Scroll thumbnail panel to active page after list rebuild

## [0.5.22] - 2026-02-26

### Features

- Add thumbnailWidth option to ViewerOptions

### Bug Fixes

- Ensure **VERSION** is replaced in all build outputs

## [0.5.21] - 2026-02-26

### Features

- Relax OOXML standard compliance in WASM parser (engine)
- ColorTransform, ColorRef, ColorBase, PresetColor, and SystemColor (engine)

### Bug Fixes

- Handle all-fields-optional refactor in PPTX converter (engine)
- Restore ThemeColorRef and use ColorBase::Theme (engine)

## [0.5.20] - 2026-02-25

### Features

- Anonymous usage telemetry via PostHog

## [0.5.19] - 2026-02-25

### Features

- Demo options panel and toolbar button visibility for disabled panels
- UI component visibility options, methods, and events

## [0.5.18] - 2026-02-24

### Features

- License-gated hideAttribution option
- Theme support wired through OOXML adapter and renderer (engine)
- Theme model with ThemeColorRef, ThemeFontRef, and TextFont types (engine)

## [0.5.17] - 2026-02-23

### Features

- Character spacing (spc attribute) applied to glyph advances (engine)
- Preserve text fill alpha from OOXML color transforms (engine)

### Bug Fixes

- Pass object to WASM init function to resolve deprecation warning
- Center baseline within Exact line spacing and start first line at y=0 (engine)
- Allow text overflow and negative vertical anchoring for noAutofit boxes (engine)
- Correct PPTX stroke inheritance and text overflow for small containers (engine)

## [0.5.16] - 2026-02-23

### Features

- OTF shaping for PPTX text layout (engine)
- Table composition in text_new pipeline (engine)
- Bullet support, justify alignment, superscript/subscript, and caps (engine)
- NormalAutoFit shrink-to-fit in compose_body (engine)
- compose_body for PPTX text frame layout (engine)
- compose_program and GlyphId in new layout model (engine)
- compose_story with greedy line breaking and alignment (engine)
- TextProgram module (engine)
- Character position tracking in layout model (engine)
- Itemizer as stateless function (engine)
- Itemize and shape modules (engine)
- Compose module with composition function signatures (engine)
- TextBody and TextSection models for PPTX/DOCX text containers (engine)
- Run access, mutation, and position lookup methods (engine)
- Block access, mutation, and position lookup methods (engine)
- Computed metrics and above/below baseline methods in layout model (engine)
- Layout module with LayoutParcel, LayoutLine, LayoutRunList model (engine)
- Text model module with TextStory, TextBlock, TextRun (engine)

### Bug Fixes

- Use effective zoom for zoom in/out step calculation in fit modes
- Include line_gap in below_baseline for correct text line height (engine)
- Fix text rendering regressions in text_new pipeline (engine)

## [0.5.15] - 2026-02-19

### Features

- 3D bevel effect rendering for PPTX shapes (engine)
- Spec-accurate multi-light rigs and HSL face lighting for 3D bevels (engine)
- Replace bevel profiles with spec-accurate Bezier LUTs and RGB lighting (engine)
- Camera model, contour, extrusion, and Phong face lighting for 3D shapes (engine)
- DisplayGroup + Effects architecture for PPTX visual effects (engine)
- Inner shadow, glow, soft edge, reflection, and preset shadow effects (engine)
- Outer shadow affine transforms (scale, skew, alignment) (engine)
- Texture tile fill support for PPTX shapes (engine)
- Pattern fill support for PPTX shapes (engine)
- PathShading for shape-following gradient isolines (engine)
- RectShading for rectangular path gradients in PPTX (engine)
- Image fill (blipFill) on PPTX shapes (engine)

### Bug Fixes

- Read font name and type from metadata artifacts in WASM extraction (engine)
- Use Phong specular for bevel interior and tune WarmMatte power (engine)
- Eliminate bevel fold artifacts at rounded corners (engine)
- Smooth bevel-to-interior transition to eliminate corner staircase (engine)
- Tune RGB bevel lighting with diffuse ratio and specular delta (engine)
- Improve soft edge rendering with erosion+blur to match PowerPoint (engine)
- Improve glow rendering with dilation+blur to match PowerPoint (engine)
- Reduce blur sigma to match PowerPoint (engine)
- Correct inner shadow direction by inverting offset sign (engine)
- Correct shadow blur by converting OOXML blurRad to Gaussian sigma (engine)
- Correct all preset pattern bitmaps to match GDI+ HatchStyle spec (engine)
- Center radial gradient outer circle at focus point instead of shape center (engine)

## [0.5.14] - 2026-02-18

### Features

- Per-framework examples (React, Vue, Svelte, Angular, Next.js, Nuxt) and improved WASM fallback

## [0.5.13] - 2026-02-18

### Bug Fixes

- Eliminate import.meta from shipped code for StackBlitz compatibility

## [0.5.12] - 2026-02-18

### Bug Fixes

- Correct WASM fallback path in bundled worker

## [0.5.11] - 2026-02-18

### Bug Fixes

- Bundle worker into self-contained file for cross-bundler compatibility

## [0.5.10] - 2026-02-16

### Bug Fixes

- Ensure WASM URL is absolute before passing to blob worker

## [0.5.9] - 2026-02-16

### Bug Fixes

- Resolve WASM URL on main thread to fix Turbopack blob worker loading

## [0.5.8] - 2026-02-15

### Bug Fixes

- Delay loading overlay by 300ms to avoid flash on fast downloads

## [0.5.7] - 2026-02-15

### Features

- Open/close animation for left and right panels

### Bug Fixes

- Make container width CSS-driven to eliminate resize flash
- Use CSS centering for spread horizontal positioning to prevent resize flash

## [0.5.6] - 2026-02-15

### Bug Fixes

- Correct GitHub org casing in repository URLs for npm provenance

## [0.5.5] - 2026-02-15

### Features

- Initial release of udoc-viewer
- PDF document viewing with high-fidelity rendering
- PPTX presentation viewing support
- Thumbnail panel navigation
- Zoom controls (fit-width, fit-page, fit-spread-width-max)
- Spread view mode for side-by-side pages
- PDF recipe operations (splitMidPage, convertRawToPng)
- Download progress bar
- Password-protected PDF support
- Performance counter for tracking viewer operations
- Expand font substitution table for broader Office document coverage (engine)

### Bug Fixes

- Correct GitHub repository URL
- Correct text baseline positioning with natural line height (engine)
- Extract PPTX slide background fill and render as first frame (engine)
- Fix box blur accumulator underflow caused by off-by-one in initial window (engine)
- Improve CMYK color accuracy and fix fill path merging bug (engine)

### Performance

- Debounce page renders during viewport resize
- Reduce render debounce time from 150ms to 50ms
- Batch ICC color conversion for images
- Pre-compute ICC profile hash to avoid per-pixel hashing
- Fix layout thrashing in text layer rendering

### Engine Highlights

- PPTX shape, text, and image rendering
- Full OOXML custom geometry support with per-path styling
- Unified geometry interpreter for all PPTX preset shapes
- OOXML color transform support (lumMod, lumOff, tint, shade)
- OOXML theme color scheme support
- Slide layout shape inheritance and connector support
- PNG alpha channel and indexed PNG support for OOXML images
- JPEG 2000 decoding support
- Password protection support
- Text selection with column detection
- Non-separable blend modes
- Batch color conversion with generic BitDepth trait
- Multi-page TIFF and color space support
