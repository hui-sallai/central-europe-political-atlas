# Core English Edition — architecture decision

Status: local Core English implementation and acceptance complete; platform remains v2.0. No research data or method-state migration. The authorized full release build passed local release validation; Linux recording passed all 130 browser tests and its English baselines were reviewed. Normal deployment CI and live-site verification remain pending; see [acceptance and handoff](core-english-validation.md).

Use multiple root layouts: `app/(zh)/layout.tsx` for existing Chinese URLs and `app/(english)/en/layout.tsx` for English URLs. Both delegate to one locale-explicit document shell. The build writes `<html lang="zh-CN">` or `<html lang="en">` into the actual static HTML. There is no top-level root layout, middleware, request-time locale detection, cookie dependency or server runtime.

Route groups do not appear in URLs. Existing Chinese paths and stable research download URLs remain unchanged. English routes use `/en/` followed by the same route. Switching between root layouts intentionally performs a document navigation; the language switch preserves search parameters and hashes at click time, including filter changes made with `history.replaceState`.

Rejected alternatives: runtime-only document language patches (incorrect initial HTML), `?lang=en` (not a canonical route), middleware rewrites (incompatible with a fully static host), and duplicated language-specific numeric datasets (research/provenance drift).

Client components receive locale through a first-party `LocaleProvider`; server documents receive an explicit locale prop. Typed dictionaries and reviewed presentation overlays supply English text without mutating canonical records. All numeric observations, stable IDs, filters, classifications and provenance remain shared. Snapshot presentation is localized separately from raw CSV rows.

References: [Next.js route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups), [static exports](https://nextjs.org/docs/app/guides/static-exports). Full document navigation between different root layouts is expected.

The shared static 404 uses the documented `global-not-found` convention with `experimental.globalNotFound` because multiple root layouts have no common document layout. It contains Chinese and explicitly `lang="en"` English return links, is noindex, and needs no request-time locale detection. This experimental Next.js flag is a maintenance consideration; see [global-not-found](https://nextjs.org/docs/app/api-reference/file-conventions/not-found).
