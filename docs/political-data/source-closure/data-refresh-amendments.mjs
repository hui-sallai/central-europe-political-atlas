// Owner-approved descriptive data refreshes applied through scripts/data-refresh/apply.mjs, one exact record per run.
// 2026-10-19: Eurostat monthly high-frequency refresh (run monthly-eurostat-20261019); 2026-10-20: Serbia SORS refresh
// (run serbia-20261020); 2026-11-10: official historical recovery (run historical-recovery-20261110, owner-approved,
// descriptive stores only, verified by the store validators, coverage re-audit and recovery inventory); 2026-11-10:
// ledger correction of that run and regenerated recovery inventory (run ledger-correction-20261110).
// Later runs supersede shared files (coverage audit, ledger). No general data exemption:
// only the listed files of each run, at their exact hashes, and only for runs recorded in the refresh ledger.
export const DATA_REFRESH_FILE = 'docs/legal-security/data_refresh_amendments.json';
export const DATA_REFRESH_RUNS = {
  'monthly-eurostat-20261019': {
    approved_on: '2026-10-19', unit: 'eurostat-high-frequency',
    paths: [
      'src/data/high-frequency/high_frequency_observations.json',
      'src/data/high-frequency/high_frequency_coverage.json',
      'src/data/high-frequency/series_dictionary.json',
      'src/data/data-coverage/descriptive_data_coverage_audit.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
      'public/research-data/high_frequency_runtime.json',
      'public/research-data/high_frequency_coverage.json',
      'public/research-data/series_dictionary.json',
      'public/research-data/descriptive_data_coverage_audit.json',
    ],
  },
  'serbia-20261020': {
    approved_on: '2026-10-20', unit: 'serbia-sors',
    paths: [
      'public/research-data/descriptive_data_coverage_audit.json',
      'public/research-data/serbia/serbia_descriptive_history_annual.json',
      'public/research-data/serbia/serbia_descriptive_history_monthly.json',
      'public/research-data/serbia/serbia_ingestion_manifest.json',
      'public/research-data/serbia_sors_runtime.json',
      'src/data/data-coverage/descriptive_data_coverage_audit.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
      'src/data/serbia/raw/03010601IND01.extract.json',
      'src/data/serbia/raw/03010601IND03.extract.json',
      'src/data/serbia/raw/030201010101IND01.extract.json',
      'src/data/serbia/raw/060001IND02.extract.json',
      'src/data/serbia/raw/0902010301IND01.extract.json',
      'src/data/serbia/raw/09020104IND01.extract.json',
      'src/data/serbia/raw/100109IND01.extract.json',
      'src/data/serbia/raw/1701IND01.extract.json',
      'src/data/serbia/raw/1702IND01.extract.json',
      'src/data/serbia/raw/1702IND02.extract.json',
      'src/data/serbia/raw/18010403IND01.extract.json',
      'src/data/serbia/raw/180304IND02.extract.json',
      'src/data/serbia/raw/210105IND02.extract.json',
      'src/data/serbia/raw/2400020102IND02.extract.json',
      'src/data/serbia/raw/2400020102IND04.extract.json',
      'src/data/serbia/raw/240003010102IND03.extract.json',
      'src/data/serbia/raw/240003020102IND02.extract.json',
      'src/data/serbia/raw/240003020102IND03.extract.json',
      'src/data/serbia/raw/240003020205IND01.extract.json',
      'src/data/serbia/raw/240003020304IND01.extract.json',
      'src/data/serbia/raw/2403040101IND01.extract.json',
      'src/data/serbia/raw/2403040101IND02.extract.json',
      'src/data/serbia/raw/2403040401IND01.extract.json',
      'src/data/serbia/raw/2403040401IND02.extract.json',
      'src/data/serbia/raw/bis_rsd_per_eur.extract.json',
      'src/data/serbia/serbia_descriptive_history_annual.json',
      'src/data/serbia/serbia_descriptive_history_monthly.json',
      'src/data/serbia/serbia_ingestion_manifest.json',
    ],
  },
  'historical-recovery-20261110': {
    approved_on: '2026-11-10', unit: 'historical-recovery',
    verification: 'historical-recovery: store validators (annual, monthly, regional, Serbia), data-coverage re-audit and recovery inventory',
    // Owner-approved 2026-11-10: this run may add new files (exact hashes in its record) within NEW_PATH_SCOPE only.
    allow_new_paths: true,
    paths: [
      'public/research-data/annual_descriptive_history.json',
      'public/research-data/annual_history_manifest.json',
      'public/research-data/annual_history_runtime.json',
      'public/research-data/descriptive_data_coverage_audit.json',
      'public/research-data/historical_recovery_inventory.json',
      'public/research-data/monthly_descriptive_history.json',
      'public/research-data/monthly_history_manifest.json',
      'public/research-data/monthly_history_runtime.json',
      'public/research-data/regional-history/austria.json',
      'public/research-data/regional-history/czechia.json',
      'public/research-data/regional-history/germany.json',
      'public/research-data/regional-history/poland.json',
      'public/research-data/regional-history/romania.json',
      'public/research-data/regional_descriptive_history.json',
      'public/research-data/regional_history_manifest.json',
      'public/research-data/serbia/serbia_descriptive_history_annual.json',
      'public/research-data/serbia/serbia_descriptive_history_monthly.json',
      'public/research-data/serbia/serbia_descriptive_history_regional.json',
      'public/research-data/serbia/serbia_ingestion_manifest.json',
      'public/research-data/serbia_sors_runtime.json',
      'src/data/data-coverage/descriptive_data_coverage_audit.json',
      'src/data/data-coverage/historical_recovery_inventory.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
      'src/data/historical/annual_descriptive_history.json',
      'src/data/historical/annual_history_manifest.json',
      'src/data/historical/monthly_descriptive_history.json',
      'src/data/historical/monthly_history_manifest.json',
      'src/data/historical/raw/annual/full/bop_fdi6_flow.json',
      'src/data/historical/raw/annual/full/demo_pjan.json',
      'src/data/historical/raw/annual/full/ext_tec09.json',
      'src/data/historical/raw/annual/full/gov_10a_main.json',
      'src/data/historical/raw/annual/full/gov_10dd_edpt1.json',
      'src/data/historical/raw/annual/full/nama_10_a10.json',
      'src/data/historical/raw/annual/full/nama_10_gdp.json',
      'src/data/historical/raw/annual/full/nama_10_lp_ulc.json',
      'src/data/historical/raw/annual/full/nama_10_pc.json',
      'src/data/historical/raw/annual/full/nrg_ind_id.json',
      'src/data/historical/raw/annual/full/nrg_pc_204.json',
      'src/data/historical/raw/annual/full/nrg_pc_205.json',
      'src/data/historical/raw/annual/full/prc_hicp_aind.json',
      'src/data/historical/raw/annual/full/tipsbp20.json',
      'src/data/historical/raw/annual/full/une_rt_a.json',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_CZ.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_HR.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_HU.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_PL.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_RO.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_RS.csv',
      'src/data/historical/raw/monthly/full/bis_WS_CBPOL_M_XM.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_AT.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_CZ.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_DE.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_HR.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_HU.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_PL.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_RO.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_RS.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_SI.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_N_B_SK.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_AT.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_CZ.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_DE.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_HR.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_HU.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_PL.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_RO.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_RS.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_SI.csv',
      'src/data/historical/raw/monthly/full/bis_WS_EER_M_R_B_SK.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_CZ_CZK_A.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_HU_HUF_A.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_PL_PLN_A.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_RO_RON_A.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_RS_RSD_A.csv',
      'src/data/historical/raw/monthly/full/bis_WS_XRU_M_XM_EUR_A.csv',
      'src/data/historical/raw/monthly/full/eurostat_irt_lt_mcby_m_MCBY.json',
      'src/data/historical/raw/monthly/full/eurostat_prc_hicp_minr_I15_NRG.json',
      'src/data/historical/raw/monthly/full/eurostat_prc_hicp_minr_I15_TOTAL.json',
      'src/data/historical/raw/monthly/full/eurostat_prc_hicp_minr_RCH_A_NRG.json',
      'src/data/historical/raw/monthly/full/eurostat_prc_hicp_minr_RCH_A_TOTAL.json',
      'src/data/historical/raw/monthly/full/eurostat_sts_inpr_m_PRD_B-D_SCA_I21.json',
      'src/data/historical/raw/monthly/full/eurostat_une_rt_m_SA_TOTAL_T_PC_ACT.json',
      'src/data/historical/raw/regional/full/eurostat_employment.json',
      'src/data/historical/raw/regional/full/eurostat_population.json',
      'src/data/historical/raw/regional/full/eurostat_unemployment.json',
      'src/data/historical/regional_descriptive_history.json',
      'src/data/historical/regional_history_manifest.json',
      'src/data/serbia/serbia_descriptive_history_annual.json',
      'src/data/serbia/serbia_descriptive_history_monthly.json',
      'src/data/serbia/serbia_descriptive_history_regional.json',
      'src/data/serbia/serbia_ingestion_manifest.json',
    ],
  },
  // 2026-11-10 (owner: "批准登记台账更正和清单修复", then "批准方案 1，修改链校验"): append-only ledger correction of
  // historical-recovery-20261110 (placeholder times, per-series detail, attested missing chain link) and the
  // regenerated recovery inventory. No observation store changes.
  'ledger-correction-20261110': {
    approved_on: '2026-11-10', unit: 'ledger-correction',
    verification: 'ledger-correction: ledger hash chain verified, original entries byte-identical, per-series detail equals the 7,799 recorded additions, inventory rebuild and data-coverage validators',
    paths: [
      'public/research-data/historical_recovery_inventory.json',
      'src/data/data-coverage/historical_recovery_inventory.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
    ],
  },
};
// A run may add new files only if it declares allow_new_paths, and only within these descriptive locations.
export const NEW_PATH_SCOPE = [/^src\/data\/historical\/raw\/(annual|monthly|regional)\/full\/[^/*?[\]{}]+\.(json|csv)$/, /^src\/data\/data-coverage\/historical_recovery_inventory\.json$/, /^public\/research-data\/historical_recovery_inventory\.json$/];
export const newPathAllowed = (runId, file) => Boolean(DATA_REFRESH_RUNS[runId]?.allow_new_paths) && NEW_PATH_SCOPE.some((re) => re.test(file));
const flags = ['formal_model_input_change_allowed', 'frozen_snapshot_change_allowed', 'political_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed'];
export function approvedDataRefreshFiles(records) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    const run = DATA_REFRESH_RUNS[r.run_id];
    if (!run || r.approved_on !== run.approved_on || r.unit !== run.unit) { problems.push(`Unexpected data refresh authorization: ${r.run_id}`); continue; }
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected data refresh baseline');
    // Each run's exact verification statement; runs without one were applied through data-refresh:apply.
    if (r.verification !== (run.verification ?? 'data-refresh:apply store validators and data-coverage re-audit')) problems.push('Data refresh verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    const allowed = new Set(run.paths), paths = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || paths.has(f.path)) problems.push(`Not an exact unique data refresh path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing data refresh hash: ${f.path}`);
      paths.add(f.path);
    }
    if (paths.size !== allowed.size) problems.push('Incomplete data refresh file set');
  }
  // Applied in run order, so a later run's hash for a shared file (coverage audit, ledger) supersedes the earlier one.
  const order = Object.keys(DATA_REFRESH_RUNS);
  for (const r of [...(records ?? [])].filter((x) => x.status === 'owner_approved' && DATA_REFRESH_RUNS[x.run_id]).sort((x, y) => order.indexOf(x.run_id) - order.indexOf(y.run_id))) {
    for (const f of r.files ?? []) approved.set(f.path, f.sha256);
  }
  // New (non-baseline) files: exact hashes from runs that declare allow_new_paths, scoped by NEW_PATH_SCOPE.
  const added = new Map();
  for (const r of [...(records ?? [])].filter((x) => x.status === 'owner_approved' && DATA_REFRESH_RUNS[x.run_id])) for (const f of r.files ?? []) if (newPathAllowed(r.run_id, f.path)) added.set(f.path, f.sha256);
  return { approved, added, problems };
}
