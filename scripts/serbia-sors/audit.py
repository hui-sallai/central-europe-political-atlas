"""Serbia Official Statistics Integration Audit (SORS / RZS) — audit and mapping only, no ingestion.

Reads a local snapshot of the SORS open-data catalog and the datasets inspected for the audit, and writes:
  src/data/serbia/serbia_official_data_source_audit.json
  src/data/serbia/serbia_indicator_mapping.json
  src/data/serbia/serbia_regional_classification_registry.json
  src/data/serbia/serbia_data_integration_plan.json
Nothing is added to any observation store, model sample or readiness file.

Usage: SORS_RAW_DIR=<folder with portal.html, portal_en.html and raw/*.json> python3 scripts/serbia-sors/audit.py
The raw folder is a scratch snapshot (large); only sha256/size/retrieval facts are recorded here. Raw snapshots of the
series that are later ingested will be archived by the ingestion step, not by this audit.
"""
import collections, hashlib, html, io, json, os, re, sys, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.environ.get("SORS_RAW_DIR")
if not RAW:
    sys.exit("set SORS_RAW_DIR")
OUT = os.path.join(ROOT, "src", "data", "serbia")
AUDIT_DATE = "2026-09-30"
API = "https://opendata.stat.gov.rs/data/WcfJsonRestService.Service1.svc/dataset/{id}/{lang}/{fmt}"
NEUTRALITY_NOTE = ("Regional units follow the territorial classification used by the source institution. Their inclusion or labeling "
                   "in this dataset does not constitute a political or legal position on territorial status.")
CATEGORY_EN = {}


def sha(b): return hashlib.sha256(b).hexdigest()


def load_raw(dataset_id):
    path = os.path.join(RAW, "raw", f"{dataset_id}.json")
    blob = open(path, "rb").read()
    payload, container = blob, "json"
    if blob[:4] == b"PK\x03\x04":
        z = zipfile.ZipFile(io.BytesIO(blob)); payload = z.read(z.namelist()[0]); container = f"zip({z.namelist()[0]})"
    return json.loads(payload.decode("utf-8-sig")), {"bytes": len(blob), "sha256": sha(blob), "container": container}


# --- Catalog ---------------------------------------------------------------------------------------------------
def parse_catalog(file):
    text = html.unescape(open(os.path.join(RAW, file), encoding="utf-8").read())
    for value, label in re.findall(r'<option[^>]*value="(\d\d)"[^>]*>([^<]*)</option>', text):
        CATEGORY_EN.setdefault(file, {})[value] = label.strip()
    out = {}
    for cat, li in re.findall(r'<li class="(\d\d)">(.*?)</li>', text, flags=re.S):
        m = re.search(r"PrikaziLink\('([^']*)','([^']*)','([^']*)'\)", li)
        if not m: continue
        dsid = re.search(r"dataset/([^/]+)/", m.group(1)).group(1)
        title = re.search(r'indikatorNaziv">(.*?)</DIV>', li, flags=re.S | re.I)
        ctx = " ".join(re.sub(r"<[^>]+>", "", d) for d in re.findall(r'<DIV class="amazingCssClass">(.*?)</DIV>', li, flags=re.S | re.I))
        per = re.search(r"(?:Period|Период|Period):\s*([^,]+?)\s*,\s*(?:Number of record|Број записа|Broj zapisa):\s*(\d+)", ctx)
        upd = re.search(r"(?:Last update|Последње ажурирање|Poslednje ažuriranje):\s*([\d.]+)", ctx)
        out[dsid] = {"category": cat, "title": re.sub(r"<[^>]+>", "", title.group(1)).strip() if title else None,
                     "period": per.group(1).strip() if per else None, "records": int(per.group(2)) if per else None,
                     "last_update": upd.group(1).rstrip(".") if upd else None,
                     "metadata": sorted(set(re.findall(r'href="(http[^"]*Metadata[^"]*)"', li, flags=re.I)))}
    return out


cat_en = parse_catalog("portal_en.html")
cat_sr = parse_catalog("portal.html")
portal_hashes = {f: sha(open(os.path.join(RAW, f), "rb").read()) for f in ("portal.html", "portal_en.html")}

# --- Profiles of inspected datasets -----------------------------------------------------------------------------
BASE = {"idindikator", "IDTer", "nTer", "mes", "god", "vrednost", "idJedinicaMere", "nJedinicaMere", "nIzvorI", "Indikator", "IDStatusPodatka", "nStatusPodatka", "idjezik"}
data, files = {}, {}
for f in sorted(os.listdir(os.path.join(RAW, "raw"))):
    if f.endswith(".json"):
        dsid = f[:-5]; data[dsid], files[dsid] = load_raw(dsid)
nstj = data.pop("NSTJ"); municipalities = data.pop("SIFOPS")
nstj_codes = {r["IDNSTJ"] for r in nstj}


def profile(dsid):
    d = data[dsid]
    periods = sorted({(r["god"], r["mes"]) for r in d})
    months = {m for _, m in periods}
    freq = "annual" if months == {"00"} else ("quarterly" if all(m.startswith("K") for m in months) else ("monthly" if months <= {f"{i:02d}" for i in range(1, 13)} else "mixed_annual_and_monthly"))
    terr = collections.Counter(r.get("IDTer") for r in d if r.get("IDTer"))
    levels = collections.Counter(("national" if t == "RS" else f"NSTJ{len(t) - 2}") if t in nstj_codes else ("municipality_or_city" if t else "national_unspecified") for t in terr)
    flags = collections.defaultdict(set)
    for r in d:
        if r["IDStatusPodatka"] != "A": flags[f'{r["IDStatusPodatka"]}: {r["nStatusPodatka"]}'].add(r["god"])
    return {
        "records": len(d), "period_first": "-".join(p for p in periods[0] if p != "00"), "period_last": "-".join(p for p in periods[-1] if p != "00"),
        "frequency": freq, "geographic_levels": dict(levels) or {"national": 1},
        "units": sorted({f'{r["idJedinicaMere"]} ({r["nJedinicaMere"]})' for r in d if r.get("idJedinicaMere")}) or ["unit given by the measure dimension"],
        "dimensions": {k: sorted({str(r.get(k)) for r in d})[:40] for k in d[0] if k not in BASE and not k.startswith("n")},
        "status_flags": {k: [min(v), max(v), len(v)] for k, v in sorted(flags.items())},
        "missing_value_records": sum(1 for r in d if r["vrednost"] is None),
        "zero_value_records": sum(1 for r in d if r["vrednost"] == 0),
        **files[dsid],
    }


