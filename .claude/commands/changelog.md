Update the [Unreleased] section of CHANGELOG.md with changes since the last released version.

Optional arguments: $ARGUMENTS
- If empty, update the [Unreleased] section with changes from the last tag to HEAD.
- If "full", regenerate the entire changelog from scratch.

## Confidentiality (read first — applies to every entry)

The viewer repo (docmentis-udoc-viewer) is open source, but **all other repos are NOT** — the core engine and its dependency repos (docmentis-pdf, docmentis-font, docmentis-ooxml) are private. The CHANGELOG.md lives in the public viewer repo.

When writing entries for changes that originate in any private repo:
- **Do not expose implementation details.** No internal crate names, module paths, function names, algorithm specifics, file names, or architecture. Never quote private commit messages verbatim.
- **Focus on user-visible outcomes.** Describe what problem was fixed or what improvement was made, from the perspective of someone using the viewer to render documents — e.g. "Fixed incorrect text spacing in some PDFs" rather than anything about the internal fix.
- When in doubt, describe the symptom the user would have seen, not the code that changed.

## Instructions

### Step 1: Determine the version range

- Run `git tag --sort=-creatordate | head -1` to find the latest tag.
- The range is from that tag to HEAD.
- If there are no new commits since the tag, inform the user and stop.

### Step 2: Collect commits from this repo (docmentis-udoc-viewer)

- Run `git log <latest-tag>..HEAD --oneline` to get commits since last release.
- Filter to meaningful commits: `feat:`, `fix:`, `perf:`, `refactor:` prefixes.
- Ignore `chore:`, `docs:`, `test:`, merge commits — BUT note `chore: Update WASM binary` commits separately for Step 3.
- These are viewer changes and may include implementation detail, since this repo is public.

### Step 3: Collect changes from the engine and its dependency repos

The WASM binary in this project is built from the sibling engine repo, which in turn depends on three private dependency repos. All four are located as siblings of this project:

- `../docmentis-udoc-engine-legacy` — core engine
- `../docmentis-pdf` — PDF parsing/rendering
- `../docmentis-font` — font handling
- `../docmentis-ooxml` — OOXML (docx/xlsx/pptx) support

Determine the date range to scan:
- For each `chore: Update WASM binary` commit found in Step 2, get its date and the date of the previous WASM update (or the from-tag date) to bound the range.
- If there are no WASM update commits, use the date range spanned by the tag range itself.

Then, in **each** of the four repos above, find commits in that date range:
```
git log --after="<prev-date>" --before="<wasm-date>" --oneline
```
Collect `feat:`, `fix:`, `perf:` commits from every repo. Treat all of these as **engine-side** changes — they ship to users through the WASM binary. Remember the confidentiality rules above apply to all of them.

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
- **Re-evaluate the category for each change based on the user-facing outcome, not the commit prefix.** A commit prefixed `feat:`/`refactor:` in a private repo may land in the changelog as a Bug Fix (or vice versa) depending on what the user actually experiences. A `refactor:` with no user-visible effect should usually be dropped entirely. Pick the category that best describes the benefit to the user.
- For engine-side changes (the core engine, docmentis-pdf, docmentis-font, docmentis-ooxml), add "(engine)" suffix to distinguish from viewer changes.
- Write human-readable descriptions — don't just copy commit messages verbatim. Clean them up, remove prefixes, make them concise but informative.
- **Apply the confidentiality rules**: for engine-side entries, describe the problem fixed or improvement made without leaking implementation details.
- Keep entries at a reasonable granularity — consolidate very small related fixes into one entry where it makes sense.

### Step 5: Update CHANGELOG.md

- Read the existing CHANGELOG.md file.
- Find the existing `## [Unreleased]` section. It ends where the next `## [` line begins (or at end of file if there's no next version).
- Replace the entire [Unreleased] section (header + all content until next version header) with the newly generated section.
- If there is no `## [Unreleased]` section, insert one right after the changelog header/preamble and before the first versioned section.
- Write the updated file using the Edit tool.
- Tell the user the [Unreleased] section has been updated and show a brief summary of what was added.
