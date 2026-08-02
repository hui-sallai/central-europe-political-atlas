export const giscoLicenseVerificationDecision = {
  boundary_source_name: "Eurostat GISCO NUTS 2024",
  boundary_file: "hu_nuts3_gisco_2024.geojson",
  original_candidate_file: "NUTS_RG_01M_2024_4326_LEVL_3.geojson",
  license_source: "European Commission / Eurostat GISCO geodata and NUTS usage conditions",
  license_url: "https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics",
  attribution_required: true,
  attribution_text: "Source: European Commission – Eurostat/GISCO; administrative boundaries: © EuroGeographics.",
  license_review_status: "verified_for_public_research_display",
  license_checked: true,
  license_review_date: "2026-08-02",
  license_decision_note:
    "Eurostat GISCO statistical-units terms permit non-commercial use when the source and © EuroGeographics boundary attribution are visible. This decision is limited to public non-commercial research display; commercial use requires separate EuroGeographics clearance. Authoritative topology validation remains pending.",
} as const;

export const pendingGiscoLicenseReview = {
  license_review_status: "pending_official_terms_review",
  license_checked: false,
  license_review_date: "",
  license_decision_note: "待选定具体文件并确认其适用官方条款后复核。",
} as const;
