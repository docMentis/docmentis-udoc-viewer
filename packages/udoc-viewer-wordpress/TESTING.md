# Testing the WordPress Plugin

## Prerequisites

- Node.js >= 18

## Quick Start with wp-now

[wp-now](https://github.com/WordPress/playground-tools/tree/trunk/packages/wp-now) runs a full WordPress instance locally using PHP-WASM. No Docker, no database, no setup wizard needed.

```bash
cd packages/udoc-viewer-wordpress
npx @wp-now/wp-now start
```

This will:

- Download WordPress automatically (first run only)
- Detect the plugin from `udoc-viewer.php` and activate it
- Start a local server at **http://localhost:8881**
- Auto-log you in as admin (no credentials needed)

## Testing the Shortcode

1. Go to **http://localhost:8881/wp-admin/post-new.php**
2. Click the **three-dot menu** (top-right) > **Code editor**
3. Paste:
    ```
    [udoc-viewer src="https://www.docmentis.com/samples/sample-document.docx"]
    ```
4. Click **Publish** > **View Post**
5. The viewer should render the document inline

### Shortcode variations to test

```
<!-- Basic PDF -->
[udoc-viewer src="https://www.docmentis.com/samples/sample-pdf.pdf"]

<!-- Custom height + dark theme -->
[udoc-viewer src="https://www.docmentis.com/samples/sample-pdf.pdf" height="80vh" theme="dark"]

<!-- Minimal: no toolbar, no panels -->
[udoc-viewer src="https://www.docmentis.com/samples/sample-document.docx" toolbar="false" left-panel="false" right-panel="false"]
```

## Testing the Gutenberg Block

1. Go to **http://localhost:8881/wp-admin/post-new.php**
2. Click the **+** block inserter (top-left)
3. Search for **"Document Viewer"**
4. Insert the block
5. Either:
    - Click **"Choose from Media Library"** to pick an uploaded file
    - Enter a document URL in the text field
6. Configure options in the right sidebar (Dimensions, Appearance, Features)
7. Publish and view the post

## Testing the Settings Page

1. Go to **http://localhost:8881/wp-admin/admin.php?page=udoc-viewer**
2. Verify all sections render:
    - **License** — license key field
    - **Asset Loading** — CDN vs self-hosted radio buttons
    - **Viewer Defaults** — theme, toolbar, floating toolbar, attribution, download, print, theme switching, Google Fonts
3. Change settings and save
4. Verify changes apply to viewers on the frontend

## Creating Test Posts via CLI

You can create posts programmatically using the REST API (useful for automation):

```bash
# Get auth cookies (wp-now auto-logs in)
curl -s -c /tmp/wp-cookies.txt -L "http://localhost:8881/wp-admin/" > /dev/null

# Get REST nonce
NONCE=$(curl -s -b /tmp/wp-cookies.txt "http://localhost:8881/wp-admin/admin-ajax.php?action=rest-nonce")

# Create a post with shortcode
curl -s -b /tmp/wp-cookies.txt \
  -H "X-WP-Nonce: $NONCE" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","content":"[udoc-viewer src=\"https://www.docmentis.com/samples/sample-document.docx\"]","status":"publish"}' \
  "http://localhost:8881/?rest_route=/wp/v2/posts"
```

> **Note:** wp-now uses SQLite, not MySQL. The REST API uses query parameter routing (`?rest_route=`) instead of pretty permalinks (`/wp-json/`).

## What to Verify

- [ ] Plugin appears and is active at **Plugins** page
- [ ] Settings page renders at **Settings > UDoc Viewer**
- [ ] Shortcode renders a viewer container with correct dimensions
- [ ] Gutenberg block shows placeholder, accepts Media Library files and URLs
- [ ] Viewer SDK loads from CDN (check Network tab for `+esm` request)
- [ ] Documents render correctly (check Console for errors)
- [ ] Scripts are only loaded on pages that use the viewer (check other pages)
- [ ] Theme setting (light/dark/system) applies to the viewer
- [ ] Multiple viewers on one page work independently

## Releasing

### Build a ZIP locally

```bash
sh scripts/build-wp-zip.sh
# Output: dist/udoc-viewer-wordpress-<version>.zip
```

### Publish a GitHub Release

1. Update `udoc-viewer.php`:
    - Bump the `Version:` header (plugin version)
    - If upgrading the viewer SDK, also bump `UDOC_VIEWER_SDK_VERSION` to match the npm release (this controls the CDN URL)
2. Commit and push to `main`
3. Tag and push:
    ```bash
    git tag wp-v0.1.0
    git push --tags
    ```
4. The `publish-wp.yml` workflow will automatically build the ZIP and create a GitHub Release

The ZIP can be installed via **WordPress Admin > Plugins > Add New > Upload Plugin**.

## Cleanup

Press `Ctrl+C` to stop wp-now. WordPress data is stored in `~/.wp-now/` and persists between runs. To start fresh:

```bash
rm -rf ~/.wp-now/
```
