# Research data directory (`src/data`)

This directory is the canonical, version-controlled application data layer. Pages read these collections through `src/lib/researchData.ts`; the export script validates and normalizes the same records before mirroring research files to `public/research-data`.

- `countries/`: canonical country metadata
- `indicators/`: indicator definitions, including pending V4 input fields
- `observations/`: factual observations used by the current data and country views
- `sources/`: normalized source registry
- `events/`: event-library records; uncoded records keep `enters_model=false`
- `projects/`: verified or pending China-related project records
- `models/`: v0.50 transparent model documentation; generated Model Cards and outputs are mirrored to `public/research-data`

Existing indicator ids preserve the established platform vocabulary and avoid duplicate definitions:

- Fiscal: `fiscal_balance_gdp`, `government_debt_gdp`, `interest_expenditure_gdp`, `government_bond_yield`, `eu_funds_received`
- External: `exports_gdp`, `imports_gdp`, `current_account_gdp`, `external_debt_gdp`, `exchange_rate_eur_lcu`, `germany_export_dependence`
- Energy: `energy_import_dependency`, `gas_import_dependency`, `household_electricity_price`, `energy_inflation`
- Industry: `manufacturing_share_gdp`, `automotive_export_share`, `battery_investment`, `fdi_inflow`, `industrial_electricity_price`

New V4 input contracts stay `pending` until sourced observations exist. Existing factual indicator definitions keep their established ids and observations. Pending model inputs never receive fabricated values or implicit zeroes.

Use an auditable import or cleaning step when changing factual values. Do not change values through page components. Run `pnpm run export:research-data` after updating a canonical collection.
