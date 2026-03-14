# Changelog

All notable changes to the udoc-viewer project will be documented in this file.

This project includes changes from both the **viewer** (this repo) and the **engine** (docmentis-udoc core).

## [Unreleased]

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
