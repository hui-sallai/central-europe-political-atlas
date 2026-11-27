#!/usr/bin/env python3
"""Run at repository root with installed Node dependencies. Stdout is a deterministic JSON receipt."""
import csv
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def read(path):
    return json.loads(Path(path).read_bytes())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(ok, why):
    if not ok:
        raise ValueError(why)


def unique_map(rows, key):
    result = {}
    for row in rows:
        identity = key(row)
        require(identity not in result, f"duplicate {identity}")
        result[identity] = row
    return result


def csv_dicts(data):
    return list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"), newline="")))


def csv_bytes(headers, records):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, headers.split(), quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(records)
    return output.getvalue().encode()


SORS_KEYS = ["cpi_index_2006", "lfs_unemployment_quarterly", "cpi_annual_index", "retail_trade_volume_sa"]
SORS_DIMENSIONS = [{"IDCOICOP":"0000"}, {"IDPol":"0","IDStarGrupa":"15-74"}, {"IDCOICOP":"0000"}, {"IDKD08STS":"47","IDDesezoniranjeVS":"Y"}]
SORS_CODES = ["I06", "PC", "I_MTHPPYR", "INX"]
FIXTURES = """
import fs from 'node:fs';
import path from 'node:path';
import { buildSorsSnapshotExample, SORS_FIXTURE_TIME } from './tests/fixtures/research-package-sors.mjs';
if (SORS_FIXTURE_TIME !== '2026-11-26T12:00:00.000Z') throw Error('Fixture clock drift');
for (const key of process.argv.slice(2)) fs.writeFileSync(path.join(process.argv[1],key+'.zip'),buildSorsSnapshotExample(key,SORS_FIXTURE_TIME).bytes);
"""