profiles = {dsid: profile(dsid) for dsid in data}

# --- Series selection helpers -----------------------------------------------------------------------------------
def rows(dsid, where, territory="RS", monthly=None):
    out = []
    for r in data[dsid]:
        if territory and r.get("IDTer", "RS") != territory: continue
        if any(str(r.get(k)) != str(v) for k, v in where.items()): continue
        if monthly is True and r["mes"] == "00": continue
        if monthly is False and r["mes"] != "00": continue
        out.append(r)
    return out


def code_for(dsid, id_field, name_field, pattern):
    for r in data[dsid]:
        if re.search(pattern, str(r.get(name_field)), re.I): return r[id_field]
    return None


def period_key(r): return r["god"] if r["mes"] == "00" else f'{r["god"]}-{r["mes"]}'


def series_facts(rs, floor_year=2000):
    obs = [r for r in rs if r["vrednost"] is not None]
    years = sorted({int(r["god"]) for r in obs})
    breaks = sorted({int(r["god"]) for r in rs if r["IDStatusPodatka"] in ("B", "D")})
    last_break = max(breaks) if breaks else None
    floor = max(floor_year, last_break or floor_year, years[0] if years else floor_year)
    return {"observations": len(obs), "missing_flagged": len(rs) - len(obs), "first": period_key(min(obs, key=period_key)) if obs else None,
            "last": period_key(max(obs, key=period_key)) if obs else None, "break_or_definition_flag_years": breaks,
            "definition_compatible_floor": floor if obs else None,
            "observations_2000_latest": sum(1 for r in obs if int(r["god"]) >= 2000),
            "observations_from_floor": sum(1 for r in obs if int(r["god"]) >= floor),
            "zeros": sum(1 for r in obs if r["vrednost"] == 0)}


def level_shifts(rs, threshold=0.02):
    """Unflagged year-on-year level changes above threshold (e.g. census or territorial coverage changes)."""
    v = {int(r["god"]): r["vrednost"] for r in rs if r["vrednost"] is not None and r["mes"] == "00"}
    return [{"year": y, "previous": v[y - 1], "value": v[y], "change_pct": round((v[y] / v[y - 1] - 1) * 100, 2)} for y in sorted(v) if y - 1 in v and abs(v[y] / v[y - 1] - 1) > threshold]


# Existing Atlas Serbia observations (Eurostat-sourced) for overlap evidence.
atlas = [r for r in json.load(open(os.path.join(ROOT, "src/data/observations/observations.json")))["records"] if r["country_slug"] == "serbia"]
def atlas_value(indicator, year): return next((r["value"] for r in atlas if r["indicator"] == indicator and r["year"] == year), None)


def overlap(indicator, sors_by_year, transform=lambda v: v, tolerance=(0.0, 0.3), break_years=()):
    pairs = []
    for y in range(2021, 2026):
        a, s = atlas_value(indicator, y), sors_by_year.get(y)
        if a is None or s is None: continue
        t = transform(s)
        pairs.append({"year": y, "atlas_eurostat": a, "sors": round(t, 4), "abs_diff": round(abs(a - t), 4)})
    for p in pairs: p["within_tolerance"] = p["abs_diff"] <= max(tolerance[1], tolerance[0] * abs(p["atlas_eurostat"]))
    failed = [p["year"] for p in pairs if not p["within_tolerance"]]
    # A mismatch only in a year where the SORS series itself shows a level shift (e.g. census revision) is reported, not hidden.
    result = "no_overlap_available" if not pairs else "pass" if not failed else "pass_except_detected_break_years" if all(y in break_years for y in failed) else "fail"
    return {"atlas_indicator": indicator, "comparison": "SORS vs existing Eurostat Serbia record (same concept)", "pairs": pairs,
            "tolerance": {"relative": tolerance[0], "absolute": tolerance[1]}, "failed_years": failed, "result": result}


def by_year(rs): return {int(r["god"]): r["vrednost"] for r in rs if r["vrednost"] is not None and r["mes"] == "00"}


# --- Mapping (curated definitions; every number below is computed from the downloaded data) ------------------------
GDP = "09020104IND01"
exp_code = code_for(GDP, "IDUpotrebaBDP", "nUpotrebaBDP", r"^Exports")
imp_code = code_for(GDP, "IDUpotrebaBDP", "nUpotrebaBDP", r"^Imports")
c_code = next((r["IDKD08"] for r in data["0902010301IND01"] if r["IDKD08"] == "C"), None)
en_import = code_for("040201IND06", "IDTokovi2017", "nTokovi2017", r"^Import$")
en_export = code_for("040201IND06", "IDTokovi2017", "nTokovi2017", r"^Export$")
en_gae = code_for("040201IND06", "IDTokovi2017", "nTokovi2017", r"^Gross ava")

