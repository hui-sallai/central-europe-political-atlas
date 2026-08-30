"""Acquire and audit official ECB EA-MPD / EA-EMPD workbooks.

Raw workbooks are kept in a git-ignored local cache. Public outputs contain
derived machine-readable records, checksums, source links and explicit
identification limits; they never contain the original workbooks.
"""

from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import mimetypes
import re
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT / ".tmp-ecb-v16"
OUT_DIR = ROOT / "src" / "data" / "identified-shocks"
DRIVER_DIR = ROOT / "src" / "data" / "macro-drivers"
GENERATED_AT = "2026-08-30"
ECB_REUSE_URL = "https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html"
ECB_STATS_REUSE_URL = "https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html"

ASSETS = {
    "ea_mpd": {
        "dataset_id": "ea_mpd",
        "dataset_name": "Euro Area Monetary Policy Event-Study Database (EA-MPD)",
        "file_name": "ea_mpd.xlsx",
        "source_url": "https://www.ecb.europa.eu/pub/pdf/annex/Dataset_EA-MPD.xlsx",
        "methodology_url": "https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp2281~3303fd281b.en.pdf",
        "official_publication": "Measuring euro area monetary policy, ECB Working Paper 2281",
    },
    "ea_empd": {
        "dataset_id": "ea_empd",
        "dataset_name": "Euro Area Extended Monetary Policy Event-Study Database (EA-EMPD)",
        "file_name": "ea_empd.xlsx",
        "source_url": "https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3157-annex-EA-EMPD~8b94679d77.en.xlsx",
        "methodology_url": "https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3157~f5789c7b8a.en.pdf",
        "official_publication": "Monetary transmission with frequent policy events, ECB Working Paper 3157",
    },
}


def json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value == 0:
        return 0
    return value


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=json_value)
    else:
        text = json.dumps(payload, ensure_ascii=False, indent=2, default=json_value)
    path.write_text(text + "\n", encoding="utf-8")


def download(url: str, target: Path, refresh: bool) -> None:
    if target.exists() and not refresh:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "Central-Europe-Political-Atlas/1.6 research acquisition"})
    with urllib.request.urlopen(request, timeout=120) as response, target.open("wb") as handle:
        handle.write(response.read())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_excel_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    text = str(value).strip()
    for pattern in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, pattern)
        except ValueError:
            pass
    raise ValueError(f"Unsupported ECB date value: {value!r}")


def last_sunday(year: int, month: int) -> int:
    last_day = calendar.monthrange(year, month)[1]
    weekday = date(year, month, last_day).weekday()
    return last_day - ((weekday - 6) % 7)


def frankfurt_offset_hours(local_dt: datetime) -> int:
    """EU CET/CEST rule for daytime ECB events (no ambiguous 02:xx fixtures)."""
    march_transition = datetime(local_dt.year, 3, last_sunday(local_dt.year, 3), 3, 0)
    october_transition = datetime(local_dt.year, 10, last_sunday(local_dt.year, 10), 3, 0)
    return 2 if march_transition <= local_dt < october_transition else 1


def timestamp_fields(local_dt: datetime) -> dict[str, Any]:
    offset = frankfurt_offset_hours(local_dt)
    aware = local_dt.replace(tzinfo=timezone(timedelta(hours=offset)))
    return {
        "event_timestamp": aware.isoformat(),
        "original_local_timestamp": local_dt.isoformat(),
        "utc_timestamp": aware.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "timezone": "Europe/Frankfurt",
        "timezone_abbreviation": "CEST" if offset == 2 else "CET",
        "timezone_conversion_rule": "EU CET/CEST calendar rule; last Sunday in March to last Sunday in October uses UTC+2, otherwise UTC+1",
    }


def infer_type(values: list[Any]) -> str:
    types = set()
    for value in values:
        if value is None:
            continue
        if isinstance(value, bool):
            types.add("boolean")
        elif isinstance(value, (int, float)):
            types.add("number")
        elif isinstance(value, (datetime, date)):
            types.add("datetime")
        else:
            types.add("string")
    if not types:
        return "empty"
    return next(iter(types)) if len(types) == 1 else "mixed"


def unit_from_description(description: str | None, column: str) -> str | None:
    text = (description or "").lower()
    if "basis point" in text or column.startswith(("OIS", "DE", "FR", "IT", "ES")):
        return "basis_points"
    if "percentage point" in text or column.startswith(("EUR", "STOXX", "SX7")):
        return "percentage_points"
    if column in {"Date_time", "date"}:
        return "datetime_or_date"
    if column in {"ECB_database", "Non_regular_trading_day", "Outside_regular_trading_hours"}:
        return "binary_flag"
    if column == "Days_until_next_GC":
        return "days"
    return None


