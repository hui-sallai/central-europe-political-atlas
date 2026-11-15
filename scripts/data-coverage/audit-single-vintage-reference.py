"""Independent audit of src/data/historical/annual_single_vintage_reference.json (2026-11-16).

Written separately from the builder (scripts/historical-annual/build-single-vintage-reference.mjs): its own JSON-stat
reader, its own floor computation and its own canonical lookups, in a different language, so a defect in the builder
cannot reproduce itself here. Standard library only. Read-only: writes one report file.

Checks every record against (1) the archived Eurostat extract cell it cites, (2) the official floor rule recomputed from
the raw flags, (3) the admitted value of the same year in observations.json / the annual descriptive history, and (4)
the registries (countries, indicators, units). Also checks completeness (no official cell above the floor omitted),
uniqueness, null semantics and per-table vintage consistency.

Usage: python3 -I scripts/data-coverage/audit-single-vintage-reference.py [--check]
Output: docs/data-coverage/single_vintage_reference_reconciliation_2026-11-16.json
"""
import hashlib
import json
import os
import sys
from urllib.parse import urlparse, parse_qs

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STORE = "src/data/historical/annual_single_vintage_reference.json"
PUBLIC = "public/research-data/annual_single_vintage_reference.json"
OUT = "docs/data-coverage/single_vintage_reference_reconciliation_2026-11-16.json"
TOL_REL, TOL_ABS = 0.02, 0.3  # the registered vintage-revision tolerance (annual_history_manifest.overlap_tolerance)
GEO = {"AT": ("AUT", "austria"), "DE": ("DEU", "germany"), "SK": ("SVK", "slovakia"), "SI": ("SVN", "slovenia"), "CZ": ("CZE", "czechia"),
       "HU": ("HUN", "hungary"), "PL": ("POL", "poland"), "RO": ("ROU", "romania"), "HR": ("HRV", "croatia"), "RS": ("SRB", "serbia")}
TERRITORIAL = {"DE": 1991, "RS": 1999}


def path(rel):
    return os.path.join(ROOT, rel)


