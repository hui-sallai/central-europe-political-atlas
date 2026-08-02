import hungaryBoundaryValidation from "../../public/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json";

export type RegionDataStatus = "正式数据" | "待核验" | "待接入" | "结构样例" | "pilot_pending_region_code_match";
export type RegionSourceStatus = "官方来源" | "人工整理" | "待接入" | "结构样例";

export type RegionMetadataRecord = {
  region_id: string;
  country_id: string;
  region_name_zh: string;
  region_name_en: string;
  region_name_local: string;
  admin_level: "ADM1" | "ADM2" | "NUTS1" | "NUTS2" | "NUTS3" | "COUNTRY";
  admin_code: string;
  parent_region_id: string;
  capital_or_main_city: string;
  region_type: string;
  is_v4_region: boolean;
  is_boundary_available: boolean;
  is_statistical_data_available: boolean;
  is_election_data_available: boolean;
  is_china_project_mapped: boolean;
  validation_manifest_file: string;
  manifest_status: string;
  expected_region_count: number;
  feature_count: number;
  nuts_code_count: number;
  region_id_candidate_count: number;
  detail_record_count: number;
  matched_region_count: number;
  unmatched_region_count: number;
  duplicate_region_id_count: number;
  duplicate_nuts_code_count: number;
  missing_geometry_count: number;
  manifest_detail_validation_status: string;
  region_id_final_matched: boolean;
  region_id_match_evidence_status: string;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
  data_status: RegionDataStatus;
  source_status: RegionSourceStatus;
  last_updated: string;
  notes: string;
};

const updatedAt = "2026-08-02";

const hungaryNuts3CandidateCodes = new Map([
  ["hungary_budapest", "HU110"],
  ["hungary_pest", "HU120"],
  ["hungary_fejer", "HU211"],
  ["hungary_komarom_esztergom", "HU212"],
  ["hungary_veszprem", "HU213"],
  ["hungary_gyor_moson_sopron", "HU221"],
  ["hungary_vas", "HU222"],
  ["hungary_zala", "HU223"],
  ["hungary_baranya", "HU231"],
  ["hungary_somogy", "HU232"],
  ["hungary_tolna", "HU233"],
  ["hungary_borsod_abauj_zemplen", "HU311"],
  ["hungary_heves", "HU312"],
  ["hungary_nograd", "HU313"],
  ["hungary_hajdu_bihar", "HU321"],
  ["hungary_jasz_nagykun_szolnok", "HU322"],
  ["hungary_szabolcs_szatmar_bereg", "HU323"],
  ["hungary_bacs_kiskun", "HU331"],
  ["hungary_bekes", "HU332"],
  ["hungary_csongrad_csanad", "HU333"],
]);

const v4RegionDefaults = {
  admin_level: "ADM1" as const,
  parent_region_id: "",
  is_v4_region: true,
  is_boundary_available: false,
  is_statistical_data_available: false,
  is_election_data_available: false,
  is_china_project_mapped: false,
  validation_manifest_file: "",
  manifest_status: "not_started",
  expected_region_count: 0,
  feature_count: 0,
  nuts_code_count: 0,
  region_id_candidate_count: 0,
  detail_record_count: 0,
  matched_region_count: 0,
  unmatched_region_count: 0,
  duplicate_region_id_count: 0,
  duplicate_nuts_code_count: 0,
  missing_geometry_count: 0,
  manifest_detail_validation_status: "not_started",
  region_id_final_matched: false,
  region_id_match_evidence_status: "not_started",
  public_display_ready: false,
  is_ready_for_display: false,
  data_status: "待核验" as const,
  source_status: "人工整理" as const,
  last_updated: updatedAt,
  notes: "v0.9 区域主键层第一版；仅建立 ADM1 元数据和稳定 region_id。真实边界、区域统计、区域选举和对华项目坐标尚未接入。",
};