def verify_sors():
    history = read("public/research-data/serbia/serbia_descriptive_history_monthly.json")
    runtime = read("public/research-data/serbia_sors_runtime.json")
    intake = read("src/data/serbia/serbia_ingestion_manifest.json")
    pins = read("docs/research-rights/r1c3/captured_snapshots.json")["sors_fixture_rebuilds"]["series"]
    observations = {}
    with tempfile.TemporaryDirectory() as folder:
        subprocess.run(["node", "--input-type=module", "-e", FIXTURES, folder, *SORS_KEYS], check=True)
        for key, dims, code in zip(SORS_KEYS, SORS_DIMENSIONS, SORS_CODES):
            pin = pins[key]
            series = next(r for r in runtime["series"] if r["key"] == key and r["store"] == "monthly")
            history_source = next(r for r in history["series_sources"] if r["series"] == key)
            dataset = pin["dataset"]
            url = f"https://opendata.stat.gov.rs/data/WcfJsonRestService.Service1.svc/dataset/{dataset}/3/json"
            acquisition = next(r for r in intake["sources"] if r["dataset_id"] == dataset)
            data = Path(acquisition["extract_file"]).read_bytes()
            extract = json.loads(data)
            require(sha(data) == acquisition["extract_sha256"], key+" extract digest")
            for field in ["dataset_id", "source_url", "retrieved_at", "http_status", "response_container", "response_bytes", "response_record_count", "response_sha256", "extract_record_count"]:
                require(acquisition[field] == extract[field], key+" acquisition "+field)
            require(extract["http_status"] == 200 and extract["response_container"] == "json", key+" acquisition")
            require(extract["source_url"] == history_source["source_url"] == series["source_url"] == url, key+" URL")
            require(series["dataset"] == history_source["source_dataset"] == dataset, key+" dataset")
            require(history_source["original_code"] == dims and history_source["missing_status_records"] == 0, key+" dimensions")
            history_periods = unique_map((r for r in history["records"] if r["series"] == key), lambda r:r["period"])
            runtime_periods = unique_map(series["points"], lambda r:r[0])
            raw_periods = unique_map(extract["records"], lambda r:f'{r["god"]}-{str(r["mes"]).replace("K","Q")}')
            archive = (Path(folder)/(key+".zip")).read_bytes()
            with zipfile.ZipFile(io.BytesIO(archive)) as z:
                require(z.testzip() is None, key+" CRC")
                require(set(z.namelist()) == {"manifest.json","README.md","view-url.txt","citation.txt","data.csv","sources.csv"}, key+" unexpected inventory")
                csv_data, csv_sources = z.read("data.csv"), z.read("sources.csv")
                manifest = json.loads(z.read("manifest.json"))
            digests = {"data":sha(csv_data),"sources":sha(csv_sources),"archive":sha(archive)}
            require(all(pin[name] == digest for name,digest in digests.items()), key+" pinned bytes")
            rows = csv_dicts(csv_data)
            csv_periods = unique_map(rows, lambda r:r["period"])
            source, = csv_dicts(csv_sources)
            require(source["dataset"] == dataset and source["source_url"] == url and json.loads(source["source_code"]) == dims, key+" sources.csv")
            require(set(raw_periods) == set(history_periods) == set(runtime_periods) == set(csv_periods), key+" period sets")
            require(len(raw_periods) == extract["extract_record_count"] == pin["rows"] == manifest["observation_count"], key+" row counts")
            require(manifest["figure"] is None and list(csv_periods) == sorted(raw_periods, reverse=True), key+" figure or row order")
            statuses = Counter()
            for period, raw in raw_periods.items():
                point, hist, output = runtime_periods[period], history_periods[period], csv_periods[period]
                why = key+" "+period
                require(raw["idindikator"] == dataset and raw["idJedinicaMere"] == code and raw["IDTer"] == "RS" and raw["nIzvorI"] == "SORS", why+" identity")
                require(all(str(raw[d]) == v for d,v in dims.items()), why+" selection")
                require(raw["vrednost"] is not None and raw["vrednost"] == hist["original_value"] == hist["normalized_value"] == point[1] == point[2] == float(output["value"]) == float(output["original_value"]), why+" value")
                require(hist["source_ref"] == history_source["source_ref"] and output["source_id"] == source["source_id"], why+" source reference")
                require(hist["normalized_unit"] == series["unit"] == output["unit"] and hist["original_unit"] == series["original_unit"] == output["original_unit"], why+" unit")
                require(raw["IDStatusPodatka"] == point[3] == hist["sors_status"] and raw["nStatusPodatka"] == output["status"] == series["status_legend"][point[3]], why+" status")
                require(hist["territory_code"] == "RS" and hist["statistical_level"] == "national" and output["country"] == "serbia", why+" geography")
                require(output["layer"] == "serbia_sors_descriptive" and output["id"] == f"sors:{key}:{period}", why+" identity")
                require(output["cross_country_comparable"] == "false" and not hist["cross_country_comparable"] and point[5] == 0, why+" comparability")
                statuses[raw["nStatusPodatka"]] += 1
            observations[key] = dict(dataset=dataset, source_url=url, dimensions=dims, original_unit_code=code,
                source_unit_labels=sorted({r["nJedinicaMere"] for r in raw_periods.values()}), unit=series["unit"],
                native_indicator=sorted({r["Indikator"] for r in raw_periods.values()}), selected_rows=len(rows),
                first=min(raw_periods), last=max(raw_periods), missing_values=0, mismatched_rows=0,
                statuses=dict(sorted(statuses.items())), sha256=digests, retained_extract_sha256=sha(data),
                recorded_upstream_sha256=extract["response_sha256"], recorded_upstream_bytes=extract["response_bytes"],
                recorded_upstream_records=extract["response_record_count"], retained_extract_file=acquisition["extract_file"],
                recorded_upstream_retrieval=extract["retrieved_at"], source_row_retrieval=source["retrieved_at"] or None,
                upstream_response_digest_independently_recomputed=False)
    return observations