gdp_growth = rows(GDP, {"IDUpotrebaBDP": "00", "IDVrPod": "5"})
pop_jan = rows("18010403IND01", {"IDPol": "0", "IDStarost": "0"})
lfs_u = rows("240003020102IND03", {"IDPol": "0", "IDStarGrupa": "15-74"})
lfs_e = rows("240003020102IND02", {"IDPol": "0", "IDStarGrupa": "20-64"})
manuf = rows("0902010301IND01", {"IDKD08": c_code, "IDVrPod": "2"}) if c_code else []
energy_rows = {k: by_year(rows("040201IND06", {"IDTokovi2017": code, "IDEnergenti": "0"})) for k, code in (("import", en_import), ("export", en_export), ("gae", en_gae)) if code}
energy_dep = {y: (energy_rows["import"][y] - energy_rows["export"].get(y, 0)) / energy_rows["gae"][y] * 100 for y in energy_rows.get("import", {}) if energy_rows.get("gae", {}).get(y)}

def gate(concept, unit, period, population, methodology):
    checks = {"equivalent_economic_concept": concept, "compatible_unit": unit, "compatible_reference_period": period, "compatible_geographic_statistical_population": population, "documented_methodology_compatibility": methodology}
    return {**checks, "cross_country_comparable": all(checks.values())}