const nonV4RegionDefaults = {
  region_name_zh: "国家级区域待接入",
  region_name_en: "National-level regions pending",
  region_name_local: "Pending",
  admin_level: "COUNTRY" as const,
  admin_code: "PENDING",
  parent_region_id: "",
  capital_or_main_city: "待接入",
  region_type: "country-level placeholder",
  is_v4_region: false,
  is_boundary_available: false,
  is_statistical_data_available: false,
  is_election_data_available: false,
  is_china_project_mapped: false,
  validation_manifest_file: "",
  manifest_status: "not_applicable",
  expected_region_count: 0,
  feature_count: 0,
  nuts_code_count: 0,
  region_id_candidate_count: 0,
  detail_record_count: 0,
  matched_region_count: 0,
  unmatched_region_count: 0,
  duplicate_region_id_count: 0,
  duplicate_nuts_code_count: 0,
  missing_geometry_count: 0,
  manifest_detail_validation_status: "not_applicable",
  region_id_final_matched: false,
  region_id_match_evidence_status: "not_applicable",
  public_display_ready: false,
  is_ready_for_display: false,
  data_status: "待接入" as const,
  source_status: "待接入" as const,
  last_updated: updatedAt,
  notes: "非 V4 国家在 v0.9 第一版只保留国家级待接入占位；不建立 ADM1/ADM2 区域表，不进入区域横向比较。",
};

function v4Region(record: Omit<RegionMetadataRecord, keyof typeof v4RegionDefaults>): RegionMetadataRecord {
  const isHungaryPilot = record.country_id === "hungary";

  return {
    region_id: record.region_id,
    country_id: record.country_id,
    region_name_zh: record.region_name_zh,
    region_name_en: record.region_name_en,
    region_name_local: record.region_name_local,
    admin_level: isHungaryPilot ? "NUTS3" : v4RegionDefaults.admin_level,
    admin_code: isHungaryPilot ? hungaryNuts3CandidateCodes.get(record.region_id) ?? record.admin_code : record.admin_code,
    parent_region_id: v4RegionDefaults.parent_region_id,
    capital_or_main_city: record.capital_or_main_city,
    region_type: record.region_type,
    is_v4_region: v4RegionDefaults.is_v4_region,
    is_boundary_available: v4RegionDefaults.is_boundary_available,
    is_statistical_data_available: v4RegionDefaults.is_statistical_data_available,
    is_election_data_available: v4RegionDefaults.is_election_data_available,
    is_china_project_mapped: v4RegionDefaults.is_china_project_mapped,
    validation_manifest_file: isHungaryPilot ? hungaryBoundaryValidation.validation_file : v4RegionDefaults.validation_manifest_file,
    manifest_status: isHungaryPilot ? hungaryBoundaryValidation.manifest_status : v4RegionDefaults.manifest_status,
    expected_region_count: isHungaryPilot ? hungaryBoundaryValidation.expected_region_count : v4RegionDefaults.expected_region_count,
    feature_count: isHungaryPilot ? hungaryBoundaryValidation.feature_count : v4RegionDefaults.feature_count,
    nuts_code_count: isHungaryPilot ? hungaryBoundaryValidation.nuts_code_count : v4RegionDefaults.nuts_code_count,
    region_id_candidate_count: isHungaryPilot ? hungaryBoundaryValidation.region_id_candidate_count : v4RegionDefaults.region_id_candidate_count,
    detail_record_count: isHungaryPilot ? hungaryBoundaryValidation.detail_record_count : v4RegionDefaults.detail_record_count,
    matched_region_count: isHungaryPilot ? hungaryBoundaryValidation.matched_region_count : v4RegionDefaults.matched_region_count,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    missing_geometry_count: isHungaryPilot ? hungaryBoundaryValidation.missing_geometry_count : v4RegionDefaults.missing_geometry_count,
    manifest_detail_validation_status: isHungaryPilot
      ? hungaryBoundaryValidation.manifest_detail_validation_status
      : v4RegionDefaults.manifest_detail_validation_status,
    region_id_final_matched: false,
    region_id_match_evidence_status: isHungaryPilot
      ? "precheck_20_of_20_pending_final_review"
      : v4RegionDefaults.region_id_match_evidence_status,
    public_display_ready: false,
    is_ready_for_display: false,
    data_status: isHungaryPilot ? "pilot_pending_region_code_match" : v4RegionDefaults.data_status,
    source_status: v4RegionDefaults.source_status,
    last_updated: v4RegionDefaults.last_updated,
    notes: isHungaryPilot
      ? "v0.18 Hungary NUTS3 validation manifest 明细核验结果已记录；20 条明细具备 NUTS code、region_id candidate、地区名和几何存在性，最终主键、许可与权威拓扑仍待核验。真实地图展示未启用。"
      : v4RegionDefaults.notes,
  };
}

