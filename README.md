# Central Europe Political Atlas

Central Europe Political Atlas is a public political-economy research platform for ten Central and Eastern European countries. It combines traceable national and regional observations, coded events, China-related project evidence, transparent model cards and conditional scenario analysis.

Public site: https://hy-central-europe-analysis.org/

Current release: **v1.1 Architecture & Interface Refactor**

## Research scope

- 10 country profiles and a shared canonical observation schema.
- Factual regional comparison maps for 9 countries; Serbia remains available at national level while regional comparison is pending.
- 4 transparent, rule-based models with input traces, published weights, completeness and confidence.
- 4 conditional scenarios with baseline, shock assumption, adjusted input and result traces.
- Coded political-economy events and verified China-related project records.
- Deterministic validation, golden cases and a release QA gate.

The platform does not publish election forecasts, probability forecasts, investment advice, causal impact estimates or objective risk truths. Missing, pending and sample records are never promoted to official data.

## Public routes

- `/map/` - factual regional map workbench
- `/countries/` - country entry and coverage summary
- `/data/` - observations, projects, dictionaries and QA
- `/news/` - Political Economy Event Library
- `/models/` - transparent model results and model cards
- `/scenarios/` - conditional scenario analysis
- `/methodology/` - methods, limitations, validation and citation
- `/legal/` - independence, copyright, data licensing and correction requests
- `/privacy/` - data minimisation, hosting logs and contact-email handling

The production build is served from the custom-domain root. `NEXT_PUBLIC_BASE_PATH` remains available only for local or fallback project-path testing and must not be set in the custom-domain deployment workflow.

The site intentionally contains no client-side API credentials, advertising trackers or first-party analytics. Secrets belong in local or repository environment settings and must never be committed.

## Local verification

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd run lint
pnpm.cmd run typecheck
pnpm.cmd run research:validate
pnpm.cmd run build
```

`pnpm.cmd run build` exports the public research data, runs deterministic research validation, builds the static site and validates routes, internal links, metadata and required exports.

## Research exports

Machine-readable files are published under `/research-data/`. See [the research-data schema guide](public/research-data/README.md) for stable IDs, status enums, formula versions, citation rules and analytical boundaries.

## Citation

Central Europe Political Atlas, version v1.1 Architecture & Interface Refactor, accessed YYYY-MM-DD. https://hy-central-europe-analysis.org/

The project currently does not claim a DOI. Cite original source URLs when using individual observations, events or project records.

Legal, copyright, privacy, correction and takedown contact: sallaizhang@outlook.com
