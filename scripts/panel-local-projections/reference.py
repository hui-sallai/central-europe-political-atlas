"""Generate synthetic inputs and compare genuine external R outputs, or replay fixtures."""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import numpy as np
from estimator import estimate

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/panel-local-projections"
PIN = "4fd72b97edc9fe6dc65dd34c32e96e7100a1b873"
FILES = {
    "README.md": "4081bf94db74c3fbeca415a5ff1093765358a65e1b95971c18aaf231da8f4ba6",
    "R_code/panel_LP.R": "0e678ddcdc78f94beadc29c5068475035e7fb8d3eb41cdd1286e1aa9f1e4298c",
    "R_code/usage_example.R": "aad87b0bc85a5514f0b5974453e8d21ad6d1322250ac0e3593a5fe448544d6b5",
    "matlab_code/panel_LP.m": "3055c75431f551050972b112677a01ca28809e163bcd3ad1c0b45b23424465dd",
    "matlab_code/usage_example.m": "15fa475adb8e9b768da0040c6c3f9cb647cff48b845db9b8d9bfc54c682f624a",
}


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def synthetic():
    rng = np.random.default_rng(1801090)
    n, t = 8, 144
    units = np.tile(np.arange(n), t)
    times = np.repeat(np.arange(t), n)
    x = np.repeat(rng.normal(size=(t, 2)), n, axis=0)
    x[times % 9 == 0] = 0
    s = np.column_stack((np.ones(n*t), np.where(units < 4, .5, -.5)))
    common = np.repeat(rng.normal(size=t), n)
    y = .6*x[:, 0] + .4*x[:, 1] + .8*s[:, 1]*x[:, 0] + common + rng.normal(size=n*t) + units/5
    # Dynamic outcomes exercise lag blocks, not only h=0 regressions.
    for time in range(1, t):
        y[time*n:(time+1)*n] += .25*y[(time-1)*n:time*n]
    cases = []
    for name, nx, ns, fe in [("single_shock_no_fe", 1, 1, []),
                              ("single_shock_heterogeneous_country_fe", 1, 2, [units.tolist()]),
                              ("joint_two_shocks_two_characteristics", 2, 2, [units.tolist()])]:
        cases.append({"id": name, "horizon": 6, "cumulative": True,
                      "inputs": {"y": y.tolist(), "shocks": x[:, :nx].tolist(),
                                 "characteristics": s[:, :ns].tolist(), "units": units.tolist(),
                                 "times": times.tolist(), "fixed_effects": fe}})
    cases.append({"id": "joint_contrast_country_time_fe", "horizon": 6, "cumulative": True,
                  "inputs": {"y": y.tolist(), "shocks": x.tolist(), "characteristics": s[:,1:].tolist(),
                             "units": units.tolist(), "times": times.tolist(),
                             "fixed_effects": [units.tolist(),times.tolist()]}})
    cases.append({"id": "joint_country_fe_month_dummies", "horizon": 6, "cumulative": True,
                  "inputs": {"y": y.tolist(), "shocks": x.tolist(), "characteristics": s.tolist(),
                             "units": units.tolist(), "times": times.tolist(), "fixed_effects": [units.tolist()],
                             "controls": np.column_stack([times % 12 == m for m in range(1,12)]).astype(float).tolist()}})
    return {"seed": 1801090, "cases": cases}


def compare(fixtures, reference):
    checks = []
    for case in fixtures["cases"]:
        actual = estimate(**case["inputs"], horizon=case["horizon"], cumulative=case["cumulative"])
        expected = reference["cases"][case["id"]]
        errors = {}
        for key, rkey in [("estimate", "estimate"), ("se", "SE"), ("p_value", "pval"),
                          ("ci90", "CI90"), ("ci95", "CI95"), ("ci99", "CI99")]:
            a = np.asarray([h[key] for h in actual])
            b = np.asarray(expected[rkey])
            errors[key] = float(np.max(np.abs(a-b)))
            if not np.allclose(a, b, atol=1e-8, rtol=1e-7):
                raise AssertionError(f"{case['id']}:{key}:{errors[key]}")
        checks.append({"case_id": case["id"], "status": "pass", "maximum_absolute_errors": errors})
    assert reference["small_sample_negative"].startswith("unsupported_reference_configuration")
    assert "subscript out of bounds" in reference["small_sample_negative"]
    try:
        estimate(**fixtures["cases"][2]["inputs"], horizon=6, small_sample=True)
    except ValueError as error:
        assert "unsupported_reference_configuration" in str(error)
    else:
        raise AssertionError("production IK guard failed")
    return checks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--author-repository", type=Path)
    args = parser.parse_args()
    fixture_path = DATA / "panel_lp_reference_cases.json"
    if args.author_repository:
        repo = args.author_repository.resolve()
        assert not repo.is_relative_to(ROOT), "external author repository must remain outside project"
        commit = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
        assert commit == PIN
        files = []
        for name, checksum in FILES.items():
            assert hashlib.sha256((repo/name).read_bytes()).hexdigest() == checksum
            blob = subprocess.check_output(["git", "-C", str(repo), "rev-parse", f"HEAD:{name}"], text=True).strip()
            files.append({"path": name, "blob_sha": blob, "sha256": checksum})
        assert not any(p.name.lower().startswith(("license", "licence", "copying")) for p in repo.iterdir())
        fixtures = synthetic()
        with tempfile.TemporaryDirectory(prefix="atlas-panel-r-") as temp:
            inputs, outputs = Path(temp)/"inputs.json", Path(temp)/"outputs.json"
            save(inputs, fixtures)
            subprocess.run(["Rscript", str(Path(__file__).with_suffix(".R")), str(repo/"R_code/panel_LP.R"), str(inputs), str(outputs)], check=True)
            reference = json.loads(outputs.read_text())
        checks = compare(fixtures, reference)
        save(fixture_path, {"schema_version": "panel-lp-reference-cases-v1.8", **fixtures,
                            "author_reference": reference, "validation": checks})
        save(DATA/"panel_lp_reference_manifest.json", {
            "schema_version": "panel-lp-reference-manifest-v1.8", "retrieval_date": date.today().isoformat(),
            "repository": "TinchoAlmuzara/PanelLocalProjections", "commit": PIN, "files": files,
            "paper": "Micro Responses to Macro Shocks", "paper_revision": "August 2026", "doi": "10.59576/sr.1090",
            "license": "no_root_license_file; external audit only; author source excluded from repository and research package",
            "r_state": "executed_unmodified_author_source", "r_runtime": reference["runtime"],
            "r_packages": reference["packages"], "matlab_state": "source_audited_runtime_unavailable_not_numerically_executed",
            "fixture_sha256": hashlib.sha256(fixture_path.read_bytes()).hexdigest(),
            "multi_x_asymptotic": "pass", "small_sample_joint_shock": "unsupported_reference_configuration",
            "interaction_order": "shock outer, characteristic inner", "reference_checks": checks})
    else:
        fixtures = json.loads(fixture_path.read_text())
        checks = compare(fixtures, fixtures["author_reference"])
        manifest = json.loads((DATA/"panel_lp_reference_manifest.json").read_text())
        assert manifest["commit"] == PIN
        assert manifest["fixture_sha256"] == hashlib.sha256(fixture_path.read_bytes()).hexdigest()
        assert {f["path"]: f["sha256"] for f in manifest["files"]} == FILES
    print(json.dumps({"reference_status": "pass", "cases": checks, "IK": "unsupported_reference_configuration"}))


if __name__ == "__main__":
    main()