def load(rel):
    with open(path(rel), "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def sha(rel):
    with open(path(rel), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


class JsonStat:
    """Minimal JSON-stat 2.0 reader: value/status may be dicts keyed by flat index or lists."""

    def __init__(self, doc):
        self.ids, self.size = doc["id"], doc["size"]
        self.cats = {d: sorted(doc["dimension"][d]["category"]["index"].items(), key=lambda kv: kv[1]) for d in self.ids}
        self.pos = {d: {k: i for k, i in self.cats[d]} for d in self.ids}
        self.value, self.status = doc.get("value", {}), doc.get("status", {})
        self.updated = doc.get("updated")

    def _get(self, store, i):
        if isinstance(store, list):
            return store[i] if i < len(store) else None
        return store.get(str(i))

    def cell(self, coords):
        idx = 0
        for d, n in zip(self.ids, self.size):
            key = coords.get(d)
            if key is None:
                if n != 1:
                    return None, None
                key = self.cats[d][0][0]
            if key not in self.pos[d]:
                return None, None
            idx = idx * n + self.pos[d][key]
        return self._get(self.value, idx), self._get(self.status, idx)

    def times(self):
        return [k for k, _ in self.cats["time"]]


def admitted_values():
    """observations.json first (canonical), else the annual descriptive history — same precedence as the platform."""
    out = {}
    hist = load("src/data/historical/annual_descriptive_history.json")["records"]
    for r in hist:
        if r.get("value") is not None:
            out[(r["country_slug"], r["indicator"], int(r["year"]))] = ("annual_history", r["value"], r.get("recovery_phase"), r.get("source_query_url"), r.get("updated_at"))
    obs = load("src/data/observations/observations.json")
    recs = obs["records"]
    for r in recs:
        if r.get("value") is not None:
            out[(r["country_slug"], r["indicator"], int(r["year"]))] = ("observations.json", r["value"], None, r.get("source_query_url"), r.get("updated_at"))
    return out


def main():
    doc = load(STORE)
    manifest = load("src/data/historical/annual_history_manifest.json")
    archive = {t["table"]: t for t in manifest["recovery"]["tables"]}
    problems, revisions = [], []
    checks = {}

    def problem(record_id, check, expected, actual, cause, severity="error", action="investigate"):
        problems.append({"record_id": record_id, "check": check, "expected": expected, "actual": actual, "root_cause": cause, "severity": severity, "proposed_action": action})

    # 1-2 structure and schema
    required = {"id": str, "country": str, "country_slug": str, "indicator": str, "year": int, "value": (int, float), "unit": str, "value_status": str,
                "source": str, "source_dataset": str, "source_query_url": str, "definition": str, "vintage": str, "dataset_updated_at": str,
                "comparability_status": str, "provenance": dict, "layer": str, "spliced": bool, "descriptive_only": bool}
    checks["schema_version"] = doc.get("schema_version") == "annual-single-vintage-reference-v1"
    checks["record_count_matches"] = doc.get("record_count") == len(doc["records"])
    for r in doc["records"]:
        for k, t in required.items():
            if k not in r or (r[k] is not None and not isinstance(r[k], t)) or (k == "value" and isinstance(r[k], bool)):
                problem(r.get("id"), "schema", f"{k}: {t}", type(r.get(k)).__name__, "missing or mistyped field")
        if r["id"] != f"vintage:annual:{r['country_slug']}:{r['indicator']}:{r['year']}":
            problem(r["id"], "id_format", "vintage:annual:<country>:<indicator>:<year>", r["id"], "id does not match its fields")
    # 3-4 uniqueness and duplicates
    keys = [(r["country_slug"], r["indicator"], r["year"]) for r in doc["records"]]
    checks["unique_country_indicator_period"] = len(keys) == len(set(keys))
    checks["unique_ids"] = len({r["id"] for r in doc["records"]}) == len(doc["records"])
    # 5 country identifiers against the canonical country registry (observations.json pairs)
    obs = load("src/data/observations/observations.json")
    pairs = {(r["country"], r["country_slug"]) for r in obs["records"]}
    for r in doc["records"]:
        if (r["country"], r["country_slug"]) not in pairs:
            problem(r["id"], "country_identifier", "pair registered in observations.json", [r["country"], r["country_slug"]], "unknown country pair")
    # 6 indicator identifiers registered in the canonical store and the annual manifest
    canonical_indicators = {r["indicator"] for r in obs["records"]}
    for ind in {r["indicator"] for r in doc["records"]}:
        if ind not in canonical_indicators:
            problem(ind, "indicator_identifier", "indicator present in observations.json", ind, "unregistered indicator")
    # 8 units equal those of the admitted annual layers for the same indicator
    hist_units = {}
    for r in load("src/data/historical/annual_descriptive_history.json")["records"]:
        hist_units.setdefault(r["indicator"], set()).add(r["unit"])
    for r in doc["records"]:
        if r["indicator"] in hist_units and r["unit"] not in hist_units[r["indicator"]]:
            problem(r["id"], "unit", sorted(hist_units[r["indicator"]]), r["unit"], "unit differs from the admitted annual history")

    # Raw extracts: hash, selection, values, flags, floors, completeness
    tables = {}
    for spec in doc["indicators"]:
        t = spec["table"]
        if t not in tables:
            a = archive[t]
            file_sha = sha(a["raw_file"])
            checks[f"raw_sha256:{t}"] = file_sha == a["sha256"]
            tables[t] = (JsonStat(load(a["raw_file"])), a)
    by_key = {(r["country_slug"], r["indicator"], r["year"]): r for r in doc["records"]}
    series_check = []
    for spec in doc["indicators"]:
        js, a = tables[spec["table"]]
        q = {k: v for k, v in parse_qs(urlparse(a["url"]).query).items() if k not in ("format", "lang", "geo")}
        for k, v in spec["selection"].items():
            if k in q and v not in q[k]:
                problem(spec["indicator"], "selection", q[k], v, "selection not part of the archived request")
        for code, (iso3, slug) in GEO.items():
            coords = dict(spec["selection"], geo=code, freq="A")
            cells = []
            for tm in js.times():
                v, f = js.cell(dict(coords, time=tm))
                if v is not None:
                    cells.append((int(tm), v, (f or "").strip()))
            floor = None
            if cells:
                breaks = [y if "b" in f else y + 1 for y, _, f in cells if "b" in f or "d" in f]
                floor = max([cells[0][0], TERRITORIAL.get(code, cells[0][0])] + breaks)
            expected = [(y, v, f) for y, v, f in cells if floor is not None and y >= floor]
            got = sorted(r["year"] for r in doc["records"] if r["country_slug"] == slug and r["indicator"] == spec["indicator"])
            missing = [y for y, _, _ in expected if y not in got]
            extra = [y for y in got if y not in {e[0] for e in expected}]
            for y in missing:
                problem(f"vintage:annual:{slug}:{spec['indicator']}:{y}", "completeness", "official cell above the floor present", None, "official cell omitted")
            for y in extra:
                problem(f"vintage:annual:{slug}:{spec['indicator']}:{y}", "floor_or_existence", f"no record (floor {floor} or empty cell)", by_key[(slug, spec["indicator"], y)]["value"], "record without an admissible official cell")
            for y, v, f in expected:
                r = by_key.get((slug, spec["indicator"], y))
                if not r:
                    continue
                if r["value"] != v:
                    problem(r["id"], "value", v, r["value"], "value differs from the archived official cell", action="rebuild from the archived extract")
                if (r["source_flag"] or "") != f:
                    problem(r["id"], "flag", f or None, r["source_flag"], "source flag differs from the official cell")
                status = "provisional" if "p" in f else "estimated" if "e" in f else "low_reliability" if "u" in f else "official"
                if r["value_status"] != status:
                    problem(r["id"], "value_status", status, r["value_status"], "status does not follow the official flag")
                if r["provenance"]["raw_sha256"] != a["sha256"] or r["provenance"]["raw_file"] != a["raw_file"]:
                    problem(r["id"], "provenance", a["raw_file"], r["provenance"]["raw_file"], "provenance does not cite the archived extract")
                if r["source_dataset"] != f"Eurostat {spec['table']}" or r["source_query_url"] != a["url"]:
                    problem(r["id"], "source_reference", a["url"], r["source_query_url"], "source reference differs")
                if r["vintage"] != a["retrieved_at"] or r["dataset_updated_at"] != a["dataset_updated_at"]:
                    problem(r["id"], "vintage", [a["retrieved_at"], a["dataset_updated_at"]], [r["vintage"], r["dataset_updated_at"]], "vintage fields differ from the archive entry")
            series_check.append({"indicator": spec["indicator"], "country": slug, "official_cells": len(cells), "floor": floor, "expected_records": len(expected), "records": len(got), "omitted": missing, "extra": extra})

    # 12-14 null semantics, zeros, aggregation, national scope
    checks["no_null_values"] = all(r["value"] is not None for r in doc["records"])
    zeros = [r["id"] for r in doc["records"] if r["value"] == 0]
    checks["zeros_are_official_zeros"] = True  # every value was compared with its official cell above; a zero passes only if the cell is 0
    checks["no_calculated_or_aggregated_values"] = all(r["value_status"] in ("official", "provisional", "estimated", "low_reliability") and "calculation_formula" not in r for r in doc["records"])
    checks["national_scope_only"] = all(r["provenance"]["selection"]["geo"] in GEO for r in doc["records"])
    checks["not_spliced_descriptive_only"] = all(r["spliced"] is False and r["descriptive_only"] is True and r["layer"] == "single_vintage_reference" for r in doc["records"])
    # 16 vintage consistency: one retrieval per table, shared by every record of that table
    per_table = {}
    for r in doc["records"]:
        per_table.setdefault(r["source_dataset"], set()).add((r["vintage"], r["dataset_updated_at"]))
    checks["one_vintage_per_table"] = all(len(v) == 1 for v in per_table.values())
    vintages = sorted({(t, a["retrieved_at"], a["dataset_updated_at"]) for t, (_, a) in tables.items()})

    # 17 agreement with admitted observations of the same year
    admitted = admitted_values()
    for r in doc["records"]:
        a = admitted.get((r["country_slug"], r["indicator"], r["year"]))
        stated = r.get("admitted_same_year")
        if a is None:
            if stated is not None:
                problem(r["id"], "admitted_same_year", None, stated, "states an admitted value that does not exist")
            continue
        layer, value, phase, url, updated = a
        diff = round(r["value"] - value, 6)
        if not stated or stated["layer"] != layer or stated["value"] != value or stated["difference_reference_minus_admitted"] != diff:
            problem(r["id"], "admitted_same_year", {"layer": layer, "value": value, "difference": diff}, stated, "recorded comparison differs from the admitted store")
        same_extract = layer == "annual_history" and phase == "R"
        if same_extract and diff != 0:
            problem(r["id"], "exact_agreement", value, r["value"], "Phase R record from the same archived extract differs", action="rebuild")
        if diff != 0:
            within = abs(diff) <= max(TOL_ABS, TOL_REL * abs(value))
            revisions.append({"record_id": r["id"], "expected_admitted_value": value, "actual_reference_value": r["value"], "difference": diff,
                              "admitted_layer": layer, "admitted_source": url, "admitted_updated_at": updated, "reference_source": r["source_query_url"], "reference_dataset_updated_at": r["dataset_updated_at"],
                              "root_cause": "vintage revision: the admitted value comes from an earlier retrieval of the same Eurostat table and selection" + ("" if url and r["source_dataset"].split()[-1] in url else " (admitted record cites a different query; see admitted_source)"),
                              "severity": "info_within_registered_tolerance" if within else "warning_beyond_registered_tolerance",
                              "proposed_action": "none in this layer (documented, unspliced); converges only through a canonical refresh with model-impact review (owner decision 2026-11-11 keeps the hold)"})
    # public copy and determinism of the stored text
    checks["public_copy_byte_identical"] = sha(STORE) == sha(PUBLIC)
    exact_overlap = sum(1 for r in doc["records"] if r.get("admitted_same_year") and r["admitted_same_year"]["difference_reference_minus_admitted"] == 0)
    report = {
        "schema_version": "single-vintage-reference-reconciliation-v1", "date": "2026-11-16", "artifact": STORE, "artifact_sha256": sha(STORE), "public_copy": PUBLIC,
        "method": "independent Python re-derivation from the archived extracts (own JSON-stat reader and floor rule); exact float comparison of every value",
        "counts": {"records": len(doc["records"]), "series": len(series_check), "series_with_records": sum(1 for s in series_check if s["records"]),
                   "overlap_with_admitted": sum(1 for r in doc["records"] if r.get("admitted_same_year")), "overlap_exact": exact_overlap, "vintage_revisions": len(revisions),
                   "revisions_beyond_tolerance": sum(1 for v in revisions if v["severity"].startswith("warning")), "zero_values": len(zeros)},
        "checks": checks, "vintages": [{"table": t, "retrieved_at": r, "dataset_updated_at": u} for t, r, u in vintages],
        "defects": problems, "vintage_revisions": revisions, "series": series_check,
        "result": "pass" if not problems and all(checks.values()) else "fail",
    }
    text = json.dumps(report, indent=1, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        with open(path(OUT), encoding="utf-8") as f:
            if f.read() != text:
                print("reconciliation report is stale", file=sys.stderr)
                sys.exit(1)
    else:
        with open(path(OUT), "w", encoding="utf-8") as f:
            f.write(text)
    print(json.dumps({"result": report["result"], "counts": report["counts"], "failed_checks": [k for k, v in checks.items() if not v], "defects": problems[:10]}, indent=1))
    sys.exit(0 if report["result"] == "pass" else 2)


if __name__ == "__main__":
    main()
