"""Hash and semantic audit of frozen v1.81 robustness outputs; no model replay."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/"src/data/panel-local-projections"
def read(name): return json.loads((DATA/f"{name}.json").read_text())
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
checks=0
def check(value,message):
    global checks
    checks+=1
    assert value,message

summary=read("panel_lp_validation_summary")
for name,digest in summary["validated_files_sha256"].items():
    check(sha(DATA/name)==digest,f"frozen Panel LP artifact changed: {name}")
anchor=read("panel_lp_baseline_invariance_manifest")
formal=read("panel_lp_results")
check(anchor["formal_baseline_sha256"]=="fc49e0d559266aea6600bceed2009d4246d4bc426da4f081cc4f08e4c5ef26d0","v1.8 baseline anchor")
check(sha(DATA/"panel_lp_results.json")=="10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc","frozen formal result hash")
check(len(formal["records"])==4 and formal["publication_state"]=="active","formal LP state")
registry=read("panel_lp_path_inference_registry")
check(registry["schema_version"]=="panel-lp-path-inference-registry-v1.82" and registry["state"]=="blocked","path inference state")
check(registry["research_closed"] is True and registry["activated_paths"]==0 and not registry["public_joint_bands"] and not registry["public_global_path_test"],"whole-path closure boundary")
conclusion=read("panel_lp_joint_inference_research_conclusion")
for name,digest in conclusion["v1_81_output_sha256"].items():
    check(sha(DATA/name)==digest,f"frozen v1.81 diagnostic changed: {name}")
for name in ("panel_lp_composition_robustness_summary","panel_lp_country_influence","panel_lp_leave_one_country_out","panel_lp_time_fe_sensitivity_summary"):
    value=read(name)
    check(value.get("state") in ("diagnostic_only","secondary_sensitivity_only"),f"diagnostic status: {name}")
check(read("panel_lp_model_comparison")["status"]=="descriptive_model_comparison_no_inference","model comparison boundary")
print(f"Panel robustness freeze/hash/semantic PASS: {checks} checks; no LOCO models or time-FE analyses recomputed.")