POP_NOTE = "SORS national totals exclude AP Kosovo and Metohija from 1998 (no SORS data for RS23 units); census revisions produce unflagged level shifts."
mappings = [
    # ---------------- national annual ----------------
    dict(atlas_indicator="gdp_current_eur", sors_dataset=GDP, selection={"IDUpotrebaBDP": "00", "IDVrPod": "1"}, frequency="annual", original_unit="mill. RSD, current prices",
         status="requires_transformation", transformation="RSD → EUR at the annual average EUR/RSD rate (NBS official middle rate, or the BIS-derived RSD per EUR already in the Atlas); record rate source and value", gate=gate(True, False, True, True, True), facts=series_facts(rows(GDP, {"IDUpotrebaBDP": "00", "IDVrPod": "1"})),
         note="ESA 2010 expenditure-approach GDP; Eurostat's Serbia GDP is transmitted by SORS, so concept matches once converted to EUR."),
    dict(atlas_indicator="real_gdp_growth", sors_dataset=GDP, selection={"IDUpotrebaBDP": "00", "IDVrPod": "5"}, frequency="annual", original_unit="% (SORS measure label reads 'previous year = 100, %', but values are growth rates)",
         status="definition_compatible", transformation="none (values are already % growth; verified against Eurostat)", gate=gate(True, True, True, True, True),
         overlap=overlap("real_gdp_growth", by_year(gdp_growth)), facts=series_facts(gdp_growth)),
    dict(atlas_indicator="gdp_per_capita_eur", sors_dataset=f"{GDP} + 18010403IND01", selection={"gdp": {"IDUpotrebaBDP": "00", "IDVrPod": "1"}, "population": "average of 1 Jan t and t+1, or SORS mid-year estimate"}, frequency="annual", original_unit="derived",
         status="requires_transformation", transformation="GDP (EUR) / average population; population basis must match Eurostat nama_10_pc (average population)", gate=gate(True, False, True, False, False), facts=series_facts([r for r in rows(GDP, {"IDUpotrebaBDP": "00", "IDVrPod": "1"}) if int(r["god"]) >= 2011 and int(r["god"]) <= 2024]),
         note=POP_NOTE),
    dict(atlas_indicator="population", sors_dataset="18010403IND01", selection={"IDTer": "RS", "IDPol": "0", "IDStarost": "0"}, frequency="annual", original_unit="number, 1 January",
         status="definition_compatible", transformation="none", gate=gate(True, True, True, True, True), overlap=overlap("population", by_year(pop_jan), tolerance=(0.005, 1), break_years=[s["year"] for s in level_shifts(pop_jan)]), facts=series_facts(pop_jan), level_shifts=level_shifts(pop_jan),
         note=POP_NOTE + " The 1 January 2022 value already reflects the 2022 census revision; the Atlas's Eurostat record for 2022 is an earlier (rounded) vintage."),
    dict(atlas_indicator="population (1961–2010 annual estimates)", sors_dataset="180304IND02", selection={"IDTer": "RS"}, frequency="annual", original_unit="number (SORS annual estimate)",
         status="descriptive_only", transformation="none", gate=gate(True, True, False, False, False), facts=series_facts(rows("180304IND02", {})), level_shifts=level_shifts(rows("180304IND02", {})),
         note="Longer SORS estimate series; reference date and territorial coverage differ from the 1 January Eurostat concept before 2011 and change in 1998. " + POP_NOTE),
    dict(atlas_indicator="hicp_inflation", sors_dataset="03010601IND03", selection={"IDCOICOP": "0000"}, frequency="monthly → annual average", original_unit="index, same month previous year = 100",
         status="not_comparable", transformation="n/a", gate=gate(False, True, True, True, False),
         note="National CPI is not HICP. Serbia's HICP already comes from Eurostat; SORS CPI must not replace it."),
    dict(atlas_indicator="serbia_cpi_annual_rate (Serbia-specific, y/y index IND03)", sors_dataset="03010601IND03", selection={"IDCOICOP": "0000"}, frequency="monthly", original_unit="index, same month previous year = 100",
         status="descriptive_only", transformation="annual rate % = index − 100", gate=gate(False, True, True, True, False), facts=series_facts(rows("03010601IND03", {"IDCOICOP": "0000"}, monthly=True)),
         note="Official national CPI (2007+; base 2006=100). Open-data series ends 2025-12; later months need the successor dataset. Pre-2007 CPI (030201IND01, 1999–2010, base 2005) is a different index and is not spliced."),
    dict(atlas_indicator="unemployment_rate", sors_dataset="240003020102IND03", selection={"IDPol": "0", "IDStarGrupa": "15-74"}, frequency="annual", original_unit="% (LFS, 15–74)",
         status="definition_compatible", transformation="none", gate=gate(True, True, True, True, True), overlap=overlap("unemployment_rate", by_year(lfs_u), tolerance=(0.0, 0.3)), facts=series_facts(lfs_u),
         note="LFS series revised by SORS to the 2021 methodology back to 2011 (status 'Revised value'); earlier LFS years are a different series."),
    dict(atlas_indicator="employment_rate (Phase G review queue)", sors_dataset="240003020102IND02", selection={"IDPol": "0", "IDStarGrupa": "20-64"}, frequency="annual", original_unit="% (LFS, 20–64)",
         status="definition_compatible", transformation="none", gate=gate(True, True, True, True, True), facts=series_facts(lfs_e),
         note="Same revised 2011+ LFS basis. Cross-country use waits for the employment-rate methodological review that also covers the EU countries."),
    dict(atlas_indicator="average_earnings (Serbia-specific)", sors_dataset="2403040401IND01 / IND02", selection={"IDTer": "RS"}, frequency="annual (monthly in 2403040101)", original_unit="RSD per month (net / gross)",
         status="descriptive_only", transformation="none", gate=gate(False, False, True, False, False), facts=series_facts(rows("2403040401IND01", {})),
         note="National earnings statistic (administrative sources); official break flags 1997, 2009, 2018 and 'definition differs' 2001. Not the Eurostat compensation-per-employee concept."),
    dict(atlas_indicator="exports_goods_services", sors_dataset=GDP, selection={"IDUpotrebaBDP": exp_code, "IDVrPod": "1"}, frequency="annual", original_unit="mill. RSD, current prices",
         status="requires_transformation", transformation="RSD → EUR at the annual average rate", gate=gate(True, False, True, True, True), facts=series_facts(rows(GDP, {"IDUpotrebaBDP": exp_code, "IDVrPod": "1"})), note="National-accounts exports of goods and services (same concept as Eurostat nama_10_gdp P6)."),
    dict(atlas_indicator="imports_goods_services", sors_dataset=GDP, selection={"IDUpotrebaBDP": imp_code, "IDVrPod": "1"}, frequency="annual", original_unit="mill. RSD, current prices",
         status="requires_transformation", transformation="RSD → EUR at the annual average rate", gate=gate(True, False, True, True, True), facts=series_facts(rows(GDP, {"IDUpotrebaBDP": imp_code, "IDVrPod": "1"})), note="National-accounts imports of goods and services (P7)."),
    dict(atlas_indicator="trade_balance", sors_dataset=GDP, selection={"exports": exp_code, "imports": imp_code}, frequency="annual", original_unit="derived",
         status="requires_transformation", transformation="exports − imports after EUR conversion", gate=gate(True, False, True, True, True), facts=series_facts(rows(GDP, {"IDUpotrebaBDP": exp_code, "IDVrPod": "1"}))),
    dict(atlas_indicator="goods_trade (Serbia-specific)", sors_dataset="1701IND01 / 1702IND01-02", selection={"IDVrPod": "EUR (monthly) / USD (annual)"}, frequency="annual (USD) and monthly (RSD/EUR/USD)", original_unit="million USD / EUR / RSD",
         status="descriptive_only", transformation="none", gate=gate(False, False, True, True, False), facts=series_facts(rows("1701IND01", {"IDVrPod": "1"}, territory=None)),
         note="Merchandise trade statistics (goods only, customs basis) — a different concept from national-accounts exports of goods and services."),
    dict(atlas_indicator="manufacturing_share_gdp", sors_dataset="0902010301IND01", selection={"IDKD08": c_code, "IDVrPod": "2"}, frequency="annual", original_unit="% of GDP",
         status="definition_compatible" if manuf else "requires_transformation", transformation="none" if manuf else "sum NACE divisions 10–33 / GDP", gate=gate(True, True, True, True, True),
         overlap=overlap("manufacturing_share_gdp", by_year(manuf), tolerance=(0.0, 0.3)) if manuf else None, facts=series_facts(manuf) if manuf else None),
    dict(atlas_indicator="fiscal_balance_gdp / government_revenue_gdp / government_expenditure_gdp", sors_dataset="09020701IND01", selection={"IDInstitucionalniSektor": "S.13", "IDTransakcijeESA": "B9 / TR / TE"}, frequency="annual", original_unit="million RSD",
         status="requires_methodological_review", transformation="ratio to GDP (current RSD)", gate=gate(True, True, True, True, False),
         note="ESA-coded general-government accounts, but many cells carry 'Definition differs' and 'not collected' flags; Eurostat EDP-notified values for Serbia are pending, so no overlap check is possible."),
    dict(atlas_indicator="government_debt_gdp", sors_dataset=None, selection=None, frequency="annual", original_unit=None, status="requires_methodological_review", transformation="n/a", gate=gate(False, False, False, False, False),
         note="Not in the SORS open-data portal. Public debt is published by the Ministry of Finance (Public Debt Administration) under a national definition, not EDP."),
    dict(atlas_indicator="rd_expenditure_gdp (review queue)", sors_dataset="100109IND01", selection={"IDTer": "RS"}, frequency="annual", original_unit="% of GDP",
         status="descriptive_only", transformation="none", gate=gate(True, True, True, True, False), facts=series_facts(rows("100109IND01", {})),
         note="GERD / GDP; comparable concept but the Atlas has not yet adopted an R&D indicator for any country (Phase G review queue)."),
    dict(atlas_indicator="energy_import_dependency", sors_dataset="040201IND06", selection={"IDEnergenti": "0", "IDTokovi2017": f"({en_import} − {en_export}) / {en_gae}"}, frequency="annual", original_unit="TJ",
         status="requires_transformation", transformation="(imports − exports) / gross available energy × 100", gate=gate(True, True, True, True, False),
         overlap=overlap("energy_import_dependency", energy_dep, tolerance=(0.0, 0.3)), note="Energy balance 2010–2024; the Eurostat indicator is itself in the Phase G review queue (2019 methodology). A systematic gap to Eurostat indicates a definitional difference in the balance aggregates."),
    dict(atlas_indicator="fdi_inflow / current_account_gdp", sors_dataset=None, selection=None, frequency="annual", original_unit=None, status="requires_methodological_review", transformation="n/a", gate=gate(False, False, False, False, False),
         note="Not published by SORS. Balance of payments and FDI are compiled by the National Bank of Serbia (BPM6); requires a separate NBS source audit."),
    # ---------------- monthly / quarterly ----------------
    dict(atlas_indicator="industrial_production_index", sors_dataset="060001IND02", selection={"IDKD08": "0"}, frequency="monthly (and annual)", original_unit="index, 2021=100 (not seasonally adjusted)",
         status="definition_compatible", transformation="none for descriptive use; seasonal and calendar adjustment would be needed to match the SCA Eurostat series", gate=gate(True, True, True, True, False),
         facts=series_facts(rows("060001IND02", {"IDKD08": "0"}, territory=None, monthly=True)), model_role="formal_model_compatible_candidate",
         note="Serbia's Eurostat IPI (already in the frozen HF data) is transmitted by SORS; the SORS series is a candidate only — no model inclusion is authorised."),
    dict(atlas_indicator="serbia_cpi_index (Serbia-specific, base 2006=100 IND01)", sors_dataset="03010601IND01", selection={"IDCOICOP": "0000"}, frequency="monthly", original_unit="index 2006=100; y/y index",
         status="descriptive_only", transformation="none", gate=gate(False, True, True, True, False), facts=series_facts(rows("03010601IND01", {"IDCOICOP": "0000"}, monthly=True)), model_role="descriptive_only",
         note="Not HICP; excluded from HICP-based models."),
    dict(atlas_indicator="lfs_unemployment_quarterly (Serbia-specific)", sors_dataset="240003010102IND03", selection={"IDPol": "0", "IDStarGrupa": "15-74"}, frequency="quarterly", original_unit="%",
         status="descriptive_only", transformation="none", gate=gate(True, True, False, True, True), facts=series_facts(rows("240003010102IND03", {"IDPol": "0", "IDStarGrupa": "15-74"})), model_role="descriptive_only",
         note="Quarterly, not seasonally adjusted; the frozen models use monthly SA unemployment."),
    dict(atlas_indicator="average_earnings_monthly (Serbia-specific)", sors_dataset="2403040101IND01 / IND02", selection={"IDTer": "RS"}, frequency="monthly", original_unit="RSD",
         status="descriptive_only", transformation="none", gate=gate(False, False, True, False, False), facts=series_facts(rows("2403040101IND02", {}, monthly=True)), model_role="descriptive_only"),
    dict(atlas_indicator="retail_trade_volume (Serbia-specific)", sors_dataset="210105IND02", selection={"IDKD08STS": "47", "IDDesezoniranjeVS": "Y"}, frequency="monthly", original_unit="index 2021=100, constant prices, SA",
         status="descriptive_only", transformation="none", gate=gate(True, True, True, True, False), facts=series_facts(rows("210105IND02", {"IDKD08STS": "47", "IDDesezoniranjeVS": "Y"}, monthly=True)), model_role="descriptive_only"),
    dict(atlas_indicator="producer_prices_industry (Serbia-specific)", sors_dataset="030201010101IND01", selection={"IDKD08": "0", "IDIndeksVrsta": "3"}, frequency="monthly", original_unit="index, same month previous year = 100",
         status="descriptive_only", transformation="none", gate=gate(True, True, True, True, False), facts=series_facts(rows("030201010101IND01", {"IDKD08": "0", "IDIndeksVrsta": "3"}, monthly=True)), model_role="descriptive_only"),
    dict(atlas_indicator="goods_trade_monthly (Serbia-specific)", sors_dataset="1702IND01 / 1702IND02", selection={"IDVrPod": "2"}, frequency="monthly", original_unit="EUR million",
         status="descriptive_only", transformation="none", gate=gate(False, True, True, True, False), facts=series_facts(rows("1702IND01", {"IDVrPod": "2"}, territory=None, monthly=True)), model_role="descriptive_only"),
    dict(atlas_indicator="bilateral_fx_local_per_eur / policy_rate", sors_dataset=None, selection=None, frequency="monthly", original_unit=None, status="definition_compatible", transformation="n/a", gate=gate(True, True, True, True, True), model_role="descriptive_only",
         note="Published by the National Bank of Serbia, not SORS. The Atlas already carries these series via BIS (NBS as contributing central bank); keep BIS as the store, use NBS only as a documented cross-check."),
]
# ---------------- regional ----------------
regional = [
    dict(atlas_indicator="regional_population", sors_dataset="18010403IND01", selection={"IDPol": "0", "IDStarost": "0"}, levels=["NSTJ1", "NSTJ2", "NSTJ3", "municipality"], frequency="annual", period="2011–2025", original_unit="number, 1 January",
         status="definition_compatible", gate=gate(True, True, True, False, True), note="Same concept as Eurostat regional population; NSTJ units are not NUTS units, so cross-country regional ranking stays off."),
    dict(atlas_indicator="regional_population (long series)", sors_dataset="180304IND02", selection={}, levels=["NSTJ1", "NSTJ2", "NSTJ3", "municipality"], frequency="annual", period="1961–2025", original_unit="number",
         status="descriptive_only", gate=gate(True, True, False, False, False), note="Unflagged 1998 coverage change (RS23 units without data) and census level shifts; trends only within segments."),
    dict(atlas_indicator="regional_gdp / regional_gdp_per_capita", sors_dataset=None, selection=None, levels=["NSTJ2", "NSTJ3"], frequency="annual", period=None, original_unit=None,
         status="requires_methodological_review", gate=gate(False, False, False, False, False), note="Regional GDP is published by SORS in releases and its statistical database but not in the open-data portal; needs a separate source audit."),
    dict(atlas_indicator="regional_unemployment_rate", sors_dataset="240003020304IND01 (2021–2025) / 2400020102IND04 (2014–2020)", selection={"IDPol": "0", "IDStarGrupa": "15-74 (2021+) / 15 (2014–2020)"}, levels=["NSTJ1", "NSTJ2"], frequency="annual", period="2014–2025", original_unit="%",
         status="descriptive_only", gate=gate(True, True, True, False, False), note="Official 2021 series-break flag between the two LFS segments; 2014–2020 regional values include many 'low reliability' flags. Segments are not joined."),
    dict(atlas_indicator="regional_employment_rate", sors_dataset="240003020205IND01 (2021–2025) / 2400020102IND02 (2014–2020)", selection={"IDPol": "0", "IDStarGrupa": "20-64 (2021+)"}, levels=["NSTJ1", "NSTJ2"], frequency="annual", period="2014–2025", original_unit="%",
         status="descriptive_only", gate=gate(True, True, True, False, False), note="Same 2021 break; not joined."),
    dict(atlas_indicator="regional_manufacturing_share", sors_dataset="240205IND01 (registered employment by activity)", selection=None, levels=["NSTJ3", "municipality"], frequency="annual", period="2015–2025", original_unit="persons",
         status="not_comparable", gate=gate(False, False, True, False, False), note="Only an employment-based structure is available in open data; the Atlas indicator is a GVA share."),
]

