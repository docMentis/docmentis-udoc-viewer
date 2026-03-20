# Releasing the WordPress Plugin

## Build a ZIP locally

```bash
sh scripts/build-wp-zip.sh
# Output: dist/udoc-viewer-wordpress-<version>.zip
```

## Publish a GitHub Release

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
