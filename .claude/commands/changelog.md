Update the [Unreleased] section of CHANGELOG.md with changes since the last released version.

Optional arguments: $ARGUMENTS
- If empty, update the [Unreleased] section with changes from the last tag to HEAD.
- If "full", regenerate the entire changelog from scratch.

## Instructions

### Step 1: Determine the version range

- Run `git tag --sort=-creatordate | head -1` to find the latest tag.
- The range is from that tag to HEAD.
- If there are no new commits since the tag, inform the user and stop.

### Step 2: Collect commits from this repo (docmentis-udoc-viewer)

- Run `git log <latest-tag>..HEAD --oneline` to get commits since last release.
- Filter to meaningful commits: `feat:`, `fix:`, `perf:`, `refactor:` prefixes.
- Ignore `chore:`, `docs:`, `test:`, merge commits — BUT note `chore: Update WASM binary` commits separately for Step 3.

### Step 3: Collect changes from the core engine repo (docmentis-udoc)

The WASM binary in this project is built from the sibling repo at `/Users/wangxin/Documents/Docmentis/docmentis-udoc`.

For each `chore: Update WASM binary` commit found in Step 2:
- Get the date of that commit and the date of the previous WASM update (or the from-tag).
- In the `docmentis-udoc` repo, find commits in that date range using `git log --after="<prev-date>" --before="<wasm-date>" --oneline`.
- Collect `feat:`, `fix:`, `perf:` commits from that repo.

If there are no WASM update commits but the range spans a period, check the docmentis-udoc repo for changes in the same date range as the tag range.

### Step 4: Format the new [Unreleased] section

Format the section like this:

```
## [Unreleased]

### Features
- Description of feature
- Description of engine feature (engine)

### Bug Fixes
- Description of fix
- Description of engine fix (engine)

### Performance
- Description of improvement (engine)
```

Rules:
- Group by category: Features, Bug Fixes, Performance. Omit empty categories.
- For engine (docmentis-udoc) changes, add "(engine)" suffix to distinguish from viewer changes.
- Write human-readable descriptions — don't just copy commit messages verbatim. Clean them up, remove prefixes, make them concise but informative.
- Keep entries at a reasonable granularity — consolidate very small related fixes into one entry where it makes sense.

### Step 5: Update CHANGELOG.md

- Read the existing CHANGELOG.md file.
- Find the existing `## [Unreleased]` section. It ends where the next `## [` line begins (or at end of file if there's no next version).
- Replace the entire [Unreleased] section (header + all content until next version header) with the newly generated section.
- If there is no `## [Unreleased]` section, insert one right after the changelog header/preamble and before the first versioned section.
- Write the updated file using the Edit tool.
- Tell the user the [Unreleased] section has been updated and show a brief summary of what was added.