# Regional observation counts (non-missing, 2000+, NSTJ units and municipalities; RS national excluded).
def regional_count(dsid, where, since=2000):
    return sum(1 for r in data[dsid] if r.get("IDTer") not in (None, "RS") and r["vrednost"] is not None and int(r["god"]) >= since and all(str(r.get(k)) == str(v) for k, v in where.items()))
regional[0]["expected_new_observations"] = regional_count("18010403IND01", {"IDPol": "0", "IDStarost": "0"})
regional[1]["expected_new_observations"] = regional_count("180304IND02", {})
regional[3]["expected_new_observations"] = regional_count("240003020304IND01", {"IDPol": "0", "IDStarGrupa": "15-74"}) + regional_count("2400020102IND04", {"IDPol": "0", "IDStarGrupa": "15"})
regional[4]["expected_new_observations"] = regional_count("240003020205IND01", {"IDPol": "0", "IDStarGrupa": "20-64"}) + regional_count("2400020102IND02", {"IDPol": "0", "IDStarGrupa": "15"})

for m in mappings + regional:
    ds = (m.get("sors_dataset") or "").split(" ")[0]
    m["source_institution"] = "Statistical Office of the Republic of Serbia (SORS / RZS)" if m.get("sors_dataset") else ("National Bank of Serbia" if "NBS" in (m.get("note") or "") or "National Bank" in (m.get("note") or "") else "Ministry of Finance of the Republic of Serbia")
    if ds in cat_en: m["sors_dataset_title"] = cat_en[ds]["title"]; m["sors_dataset_title_sr"] = cat_sr.get(ds, {}).get("title")
    m.setdefault("model_role", "descriptive_only")
    m["cross_country_comparable"] = m["gate"]["cross_country_comparable"] and (m.get("overlap") is None or m["overlap"]["result"] in ("pass", "pass_except_detected_break_years"))
    if m["status"] in ("definition_compatible", "requires_transformation") and m.get("overlap") and m["overlap"]["result"] == "fail":
        m["status"] = "requires_methodological_review"; m["note"] = (m.get("note") or "") + f" Overlap with the Eurostat Serbia record failed tolerance in {m['overlap']['failed_years']}."

