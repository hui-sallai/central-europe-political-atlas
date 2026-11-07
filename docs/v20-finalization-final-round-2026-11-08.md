# v2.0 finalization — final release round, 2026-11-08

Earlier rounds:
- [Round 1 production acceptance](v20-round1-production-acceptance-2026-11-08.md) covered integration and the research journeys.
- [Round 2](v20-finalization-round2-2026-11-08.md) covered research data, provenance, methodology and exports.

This round covers:
- the full security pass that Round 1 deferred to the end of the stage;
- CI coverage of every gate;
- the state of the release identity and gates;
- the one security change this round made.

The platform stays **v2.0** (`package.json` 2.0.0). The release flow was not invoked, and `src/data/release.json` is unchanged.

## Baseline

| Item | Value |
|---|---|
| Live commit before this round | `a1e97c3` (Pages run `42417434388`) |
| Full CI on that commit | 49 steps, all successful except the three screenshot-recording steps that are skipped by design. 626 browser tests passed. Both legal/security gates reported 0 failures, and the bilingual validator ran 1,729 checks. |
| New in CI since Round 2 | five descriptive-history and coverage validators, run before export (`76db04c`) |

## 1. Security pass

**Repository:**
- Secret scanning and push protection are enabled.
- Code-scanning (CodeQL) and secret-scanning alerts: 0 open each.

**Privacy, tracked tree:** a search of every tracked file found no local user paths, no session temp paths, no student address and no university name.

**Privacy, live site:** 7 production pages (both locales) and all 22 JS bundles they load were fetched.
- They contain no local paths, no student address, no university name and no key patterns.
- The only e-mail address is the public controller contact, `sallaizhang@outlook.com`.

**Headers:** GitHub Pages sends no CSP or HSTS headers, and the site sets no CSP meta tag. This is a known limitation of the hosting and is unchanged.

**Dependabot (found in this round):**
- There were 21 open alerts.
- 20 were on `next` 16.3.6: 10 advisories, each reported once for `package.json` and once for `pnpm-lock.yaml`.
  - 2 critical: Image Optimization API RCE and `use cache` RCE.
  - 2 high: Image Optimization SSRF and Server Actions DoS.
  - 5 medium: cache poisoning and leaks.
  - 1 low: a development-server disclosure.
- 1 was on the dev-only `minimatch`.
- Earlier rounds checked only the code-scanning and secret-scanning counts, so they never saw these alerts.

**Exposure:** the site is a static export (`output: "export"`). `src/` contains no `use server`, `use cache` or Draft Mode. Production therefore had no server path for these advisories; the local development server did.

## 2. Change: Next.js 16.3.6 → 16.4.1 (`f076f3b`, owner-approved)

**Package change:**
- `next` and `eslint-config-next` move to 16.4.1, published 2026-10-14. That release patches all 10 Next.js advisories.
- The lockfile diff touches only `next`, `@next/env`, `@next/eslint-plugin-next`, the eight `@next/swc-*` binaries, `eslint-config-next` and the `caniuse-lite` version that `next` pins.

**Governance:** the new exception `dep-sec-2026-11-next-16-4-1` in `dependency_maintenance_exceptions.json`:
- pins lockfile sha256 `d472dc3e…b68b`;
- states the package pairs against the frozen baseline (16.2.6);
- sets every research, model, political and release flag to false.

The exception is applied by:
- `workspaces:validate --source-only`;
- `notebook:validate`;
- `political-source-closure:validate --checkpoint`.

`third_party_dependency_licences.md` records the change.

**`pnpm audit` after the upgrade:**
- production tree: 0 advisories;
- full tree: 2 advisories, both dev-only lint tooling, which is not in the site bundle:
  - **`minimatch` 10.2.5** (moderate).
    - It comes in through `@typescript-eslint/typescript-estree`, and every release of that package, including the latest 8.72.1, requires `^10.2.2`.
    - The fix exists only in 11.0.1. Reaching it would need a `pnpm.overrides` entry, and the dependency boundary rejects any change to overrides.
    - It is left open, and its Dependabot alert stays open with it.
  - **`zod` 4.4.3** (high), via `eslint-plugin-react-hooks`.
    - The patched 4.6.6 is within the declared range.
    - It was not among the Dependabot alerts or in the approved scope, so it needs its own owner-approved transitive exception if wanted.

**Validation on 16.4.1 (local):**
- type check passed;
- ESLint: 0 errors, plus the one existing warning;
- 378/378 tooling tests passed;
- the research export, package build and `research-package:validate` passed;
- `build:site` built 72 static pages;
- the release validator, `legal-security:validate` on built output (12,954 checks, 0 failures), i18n (1,729 checks), SEO and the UI regression check all passed;
- the **full browser suite passed 626/626**, including the darwin screenshot baselines.

The two boundary-licence files that a local export rewrites were restored, not committed.

## 3. Release identity and gates (unchanged, by design)

- **Platform:** v2.0. The research-package filename stays `research-data-v2.0.zip`.
- **Package hash:** it changes on every deploy, because the per-build `deployment_provenance.json` is inside the ZIP. Round 2 showed that every data entry reproduces byte for byte.
- **Owner confirmations:** all recorded items stand. The controller's establishment is deliberately left unresolved. The operating mode is `noncommercial_research`.
- **Political admission:** the source-closure gate reports `countries_ready: 0`, with 4 contact packets prepared and not sent. The admitted countries (Germany, Czechia, Poland, Slovakia, Hungary) are unchanged. Germany's canonical data is unchanged since `4348f79`.
- **Formal VAR/IRF publication:** stays closed under the frozen research-program closure.
- **Frozen inputs:** event registries, the window engine and the hash-pinned files are unchanged.

## 4. Open items carried past v2.0

1. **Dev-only `minimatch`:** no patched release in range, as described in §2. Revisit when `typescript-eslint` accepts minimatch 11.
2. **Dev-only `zod`:** fixable in range, but needs a separate owner approval.
3. **Licence-note generator:** a local export rewrites two boundary-licence files. A separate fix task is running; production is correct.
4. **Hosting headers:** no CSP or HSTS on GitHub Pages.
5. **Research limits stated in the earlier rounds:**
   - descriptive associations only;
   - CATL outcomes and the court outcome are unverified;
   - the Czech seventh payment request has a preliminary assessment only;
   - formal VAR/IRF stays unpublished.

## Readiness

`f076f3b` and this report are ready to deploy once the owner approves the push.

After the push, the deploy CI must pass in full: the five history validators, all gates and the 626 browser tests on Linux. Then:
- the live deployment record must name the new commit;
- the Dependabot alert count should fall from 21 to 1 (`minimatch`);
- the production acceptance suite must pass.