def verify_eurostat():
    path = "src/data/historical/raw/monthly/eurostat_prc_hicp_minr_RCH_A_TOTAL.json"
    data = Path(path).read_bytes()
    raw = json.loads(data)
    receipt = next(r for r in read("public/research-data/monthly_history_manifest.json")["sources"] if r["raw_file"] == path)
    require(sha(data) == receipt["sha256"] == "4a2dbd260ac3b96351c153e8b2f6f340ab00ed4712c3ee6141a03ed8fc49ccfb", "Eurostat retained response")
    require(receipt["dataset_updated_at"] == raw["updated"] and receipt["http_status"] == 200, "Eurostat receipt")
    query = parse_qs(urlparse(receipt["url"]).query)
    require(query["unit"] == ["RCH_A"] and query["coicop18"] == ["TOTAL"] and "HU" in query["geo"], "Eurostat dimensions")
    require(raw["class"] == "dataset" and raw["source"] == raw["extension"]["agencyId"] == "ESTAT" and raw["extension"]["id"] == "PRC_HICP_MINR", "Eurostat identity")
    periods = [f"2020-{m:02d}" for m in range(1,13)]
    canonical = unique_map((r for r in read("src/data/high-frequency/high_frequency_observations.json")["records"]
        if r["country"] == "hungary" and r["indicator"] == "hicp_annual_rate" and r["period"] in periods), lambda r:r["period"])
    runtime = unique_map((r for r in read("public/research-data/high_frequency_runtime.json")["records"]
        if r[1] == "hungary" and r[3] == "hicp_annual_rate" and r[2] in periods), lambda r:r[2])
    require(set(canonical) == set(runtime) == set(periods), "Eurostat periods")
    dims = {"geo":"HU","freq":"M","unit":"RCH_A","coicop18":"TOTAL"}
    values, records = [], []
    for period in periods:
        coordinates = {**dims,"time":period}
        offset = 0
        require(set(coordinates) == set(raw["id"]) and len(raw["id"]) == len(raw["size"]), "Unexpected JSON-stat dimensions")
        for dim, size in zip(raw["id"],raw["size"]):
            index = raw["dimension"][dim]["category"]["index"]
            require(len(index) == size, "Category size")
            position = index[coordinates[dim]]
            require(isinstance(position,int) and 0 <= position < size, "Invalid JSON-stat coordinate")
            offset = offset * size + position
        index = str(offset)
        flag = raw.get("status",{}).get(index)
        require(index in raw["value"] and raw["value"][index] is not None and flag is None, period+" missing or flagged")
        c, r, value = canonical[period],runtime[period],raw["value"][index]
        require(c["value"] == r[4] == value and c["unit"] == r[6] == "RCH_A" and c["data_status"] == r[11] == "official", period+" value, unit or status")
        require(c["frequency"] == "monthly" and c["source"]=="Eurostat" and c["definition_version"] == r[9] == 'prc_hicp_minr:{"coicop18":"TOTAL","unit":"RCH_A"}', period+" source definition")
        require(c["observation_id"] == r[0] and c["source_dataset"] == r[10] == "Eurostat prc_hicp_minr", period+" source attribution")
        require(c["value_semantics"] == r[7] == "yoy_rate" and r[8] == c["seasonal_adjustment"] == "NSA", period+" semantics")
        url = "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table"
        require(c["source_url"] == url, period+" source URL")
        values.append({"period":period,"flat_index":offset,"value":value,"upstream_status":flag})
        records.append(dict(id=r[0],country=r[1],indicator=r[3],period=period,value=format(value,'.15g'),unit=r[6],
            layer="formal_observation",status=r[11],source_id="source-1",seasonal_adjustment=r[8],value_semantics=r[7]))
    csv_data = csv_bytes("id country indicator period value unit layer status source_id cross_country_comparable seasonal_adjustment value_semantics",reversed(records))
    source = dict(source_id="source-1",institution="Eurostat",dataset="prc_hicp_minr",source_url=url,
        source_code=r[9],unit=r[6],definition=r[7],status=r[11],source_layer="formal_observation")
    csv_sources = csv_bytes("source_id institution dataset source_url source_code retrieved_at updated_at unit original_unit definition reliability status source_layer",[source])
    pins = read("docs/research-rights/r1c3/captured_snapshots.json")["views"]["hu-monthly-hicp"]
    require(sha(csv_data) == pins["data_csv_sha256"] and sha(csv_sources) == pins["sources_csv_sha256"], "Eurostat independent CSV serialization")
    return dict(retained_response_sha256=sha(data),retained_file=path,source=raw["source"],dataset=raw["extension"]["id"],
        acquisition_query=receipt["url"],dimensions=dims,jsonstat_order=raw["id"],jsonstat_sizes=raw["size"],
        recorded_retrieval=receipt["retrieved_at"],raw_dataset_updated_at=raw["updated"],canonical_update_dates=sorted({c["updated_at"] for c in canonical.values()}),
        source_row={**source,"retrieved_at":None,"updated_at":None},normalized_unit="RCH_A",source_unit=raw["dimension"]["unit"]["category"]["label"]["RCH_A"],
        selected_values=values,raw_status_member_present="status" in raw,upstream_flagged_rows=0,missing_values=0,mismatched_rows=0,
        data_csv_sha256=sha(csv_data),sources_csv_sha256=sha(csv_sources),historical_capture_proven=False)


if __name__ == "__main__":
    print(json.dumps({"fixture_clock":"2026-11-26T12:00:00.000Z","sors":verify_sors(),"eurostat":verify_eurostat()},indent=2,ensure_ascii=False))
