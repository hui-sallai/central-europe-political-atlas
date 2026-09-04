"""Independent, offline NumPy path fits for v1.72 diagnostics, never baseline writes."""
import json
import hashlib
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data"
LP = DATA / "local-projections"
DATE = "2026-09-04"
NORMAL_95 = 1.959963984540054
PSD_TOLERANCE = 1e-8

def provenance(script):
    files = ["src/data/high-frequency/high_frequency_observations.json", "src/data/macro-drivers/macro_driver_observations.json",
             "src/data/identified-shocks/jk_event_level_shocks.json", "src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json",
             "src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json",
             "scripts/local-projections/finite_sample_common.py", f"scripts/local-projections/{script}"]
    return {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in files}

def read(name):
    return json.loads((DATA / name).read_text())

def write(name, payload):
    (LP / name).write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n")

def month_add(period, amount):
    year, month = map(int, period.split("-"))
    absolute = year * 12 + month - 1 + amount
    return f"{absolute // 12:04d}-{absolute % 12 + 1:02d}"

SPECS = {
    "hicp_price_level": ("hf", "hicp_monthly_index", True, True),
    "industrial_production": ("hf", "industrial_production_index", False, True),
    "unemployment": ("hf", "unemployment_rate_monthly", False, False),
    "long_term_yield": ("macro", "long_term_government_yield", False, False),
    "bilateral_fx": ("macro", "bilateral_fx_local_per_eur", False, True),
    "domestic_policy_rate": ("macro", "policy_rate", False, False),
}

class Inputs:
    def __init__(self):
        self.models = read("local-projections/lp_results.json")["records"]
        self.hf = read("high-frequency/high_frequency_observations.json")["records"]
        self.macro = read("macro-drivers/macro_driver_observations.json")["records"]
        self.mp = {r["period"]: r["value"] for r in read("identified-shocks/ecb_pure_monetary_policy_shock_monthly.json")["records"]}
        self.cbi = {r["period"]: r["value"] for r in read("identified-shocks/ecb_central_bank_information_shock_monthly.json")["records"]}
        self.events = read("identified-shocks/jk_event_level_shocks.json")["records"]

    def design(self, model):
        source, field, dummies, logarithm = SPECS[model["outcome_id"]]
        observations = self.hf if source == "hf" else self.macro
        values = {r["period"]: r["value"] for r in observations if r["country"] == model["country"]
                  and r.get("indicator" if source == "hf" else "driver_id") == field
                  and (source == "hf" or r["transformation"] == "level") and r["value"] is not None}
        p, horizon = model["lp_lag_count"], model["maximum_horizon"]
        periods, x, y = [], [], []
        period = model["sample_start"]
        while period <= model["sample_end"]:
            lag_months = [month_add(period, -lag) for lag in range(1, p + 1)]
            future_months = [month_add(period, h) for h in range(horizon + 1)]
            if all(t in values for t in lag_months + future_months) and all(t in self.mp and t in self.cbi for t in lag_months + [period]):
                controls = [self.mp[period], self.cbi[period]]
                for t in lag_months:
                    controls.extend([values[t], self.mp[t], self.cbi[t]])
                if dummies:
                    controls.extend(float(int(period[-2:]) == m) for m in range(2, 13))
                controls.append(1.0)
                base = values[month_add(period, -1)]
                y.append([100 * np.log(values[t] / base) if logarithm else values[t] - base for t in future_months])
                x.append(controls)
                periods.append(period)
            period = month_add(period, 1)
        return periods, np.array(x), np.array(y)

def fit_path(x, y):
    """SVD least squares plus EHW-HC1 joint covariance on one common sample."""
    n, k = x.shape
    inverse_design = np.linalg.pinv(x)
    beta = inverse_design @ y
    residual = y - x @ beta
    rank = np.linalg.matrix_rank(x)
    covariance = []
    for component in range(2):
        scores = residual * inverse_design[component, :, None]
        covariance.append(scores.T @ scores * n / (n-k))
    return {"beta": beta[:2], "covariance": np.array(covariance), "residual": residual,
            "inverse_design": inverse_design, "rank": int(rank), "n": n, "k": k}

def critical_value(covariance, seed, draws=5000):
    se = np.sqrt(np.maximum(0, np.diag(covariance)))
    correlation = covariance / np.maximum(np.finfo(float).eps, np.outer(se, se))
    symmetry_error = float(np.max(np.abs(correlation-correlation.T)))
    raw, vectors = np.linalg.eigh((correlation+correlation.T)/2)
    if raw.min() < -PSD_TOLERANCE:
        raise ValueError(f"materially negative correlation eigenvalue {raw.min()}")
    normals = np.random.default_rng(seed).standard_normal((draws, len(se)))
    sampled = normals @ (vectors * np.sqrt(np.maximum(0, raw))).T
    critical = float(np.quantile(np.max(np.abs(sampled), axis=1), .95, method="inverted_cdf"))
    return critical, {"raw_minimum_eigenvalue": float(raw.min()), "eigenvalue_scale": "correlation",
                      "raw_minimum_covariance_eigenvalue": float(np.linalg.eigvalsh((covariance+covariance.T)/2).min()),
                      "clipped_eigenvalue_count": int(np.sum(raw < 0)),
                      "clipping_magnitude": float(np.sum(np.maximum(0, -raw))), "symmetry_error": symmetry_error,
                      "material_negative_tolerance": PSD_TOLERANCE}

def concentration(values):
    values = np.asarray(values)
    total = float(values @ values)
    if total == 0:
        return {"effective_shock_support_count": 0, "herfindahl": None, "nonzero_count": 0, "zero_count": len(values),
                **{f"top_{n}_share": None for n in (1, 3, 5, 10)}}
    weights = np.sort(values**2 / total)[::-1]
    hhi = float(weights @ weights)
    return {"effective_shock_support_count": 1/hhi, "herfindahl": hhi,
            "nonzero_count": int(np.count_nonzero(values)), "zero_count": int(np.sum(values == 0)),
            **{f"top_{n}_share": float(weights[:n].sum()) for n in (1, 3, 5, 10)}}

def path_change(base, alternative):
    change = np.abs(alternative-base)
    if np.std(base) > 0 and np.std(alternative) > 0:
        correlation = float(np.corrcoef(base, alternative)[0, 1])
    else:
        correlation = None
    return {"maximum_absolute_change": float(change.max()), "path_correlation": correlation,
            "sign_agreement": float(np.mean(np.sign(base) == np.sign(alternative))),
            "any_sign_reversal": bool(np.any(base * alternative < 0))}