function nonV4Placeholder(countryId: string): RegionMetadataRecord {
  return {
    region_id: `${countryId}_national_pending`,
    country_id: countryId,
    region_name_zh: nonV4RegionDefaults.region_name_zh,
    region_name_en: nonV4RegionDefaults.region_name_en,
    region_name_local: nonV4RegionDefaults.region_name_local,
    admin_level: nonV4RegionDefaults.admin_level,
    admin_code: nonV4RegionDefaults.admin_code,
    parent_region_id: nonV4RegionDefaults.parent_region_id,
    capital_or_main_city: nonV4RegionDefaults.capital_or_main_city,
    region_type: nonV4RegionDefaults.region_type,
    is_v4_region: nonV4RegionDefaults.is_v4_region,
    is_boundary_available: nonV4RegionDefaults.is_boundary_available,
    is_statistical_data_available: nonV4RegionDefaults.is_statistical_data_available,
    is_election_data_available: nonV4RegionDefaults.is_election_data_available,
    is_china_project_mapped: nonV4RegionDefaults.is_china_project_mapped,
    validation_manifest_file: nonV4RegionDefaults.validation_manifest_file,
    manifest_status: nonV4RegionDefaults.manifest_status,
    expected_region_count: nonV4RegionDefaults.expected_region_count,
    feature_count: nonV4RegionDefaults.feature_count,
    nuts_code_count: nonV4RegionDefaults.nuts_code_count,
    region_id_candidate_count: nonV4RegionDefaults.region_id_candidate_count,
    detail_record_count: nonV4RegionDefaults.detail_record_count,
    matched_region_count: nonV4RegionDefaults.matched_region_count,
    unmatched_region_count: nonV4RegionDefaults.unmatched_region_count,
    duplicate_region_id_count: nonV4RegionDefaults.duplicate_region_id_count,
    duplicate_nuts_code_count: nonV4RegionDefaults.duplicate_nuts_code_count,
    missing_geometry_count: nonV4RegionDefaults.missing_geometry_count,
    manifest_detail_validation_status: nonV4RegionDefaults.manifest_detail_validation_status,
    region_id_final_matched: nonV4RegionDefaults.region_id_final_matched,
    region_id_match_evidence_status: nonV4RegionDefaults.region_id_match_evidence_status,
    public_display_ready: nonV4RegionDefaults.public_display_ready,
    is_ready_for_display: nonV4RegionDefaults.is_ready_for_display,
    data_status: nonV4RegionDefaults.data_status,
    source_status: nonV4RegionDefaults.source_status,
    last_updated: nonV4RegionDefaults.last_updated,
    notes: nonV4RegionDefaults.notes,
  };
}

