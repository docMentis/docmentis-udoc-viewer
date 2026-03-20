#!/bin/sh
# Build a distributable ZIP for the UDoc Viewer WordPress plugin.
#
# Usage: scripts/build-wp-zip.sh
# Output: dist/udoc-viewer-<version>.zip
#
# The ZIP contains a top-level "udoc-viewer/" directory matching the
# expected WordPress plugin folder name.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$ROOT_DIR/packages/udoc-viewer-wordpress"

# Read version from the main plugin file header.
VERSION=$(grep -m1 'Version:' "$PLUGIN_DIR/udoc-viewer.php" | sed 's/.*Version:[[:space:]]*//' | tr -d '[:space:]')

if [ -z "$VERSION" ]; then
  echo "Error: could not read version from udoc-viewer.php" >&2
  exit 1
fi

DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="$DIST_DIR/udoc-viewer"
ZIP_FILE="$DIST_DIR/udoc-viewer-wordpress-${VERSION}.zip"

echo "Building udoc-viewer v${VERSION}..."

# Clean previous build.
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

# Copy plugin files (exclude dev-only files).
cp "$PLUGIN_DIR/udoc-viewer.php" "$STAGE_DIR/"
cp "$PLUGIN_DIR/readme.txt" "$STAGE_DIR/"
cp -r "$PLUGIN_DIR/includes" "$STAGE_DIR/"
cp -r "$PLUGIN_DIR/assets" "$STAGE_DIR/"
cp -r "$PLUGIN_DIR/block" "$STAGE_DIR/"

# Build ZIP.
rm -f "$ZIP_FILE"
(cd "$DIST_DIR" && zip -r "$ZIP_FILE" udoc-viewer/)

# Clean staging directory.
rm -rf "$STAGE_DIR"

echo "Created $ZIP_FILE"