# --- Source audit -----------------------------------------------------------------------------------------------
RELEVANT_CATEGORIES = {"03", "04", "06", "09", "10", "17", "18", "21", "24", "90", "00"}
def catalog_entry(dsid):
    en, sr = cat_en.get(dsid, {}), cat_sr.get(dsid, {})
    entry = {"dataset_id": dsid, "official_name_en": en.get("title"), "official_name_sr": sr.get("title"), "category": en.get("category"), "category_name": CATEGORY_EN.get("portal_en.html", {}).get(en.get("category")),
             "period": en.get("period"), "records": en.get("records"), "latest_update": en.get("last_update"), "metadata_pages": en.get("metadata") or sr.get("metadata"),
             "endpoints": {"json_en": API.format(id=dsid, lang=3, fmt="json"), "csv_en": API.format(id=dsid, lang=3, fmt="csv"), "json_sr_cyrillic": API.format(id=dsid, lang=1, fmt="json"), "json_sr_latin": API.format(id=dsid, lang=2, fmt="json")},
             "machine_readable_formats": ["JSON", "CSV", "Excel"], "attribution_requirement": "Cite SORS as source, state retrieval date and download address, and mark all modifications (SORS open-data terms of use)."}
    if dsid in profiles: entry["inspected"] = profiles[dsid]
    return entry

