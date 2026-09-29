---
name: release
description: Cut a new Atlas release. Use when the owner asks to release, bump the version or publish a new version. Updates the version in src/data/release.json and CHANGELOG.md, runs the full build with all validators, restores incidental export changes, and drafts release notes. Never pushes without explicit owner approval ("推送上线").
argument-hint: <version, e.g. v2.1> <short title>
---

# Release

The version has a **single source**: `src/data/release.json` (`version`, `release_date`, `citation_key`, `schema_version`).
`src/lib/releaseMetadata.ts` only reads it; footer, methodology, citation, platform metadata, research-package name and page
kickers all derive from it. `package.json` "version" is the npm semver mirror (e.g. v2.1 → 2.1.0) — keep it in step.

Editing `src/data/release.json` is allowed **only** in this workflow. No other research data changes belong in a release commit.

## Steps
1. Confirm the new version string and title with the owner (numbering continues from the last release, e.g. v2.0 → v2.1).
2. Update `src/data/release.json`: `version` ("vX.Y <Title>"), `release_date` (today, YYYY-MM-DD), `citation_key`
   (`central_europe_political_atlas_vX_Y`), and `schema_version` (`release-metadata-vX.Y`) — check
   `scripts/release/validate-release.mjs` for any version-pinned expectations and update them in the same commit.
   Set `package.json` "version" to the matching semver.
3. Add a dated section at the top of `CHANGELOG.md` (`## vX.Y <Title> — YYYY-MM-DD`) listing user-visible changes, data
   changes (with store/file names and record counts) and validators added. State explicitly what did **not** change
   (formal model samples, readiness, inference, scenario formulas).
4. Run the full build with the Python venv on PATH: `pnpm build` (≈ several minutes; ~35 validators + export + site + UI/release checks).
   Then `pnpm test:ui` and `pnpm seo:validate`.
5. Restore incidental regenerated files: `git checkout -- public/research-data src/data/analysis/advanced_analysis_validation_summary.json`
   unless the release intentionally changes them.
6. Secret scan (`node scripts/security/check-public-secrets.mjs`) and check the diff has no local paths (`/Users/…`).
7. Commit ("Release vX.Y <Title>") and draft release notes for the owner: highlights, data changes, validation summary
   (validator names and pass counts), known limitations. Stop and ask before pushing; the Pages workflow deploys `main`.