def normalize_note_key(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def note_descriptions(workbook, dataset_id: str) -> dict[str, str]:
    descriptions: dict[str, str] = {}
    ws = workbook["Notes"]
    if dataset_id == "ea_mpd":
        for row in ws.iter_rows(values_only=True):
            text = row[0] if row else None
            if not isinstance(text, str) or ":" not in text:
                continue
            key, description = text.split(":", 1)
            descriptions[normalize_note_key(key)] = description.strip()
    else:
        for row in ws.iter_rows(values_only=True):
            key = row[0] if len(row) else None
            description = row[2] if len(row) > 2 else None
            if isinstance(key, str) and isinstance(description, str):
                descriptions[normalize_note_key(key)] = description.strip()
        descriptions.update({
            "DATETIME": "Local Frankfurt date and start time of the registered policy or communication event.",
            "EVENTTYPE": "Official EA-EMPD event classification.",
            "SPEAKER": "Registered ECB policymaker speaker.",
            "TITLE": "Registered event or speech title.",
        })
    return descriptions


def build_workbook_schema(path: Path, dataset_id: str) -> dict[str, Any]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    descriptions = note_descriptions(workbook, dataset_id)
    sheets = []
    for ws in workbook.worksheets:
        raw_rows: list[list[Any]] = []
        last_row = 0
        last_col = 0
        for row_index, row in enumerate(ws.iter_rows(values_only=True), start=1):
            values = list(row)
            while values and values[-1] is None:
                values.pop()
            raw_rows.append(values)
            if values:
                last_row = row_index
                last_col = max(last_col, len(values))
        columns = []
        if last_row == 0:
            sheets.append({"sheet_name": ws.title, "row_count": 0, "column_count": 0, "columns": []})
            continue
        is_data_sheet = ws.title != "Notes"
        raw_rows = raw_rows[:last_row]
        headers = [(raw_rows[0][index - 1] if raw_rows and len(raw_rows[0]) >= index else None) for index in range(1, last_col + 1)]
        data_start = 2 if is_data_sheet else 1
        for index in range(1, last_col + 1):
            raw_header = headers[index - 1]
            column_name = str(raw_header) if raw_header is not None else f"column_{index}"
            values = [raw_rows[row - 1][index - 1] if len(raw_rows[row - 1]) >= index else None for row in range(data_start, last_row + 1)]
            non_missing = [value for value in values if value is not None]
            key = normalize_note_key(column_name)
            if dataset_id == "ea_mpd" and key == "OISSW":
                key = "OIS1W"
            if dataset_id == "ea_mpd" and key == "STOXX50":
                key = "STOXX50E"
            description = descriptions.get(key)
            columns.append({
                "column_name": column_name,
                "inferred_type": infer_type(values),
                "missing_count": len(values) - len(non_missing),
                "sample_value": json_value(non_missing[0]) if non_missing else None,
                "description": description,
                "unit": unit_from_description(description, column_name),
                "source_description": description,
            })
        sheets.append({
            "sheet_name": ws.title,
            "row_count": last_row - 1 if is_data_sheet else last_row,
            "column_count": last_col,
            "columns": columns,
        })
    return {
        "schema_version": f"{dataset_id}-workbook-schema-v1.6",
        "generated_at": GENERATED_AT,
        "dataset_id": dataset_id,
        "raw_field_names_preserved": True,
        "sheet_count": len(sheets),
        "sheets": sheets,
    }


def classify_measure(name: str) -> tuple[str | None, str | None, str]:
    if name.startswith("OIS_") or name == "OIS_SW":
        maturity = name.replace("OIS_", "").replace("SW", "1W")
        return "overnight_index_swap", maturity, "basis_points"
    match = re.match(r"^(DE|FR|IT|ES)(\d+[MY])$", name)
    if match:
        return f"{match.group(1).lower()}_sovereign_yield", match.group(2), "basis_points"
    if name.startswith("EUR"):
        return "foreign_exchange", None, "percentage_points"
    if name.startswith("STOXX") or name == "SX7E":
        return "equity_index", None, "percentage_points"
    return None, None, "unknown"


def schedule_for_mpd(event_date: datetime, subtype: str) -> tuple[datetime, datetime, datetime, str]:
    post_shift = event_date.date() >= date(2022, 7, 1)
    if subtype == "press_release":
        event_time = (14, 15) if post_shift else (13, 45)
        start_time = (13, 55) if post_shift else (13, 25)
        end_time = (14, 40) if post_shift else (14, 10)
        window_id = "policy_decision_window"
    elif subtype == "press_conference":
        event_time = (14, 45) if post_shift else (14, 30)
        start_time = (14, 30) if post_shift else (14, 15)
        end_time = (16, 5) if post_shift else (15, 50)
        window_id = "press_conference_window"
    else:
        event_time = (14, 15) if post_shift else (13, 45)
        start_time = (13, 55) if post_shift else (13, 25)
        end_time = (16, 5) if post_shift else (15, 50)
        window_id = "combined_monetary_event_window"
    event_dt = event_date.replace(hour=event_time[0], minute=event_time[1])
    start_dt = event_date.replace(hour=start_time[0], minute=start_time[1])
    end_dt = event_date.replace(hour=end_time[0], minute=end_time[1])
    return event_dt, start_dt, end_dt, window_id


def measure_payload(name: str, value: Any) -> dict[str, Any]:
    asset_class, maturity, unit = classify_measure(name)
    return {
        "raw_measure_id": name,
        "raw_measure_name": name,
        "value": json_value(value),
        "unit": unit,
        "asset_class": asset_class,
        "maturity": maturity,
        "factor_name": "one_month_ois_surprise_proxy" if name == "OIS_1M" else None,
    }


def build_event_record(
    *, dataset_id: str, event_id: str, parent_event_id: str, local_dt: datetime,
    event_type: str, event_subtype: str, speaker: str | None, policy_decision: bool,
    speech: bool, window_id: str, window_start: datetime, window_end: datetime,
    primary_value: Any, additional_measures: list[dict[str, Any]], source_sheet: str,
    source_row: int, source_dataset_version: str, controls: dict[str, Any] | None = None,
) -> dict[str, Any]:
    time = timestamp_fields(local_dt)
    return {
        "event_id": event_id,
        "parent_event_id": parent_event_id,
        "window_measure_id": f"{event_id}:OIS_1M",
        "dataset_id": dataset_id,
        "event_date": local_dt.date().isoformat(),
        **time,
        "event_type": event_type,
        "event_subtype": event_subtype,
        "speaker": speaker,
        "policy_decision_event": policy_decision,
        "speech_event": speech,
        "window_id": window_id,
        "window_start": timestamp_fields(window_start)["event_timestamp"],
        "window_end": timestamp_fields(window_end)["event_timestamp"],
        "raw_measure_id": "OIS_1M",
        "raw_measure_name": "1 month OIS rate change in the relevant window",
        "value": json_value(primary_value),
        "unit": "basis_points",
        "asset_class": "overnight_index_swap",
        "maturity": "1M",
        "factor_name": "one_month_ois_surprise_proxy",
        "official_sign": "positive_means_OIS_rate_increase",
        "canonical_sign": "positive_means_monetary_tightening_proxy",
        "sign_multiplier": 1,
        "additional_measures": additional_measures,
        "controls": controls or {},
        "source_sheet": source_sheet,
        "source_row": source_row,
        "source_dataset_version": source_dataset_version,
    }


def workbook_rows(ws):
    headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    last_col = max(index for index, value in enumerate(headers, start=1) if value is not None)
    headers = [str(value) for value in headers[:last_col]]
    for row_index, values in enumerate(ws.iter_rows(min_row=2, max_col=last_col, values_only=True), start=2):
        if values[0] is None:
            continue
        yield row_index, dict(zip(headers, values))


def build_canonical_events(paths: dict[str, Path]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    records: list[dict[str, Any]] = []
    dataset_counts = Counter()
    event_type_counts = Counter()

    mpd = load_workbook(paths["ea_mpd"], read_only=True, data_only=True)
    sheet_map = {
        "Press Release Window": ("decision", "press_release"),
        "Press Conference Window": ("press_conference", "press_conference"),
        "Monetary Event Window": ("combined_monetary_event", "combined"),
    }
    for sheet_name, (event_type, subtype) in sheet_map.items():
        for row_index, row in workbook_rows(mpd[sheet_name]):
            event_date = parse_excel_date(row["date"])
            local_dt, window_start, window_end, window_id = schedule_for_mpd(event_date, subtype)
            slug = event_date.date().isoformat()
            event_id = f"ea_mpd:{slug}:{subtype}"
            measures = [measure_payload(name, value) for name, value in row.items() if name not in {"date", "OIS_1M"} and value is not None]
            records.append(build_event_record(
                dataset_id="ea_mpd", event_id=event_id, parent_event_id=f"ecb_gc:{slug}", local_dt=local_dt,
                event_type=event_type, event_subtype=subtype, speaker=None, policy_decision=True, speech=False,
                window_id=window_id, window_start=window_start, window_end=window_end,
                primary_value=row.get("OIS_1M"), additional_measures=measures, source_sheet=sheet_name,
                source_row=row_index, source_dataset_version="2025-11-04",
            ))
            dataset_counts["ea_mpd"] += 1
            event_type_counts[f"ea_mpd:{subtype}"] += 1

    empd = load_workbook(paths["ea_empd"], read_only=True, data_only=True)
    type_map = {
        "GC_ME": ("combined_monetary_event", "combined", True, False),
        "GC_PR": ("decision", "press_release", True, False),
        "GC_PC": ("press_conference", "press_conference", True, False),
        "EB": ("speech", "executive_board_speech", False, True),
        "P": ("speech", "president_speech", False, True),
    }
    control_fields = {"ECB_database", "Non_regular_trading_day", "Outside_regular_trading_hours", "Days_until_next_GC"}
    metadata_fields = {"Date_time", "Event_type", "Speaker", "Title", *control_fields}
    for row_index, row in workbook_rows(empd["EA-EMPD"]):
        local_dt = parse_excel_date(row["Date_time"])
        source_type = str(row["Event_type"])
        event_type, subtype, policy_decision, speech = type_map[source_type]
        if speech:
            window_start = local_dt - timedelta(minutes=20)
            window_end = local_dt + timedelta(minutes=50)
            window_id = "speech_window_20_to_10_pre_10_to_20_post_assuming_30m_speech"
            parent = f"ea_empd_speech:{local_dt.isoformat()}:{row_index}"
        else:
            _, window_start, window_end, window_id = schedule_for_mpd(local_dt, subtype)
            parent = f"ecb_gc:{local_dt.date().isoformat()}"
        event_id = f"ea_empd:{local_dt.isoformat()}:{source_type}:{row_index}"
        measures = [measure_payload(name, value) for name, value in row.items() if name not in metadata_fields | {"OIS_1M"} and value is not None]
        controls = {field: json_value(row.get(field)) for field in control_fields}
        controls["title"] = row.get("Title")
        controls["official_event_type"] = source_type
        records.append(build_event_record(
            dataset_id="ea_empd", event_id=event_id, parent_event_id=parent, local_dt=local_dt,
            event_type=event_type, event_subtype=subtype, speaker=row.get("Speaker"),
            policy_decision=policy_decision, speech=speech, window_id=window_id,
            window_start=window_start, window_end=window_end, primary_value=row.get("OIS_1M"),
            additional_measures=measures, source_sheet="EA-EMPD", source_row=row_index,
            source_dataset_version="2026-06-10", controls=controls,
        ))
        dataset_counts["ea_empd"] += 1
        event_type_counts[f"ea_empd:{source_type}"] += 1

    records.sort(key=lambda item: (item["original_local_timestamp"], item["dataset_id"], item["event_id"]))
    metadata = {
        "record_count": len(records),
        "dataset_counts": dict(dataset_counts),
        "event_type_counts": dict(event_type_counts),
        "measure_observation_count": sum(1 + len(item["additional_measures"]) for item in records),
    }
    return records, metadata


def build_overlap(events: list[dict[str, Any]]) -> dict[str, Any]:
    subtype_to_empd = {"press_release": "press_release", "press_conference": "press_conference", "combined": "combined"}
    mpd = {(event["event_date"], event["event_subtype"]): event for event in events if event["dataset_id"] == "ea_mpd"}
    empd = {(event["event_date"], event["event_subtype"]): event for event in events if event["dataset_id"] == "ea_empd" and event["policy_decision_event"]}
    records = []
    for key in sorted(set(mpd) & set(empd)):
        left, right = mpd[key], empd[key]
        left_value, right_value = left["value"], right["value"]
        equivalent = left_value is not None and right_value is not None and abs(left_value - right_value) <= 1e-8
        records.append({
            "event_date": key[0],
            "event_subtype": subtype_to_empd[key[1]],
            "ea_mpd_event_id": left["event_id"],
            "ea_empd_event_id": right["event_id"],
            "same_underlying_event": True,
            "field_equivalence": "canonical OIS_1M and matching event-window semantics audited",
            "value_equivalence": "within_1e-8" if equivalent else "not_equivalent_or_missing",
            "ea_mpd_ois_1m": left_value,
            "ea_empd_ois_1m": right_value,
            "preferred_source": "ea_mpd_for_official_decision_baseline",
        })
    return {
        "schema_version": "ecb-event-dataset-overlap-registry-v1.6",
        "generated_at": GENERATED_AT,
        "record_count": len(records),
        "same_underlying_event_count": len(records),
        "preferred_source_policy": {
            "official_decisions": "EA-MPD is the baseline source; matching EA-EMPD GC rows are retained for extended-database reproducibility but excluded from baseline aggregation.",
            "speeches": "EA-EMPD is the preferred source.",
            "historical_reproducibility": "Neither dataset is deleted or silently overwritten.",
        },
        "records": records,
    }


def month_range(start: str, end: str) -> list[str]:
    cursor = datetime.strptime(start + "-01", "%Y-%m-%d")
    finish = datetime.strptime(end + "-01", "%Y-%m-%d")
    result = []
    while cursor <= finish:
        result.append(cursor.strftime("%Y-%m"))
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return result


def aggregate_monthly(events: list[dict[str, Any]], checksums: dict[str, str]) -> dict[str, Any]:
    decisions = [event for event in events if event["dataset_id"] == "ea_mpd" and event["event_subtype"] == "combined"]
    speeches = [event for event in events if event["dataset_id"] == "ea_empd" and event["speech_event"]]
    profiles = {
        "official_decisions_only": decisions,
        "speeches_only": speeches,
        "all_policy_events": decisions + speeches,
    }
    records = []
    for profile, profile_events in profiles.items():
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for event in profile_events:
            grouped[event["event_date"][:7]].append(event)
        start = min(grouped)
        end = max(grouped)
        for month in month_range(start, end):
            eligible = grouped.get(month, [])
            values = [event["value"] for event in eligible if event["value"] is not None]
            missing = len(eligible) - len(values)
            if not eligible:
                value = 0
                availability = "valid_no_event"
            elif missing:
                value = None
                availability = "missing_expected_event_observation"
            else:
                value = sum(values)
                availability = "available"
            datasets = sorted({event["dataset_id"] for event in eligible}) or (["ea_mpd"] if profile == "official_decisions_only" else ["ea_empd"] if profile == "speeches_only" else ["ea_mpd", "ea_empd"])
            records.append({
                "shock_series_id": f"ecb_ois_1m_{profile}_monthly_v1",
                "month": month,
                "aggregation_profile": profile,
                "included_event_types": ["combined_monetary_event"] if profile == "official_decisions_only" else ["speech"] if profile == "speeches_only" else ["combined_monetary_event", "speech"],
                "factor_id": "ois_1m_high_frequency_surprise_proxy",
                "event_count": len(eligible),
                "decision_event_count": sum(event["policy_decision_event"] for event in eligible),
                "speech_event_count": sum(event["speech_event"] for event in eligible),
                "observed_event_count": len(values),
                "missing_expected_event_count": missing,
                "value": value,
                "unit": "basis_points",
                "availability_status": availability,
                "source_event_ids": [event["event_id"] for event in eligible],
                "dataset_version": {dataset: "2025-11-04" if dataset == "ea_mpd" else "2026-06-10" for dataset in datasets},
                "dataset_retrieval_date": GENERATED_AT,
                "dataset_checksum": {dataset: checksums[dataset] for dataset in datasets},
                "vintage_status": "latest_retrieved_workbook_vintage",
                "identification_status": "external_innovation_proxy",
                "information_effect_status": "not_addressed",
                "sign_convention": "positive means monetary-policy tightening proxy",
                "sign_multiplier": 1,
                "aggregation_method": "monthly_sum_of_event_surprises",
                "no_look_ahead": True,
            })
    return {
        "schema_version": "ecb-monetary-policy-monthly-series-v1.6",
        "generated_at": GENERATED_AT,
        "aggregation_policy": "monthly_sum_of_event_surprises",
        "zero_policy": "No eligible event in a calendar month is value=0 with event_count=0 and availability_status=valid_no_event.",
        "missing_policy": "A month is missing only when an eligible expected event lacks the registered OIS_1M observation.",
        "record_count": len(records),
        "records": records,
    }


def applicability_registry() -> dict[str, Any]:
    records = []
    euro_members = ["austria", "germany", "slovakia", "slovenia"]
    non_euro = ["czechia", "hungary", "poland", "romania", "serbia"]
    for country in euro_members:
        records.append({"country_id": country, "start_period": "2015-01", "end_period": None, "applicability": "euro_area_common_monetary_policy_exposure", "domestic_shock_wording_allowed": False, "required_wording": "common euro-area monetary-policy innovation proxy", "causal_status": "external_innovation_proxy"})
    records.extend([
        {"country_id": "croatia", "start_period": "2015-01", "end_period": "2022-12", "applicability": "external_ecb_spillover", "domestic_shock_wording_allowed": False, "required_wording": "external ECB monetary-policy innovation spillover", "causal_status": "external_innovation_proxy"},
        {"country_id": "croatia", "start_period": "2023-01", "end_period": None, "applicability": "euro_area_common_monetary_policy_exposure", "domestic_shock_wording_allowed": False, "required_wording": "common euro-area monetary-policy innovation proxy", "causal_status": "external_innovation_proxy"},
    ])
    for country in non_euro:
        records.append({"country_id": country, "start_period": "2015-01", "end_period": None, "applicability": "external_ecb_spillover", "domestic_shock_wording_allowed": False, "required_wording": "external ECB monetary-policy innovation spillover", "causal_status": "external_innovation_proxy"})
    return {"schema_version": "shock-applicability-registry-v1.6", "generated_at": GENERATED_AT, "record_count": len(records), "records": records}


def factor_registry() -> dict[str, Any]:
    method = ASSETS["ea_mpd"]["methodology_url"]
    records = [{
        "factor_id": "ois_1m_high_frequency_surprise_proxy",
        "official_field": "OIS_1M",
        "official_name": "1 month OIS rate change in the relevant window",
        "canonical_name": "one_month_ois_high_frequency_surprise_proxy",
        "window": "decision / press-conference / combined / speech, kept separate by profile",
        "normalization": "official basis-point change; no additional factor rotation",
        "unit": "basis_points",
        "available_start": "1999-01-07",
        "available_end": "2026-03-28",
        "methodology_reference": method,
        "identification_interpretation": "high-frequency surprise proxy, not a pure identified monetary-policy shock",
        "information_effect_risk": "not_addressed",
        "causal_status": "external_innovation_proxy",
        "workbook_presence": "official_field_present",
    }]
    for factor_id, name in [("target", "Target"), ("timing", "Timing"), ("forward_guidance", "Forward Guidance"), ("qe", "QE")]:
        records.append({
            "factor_id": factor_id,
            "official_field": None,
            "official_name": name,
            "canonical_name": name.lower().replace(" ", "_"),
            "window": "defined in methodology; no direct factor column in the acquired workbook",
            "normalization": "not implemented from raw workbook fields",
            "unit": None,
            "available_start": None,
            "available_end": None,
            "methodology_reference": method,
            "identification_interpretation": "methodology-defined factor; current workbook publishes underlying market changes rather than a directly reusable factor series",
            "information_effect_risk": "not_addressed",
            "causal_status": "blocked",
            "workbook_presence": "methodology_defined_not_directly_published_in_current_workbook",
        })
    return {"schema_version": "ecb-policy-factor-registry-v1.6", "generated_at": GENERATED_AT, "record_count": len(records), "records": records}


def information_effect_registry() -> dict[str, Any]:
    records = []
    for profile in ("official_decisions_only", "speeches_only", "all_policy_events"):
        records.append({
            "shock_series_id": f"ecb_ois_1m_{profile}_monthly_v1",
            "information_effect_handling": "not_addressed",
            "evidence": "Acquired workbook reports intraday asset-price changes but does not publish a separately validated policy component and central-bank information component for this canonical series.",
            "maximum_identification_status": "external_innovation_proxy",
            "identified_shock_allowed": False,
        })
    return {"schema_version": "monetary-policy-information-effect-registry-v1.6", "generated_at": GENERATED_AT, "allowed_statuses": ["not_addressed", "partially_addressed", "separated", "not_applicable"], "record_count": len(records), "records": records}


def update_candidate_registry(manifests: dict[str, dict[str, Any]]) -> None:
    path = DRIVER_DIR / "identified_shock_source_candidates.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    for record in payload["records"]:
        key = "ea_mpd" if record["candidate_id"] == "ecb_ea_mpd" else "ea_empd"
        asset = ASSETS[key]
        record["source_url"] = asset["source_url"]
        record["methodology_url"] = asset["methodology_url"]
        record["official_annex_status"] = "acquired_and_schema_audited"
        record["acquisition_status"] = "acquired"
        record["field_audit_status"] = "audited"
        record["checksum"] = manifests[key]["sha256"]
        record["identification_status"] = "external_innovation_proxy"
        record["information_effect_status"] = "not_addressed"
        record["redistribution_status"] = "raw_workbook_excluded_from_public_package"
    payload.update({"schema_version": "identified-shock-source-candidates-v1.6", "generated_at": GENERATED_AT, "boundary": "Official acquisition and schema audit establish provenance, not automatic causal identification."})
    write_json(path, payload)


def update_shock_registry() -> dict[str, Any]:
    path = DRIVER_DIR / "shock_identification_registry.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    records = [item for item in payload["records"] if not item["shock_id"].startswith("ecb_ois_1m_")]
    for profile in ("official_decisions_only", "speeches_only", "all_policy_events"):
        records.append({
            "shock_id": f"ecb_ois_1m_{profile}_monthly_v1",
            "driver_id": "ecb_monetary_policy_event_surprise",
            "transformation": "monthly_sum_of_event_surprises",
            "aggregation_profile": profile,
            "identification_status": "external_innovation_proxy",
            "identification_strategy": "narrow-window OIS change with official event timing, overlap control and pre-registered monthly aggregation",
            "information_effect_status": "not_addressed",
            "causal_use_allowed": False,
            "boundary": "Official high-frequency surprise proxy; central-bank information effects are not separated, so it is not an identified monetary-policy shock.",
        })
    payload.update({
        "schema_version": "shock-identification-registry-v1.6",
        "generated_at": GENERATED_AT,
        "identified_shock_count": sum(item["identification_status"] == "identified_shock" for item in records),
        "external_innovation_proxy_count": sum(item["identification_status"] == "external_innovation_proxy" for item in records),
        "shock_candidate_count": sum(item["identification_status"] == "shock_candidate" for item in records),
        "record_count": len(records),
        "records": records,
    })
    write_json(path, payload)
    return payload


def update_lp_readiness() -> dict[str, Any]:
    path = DRIVER_DIR / "lp_readiness_registry.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    records = [item for item in payload["records"] if "ecb_ois_1m_official_decisions_monthly_v1" not in item["readiness_id"]]
    countries = ["austria", "croatia", "czechia", "germany", "hungary", "poland", "romania", "serbia", "slovakia", "slovenia"]
    outcomes = ["hicp_annual_rate", "industrial_production_index", "unemployment_rate", "long_term_government_yield"]
    non_euro = {"czechia", "hungary", "poland", "romania", "serbia"}
    for country in countries:
        country_outcomes = outcomes + (["bilateral_fx_local_per_eur"] if country in non_euro else [])
        for outcome in country_outcomes:
            start = "2023-01" if country == "croatia" else "2015-01"
            interpretation = "external_ecb_spillover" if country in non_euro else "common_euro_area_policy_innovation_proxy"
            if country == "croatia":
                interpretation = "post_2023_common_euro_area_policy_innovation_proxy"
            records.append({
                "readiness_id": f"lp:ecb_ois_1m_official_decisions_monthly_v1:{outcome}:{country}:h0-24",
                "shock_series": "ecb_ois_1m_official_decisions_monthly_v1",
                "outcome": outcome,
                "country": country,
                "sample_start": start,
                "sample_end": "2025-11",
                "controls": ["pre_registered_lags_of_outcome", "pre_registered_lags_of_shock"],
                "horizon": list(range(25)),
                "shock_scope": "euro_area_common_series",
                "transformation_warmup_periods": [],
                "temporally_or_definition_excluded_periods": [],
                "shock_interpretation": interpretation,
                "identification_status": "external_innovation_proxy",
                "identified_data_ready": True,
                "shock_definition_complete": True,
                "outcome_coverage_complete": None,
                "controls_complete": False,
                "causal_lp_ready": False,
                "method_state": "registry_only",
                "blockers": [
                    "information effect is not addressed",
                    "identification status is external_innovation_proxy rather than identified_shock",
                    "outcome-specific common sample and controls require separate pre-registration validation",
                    "Local Projections estimator is not activated in v1.6",
                ],
            })
    payload.update({
        "schema_version": "lp-readiness-registry-v1.6",
        "generated_at": GENERATED_AT,
        "method_state": "registry_only",
        "causal_lp_ready_count": sum(item.get("causal_lp_ready") is True for item in records),
        "identified_data_ready_count": sum(item.get("identified_data_ready") is True for item in records),
        "record_count": len(records),
        "readiness_unit": "shock series × outcome × country × sample × controls × horizon",
        "records": records,
    })
    write_json(path, payload)
    return payload


def readiness_registry() -> dict[str, Any]:
    gates = [
        ("ea_mpd_acquisition", "passed", "Official workbook acquired, checksum recorded and raw redistribution blocked."),
        ("ea_empd_acquisition", "passed", "Official annex acquired, checksum recorded and methodology URL kept separate."),
        ("shock_field_definitions", "passed_with_limitations", "Raw workbook fields mapped; methodology factors are not silently reconstructed."),
        ("announcement_timestamps", "passed", "Local Frankfurt timestamps, CET/CEST offsets and UTC conversions recorded."),
        ("event_coverage", "passed", "Decision and speech universes, dataset versions and overlap policy recorded."),
        ("monthly_aggregation", "passed", "Decision-only, speech-only and all-event profiles pre-registered; zero and missing are distinct."),
        ("information_effect_handling", "blocked", "Policy and central-bank information components are not separated in the published canonical series."),
        ("euro_area_applicability", "passed", "Euro-area common exposure and Croatia 2023 regime are dated."),
        ("non_euro_spillover_interpretation", "passed", "Non-euro countries are external ECB spillover exposures, never domestic shocks."),
        ("lp_estimator_validation", "blocked", "No series reaches identified_shock; LP remains registry_only."),
    ]
    return {
        "schema_version": "identification-readiness-v1.6",
        "generated_at": GENERATED_AT,
        "target_release": "v1.6",
        "data_layer_complete": True,
        "all_identification_gates_passed": False,
        "all_gates_passed": False,
        "identification_decision": "external_innovation_proxy_only",
        "local_projections_state": "registry_only",
        "record_count": len(gates),
        "records": [{"gate_id": gate_id, "status": status, "evidence": evidence} for gate_id, status, evidence in gates],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="Re-download official ECB assets.")
    args = parser.parse_args()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    paths: dict[str, Path] = {}
    manifests: dict[str, dict[str, Any]] = {}
    schemas: dict[str, dict[str, Any]] = {}
    for dataset_id, asset in ASSETS.items():
        target = CACHE_DIR / asset["file_name"]
        download(asset["source_url"], target, args.refresh)
        paths[dataset_id] = target
        schema = build_workbook_schema(target, dataset_id)
        schemas[dataset_id] = schema
        manifest = {
            "schema_version": f"{dataset_id}-acquisition-manifest-v1.6",
            "dataset_id": dataset_id,
            "dataset_name": asset["dataset_name"],
            "official_publication": asset["official_publication"],
            "official_annex_asset": asset["source_url"],
            "retrieval_date": GENERATED_AT,
            "file_size": target.stat().st_size,
            "sha256": sha256(target),
            "mime_type": mimetypes.guess_type(target.name)[0] or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "workbook_sheets": [{"sheet_name": sheet["sheet_name"], "row_count": sheet["row_count"], "column_count": sheet["column_count"]} for sheet in schema["sheets"]],
            "source_institution": "European Central Bank",
            "methodology_reference": asset["methodology_url"],
            "license_or_reuse_status": "ECB website information may be reused with accurate reproduction, source citation and disclosure of modifications; workbook-specific redistribution permission not independently confirmed.",
            "license_reference": ECB_REUSE_URL,
            "statistics_reuse_reference": ECB_STATS_REUSE_URL,
            "redistribution_status": "raw_workbook_excluded_from_public_package",
            "public_release_contents": "derived machine-readable observations, checksum and official source reference only",
        }
        manifests[dataset_id] = manifest
        write_json(OUT_DIR / f"{dataset_id}_acquisition_manifest.json", manifest)
        write_json(OUT_DIR / f"{dataset_id}_workbook_schema.json", schema)

    write_json(OUT_DIR / "ecb_monetary_event_data_acquisition_manifest.json", {
        "schema_version": "ecb-monetary-event-data-acquisition-manifest-v1.6",
        "generated_at": GENERATED_AT,
        "record_count": len(manifests),
        "records": list(manifests.values()),
        "raw_workbooks_publicly_redistributed": False,
    })

    events, event_metadata = build_canonical_events(paths)
    write_json(OUT_DIR / "monetary_policy_event_observations.json", {
        "schema_version": "monetary-policy-event-observations-v1.6",
        "generated_at": GENERATED_AT,
        "record_granularity": "one event-window record with OIS_1M canonical measure and nested additional official measures",
        "raw_field_names_preserved_in_workbook_schemas": True,
        "timezone_policy": "Frankfurt local time is preserved together with CET/CEST-aware UTC conversion.",
        **event_metadata,
        "records": events,
    }, compact=True)

    overlap = build_overlap(events)
    write_json(OUT_DIR / "ecb_event_dataset_overlap_registry.json", overlap)
    factors = factor_registry()
    write_json(OUT_DIR / "ecb_policy_factor_registry.json", factors)
    information = information_effect_registry()
    write_json(OUT_DIR / "monetary_policy_information_effect_registry.json", information)
    monthly = aggregate_monthly(events, {key: value["sha256"] for key, value in manifests.items()})
    write_json(OUT_DIR / "ecb_monetary_policy_monthly_series.json", monthly, compact=True)
    applicability = applicability_registry()
    write_json(OUT_DIR / "shock_applicability_registry.json", applicability)

    update_candidate_registry(manifests)
    shocks = update_shock_registry()
    lp = update_lp_readiness()
    readiness = readiness_registry()
    write_json(DRIVER_DIR / "v16_identification_readiness.json", readiness)

    print(json.dumps({
        "ea_mpd_sha256": manifests["ea_mpd"]["sha256"],
        "ea_empd_sha256": manifests["ea_empd"]["sha256"],
        "canonical_event_records": event_metadata["record_count"],
        "measure_observations": event_metadata["measure_observation_count"],
        "overlap_records": overlap["record_count"],
        "monthly_records": monthly["record_count"],
        "identified_shock_count": shocks["identified_shock_count"],
        "external_innovation_proxy_count": shocks["external_innovation_proxy_count"],
        "causal_lp_ready_count": lp["causal_lp_ready_count"],
        "lp_method_state": lp["method_state"],
    }, indent=2))


if __name__ == "__main__":
    main()