source_audit = {
    "schema_version": "serbia-official-data-source-audit-v1", "audit_date": AUDIT_DATE, "state": "audit_only_no_ingestion",
    "source_institution": {"name": "Statistical Office of the Republic of Serbia (SORS / RZS)", "portal": "https://opendata.stat.gov.rs/odata/", "website": "https://www.stat.gov.rs/",
                           "national_open_data_mirror": "https://data.gov.rs/sr/organizations/republichki-zavod-za-statistiku-2021/", "role": "authoritative national source for Serbia"},
    "terms_of_use_summary": "Free reuse for any purpose (including commercial), with the obligation to cite SORS as the source, give the retrieval date and the download address, and clearly mark any modifications.",
    "api": {"pattern": API, "languages": {"1": "Serbian (Cyrillic)", "2": "Serbian (Latin)", "3": "English"}, "formats": ["json", "csv"],
            "record_schema": {"IDTer/nTer": "territory code (NSTJ or municipality code) and name", "god": "year", "mes": "month ('00' annual, '01'–'12' monthly, 'K1'–'K4' quarterly)", "vrednost": "value (null when missing)", "idJedinicaMere/nJedinicaMere": "unit", "IDStatusPodatka/nStatusPodatka": "SORS observation status (A normal, P provisional, E estimated, R revised, B time-series break, D definition differs, O not available, M cannot exist, L not collected, U low reliability, K corrected)"},
            "access_notes": ["The API rejects requests without a browser-like User-Agent (HTTP 403); a standard User-Agent header is sufficient.", "Some large datasets are returned as a ZIP containing the JSON (e.g. 18010403IND01).", "Missing values are explicit status codes with null values; they are never zero."]},
    "portal_snapshot": {"retrieved": AUDIT_DATE, "sha256": portal_hashes, "dataset_count": len(cat_en), "by_category": {f"{k} {CATEGORY_EN.get('portal_en.html', {}).get(k, '')}": v for k, v in sorted(collections.Counter(e["category"] for e in cat_en.values()).items())}},
    "other_official_institutions": [
        {"institution": "National Bank of Serbia (NBS)", "url": "https://www.nbs.rs/en/drugi-nivo-navigacije/statistika/", "publishes": ["official EUR/RSD middle rate", "key policy rate", "balance of payments and current account (BPM6)", "FDI", "monetary aggregates"], "machine_readable": "spreadsheet downloads; no documented open-data API audited", "status": "separate source audit required; FX and policy rate already reach the Atlas via BIS with NBS as contributing central bank"},
        {"institution": "Ministry of Finance / Public Debt Administration", "url": "https://www.mfin.gov.rs/en/", "publishes": ["public debt (national definition)", "consolidated fiscal balance (GFS-style national presentation)"], "machine_readable": "reports and spreadsheets", "status": "separate source audit required; national debt definition differs from EDP"},
    ],
    "datasets": [catalog_entry(d) for d in sorted(set(profiles) | {d for d, e in cat_en.items() if e["category"] in RELEVANT_CATEGORIES and e["category"] != "00" and re.search(r"GDP|gross|population estimat|price|industrial production|unemploy|employment rate|activity rate|earnings|export|import|external trade|turnover|energy balance|RD|government", e["title"] or "", re.I)})],
}

# --- Regional classification registry -----------------------------------------------------------------------------
parents = collections.defaultdict(list)
for mcp in municipalities:
    if mcp.get("IDNSTJ"): parents[mcp["IDNSTJ"]].append(mcp["MBOPS"])
data_years = collections.defaultdict(set)
for dsid in ("180304IND02", "18010403IND01", "240003020304IND01", "2400020102IND04"):
    for r in data[dsid]:
        if r.get("IDTer") in nstj_codes and r["vrednost"] is not None: data_years[r["IDTer"]].add(int(r["god"]))
units = []
for r in nstj:
    code = r["IDNSTJ"]
    level = "national" if code == "RS" else ("extra_regio" if code.startswith("RSZ") else f"NSTJ{len(code) - 2}")
    years = sorted(data_years.get(code, []))
    units.append({"source_territorial_code": code, "source_name": r["nNSTJ"].strip(), "statistical_level": level, "parent_code": code[:-1] if level.startswith("NSTJ") and len(code) > 3 else ("RS" if level == "NSTJ1" else None),
                  "classification": "NSTJ — nomenclature of statistical territorial units (SORS code list 'Teritory - NSTJ')", "classification_version": f"SORS NSTJ code list as served on {AUDIT_DATE}",
                  "municipality_codes": sorted(parents.get(code, [])) if level == "NSTJ3" else None,
                  "inspected_data_years": [years[0], years[-1]] if years else None,
                  "coverage_status": "source_defined_unit_without_sors_data_since_1998" if code.startswith("RS23") else ("source_defined_unit" if years else "code_list_only"),
                  "nuts_status": "not an EU NUTS unit; SORS defines this unit in its own NSTJ classification"})
national_pop = rows("180304IND02", {})
registry = {
    "schema_version": "serbia-regional-classification-registry-v1", "audit_date": AUDIT_DATE, "neutrality_note": NEUTRALITY_NOTE,
    "classification": {"name": "NSTJ (Nomenklatura statističkih teritorijalnih jedinica)", "levels": {"NSTJ1": "2 units (Srbija – sever, Srbija – jug)", "NSTJ2": "5 regions", "NSTJ3": "30 areas (oblasti)", "municipality": f"{len([m for m in municipalities if m.get('IDNSTJ')])} municipalities and cities mapped to NSTJ3 in SIFOPS"},
                       "source_code_lists": {"NSTJ": API.format(id="NSTJ", lang=3, fmt="json"), "SIFOPS": API.format(id="SIFOPS", lang=3, fmt="json")},
                       "relabeling_policy": "Serbian units are stored with their NSTJ codes and levels. They are not relabelled as EU NUTS units; the source does not define the current classification as NUTS."},
    "coverage_findings": [
        {"finding": "territorial_coverage_change_1998", "evidence": {"dataset": "180304IND02", "national_total_1997": next(r["vrednost"] for r in national_pop if r["god"] == "1997"), "national_total_1998": next(r["vrednost"] for r in national_pop if r["god"] == "1998"),
                                                                      "rs23_last_year_with_data": max(data_years.get("RS23", {0}) or {0})},
         "interpretation": "From 1998 SORS national and NSTJ1 'Srbija – jug' totals are published without data for the RS23 units; this is a coverage change in the source series, recorded without any political interpretation.", "consequence": "No trend across 1997/1998; the Atlas target period (2000+) lies after the change."},
        {"finding": "census_level_shifts", "evidence": level_shifts(national_pop), "interpretation": "Unflagged level shifts in the SORS population estimate series (census years); segments are not joined into a trend."},
        {"finding": "lfs_2021_break", "evidence": {"datasets": ["240003020304IND01", "240003020205IND01"], "flag": "B: Time series break", "year": 2021}, "interpretation": "Regional LFS 2014–2020 and 2021+ are separate series."},
    ],
    "observation_record_requirements": ["source_territorial_code", "classification_version", "statistical_level", "source_year", "observation_year", "comparability_status"],
    "comparability_statuses": {"comparable_within_segment": "same NSTJ code and unit, no break or coverage change inside the segment", "series_break": "official break flag or detected level shift between years", "coverage_change": "source-defined territorial coverage changed", "not_comparable_cross_country": "NSTJ units are not NUTS units; no cross-country regional ranking"},
    "units": units,
}

