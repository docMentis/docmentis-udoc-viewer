#!/bin/sh
# Replaces the [Unreleased] header in CHANGELOG.md with the release version and date,
# and adds a fresh [Unreleased] section above it.
#
# Usage: scripts/release-changelog.sh <version>
# Example: scripts/release-changelog.sh 0.6.2

set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

CHANGELOG="CHANGELOG.md"
if [ ! -f "$CHANGELOG" ]; then
  echo "Error: $CHANGELOG not found" >&2
  exit 1
fi

DATE=$(date +%Y-%m-%d)

# Replace "## [Unreleased]" with a fresh Unreleased section + the versioned header
sed -i.bak "s/^## \[Unreleased\]/## [Unreleased]\n\n## [$VERSION] - $DATE/" "$CHANGELOG"
rm -f "${CHANGELOG}.bak"

echo "Updated $CHANGELOG: [Unreleased] -> [$VERSION] - $DATE"
