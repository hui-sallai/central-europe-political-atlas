# Research data directory

This directory is the canonical, version-controlled exchange layer. The export script validates and normalizes these records before mirroring research files to `public/research-data`.

- `countries/`: canonical country metadata
- `indicators/`: indicator definitions, including pending V4 input fields
- `observations/`: factual observations used by the current data and country views
- `sources/`: normalized source registry
- `events/`: event-library records; uncoded records keep `enters_model=false`
- `projects/`: verified or pending China-related project records
- `models/`: schema contract only; v0.30 creates no model output

Use an auditable import or cleaning step when changing factual values. Do not change values through page components. Run `pnpm run export:research-data` after updating a canonical collection.