# --- Integration plan ----------------------------------------------------------------------------------------------
def expected(m):
    f = m.get("facts") or {}
    return f.get("observations_from_floor") if m["status"] in ("definition_compatible", "exact_match") else f.get("observations_2000_latest")

plan_rows = []
for m in mappings:
    plan_rows.append({"atlas_indicator": m["atlas_indicator"], "sors_dataset": m.get("sors_dataset"), "status": m["status"], "frequency": m["frequency"], "model_role": m["model_role"],
                      "cross_country_comparable": m["cross_country_comparable"], "earliest_usable": (m.get("facts") or {}).get("definition_compatible_floor") if m["status"] in ("definition_compatible", "exact_match") else max(2000, int(str((m.get("facts") or {}).get("first") or 2000)[:4])) if m.get("facts") else None,
                      "expected_new_observations": expected(m), "action": {"definition_compatible": "ingest to Serbia descriptive store after owner approval", "exact_match": "ingest to Serbia descriptive store after owner approval",
                                                                            "descriptive_only": "ingest as Serbia-specific series (cross_country_comparable = false) after owner approval", "requires_transformation": "ingest original values; add documented transformation after the conversion source is approved",
                                                                            "not_comparable": "do not map to this Atlas indicator", "requires_methodological_review": "no ingestion until reviewed"}[m["status"]]})
integration_plan = {
    "schema_version": "serbia-data-integration-plan-v1", "audit_date": AUDIT_DATE, "state": "plan_for_owner_review",
    "prohibitions": ["No platform version change.", "No change to any formal model sample or readiness state.", "Serbia is not added to VAR, LP, Panel LP or panel models; any candidate flag is informational only.", "SORS CPI never replaces HICP.", "Missing values stay missing; nothing is encoded as zero."],
    "stores": {"national_annual": "src/data/serbia/serbia_descriptive_history_annual.json (separate from observations.json)", "monthly_quarterly": "src/data/serbia/serbia_descriptive_history_monthly.json (separate from the frozen 2015+ HF/macro files)", "regional": "src/data/serbia/serbia_descriptive_history_regional.json (NSTJ codes)"},
    "record_fields": ["source_institution", "source_dataset", "original_code", "original_unit", "original_value", "normalized_value", "transformation", "retrieved_at", "source_url", "raw_snapshot_sha256", "status (SORS status code and label)", "cross_country_comparable"],
    "cross_country_gate": ["equivalent economic concept", "compatible unit", "compatible reference period", "compatible geographic / statistical population", "documented methodology compatibility"],
    "target_period": "2000–latest where official and definition-compatible; earlier SORS values may be kept with documentation, never force-harmonised",
    "neutrality_note": NEUTRALITY_NOTE,
    "national_and_monthly": plan_rows,
    "regional": [{"atlas_indicator": r["atlas_indicator"], "sors_dataset": r.get("sors_dataset"), "levels": r["levels"], "period": r["period"], "status": r["status"], "cross_country_comparable": r["cross_country_comparable"], "expected_new_observations": r.get("expected_new_observations"), "note": r.get("note")} for r in regional],
}
safe = [r for r in plan_rows if r["status"] in ("definition_compatible", "exact_match")]
integration_plan["summary"] = {
    "safe_for_immediate_descriptive_integration": [r["atlas_indicator"] for r in safe],
    "serbia_specific_descriptive": [r["atlas_indicator"] for r in plan_rows if r["status"] == "descriptive_only"],
    "requires_transformation": [r["atlas_indicator"] for r in plan_rows if r["status"] == "requires_transformation"],
    "not_comparable": [r["atlas_indicator"] for r in plan_rows if r["status"] == "not_comparable"],
    "requires_methodological_review": [r["atlas_indicator"] for r in plan_rows if r["status"] == "requires_methodological_review"],
    "could_join_cross_country_comparisons": [r["atlas_indicator"] for r in plan_rows if r["cross_country_comparable"]],
    "expected_new_observations": {"safe_national_and_monthly": sum(r["expected_new_observations"] or 0 for r in safe), "serbia_specific_descriptive": sum(r["expected_new_observations"] or 0 for r in plan_rows if r["status"] == "descriptive_only"),
                                  "regional_descriptive": sum(r.get("expected_new_observations") or 0 for r in regional if r["status"] in ("definition_compatible", "descriptive_only")),
                                  "requires_transformation_pending_fx_source": sum(r["expected_new_observations"] or 0 for r in plan_rows if r["status"] == "requires_transformation")},
}

mapping_doc = {"schema_version": "serbia-indicator-mapping-v1", "audit_date": AUDIT_DATE, "allowed_statuses": ["exact_match", "definition_compatible", "descriptive_only", "requires_transformation", "not_comparable", "requires_methodological_review"],
               "rule": "Mappings are decided on concept, unit, reference period, population and methodology — never on similar names. Overlap with existing Eurostat Serbia records (2021–2025) is used as evidence where available.",
               "national_and_monthly": mappings, "regional": regional}

os.makedirs(OUT, exist_ok=True)
for name, doc in (("serbia_official_data_source_audit.json", source_audit), ("serbia_indicator_mapping.json", mapping_doc), ("serbia_regional_classification_registry.json", registry), ("serbia_data_integration_plan.json", integration_plan)):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh: json.dump(doc, fh, ensure_ascii=False, indent=1); fh.write("\n")
print(json.dumps(integration_plan["summary"], ensure_ascii=False, indent=1))
for m in mappings:
    if m.get("overlap"): print("overlap", m["atlas_indicator"], m["overlap"]["result"], m["overlap"]["pairs"][:2])