export const regionMetadataRecords: RegionMetadataRecord[] = [
  v4Region({ region_id: "poland_lower_silesian", country_id: "poland", region_name_zh: "下西里西亚省", region_name_en: "Lower Silesian Voivodeship", region_name_local: "Wojewodztwo dolnoslaskie", admin_code: "PL-02", capital_or_main_city: "Wroclaw", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_kuyavian_pomeranian", country_id: "poland", region_name_zh: "库亚维-滨海省", region_name_en: "Kuyavian-Pomeranian Voivodeship", region_name_local: "Wojewodztwo kujawsko-pomorskie", admin_code: "PL-04", capital_or_main_city: "Bydgoszcz / Torun", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_lublin", country_id: "poland", region_name_zh: "卢布林省", region_name_en: "Lublin Voivodeship", region_name_local: "Wojewodztwo lubelskie", admin_code: "PL-06", capital_or_main_city: "Lublin", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_lubusz", country_id: "poland", region_name_zh: "卢布斯卡省", region_name_en: "Lubusz Voivodeship", region_name_local: "Wojewodztwo lubuskie", admin_code: "PL-08", capital_or_main_city: "Gorzow Wielkopolski / Zielona Gora", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_lodz", country_id: "poland", region_name_zh: "罗兹省", region_name_en: "Lodz Voivodeship", region_name_local: "Wojewodztwo lodzkie", admin_code: "PL-10", capital_or_main_city: "Lodz", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_lesser_poland", country_id: "poland", region_name_zh: "小波兰省", region_name_en: "Lesser Poland Voivodeship", region_name_local: "Wojewodztwo malopolskie", admin_code: "PL-12", capital_or_main_city: "Krakow", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_masovian", country_id: "poland", region_name_zh: "马佐夫舍省", region_name_en: "Masovian Voivodeship", region_name_local: "Wojewodztwo mazowieckie", admin_code: "PL-14", capital_or_main_city: "Warsaw", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_opole", country_id: "poland", region_name_zh: "奥波莱省", region_name_en: "Opole Voivodeship", region_name_local: "Wojewodztwo opolskie", admin_code: "PL-16", capital_or_main_city: "Opole", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_subcarpathian", country_id: "poland", region_name_zh: "喀尔巴阡山省", region_name_en: "Subcarpathian Voivodeship", region_name_local: "Wojewodztwo podkarpackie", admin_code: "PL-18", capital_or_main_city: "Rzeszow", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_podlaskie", country_id: "poland", region_name_zh: "波德拉谢省", region_name_en: "Podlaskie Voivodeship", region_name_local: "Wojewodztwo podlaskie", admin_code: "PL-20", capital_or_main_city: "Bialystok", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_pomeranian", country_id: "poland", region_name_zh: "滨海省", region_name_en: "Pomeranian Voivodeship", region_name_local: "Wojewodztwo pomorskie", admin_code: "PL-22", capital_or_main_city: "Gdansk", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_silesian", country_id: "poland", region_name_zh: "西里西亚省", region_name_en: "Silesian Voivodeship", region_name_local: "Wojewodztwo slaskie", admin_code: "PL-24", capital_or_main_city: "Katowice", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_swietokrzyskie", country_id: "poland", region_name_zh: "圣十字省", region_name_en: "Swietokrzyskie Voivodeship", region_name_local: "Wojewodztwo swietokrzyskie", admin_code: "PL-26", capital_or_main_city: "Kielce", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_warmian_masurian", country_id: "poland", region_name_zh: "瓦尔米亚-马祖里省", region_name_en: "Warmian-Masurian Voivodeship", region_name_local: "Wojewodztwo warminsko-mazurskie", admin_code: "PL-28", capital_or_main_city: "Olsztyn", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_greater_poland", country_id: "poland", region_name_zh: "大波兰省", region_name_en: "Greater Poland Voivodeship", region_name_local: "Wojewodztwo wielkopolskie", admin_code: "PL-30", capital_or_main_city: "Poznan", region_type: "voivodeship" }),
  v4Region({ region_id: "poland_west_pomeranian", country_id: "poland", region_name_zh: "西滨海省", region_name_en: "West Pomeranian Voivodeship", region_name_local: "Wojewodztwo zachodniopomorskie", admin_code: "PL-32", capital_or_main_city: "Szczecin", region_type: "voivodeship" }),

  v4Region({ region_id: "hungary_budapest", country_id: "hungary", region_name_zh: "布达佩斯", region_name_en: "Budapest", region_name_local: "Budapest", admin_code: "HU-BU", capital_or_main_city: "Budapest", region_type: "capital / county-equivalent" }),
  v4Region({ region_id: "hungary_bacs_kiskun", country_id: "hungary", region_name_zh: "巴奇-基什孔州", region_name_en: "Bacs-Kiskun County", region_name_local: "Bacs-Kiskun varmegye", admin_code: "HU-BK", capital_or_main_city: "Kecskemet", region_type: "county" }),
  v4Region({ region_id: "hungary_baranya", country_id: "hungary", region_name_zh: "巴兰尼亚州", region_name_en: "Baranya County", region_name_local: "Baranya varmegye", admin_code: "HU-BA", capital_or_main_city: "Pecs", region_type: "county" }),
  v4Region({ region_id: "hungary_bekes", country_id: "hungary", region_name_zh: "贝凯什州", region_name_en: "Bekes County", region_name_local: "Bekes varmegye", admin_code: "HU-BE", capital_or_main_city: "Bekescsaba", region_type: "county" }),
  v4Region({ region_id: "hungary_borsod_abauj_zemplen", country_id: "hungary", region_name_zh: "包尔绍德-奥包乌伊-曾普伦州", region_name_en: "Borsod-Abauj-Zemplen County", region_name_local: "Borsod-Abauj-Zemplen varmegye", admin_code: "HU-BZ", capital_or_main_city: "Miskolc", region_type: "county" }),
  v4Region({ region_id: "hungary_csongrad_csanad", country_id: "hungary", region_name_zh: "琼格拉德-乔纳德州", region_name_en: "Csongrad-Csanad County", region_name_local: "Csongrad-Csanad varmegye", admin_code: "HU-CS", capital_or_main_city: "Szeged", region_type: "county" }),
  v4Region({ region_id: "hungary_fejer", country_id: "hungary", region_name_zh: "费耶尔州", region_name_en: "Fejer County", region_name_local: "Fejer varmegye", admin_code: "HU-FE", capital_or_main_city: "Szekesfehervar", region_type: "county" }),
  v4Region({ region_id: "hungary_gyor_moson_sopron", country_id: "hungary", region_name_zh: "杰尔-莫松-肖普朗州", region_name_en: "Gyor-Moson-Sopron County", region_name_local: "Gyor-Moson-Sopron varmegye", admin_code: "HU-GS", capital_or_main_city: "Gyor", region_type: "county" }),
  v4Region({ region_id: "hungary_hajdu_bihar", country_id: "hungary", region_name_zh: "豪伊杜-比豪尔州", region_name_en: "Hajdu-Bihar County", region_name_local: "Hajdu-Bihar varmegye", admin_code: "HU-HB", capital_or_main_city: "Debrecen", region_type: "county" }),
  v4Region({ region_id: "hungary_heves", country_id: "hungary", region_name_zh: "赫维什州", region_name_en: "Heves County", region_name_local: "Heves varmegye", admin_code: "HU-HE", capital_or_main_city: "Eger", region_type: "county" }),
  v4Region({ region_id: "hungary_jasz_nagykun_szolnok", country_id: "hungary", region_name_zh: "亚斯-瑙吉孔-索尔诺克州", region_name_en: "Jasz-Nagykun-Szolnok County", region_name_local: "Jasz-Nagykun-Szolnok varmegye", admin_code: "HU-JN", capital_or_main_city: "Szolnok", region_type: "county" }),
  v4Region({ region_id: "hungary_komarom_esztergom", country_id: "hungary", region_name_zh: "科马罗姆-埃斯泰尔戈姆州", region_name_en: "Komarom-Esztergom County", region_name_local: "Komarom-Esztergom varmegye", admin_code: "HU-KE", capital_or_main_city: "Tatabanya", region_type: "county" }),
  v4Region({ region_id: "hungary_nograd", country_id: "hungary", region_name_zh: "诺格拉德州", region_name_en: "Nograd County", region_name_local: "Nograd varmegye", admin_code: "HU-NO", capital_or_main_city: "Salgotarjan", region_type: "county" }),
  v4Region({ region_id: "hungary_pest", country_id: "hungary", region_name_zh: "佩斯州", region_name_en: "Pest County", region_name_local: "Pest varmegye", admin_code: "HU-PE", capital_or_main_city: "Budapest", region_type: "county" }),
  v4Region({ region_id: "hungary_somogy", country_id: "hungary", region_name_zh: "绍莫吉州", region_name_en: "Somogy County", region_name_local: "Somogy varmegye", admin_code: "HU-SO", capital_or_main_city: "Kaposvar", region_type: "county" }),
  v4Region({ region_id: "hungary_szabolcs_szatmar_bereg", country_id: "hungary", region_name_zh: "索博尔奇-索特马尔-贝拉格州", region_name_en: "Szabolcs-Szatmar-Bereg County", region_name_local: "Szabolcs-Szatmar-Bereg varmegye", admin_code: "HU-SZ", capital_or_main_city: "Nyiregyhaza", region_type: "county" }),
  v4Region({ region_id: "hungary_tolna", country_id: "hungary", region_name_zh: "托尔瑙州", region_name_en: "Tolna County", region_name_local: "Tolna varmegye", admin_code: "HU-TO", capital_or_main_city: "Szekszard", region_type: "county" }),
  v4Region({ region_id: "hungary_vas", country_id: "hungary", region_name_zh: "沃什州", region_name_en: "Vas County", region_name_local: "Vas varmegye", admin_code: "HU-VA", capital_or_main_city: "Szombathely", region_type: "county" }),
  v4Region({ region_id: "hungary_veszprem", country_id: "hungary", region_name_zh: "维斯普雷姆州", region_name_en: "Veszprem County", region_name_local: "Veszprem varmegye", admin_code: "HU-VE", capital_or_main_city: "Veszprem", region_type: "county" }),
  v4Region({ region_id: "hungary_zala", country_id: "hungary", region_name_zh: "佐洛州", region_name_en: "Zala County", region_name_local: "Zala varmegye", admin_code: "HU-ZA", capital_or_main_city: "Zalaegerszeg", region_type: "county" }),

  v4Region({ region_id: "czechia_prague", country_id: "czechia", region_name_zh: "布拉格", region_name_en: "Prague", region_name_local: "Praha", admin_code: "CZ-10", capital_or_main_city: "Prague", region_type: "capital city / region" }),
  v4Region({ region_id: "czechia_central_bohemian", country_id: "czechia", region_name_zh: "中波希米亚州", region_name_en: "Central Bohemian Region", region_name_local: "Stredocesky kraj", admin_code: "CZ-20", capital_or_main_city: "Prague", region_type: "region" }),
  v4Region({ region_id: "czechia_south_bohemian", country_id: "czechia", region_name_zh: "南波希米亚州", region_name_en: "South Bohemian Region", region_name_local: "Jihocesky kraj", admin_code: "CZ-31", capital_or_main_city: "Ceske Budejovice", region_type: "region" }),
  v4Region({ region_id: "czechia_plzen", country_id: "czechia", region_name_zh: "比尔森州", region_name_en: "Plzen Region", region_name_local: "Plzensky kraj", admin_code: "CZ-32", capital_or_main_city: "Plzen", region_type: "region" }),
  v4Region({ region_id: "czechia_karlovy_vary", country_id: "czechia", region_name_zh: "卡罗维发利州", region_name_en: "Karlovy Vary Region", region_name_local: "Karlovarsky kraj", admin_code: "CZ-41", capital_or_main_city: "Karlovy Vary", region_type: "region" }),
  v4Region({ region_id: "czechia_usti", country_id: "czechia", region_name_zh: "乌斯季州", region_name_en: "Usti nad Labem Region", region_name_local: "Ustecky kraj", admin_code: "CZ-42", capital_or_main_city: "Usti nad Labem", region_type: "region" }),
  v4Region({ region_id: "czechia_liberec", country_id: "czechia", region_name_zh: "利贝雷茨州", region_name_en: "Liberec Region", region_name_local: "Liberecky kraj", admin_code: "CZ-51", capital_or_main_city: "Liberec", region_type: "region" }),
  v4Region({ region_id: "czechia_hradec_kralove", country_id: "czechia", region_name_zh: "赫拉德茨-克拉洛韦州", region_name_en: "Hradec Kralove Region", region_name_local: "Kralovehradecky kraj", admin_code: "CZ-52", capital_or_main_city: "Hradec Kralove", region_type: "region" }),
  v4Region({ region_id: "czechia_pardubice", country_id: "czechia", region_name_zh: "帕尔杜比采州", region_name_en: "Pardubice Region", region_name_local: "Pardubicky kraj", admin_code: "CZ-53", capital_or_main_city: "Pardubice", region_type: "region" }),
  v4Region({ region_id: "czechia_vysocina", country_id: "czechia", region_name_zh: "维索基纳州", region_name_en: "Vysocina Region", region_name_local: "Kraj Vysocina", admin_code: "CZ-63", capital_or_main_city: "Jihlava", region_type: "region" }),
  v4Region({ region_id: "czechia_south_moravian", country_id: "czechia", region_name_zh: "南摩拉维亚州", region_name_en: "South Moravian Region", region_name_local: "Jihomoravsky kraj", admin_code: "CZ-64", capital_or_main_city: "Brno", region_type: "region" }),
  v4Region({ region_id: "czechia_olomouc", country_id: "czechia", region_name_zh: "奥洛穆茨州", region_name_en: "Olomouc Region", region_name_local: "Olomoucky kraj", admin_code: "CZ-71", capital_or_main_city: "Olomouc", region_type: "region" }),
  v4Region({ region_id: "czechia_zlin", country_id: "czechia", region_name_zh: "兹林州", region_name_en: "Zlin Region", region_name_local: "Zlinsky kraj", admin_code: "CZ-72", capital_or_main_city: "Zlin", region_type: "region" }),
  v4Region({ region_id: "czechia_moravian_silesian", country_id: "czechia", region_name_zh: "摩拉维亚-西里西亚州", region_name_en: "Moravian-Silesian Region", region_name_local: "Moravskoslezsky kraj", admin_code: "CZ-80", capital_or_main_city: "Ostrava", region_type: "region" }),

  v4Region({ region_id: "slovakia_bratislava", country_id: "slovakia", region_name_zh: "布拉迪斯拉发州", region_name_en: "Bratislava Region", region_name_local: "Bratislavsky kraj", admin_code: "SK-BL", capital_or_main_city: "Bratislava", region_type: "region" }),
  v4Region({ region_id: "slovakia_trnava", country_id: "slovakia", region_name_zh: "特尔纳瓦州", region_name_en: "Trnava Region", region_name_local: "Trnavsky kraj", admin_code: "SK-TA", capital_or_main_city: "Trnava", region_type: "region" }),
  v4Region({ region_id: "slovakia_trencin", country_id: "slovakia", region_name_zh: "特伦钦州", region_name_en: "Trencin Region", region_name_local: "Trenciansky kraj", admin_code: "SK-TC", capital_or_main_city: "Trencin", region_type: "region" }),
  v4Region({ region_id: "slovakia_nitra", country_id: "slovakia", region_name_zh: "尼特拉州", region_name_en: "Nitra Region", region_name_local: "Nitriansky kraj", admin_code: "SK-NI", capital_or_main_city: "Nitra", region_type: "region" }),
  v4Region({ region_id: "slovakia_zilina", country_id: "slovakia", region_name_zh: "日利纳州", region_name_en: "Zilina Region", region_name_local: "Zilinsky kraj", admin_code: "SK-ZI", capital_or_main_city: "Zilina", region_type: "region" }),
  v4Region({ region_id: "slovakia_banska_bystrica", country_id: "slovakia", region_name_zh: "班斯卡-比斯特里察州", region_name_en: "Banska Bystrica Region", region_name_local: "Banskobystricky kraj", admin_code: "SK-BC", capital_or_main_city: "Banska Bystrica", region_type: "region" }),
  v4Region({ region_id: "slovakia_presov", country_id: "slovakia", region_name_zh: "普雷绍夫州", region_name_en: "Presov Region", region_name_local: "Presovsky kraj", admin_code: "SK-PV", capital_or_main_city: "Presov", region_type: "region" }),
  v4Region({ region_id: "slovakia_kosice", country_id: "slovakia", region_name_zh: "科希策州", region_name_en: "Kosice Region", region_name_local: "Kosicky kraj", admin_code: "SK-KI", capital_or_main_city: "Kosice", region_type: "region" }),

  nonV4Placeholder("germany"),
  nonV4Placeholder("romania"),
  nonV4Placeholder("slovenia"),
  nonV4Placeholder("serbia"),
  nonV4Placeholder("austria"),
  nonV4Placeholder("croatia"),
];
