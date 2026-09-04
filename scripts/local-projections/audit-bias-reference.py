#!/usr/bin/env python3
"""Audit the official accessible asset; never claim it contains replication code."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/data/local-projections"
EXPECTED = "25193d48bda56dfe6f759ed3ea70b08f1f6f1cea1f082911fa793edaeb1315d8"
parser = argparse.ArgumentParser()
parser.add_argument("asset", type=Path)
args = parser.parse_args()
digest = hashlib.sha256(args.asset.read_bytes()).hexdigest()
if digest != EXPECTED:
    raise SystemExit("Fed accessible asset checksum mismatch; review before updating reference")
with zipfile.ZipFile(args.asset) as archive:
    inventory = [{"path": item.filename, "bytes": item.file_size,
                  "sha256": hashlib.sha256(archive.read(item)).hexdigest()}
                 for item in archive.infolist() if not item.is_dir()]
    code_files = [item for item in inventory if Path(item["path"]).suffix in {".m", ".py", ".r", ".R", ".do", ".jl"}]

def write(name, payload):
    (OUT / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

reference = {
    "schema_version": "lp-finite-sample-bias-reference-v1.72", "retrieval_date": "2026-09-04",
    "source_institution": "Board of Governors of the Federal Reserve System",
    "paper": {"title": "Bias in Local Projections", "authors": ["Edward P. Herbst", "Benjamin K. Johannsen"],
              "feds": "2020-010R1", "feds_doi": "10.17016/FEDS.2020.010r1",
              "journal": "Journal of Econometrics 240(1), 2024, Article 105655", "journal_doi": "10.1016/j.jeconom.2024.105655"},
    "source_url": "https://www.federalreserve.gov/econres/feds/bias-in-local-projections.htm",
    "asset_url": "https://www.federalreserve.gov/econres/feds/files/feds2020010r.zip",
    "asset": "feds2020010r.zip", "sha256": digest, "checksum_status": "passed",
    "file_inventory": inventory, "file_count": len(inventory), "replication_code_file_count": len(code_files),
    "asset_type": "accessible_paper_html_and_figures_not_replication_code",
    "software_environment": "HTML browser; no executable replication environment supplied",
    "license_reuse_status": "No explicit software license in asset. Link and cite; do not redistribute paper or figures in research package.",
    "replication_status": "blocked", "replication_blocker": "Specified official asset supplies no executable benchmark or replication program.",
    "supplementary_code_audit": {
        "repository": "ckwolf92/lp_var_nberma", "commit": "b3315b97540f003005180b13fa78da4fc84a8b39",
        "file": "_estim/lp_biascorr.m", "license": "MIT", "runtime": "MATLAB",
        "source_url": "https://github.com/ckwolf92/lp_var_nberma/blob/b3315b97540f003005180b13fa78da4fc84a8b39/_estim/lp_biascorr.m",
        "audited": True, "replicated": False,
        "scope": "Primer authors' scalar response-vector BCC implementation, not the Fed accessible ZIP and not a verified current-specification correction",
        "observed_operations": ["demean controls", "lagged control autocovariances", "1 + trace(Sigma0 inverse times Sigmaj)", "recursive correction with T-h denominator"],
    },
}
write("lp_finite_sample_bias_reference_manifest.json", reference)
features = [
    ("joint_shocks", "scalar shock moment conditions and forecast specification", "correlated contemporaneous MP and CBI", "partially_compatible", "Cannot treat the other contemporaneous identified shock as a predetermined control without a validated multivariate derivation."),
    ("persistence", "stationary ergodic summable Wold process in FEDS assumptions 1-2", "persistent outcome levels and cumulative transforms", "partially_compatible", "Near-unit-root or nonstationary levels are not automatically covered by this finite-sample expansion."),
    ("lags", "controls generate optimal linear forecast under assumption 3", "AIC p=1..6, actual p lag blocks", "partially_compatible", "Finite selected lag truncation and deliberate lag augmentation do not establish forecast sufficiency."),
    ("deterministics", "constant plus stationary stochastic controls in audited formula", "constant and 11 month dummies for HICP", "partially_compatible", "Seasonal deterministic design and its correction need a separate verified mapping."),
    ("cumulative_transform", "horizon-specific response and reference sample convention", "y[t+h]-y[t-1] or 100 log ratio on common-horizon sample", "partially_compatible", "Direct cumulative-response regression and fixed common sample are not interchangeable with the audited T-h trimming without proof."),
    ("observed_shocks", "observed shock rather than an estimated reduced-form residual", "frozen author-validated event and monthly JK components", "compatible", "Observed series are available; identification validity is a maintained assumption, not established by this audit."),
    ("exogeneity", "constant conditional first and second shock moments and independent residual component", "sparse identified external MP/CBI series", "partially_compatible", "Identification provenance does not verify iid, conditional homoskedasticity, or independence assumptions."),
    ("finite_n", "higher-order asymptotic expansion", "approximately 100-115 usable monthly observations", "partially_compatible", "A relevant motivation for audit, not a theorem guaranteeing correction accuracy at this N."),
    ("external_controls", "joint moment conditions for all controls", "lagged Brent, gas and domestic policy rates in sensitivity only", "partially_compatible", "Control-specific moment conditions and bias-corrected inference have not been independently replicated."),
]
write("lp_bias_correction_applicability_registry.json", {
    "schema_version": "lp-bias-correction-applicability-v1.72", "generated_at": "2026-09-04",
    "method_id": "herbst_johannsen_bcc", "reference": "10.17016/FEDS.2020.010r1",
    "production_status": "registry_only", "validation_status": "partial", "bias_correction_ready": False,
    "baseline_replacement_allowed": False, "corrected_standard_errors_available": False,
    "records": [{"method_id": "herbst_johannsen_bcc", "reference": "FEDS 2020-010R1 assumptions 1-4; section 3.3",
                 "feature_id": feature, "required_assumptions": assumption, "current_lp_feature": current,
                 "compatible": status == "compatible", "partially_compatible": status == "partially_compatible",
                 "incompatible": status == "incompatible", "reason": reason,
                 "validation_status": "audit_only_not_replication", "production_status": "registry_only"}
                for feature, assumption, current, status, reason in features],
    "blockers": ["No executable benchmark in specified Fed ZIP", "No validated joint-shock/current-design mapping", "No validated corrected confidence interval"],
})
print(f"Fed asset audit passed: {len(inventory)} files; {len(code_files)} replication code files; bias correction registry_only.")
