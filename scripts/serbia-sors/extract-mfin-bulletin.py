"""Transcribe Table 1 ("Основни индикатори макроекономских и фискалних кретања", pages 12-14) of the Serbian
Ministry of Finance public finance bulletin (Билтен јавних финансија) into a raw extract, exactly as printed.

Owner approval 2026-11-15 (decision D): one reading of the named bulletin file on www.mfin.gov.rs, manual
reading only. The PDF itself stays in the uncommitted local-evidence/ folder; only its SHA-256 and the printed
rows are committed. Nothing is fetched here.

Usage: python3 -I scripts/serbia-sors/extract-mfin-bulletin.py <bulletin.pdf> <out.json>
Requires pypdf.
"""
import hashlib
import json
import re
import sys

import pypdf

PAGES = (11, 12, 13)  # zero-based: printed pages 12-14
ROWS = {
    "gdp_current_bn_rsd": r"^БДП, текуће цене, млрд динара",
    "current_account_mn_eur": r"^Салдо текућих трансакција \(BPM6\)",
    "current_account_pct_gdp": r"^Салдо текућих трансакција, % БДП \(BPM6\)",
    "consolidated_revenue_mn_rsd": r"^Консолидовани јавни приходи, мил\. динара",
    "consolidated_expenditure_mn_rsd": r"^Консолидовани јавни расходи, мил\. динара",
    "consolidated_balance_mn_rsd": r"^Консолидовани дефицит/суфицит, мил\. динара",
    "consolidated_balance_pct_gdp": r"^Консолидовани дефицит/суфицит, % БДП",
    "public_debt_central_mn_rsd": r"^Јавни дуг, крај периода,( у)? мил\. дин",
    "public_debt_central_pct_gdp": r"^Јавни дуг, крај периода, % БДП",
}
TOKEN = re.compile(r"-?[\d.,]+¹?|-(?=\s|$)")


def main(pdf_path, out_path):
    raw = open(pdf_path, "rb").read()
    reader = pypdf.PdfReader(pdf_path)
    rows = {key: {} for key in ROWS}
    for index in PAGES:
        lines = [re.sub(r"\s+", " ", line).strip() for line in reader.pages[index].extract_text(extraction_mode="layout").split("\n")]
        years = next(line.split() for line in lines if re.fullmatch(r"(\d{4} )+\d{4}", line))
        for key, pattern in ROWS.items():
            line = next((line for line in lines if re.match(pattern, line)), None)
            if line is None:
                raise SystemExit(f"page {index + 1}: row {key} not found")
            tokens = TOKEN.findall(re.sub(pattern, "", line))[-len(years):]
            if len(tokens) != len(years):
                raise SystemExit(f"page {index + 1}: row {key} has {len(tokens)} values for {len(years)} years")
            for year, token in zip(years, tokens):
                rows[key][year] = token  # as printed (separators vary in the source; parsed by the build script)
    extract = {
        "schema_version": "mfin-bulletin-extract-v1",
        "source_institution": "Ministry of Finance of the Republic of Serbia (Министарство финансија)",
        "publication": "Билтен јавних финансија, август 2026 (Public finance bulletin, August 2026)",
        "page_url": "https://www.mfin.gov.rs/aktivnosti/bilten-javnih-finansija-za-mesec-avgust-2026",
        "file_url": "https://www.mfin.gov.rs/upload/media/PAHLnH_6af1772bd0b57.pdf",
        "file_sha256": hashlib.sha256(raw).hexdigest(),
        "retrieved_on": "2026-11-15",
        "table": "Табела 1. Основни индикатори макроекономских и фискалних кретања (printed pages 12-14)",
        "table_notes_as_printed": {
            "balance_of_payments": "Нова методологија платног биланса од 2007. године (BPM6); source of balance-of-payments rows: NBS.",
            "fiscal": "GFS-1986 методологија.",
            "gdp_2026": "2026 GDP is marked with a footnote (¹) in the source: not an outturn.",
        },
        "rows": rows,
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(extract, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps({"file_sha256": extract["file_sha256"], "rows": {k: len(v) for k, v in rows.items()}}))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
