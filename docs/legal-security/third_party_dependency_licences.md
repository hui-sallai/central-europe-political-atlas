# Third-party dependencies, licences and vulnerability status (audited 2026-10-04)

| Package | Version | Licence | Runtime / dev | Purpose |
|---|---|---|---|---|
| next | 16.2.6 | MIT | runtime (build-time static export) | framework, static export, OG images |
| react | 19.2.6 | MIT | runtime | UI |
| react-dom | 19.2.6 | MIT | runtime | UI |
| @axe-core/playwright | 4.13.0 | MPL-2.0 | dev | accessibility tests |
| @playwright/test | 1.63.0 | Apache-2.0 | dev | UI tests |
| @tailwindcss/postcss | 4.3.0 | MIT | dev | CSS build |
| tailwindcss | 4.3.0 | MIT | dev | CSS build |
| @types/node, @types/react, @types/react-dom | 25.9.1 / 19.2.15 / 19.2.3 | MIT | dev | types |
| eslint | 9.39.1 | MIT | dev | lint |
| eslint-config-next | 16.2.6 | MIT | dev | lint |
| typescript | 6.0.3 | Apache-2.0 | dev | typecheck |

MPL-2.0 (axe-core) is used unmodified as a dev tool and is not distributed in the site bundle.

## `pnpm audit` (2026-10-04)

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

**Action (OWNER DECISION, separate maintenance task):** upgrade `next` to ≥16.3.6 (and its transitive postcss/sharp) in a
dedicated dependency-maintenance change. That change must re-baseline the lockfile pin in the source-closure checkpoint,
pass the full UI and screenshot gate, and must not change the platform version. It is not done in this governance phase,
because the dependency set and lockfile are locked by the validators.
