// Registered official descriptive-data refresh units. A unit = one existing acquisition script, the canonical stores it
// maintains, and its write-set (companion files and raw archives that must be applied together so the offline-rebuild
// validators keep matching). Anything a staged run changes outside its unit's write-set is an unregistered side effect.
//
// Only sources already registered in the pipeline appear here (Eurostat, ECB/BIS via the macro-driver pipeline, SORS via
// the Serbia audit + mapping registry). Adding a source family is a separate, owner-approved change.

export const UNITS = {
  "eurostat-high-frequency": {
    label: "Eurostat monthly high-frequency series (HICP, industrial production, unemployment, yields, …)",
    family: "Eurostat",
    command: ["node", "scripts/acquire-eurostat-monthly.mjs"],
    offline: { cacheDir: ".tmp-eurostat" }, // offline = replay the local Eurostat response cache, if one exists
    stores: [{ path: "src/data/high-frequency/high_frequency_observations.json", kind: "hf" }],
    writeSet: ["src/data/high-frequency/high_frequency_observations.json", "src/data/high-frequency/high_frequency_coverage.json", "src/data/high-frequency/series_dictionary.json", "public/research-data/high_frequency_runtime.json", "public/research-data/high_frequency_coverage.json", "public/research-data/series_dictionary.json"],
    // Written by the same script but belongs to the model layer: any substantive change = model readiness change → STOP.
    modelLinked: ["src/data/analysis/var_readiness.json"],
    validators: ["pnpm data-coverage:validate", "pnpm var:readiness-validate", "pnpm baseline-definition:validate", "pnpm historical-extension:validate", "pnpm historical-monthly:validate"],
    note: "The live file is refreshable because published LP/VAR uses are frozen to src/data/high-frequency/snapshots/ (snapshot_manifest.json).",
  },
  "macro-drivers": {
    label: "Macro drivers: BIS policy rates, exchange rates and effective exchange rates; energy and commodity prices",
    family: "ECB / BIS",
    command: ["python", "scripts/acquisition/acquire-macro-drivers.py"],
    offline: null,
    // Owner decision 2026-09-30: not refreshable by this workflow. The only registered acquisition is the v1.51 builder;
    // it rewrites lp_readiness_registry (v1.72 → v1.51), shock_identification_registry (v1.62 → v1.51) and
    // v16_identification_readiness, and the observations are hash-pinned by frozen LP/panel-LP outputs without a snapshot.
    // Refreshing macro drivers needs a deliberate release (observations-only acquisition + research snapshot).
    blocked: "not refreshable by routine refresh: the v1.51 acquisition would roll back LP/identification registries and the observations are pinned by frozen LP/panel-LP outputs (owner decision 2026-09-30)",
    stores: [{ path: "src/data/macro-drivers/macro_driver_observations.json", kind: "md" }],
    writeSet: ["src/data/macro-drivers/"],
    modelLinked: ["src/data/macro-drivers/lp_readiness_registry.json", "src/data/macro-drivers/v16_identification_readiness.json", "src/data/macro-drivers/driver_applicability_registry.json", "src/data/macro-drivers/shock_identification_registry.json"],
    validators: ["pnpm data-coverage:validate", "pnpm lp:validate", "pnpm panel-lp:validate"],
    note: "macro_driver_observations.json is hash-pinned by the frozen LP and panel-LP outputs and has no research snapshot, so any change is a formal-model-input change (STOP) until a snapshot is registered in a deliberate release.",
  },
  "serbia-sors": {
    label: "Serbia SORS/RZS descriptive series (annual, monthly/quarterly, regional) with BIS EUR conversion",
    family: "SORS",
    command: ["node", "scripts/serbia-sors/ingest.mjs"],
    offline: { flag: "--offline" },
    stores: [
      { path: "src/data/serbia/serbia_descriptive_history_annual.json", kind: "serbia" },
      { path: "src/data/serbia/serbia_descriptive_history_monthly.json", kind: "serbia" },
      { path: "src/data/serbia/serbia_descriptive_history_regional.json", kind: "serbia" },
    ],
    writeSet: ["src/data/serbia/serbia_descriptive_history_annual.json", "src/data/serbia/serbia_descriptive_history_monthly.json", "src/data/serbia/serbia_descriptive_history_regional.json", "src/data/serbia/serbia_ingestion_manifest.json", "src/data/serbia/raw/"],
    modelLinked: [],
    registries: ["src/data/serbia/serbia_indicator_mapping.json", "src/data/serbia/serbia_official_data_source_audit.json", "src/data/serbia/serbia_regional_classification_registry.json"],
    validators: ["pnpm serbia-audit:validate", "pnpm data-coverage:validate"],
    note: "Applied as one unit: serbia-audit:validate rebuilds all three stores offline from the raw extracts.",
  },
  "annual-history": {
    label: "Eurostat annual descriptive history (2000 → first stored year) + source-ahead check of observations.json",
    family: "Eurostat",
    command: ["node", "scripts/historical-annual/acquire.mjs"],
    offline: { flag: "--offline" },
    stores: [{ path: "src/data/historical/annual_descriptive_history.json", kind: "annual" }],
    writeSet: ["src/data/historical/annual_descriptive_history.json", "src/data/historical/annual_history_manifest.json", "src/data/historical/raw/annual/"],
    manifest: "src/data/historical/annual_history_manifest.json",
    modelLinked: [],
    validators: ["pnpm historical-annual:validate", "pnpm data-coverage:validate"],
    sourceAheadCheck: true,
  },
  "monthly-history": {
    label: "Monthly descriptive history (2000-01 → first stored month): revision audit only",
    family: "Eurostat / BIS",
    command: ["node", "scripts/historical-monthly-descriptive/acquire.mjs"],
    offline: { flag: "--offline" },
    stores: [{ path: "src/data/historical/monthly_descriptive_history.json", kind: "monthly_history" }],
    writeSet: ["src/data/historical/monthly_descriptive_history.json", "src/data/historical/monthly_history_manifest.json", "src/data/historical/raw/monthly/"],
    manifest: "src/data/historical/monthly_history_manifest.json",
    modelLinked: [],
    // Its overlap gate compares against the live 2015+ high-frequency file: when both run, the staged high-frequency
    // data decides admission, so it can only be applied together with that unit.
    dependsOn: ["eurostat-high-frequency"],
    validators: ["pnpm historical-monthly:validate", "pnpm data-coverage:validate"],
  },
  "regional-history": {
    label: "Eurostat regional descriptive history (NUTS 2024 dissemination, GISCO code lists)",
    family: "Eurostat",
    command: ["node", "scripts/historical-regional/acquire.mjs"],
    offline: { flag: "--offline" },
    stores: [{ path: "src/data/historical/regional_descriptive_history.json", kind: "regional" }],
    writeSet: ["src/data/historical/regional_descriptive_history.json", "src/data/historical/regional_history_manifest.json", "src/data/historical/raw/regional/"],
    manifest: "src/data/historical/regional_history_manifest.json",
    modelLinked: [],
    validators: ["pnpm historical-regional:validate", "pnpm data-coverage:validate"],
    note: "The v0.86/v0.89 regional map files are a separate vintage and are not refreshed by this workflow.",
  },
};

// Monthly mode refreshes live series only; historical descriptive stores are preserved (monthly-history runs only in
// all-descriptive, as a revision audit).
export const MODES = {
  monthly: ["eurostat-high-frequency", "macro-drivers", "serbia-sors"],
  annual: ["annual-history"],
  regional: ["regional-history"],
  serbia: ["serbia-sors"],
  "all-descriptive": ["eurostat-high-frequency", "macro-drivers", "serbia-sors", "annual-history", "monthly-history", "regional-history"],
};

// Never touched by a data refresh (release metadata stays under the current platform version).
export const FORBIDDEN_TARGETS = ["src/data/release.json", "package.json", "CHANGELOG.md"];

export const inWriteSet = (unit, rel) => unit.writeSet.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));

// Read-only validators run inside the stage by plan.mjs, whatever the mode (stores are coupled across units).
// Blocked units' model validators (lp:*, panel-lp:*) are not needed: those units never run.
export const STAGE_VALIDATORS = [...new Set(Object.values(UNITS).filter((u) => !u.blocked).flatMap((u) => u.validators))];
