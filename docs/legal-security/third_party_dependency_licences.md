# Third-party dependencies, licences and vulnerability status (re-audited 2026-10-04 after maintenance)

| Package | Version | Licence | Runtime / dev | Purpose |
|---|---|---|---|---|
| next | 16.3.6 (was 16.2.6) | MIT | runtime (build-time static export) | framework, static export, OG images |
| react | 19.2.6 | MIT | runtime | UI |
| react-dom | 19.2.6 | MIT | runtime | UI |
| @axe-core/playwright | 4.13.0 | MPL-2.0 | dev | accessibility tests |
| @playwright/test | 1.63.0 | Apache-2.0 | dev | UI tests |
| @tailwindcss/postcss | 4.3.0 | MIT | dev | CSS build |
| tailwindcss | 4.3.0 | MIT | dev | CSS build |
| @types/node, @types/react, @types/react-dom | 25.9.1 / 19.2.15 / 19.2.3 | MIT | dev | types |
| eslint | 9.39.1 | MIT | dev | lint |
| eslint-config-next | 16.3.6 (was 16.2.6) | MIT | dev | lint |
| typescript | 6.0.3 | Apache-2.0 | dev | typecheck |

MPL-2.0 (axe-core) is used unmodified as a dev tool and is not distributed in the site bundle.

## Dependency maintenance (2026-10-04)

- **Before:** `next` 16.2.6 with bundled postcss 8.4.31 and sharp 0.34.5. `pnpm audit` reported 35 advisories (3 critical, 22 high,
  10 moderate). The production tree (`--prod`) had 21.
- **Change:**
  - `next` and `eslint-config-next` → **16.3.6**, the smallest release that fixes every recorded Next.js advisory. It pulls
    postcss 8.5.23 and sharp 0.35.x.
  - Transitive `browserslist`, `baseline-browser-mapping`, `brace-expansion` and `js-yaml` were refreshed within their
    existing semver ranges (`pnpm update --depth Infinity …`; lockfile only).
  - No new runtime dependency. App Router, static export and React 19.2.6 are unchanged.
  - Next.js regenerated `next-env.d.ts`, which now references `root-params.d.ts`.
- **After:**
  - `pnpm audit --prod` reports **no known vulnerabilities**.
  - `pnpm audit` (all) reports **1 high**: `braces` ≤3.0.3, stack-exhaustion DoS, **no patched version published**.
    Path: `eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces`. It is dev-only, used by lint
    on repository-controlled globs, has no runtime relevance and low build-time relevance. Re-check when a fix ships.
- **Verified after the upgrade:**
  - lint, typecheck and `build:site`;
  - `test:ui` (202 passed);
  - `seo:validate`, `legal-security:validate` and `political-person-safety:validate`.

### Frozen-boundary exception

The research validators (`notebook:validate`, `workspaces:validate`, `political-source-closure:validate --checkpoint`) freeze
`pnpm-lock.yaml`. This upgrade passes them **only** through the owner-approved exception `dep-sec-2026-10-next-16-3-6`
in `dependency_maintenance_exceptions.json`. The exception:
- pins the exact lockfile sha256 `c106f318…8c93`;
- allows only the two package/version pairs listed;
- forbids any version or other dependency-tooling change;
- has every research, model, political and release flag set to false.

It is enforced once, in `scripts/political-data/germany/frozen-boundary.mjs`. Any later lockfile change needs a new entry.

### Next.js advisories removed by 16.3.6

The 16.3.6 upgrade (with bundled postcss 8.5.23 and sharp 0.35.x) removed these advisories:
- Server Actions DoS, SSRF and unbounded payload;
- Middleware/Proxy bypass;
- SSRF in rewrites;
- Image Optimization API RCE (AVIF) and DoS (SVG);
- RCE on Windows-hosted servers;
- cache confusion (×2);
- Server Function endpoint disclosure;
- `next/og` ImageResponse RCE;
- postcss source-map file read and `</style>` XSS;
- sharp libvips/libheif CVEs.

Static GitHub Pages exposure has no Next.js server runtime, Server Actions, middleware or image-optimisation endpoint.
Build-time risk remains limited to the dev-only `braces` advisory, which has no patch.

| Audit | Total | Critical | High | Moderate | Production tree |
|---|---|---|---|---|---|
| before (16.2.6) | 35 | 3 | 22 | 10 | 21 |
| after (16.3.6 + in-range refresh) | 1 | 0 | 1 | 0 | 0 |

### Transitive maintenance: source-map-js 1.2.1 → 1.2.2 (2026-10-07)

- **Trigger:** GitHub Dependabot advisory for `source-map-js` (affected `>=1.0.0 <1.2.2`, patched `1.2.2`).
- **Paths (`pnpm why`):**
  - `@tailwindcss/postcss 4.3.0 > @tailwindcss/node 4.3.0`;
  - `next 16.3.6 > postcss 8.5.23`;
  - `@tailwindcss/postcss 4.3.0 > postcss 8.5.26`.
  All three declare `^1.2.1`.
- **Change:** lockfile only, via `pnpm update --depth Infinity source-map-js`. No parent package and no `package.json` change, no
  override, no artificial direct dependency.
- **Governance:** exception `dep-sec-2026-10-source-map-js-1-2-2` (kind `transitive_lockfile`, builds on the Next
  16.3.6 exception). It pins the new lockfile sha256 and anchors the previous lockfile by commit and sha256. The new
  lockfile must equal the previous one except for this version bump.
- **Relevance:** build-time tooling (PostCSS / Tailwind CSS processing). There is no runtime exposure on the static
  site.

## Historical audit before maintenance

### `pnpm audit` before maintenance (2026-10-04)

- **All dependencies:** 35 advisories (3 critical, 22 high, 10 moderate).
- **Production tree (`--prod`):** 21 advisories.
  - **next 16.2.6:** fixed in 16.2.11, 16.3.3 and 16.3.6.
    - Server Actions DoS, SSRF and unbounded payload.
    - Middleware/Proxy bypass; SSRF in rewrites.
    - Image Optimization API RCE (AVIF) and DoS (SVG).
    - RCE on Windows-hosted servers.
    - Cache confusion; Server Function endpoint disclosure.
    - `next/og` ImageResponse RCE.
  - **postcss 8.4.31** (bundled in next): source-map file read, `</style>` XSS in stringify.
  - **sharp 0.34.5:** libvips and libheif CVEs.
  - **browserslist, baseline-browser-mapping:** DoS.
- **Dev-only:** brace-expansion, braces, js-yaml.

## Exposure assessment

The site is a **static export on GitHub Pages**:
- there is no Next.js server, middleware, server actions, rewrites, image optimisation endpoint or Windows host at runtime;
- `next/og` and sharp run only at build time on Atlas-controlled data (`scripts/build-og-images.mjs`).

No advisory is reachable by visitors in the deployed site. They remain a **build-environment and supply-chain risk** (for
example, untrusted input at build time or a compromised CI).

**Action:** completed in the pre-contact closure (see Dependency maintenance above).
