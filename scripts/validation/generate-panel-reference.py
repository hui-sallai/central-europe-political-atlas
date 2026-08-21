"""Offline reference generator for the TypeScript panel engine (v1.25 §19).

Builds a deterministic synthetic panel, fits three specifications with statsmodels
(pooled OLS, country FE, country + year FE; cluster-robust SE by country) and writes
observations + reference results to src/data/analysis/panel_reference_cases.json.
The website itself never depends on Python; this fixture is only a validation oracle.
"""
import json
import math
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from scipy import stats as scipy_stats

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "data" / "analysis" / "panel_reference_cases.json"

COUNTRIES = [f"country_{index + 1}" for index in range(10)]
YEARS = list(range(2015, 2026))


def build_observations():
    rows = []
    for ci, country in enumerate(COUNTRIES):
        for year in YEARS:
            t = year - 2015
            x = math.sin(ci * 2.1 + t * 1.3) + ci * t * 0.013
            z = math.cos(ci * 1.7 - t * 0.9) * 0.8 + ci * 0.05
            y = 2.0 * x + 0.5 * z + ci * 3.0 + t * 0.7 + 0.01 * math.sin(ci * 5.3 + t * 2.9)
            for indicator, value in (("synthetic_y", y), ("synthetic_x", x), ("synthetic_z", z)):
                rows.append({
                    "observation_id": f"{country}:{indicator}:{year}",
                    "country": country,
                    "year": year,
                    "indicator": indicator,
                    "value": value,
                    "comparability_status": "comparable",
                    "data_status": "official",
                })
    return rows


def fit(spec, data):
    y = np.array([r["y"] for r in data])
    cols = [np.ones(len(data)), np.array([r["x"] for r in data]), np.array([r["z"] for r in data])]
    names = ["const", "synthetic_x", "synthetic_z"]
    countries = sorted({r["country"] for r in data})
    years = sorted({r["year"] for r in data})
    if spec in ("country", "country_year"):
        for country in countries[1:]:
            cols.append(np.array([1.0 if r["country"] == country else 0.0 for r in data]))
            names.append(f"fe_{country}")
    if spec == "country_year":
        for year in years[1:]:
            cols.append(np.array([1.0 if r["year"] == year else 0.0 for r in data]))
            names.append(f"fe_{year}")
    x = np.column_stack(cols)
    groups = np.array([countries.index(r["country"]) for r in data])
    model = sm.OLS(y, x).fit(cov_type="cluster", cov_kwds={"groups": groups})
    g = len(countries)
    df = g - 1

    # within R² defined exactly like the TS engine: 1 - SSR_full / SSR_fe_only
    fe_cols = [np.ones(len(data))]
    if spec in ("country", "country_year"):
        for country in countries[1:]:
            fe_cols.append(np.array([1.0 if r["country"] == country else 0.0 for r in data]))
    if spec == "country_year":
        for year in years[1:]:
            fe_cols.append(np.array([1.0 if r["year"] == year else 0.0 for r in data]))
    reduced = sm.OLS(y, np.column_stack(fe_cols)).fit()
    within_r2 = 1 - float(np.sum(model.resid ** 2)) / float(np.sum(reduced.resid ** 2)) if spec != "none" else float(model.rsquared)

    return {
        "coefficients": [
            {
                "variable": "synthetic_x",
                "coefficient": float(model.params[1]),
                "standard_error": float(model.bse[1]),
                "p_value_t_g_minus_1": float(2 * (1 - scipy_stats.t.cdf(abs(model.tvalues[1]), df))),
            },
            {
                "variable": "synthetic_z",
                "coefficient": float(model.params[2]),
                "standard_error": float(model.bse[2]),
                "p_value_t_g_minus_1": float(2 * (1 - scipy_stats.t.cdf(abs(model.tvalues[2]), df))),
            },
        ],
        "r_squared": float(model.rsquared),
        "within_r_squared": within_r2,
        "clusters": g,
        "degrees_of_freedom": df,
    }


def main():
    observations = build_observations()
    flat = {}
    for row in observations:
        flat.setdefault((row["country"], row["year"]), {})[row["indicator"]] = row["value"]
    data = [
        {"country": country, "year": year, "y": values["synthetic_y"], "x": values["synthetic_x"], "z": values["synthetic_z"]}
        for (country, year), values in sorted(flat.items())
    ]
    cases = {
        "pooled_ols": {"fixed_effects": "none", **fit("none", data)},
        "country_fixed_effects": {"fixed_effects": "country", **fit("country", data)},
        "country_and_year_fixed_effects": {"fixed_effects": "country_year", **fit("country_year", data)},
    }
    payload = {
        "schema_version": "panel-reference-cases-v1.25",
        "generator": "statsmodels OLS + cluster cov (small-sample correction) + scipy Student-t",
        "specification": {
            "outcome": "synthetic_y",
            "explanatory_variables": ["synthetic_x", "synthetic_z"],
            "countries": COUNTRIES,
            "start_year": YEARS[0],
            "end_year": YEARS[-1],
            "standard_errors": "cluster_country",
        },
        "observations": observations,
        "cases": cases,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({len(observations)} observations, {len(cases)} cases)")
    for name, case in cases.items():
        print(name, "x coef:", round(case["coefficients"][0]["coefficient"], 8), "se:", round(case["coefficients"][0]["standard_error"], 8))


if __name__ == "__main__":
    main()
