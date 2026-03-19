=== UDoc Viewer ===
Contributors: docmentis
Tags: pdf, document viewer, docx, pptx, word, powerpoint, webassembly
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Universal document viewer for WordPress — embed PDF, DOCX, PPTX, and images with high-fidelity rendering powered by WebAssembly.

== Description ==

UDoc Viewer brings high-fidelity document viewing to WordPress. Powered by a custom WebAssembly engine (not PDF.js), it renders documents directly in the browser with near-native quality.

**Supported formats:**

* PDF
* DOCX (Word)
* PPTX (PowerPoint)
* Images (PNG, JPEG, GIF, WebP, BMP, TIFF, and more)

**Key features:**

* Client-side rendering — documents never leave the browser
* Full-text search with match highlighting
* Zoom, pan, and page navigation
* Dark mode with system preference detection
* Responsive design (desktop and mobile)
* Gutenberg block with Media Library integration
* Shortcode support for classic editor
* No server-side dependencies
* Framework-agnostic, lightweight JavaScript SDK

== Installation ==

1. Upload the `udoc-viewer` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. (Optional) Configure settings under Settings > UDoc Viewer

== Usage ==

**Shortcode:**

`[udoc-viewer src="https://example.com/document.pdf"]`

**With a WordPress media attachment:**

`[udoc-viewer src="123"]`

**With options:**

`[udoc-viewer src="https://example.com/doc.pdf" height="800px" theme="dark" toolbar="false"]`

**Gutenberg Block:**

Search for "Document Viewer" in the block inserter. Select a file from the Media Library or enter a URL.

== Shortcode Attributes ==

* `src` — Document URL or WordPress attachment ID (required)
* `width` — Container width, default `100%`
* `height` — Container height, default `600px`
* `theme` — `light`, `dark`, or `system`
* `toolbar` — Show/hide toolbar (`true`/`false`)
* `search` — Enable/disable search (`true`/`false`)
* `fullscreen` — Enable/disable fullscreen (`true`/`false`)
* `text-selection` — Enable/disable text selection (`true`/`false`)
* `left-panel` — Enable/disable left panel (`true`/`false`)
* `right-panel` — Enable/disable right panel (`true`/`false`)

== Frequently Asked Questions ==

= Does this require a server to render documents? =

No. All rendering happens client-side in the browser using WebAssembly. Documents never leave the user's browser.

= How large is the viewer engine? =

The WebAssembly binary is approximately 11.5 MB. It is loaded from a CDN by default and cached by the browser after the first visit.

= Do I need a license key? =

No. The viewer works without a license key. A license key removes the "Powered by docMentis" attribution and unlocks premium features.

= Can I self-host the viewer assets? =

Yes. In Settings > UDoc Viewer, switch to "Self-Hosted" mode and provide the base URL where the SDK files are hosted. Ensure your server serves `.wasm` files with the `application/wasm` MIME type.

== Changelog ==

= 0.1.0 =
* Initial release
* Shortcode support with configurable attributes
* Gutenberg block with Media Library integration
* Settings page for license key, theme, and asset loading mode
* CDN and self-hosted asset loading
* WASM MIME type support for WordPress

== Upgrade Notice ==

= 0.1.0 =
Initial release.
