# Central Europe Political Atlas

Central Europe Political Atlas is a public political-economy research platform for ten Central and Eastern European countries. It combines traceable national and regional observations, coded events, China-related project evidence, transparent model cards and conditional scenario analysis.

Public site: https://hui-sallai.github.io/central-europe-political-atlas/

Current release: **v0.95 Research Release Candidate**

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

The GitHub Pages base path `/central-europe-political-atlas/` is configured in `next.config.ts` and must be preserved.

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

Central Europe Political Atlas, version v0.95 Research Release Candidate, accessed YYYY-MM-DD. https://hui-sallai.github.io/central-europe-political-atlas/

The project currently does not claim a DOI. Cite original source URLs when using individual observations, events or project records.
