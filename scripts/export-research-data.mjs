import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(projectRoot, "public", "research-data");
const generatedAt = "2026-07-17";
const schemaVersion = "research-data-v0.1";

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { countryMetadataRecords, researchDataLayerFiles } = require("../src/lib/countryMetadata.ts");
const {
  chinaProjectRecords,
  extendedObservations,
  v4TemplateIndicatorIds,
  getExtendedIndicator,
  getExtendedObservations,
  getLatestExtendedObservation,
} = require("../src/lib/extendedData.ts");
const {
  economicMetricOptions,
  economicTimeSeriesByCountry,
  getEconomicMetricSourceLinks,
} = require("../src/lib/economicTimeSeries.ts");
const { indicatorDictionaryRecords } = require("../src/lib/indicatorDictionary.ts");
const { getV4DataQualitySummary, v4QualityCountrySlugs } = require("../src/lib/v4DataQuality.ts");
const { verifyChinaProject, chinaProjectVerificationLabel } = require("../src/lib/chinaProjectVerification.ts");

const economicIndicatorIdByMetric = {
  population: "population_million",
  gdp: "gdp_nominal_mio_eur",
  gdpPerCapita: "gdp_per_capita_eur",
  growth: "real_gdp_growth",
  inflation: "hicp_inflation",
  unemployment: "unemployment_rate",
};

function envelope(dataType, records, extra = {}) {
  return {
    schema_version: schemaVersion,
    generated_at: generatedAt,
    data_type: dataType,
    record_count: Array.isArray(records) ? records.length : undefined,
    ...extra,
    records,
  };
}

function writeJson(fileName, payload) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function csvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(fileName, records) {
  fs.mkdirSync(outDir, { recursive: true });
  const headers = Array.from(records.reduce((set, record) => {
    Object.keys(record).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const lines = [
    headers.join(","),
    ...records.map((record) => headers.map((header) => csvValue(record[header])).join(",")),
  ];
  fs.writeFileSync(path.join(outDir, fileName), `${lines.join("\n")}\n`, "utf8");
}

function writeLayer(id, records, extra = {}) {
  writeJson(`${id}.json`, envelope(id, records, extra));
  writeCsv(`${id}.csv`, records);
}

function economicObservationRecords() {
  return Object.entries(economicTimeSeriesByCountry).flatMap(([countrySlug, rows]) =>
    rows.flatMap((row) =>
      economicMetricOptions.map((metric) => {
        const indicatorId = economicIndicatorIdByMetric[metric.id];
        const value = row[metric.id];
        const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
        const sourceLinks = getEconomicMetricSourceLinks(countrySlug, metric.id, row.year, value);

        return {
          observation_id: `macro:${countrySlug}:${indicatorId}:${row.year}`,
          dataset: "macro_time_series",
          country_slug: countrySlug,
          region_slug: null,
          indicator_id: indicatorId,
          date: row.year,
          frequency: "annual",
          value,
          unit: metric.unit,
          source_name: sourceLinks.map((item) => item.label).join(" / ") || row.source,
          source_url: sourceLinks[0]?.url ?? "",
          source_links: sourceLinks,
          status: value === null ? "pending" : "official",
          source_status: value === null ? "pending" : "official",
          updated_at: indicator?.updatedAt ?? generatedAt,
          note: `${metric.note} 数据来源：${row.source}`,
        };
      }),
    ),
  );
}

function extendedObservationRecords() {
  return extendedObservations.map((observation) => ({
    observation_id: `v4:${observation.countrySlug}:${observation.indicatorId}:${observation.date}`,
    dataset: "v4_extended",
    country_slug: observation.countrySlug,
    region_slug: null,
    indicator_id: observation.indicatorId,
    date: observation.date,
    frequency: "annual",
    value: observation.value,
    unit: observation.unit,
    source_name: observation.sourceName,
    source_url: observation.sourceUrl,
    source_links: [{ label: observation.sourceName, url: observation.sourceUrl, note: observation.note ?? "" }],
    status: observation.status,
    source_status: observation.status === "official" ? "official" : observation.status === "sample" ? "sample" : observation.status === "pending" ? "pending" : "manual",
    updated_at: observation.updatedAt,
    note: observation.note ?? "",
  }));
}

function rankMap(values) {
  const sorted = values
    .filter((item) => item.value !== null)
    .sort((a, b) => b.value - a.value);
  const ranks = new Map();

  sorted.forEach((item, index) => {
    const previous = sorted[index - 1];
    ranks.set(item.country_slug, previous && previous.value === item.value ? ranks.get(previous.country_slug) ?? index + 1 : index + 1);
  });

  return ranks;
}

function formatLatestObservation(countrySlug, indicatorId) {
  const observation = getLatestExtendedObservation(countrySlug, indicatorId);
  return observation
    ? {
        country_slug: countrySlug,
        date: observation.date,
        value: observation.value,
        status: observation.status,
        source_url: observation.sourceUrl,
      }
    : {
        country_slug: countrySlug,
        date: null,
        value: null,
        status: "pending",
        source_url: "",
      };
}

function derivedMetricRecords() {
  const quality = getV4DataQualitySummary();
  const metricRecords = v4TemplateIndicatorIds.map((indicatorId) => {
    const indicator = getExtendedIndicator(indicatorId);
    const latestValues = v4QualityCountrySlugs.map((countrySlug) => formatLatestObservation(countrySlug, indicatorId));
    const numericLatestValues = latestValues.filter((item) => item.value !== null);
    const latestMean = numericLatestValues.length > 0 ? numericLatestValues.reduce((sum, item) => sum + item.value, 0) / numericLatestValues.length : null;
    const highestValue = numericLatestValues.length > 0 ? Math.max(...numericLatestValues.map((item) => item.value)) : null;
    const lowestValue = numericLatestValues.length > 0 ? Math.min(...numericLatestValues.map((item) => item.value)) : null;
    const startValues = v4QualityCountrySlugs.map((countrySlug) => {
      const observation = getExtendedObservations(countrySlug).find((item) => item.indicatorId === indicatorId && item.date === "2021");
      return {
        country_slug: countrySlug,
        value: observation?.value ?? null,
      };
    });
    const startRanks = rankMap(startValues);
    const latestRanks = rankMap(latestValues);

    return {
      derived_metric_id: `v4_latest_comparison:${indicatorId}`,
      scope: "V4",
      indicator_id: indicatorId,
      indicator_name_zh: indicator?.labelZh ?? indicatorId,
      indicator_name_en: indicator?.labelEn ?? indicatorId,
      category: indicator?.category ?? "unknown",
      unit: indicator?.unit ?? "",
      latest_values: latestValues,
      highest_value: highestValue,
      highest_countries: highestValue === null ? [] : numericLatestValues.filter((item) => item.value === highestValue).map((item) => item.country_slug),
      lowest_value: lowestValue,
      lowest_countries: lowestValue === null ? [] : numericLatestValues.filter((item) => item.value === lowestValue).map((item) => item.country_slug),
      v4_mean: latestMean,
      mean_comparison: latestValues.map((item) => ({
        country_slug: item.country_slug,
        value: item.value,
        gap_to_v4_mean: item.value !== null && latestMean !== null ? item.value - latestMean : null,
        position: item.value === null || latestMean === null ? "pending" : item.value > latestMean ? "above_mean" : item.value < latestMean ? "below_mean" : "equal_mean",
      })),
      five_year_change: latestValues.map((item) => {
        const start = startValues.find((startValue) => startValue.country_slug === item.country_slug)?.value ?? null;
        return {
          country_slug: item.country_slug,
          start_year: "2021",
          start_value: start,
          latest_year: item.date,
          latest_value: item.value,
          change: start !== null && item.value !== null ? item.value - start : null,
        };
      }),
      rank_change: latestValues.map((item) => ({
        country_slug: item.country_slug,
        start_rank: startRanks.get(item.country_slug) ?? null,
        latest_rank: latestRanks.get(item.country_slug) ?? null,
        rank_delta: startRanks.has(item.country_slug) && latestRanks.has(item.country_slug) ? startRanks.get(item.country_slug) - latestRanks.get(item.country_slug) : null,
      })),
      model_boundary: "fact_derived_only_not_risk_index",
    };
  });

  return [
    {
      derived_metric_id: "v4_data_quality_summary",
      scope: "V4",
      metric_type: "data_quality",
      model_boundary: "quality_control_only_not_model_output",
      summary: quality.summary,
      by_country: quality.byCountry,
      by_indicator: quality.byIndicator,
    },
    ...metricRecords,
  ];
}

const sourceDictionaryRecords = [
  { source_id: "eurostat", name_zh: "Eurostat", name_en: "Eurostat", source_type: "欧盟官方统计", coverage: "欧盟与欧洲国家", indicator_coverage: "宏观、财政、外部、能源、产业", url: "https://ec.europa.eu/eurostat/databrowser/", reliability_level: "A", source_status: "official", update_frequency: "按数据集更新", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "V4 横向可比数据主来源。" },
  { source_id: "national_statistics", name_zh: "各国统计局", name_en: "National statistical offices", source_type: "官方统计机构", coverage: "十国", indicator_coverage: "人口、国民账户、价格、劳动力、产业", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliability_level: "A", source_status: "official", update_frequency: "按国家发布节奏", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "正式版逐国替换为具体统计局链接。" },
  { source_id: "national_central_banks", name_zh: "各国央行", name_en: "National central banks", source_type: "央行", coverage: "十国", indicator_coverage: "国际收支、FDI、金融与宏观背景", url: "https://www.ecb.europa.eu/", reliability_level: "A", source_status: "official", update_frequency: "按指标更新", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "用于 FDI、经常账户和金融口径交叉核验。" },
  { source_id: "international_organizations", name_zh: "国际组织", name_en: "International organizations", source_type: "国际组织", coverage: "全球 / 欧洲", indicator_coverage: "宏观、投资、能源、贸易补充", url: "https://data.oecd.org/", reliability_level: "A", source_status: "official", update_frequency: "按机构更新", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "用于 OECD、IMF、World Bank、UNCTAD 等补充口径。" },
  { source_id: "eu_institutions", name_zh: "欧盟机构", name_en: "EU institutions", source_type: "欧盟机构", coverage: "欧盟", indicator_coverage: "财政、监管、项目与政策事件", url: "https://european-union.europa.eu/", reliability_level: "A", source_status: "official", update_frequency: "按公告更新", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "用于欧盟委员会、理事会、议会等官方材料。" },
  { source_id: "official_government", name_zh: "官方政府部门", name_en: "Official government departments", source_type: "政府公告", coverage: "十国", indicator_coverage: "政府结构、政策事件、项目公告", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliability_level: "A", source_status: "official", update_frequency: "按公告更新", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "用于国家页和新闻事件库的正式事件依据。" },
  { source_id: "electoral_commissions", name_zh: "选举机构", name_en: "Electoral commissions", source_type: "选举机构", coverage: "十国", indicator_coverage: "选举结果、政党、区域投票", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliability_level: "A", source_status: "pending", update_frequency: "按选举周期", can_be_official_data: true, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "当前区域选举数据待接入，不上真实党派支持率图层。" },
  { source_id: "mainstream_wire", name_zh: "主流通讯社", name_en: "Mainstream news agencies", source_type: "新闻通讯社", coverage: "全球 / 欧洲", indicator_coverage: "新闻事件、项目状态", url: "https://www.reuters.com/", reliability_level: "B", source_status: "manual", update_frequency: "实时 / 日更", can_be_official_data: false, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "可作为事件依据，正式数据仍优先使用 A 级来源。" },
  { source_id: "authoritative_thinktanks", name_zh: "权威智库", name_en: "Authoritative think tanks", source_type: "研究机构", coverage: "欧洲 / 区域", indicator_coverage: "背景解释、专题事件", url: "https://www.bruegel.org/", reliability_level: "B", source_status: "manual", update_frequency: "按报告更新", can_be_official_data: false, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "作为解释材料或事件依据，不能替代官方统计。" },
  { source_id: "official_annual_reports", name_zh: "官方年报", name_en: "Official annual reports", source_type: "年报", coverage: "机构 / 企业 / 政府", indicator_coverage: "项目主体、金额、股权、产能", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliability_level: "B", source_status: "manual", update_frequency: "年度", can_be_official_data: false, can_be_event_basis: true, supplemental_only: false, excluded_from_analysis: false, last_checked_at: generatedAt, note: "项目核验的重要补充来源。" },
  { source_id: "company_announcements", name_zh: "企业公告", name_en: "Company announcements", source_type: "企业公告", coverage: "项目主体", indicator_coverage: "对华项目金额、主体、时间线", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliability_level: "C", source_status: "manual", update_frequency: "按公告更新", can_be_official_data: false, can_be_event_basis: false, supplemental_only: true, excluded_from_analysis: false, last_checked_at: generatedAt, note: "只作补充线索，量化前需与官方或年报交叉核验。" },
  { source_id: "local_media", name_zh: "地方媒体", name_en: "Local media", source_type: "地方媒体", coverage: "国家 / 地方", indicator_coverage: "项目线索、地方事件", url: "https://hui-sallai.github.io/central-europe-political-atlas/news/", reliability_level: "C", source_status: "manual", update_frequency: "不定期", can_be_official_data: false, can_be_event_basis: false, supplemental_only: true, excluded_from_analysis: false, last_checked_at: generatedAt, note: "只作补充线索，不单独进入正式事件库。" },
  { source_id: "industry_sites", name_zh: "行业网站", name_en: "Industry websites", source_type: "行业网站", coverage: "行业 / 企业", indicator_coverage: "产业链、汽车、能源、物流项目", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliability_level: "C", source_status: "manual", update_frequency: "不定期", can_be_official_data: false, can_be_event_basis: false, supplemental_only: true, excluded_from_analysis: false, last_checked_at: generatedAt, note: "只作产业背景和项目线索。" },
  { source_id: "manual_sources", name_zh: "人工整理来源", name_en: "Manually curated sources", source_type: "人工整理", coverage: "平台内部", indicator_coverage: "摘要、翻译、字段整理", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliability_level: "C", source_status: "manual", update_frequency: "随数据维护", can_be_official_data: false, can_be_event_basis: false, supplemental_only: true, excluded_from_analysis: false, last_checked_at: generatedAt, note: "必须回链到原始来源，不能单独作为正式依据。" },
  { source_id: "pending_sources", name_zh: "待接入来源", name_en: "Pending sources", source_type: "待接入", coverage: "待定", indicator_coverage: "缺失字段", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliability_level: "D", source_status: "pending", update_frequency: "待定", can_be_official_data: false, can_be_event_basis: false, supplemental_only: false, excluded_from_analysis: true, last_checked_at: generatedAt, note: "不进入正式数据、事件库或后续分析。" },
  { source_id: "sample_sources", name_zh: "结构样例来源", name_en: "Structural sample sources", source_type: "结构样例", coverage: "平台结构测试", indicator_coverage: "页面结构、地图样例、新闻样例", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliability_level: "D", source_status: "sample", update_frequency: "不更新", can_be_official_data: false, can_be_event_basis: false, supplemental_only: false, excluded_from_analysis: true, last_checked_at: generatedAt, note: "只用于验证结构，不进入模型或分析。" },
];

function dataQualityCheckRecords() {
  return getV4DataQualitySummary().cells.map((cell) => {
    const indicator = getExtendedIndicator(cell.indicatorId);
    const reliabilityLevel = cell.observation?.sourceName?.toLowerCase().includes("eurostat") ? "A" : cell.observation?.sourceName ? "B" : "D";
    const entersDerived = Boolean(indicator?.includedInDerivedComparison && cell.hasValue && !cell.isPending);

    return {
      check_id: `v4_quality:${cell.countrySlug}:${cell.indicatorId}:${cell.year}`,
      country_id: cell.countrySlug,
      indicator_id: cell.indicatorId,
      year: cell.year,
      value: cell.observation?.value ?? null,
      unit: cell.observation?.unit ?? indicator?.unit ?? "",
      status: cell.isPending ? "pending" : cell.observation?.status ?? "pending",
      source_name: cell.observation?.sourceName ?? "待接入",
      source_url: cell.observation?.sourceUrl ?? "",
      source_reliability_level: reliabilityLevel,
      updated_at: cell.observation?.updatedAt ?? "",
      is_official_data: cell.observation?.status === "official" && cell.hasValue,
      is_pending: cell.isPending,
      is_computed: cell.isComputed,
      is_manual: cell.observation?.status === "manual",
      included_in_derived_comparison: entersDerived,
      included_in_five_year_change: entersDerived,
      included_in_mean_gap: entersDerived,
      included_in_rank_change: entersDerived,
      missing_reason: cell.isPending ? cell.issues.join("；") || "数值待接入" : "",
      note: cell.observation?.note ?? "",
    };
  });
}

function derivedComparisonRecords() {
  return derivedMetricRecords()
    .filter((record) => record.indicator_id)
    .map((record) => {
      const biggestGap = record.mean_comparison
        .filter((item) => item.gap_to_v4_mean !== null)
        .sort((a, b) => Math.abs(b.gap_to_v4_mean) - Math.abs(a.gap_to_v4_mean))[0];
      const biggestChange = record.five_year_change
        .filter((item) => item.change !== null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
      const qualityCells = dataQualityCheckRecords().filter((cell) => cell.indicator_id === record.indicator_id);

      return {
        derived_comparison_id: record.derived_metric_id.replace("v4_latest_comparison:", "v4_derived_comparison:"),
        category: record.category,
        indicator_id: record.indicator_id,
        latest_comparable_year: record.latest_values.map((item) => item.date).filter(Boolean).sort().at(-1) ?? "",
        poland_value: record.latest_values.find((item) => item.country_slug === "poland")?.value ?? null,
        hungary_value: record.latest_values.find((item) => item.country_slug === "hungary")?.value ?? null,
        czechia_value: record.latest_values.find((item) => item.country_slug === "czechia")?.value ?? null,
        slovakia_value: record.latest_values.find((item) => item.country_slug === "slovakia")?.value ?? null,
        highest_value: record.highest_value,
        highest_country_ids: record.highest_countries,
        lowest_value: record.lowest_value,
        lowest_country_ids: record.lowest_countries,
        v4_mean: record.v4_mean,
        biggest_mean_gap_country_id: biggestGap?.country_slug ?? "",
        biggest_mean_gap: biggestGap?.gap_to_v4_mean ?? null,
        biggest_five_year_change_country_id: biggestChange?.country_slug ?? "",
        biggest_five_year_change: biggestChange?.change ?? null,
        pending_observation_count: qualityCells.filter((cell) => cell.is_pending).length,
        computed_observation_count: qualityCells.filter((cell) => cell.is_computed).length,
        interpretation_boundary: "仅表示事实位置，不代表风险、预测或政策优劣。",
        note: "派生自 V4 2021-2025 扩展观测值；不输出风险指数。",
      };
    });
}

function methodologyRuleRecords() {
  return [
    { rule_id: "data_status_official", rule_group: "data_status", title: "正式数据", rule: "有明确数值、单位、年份、来源名称、来源链接和更新时间，可作为当前事实展示。" },
    { rule_id: "data_status_manual", rule_group: "data_status", title: "人工整理", rule: "人工从公开材料整理，需保留来源和复核记录；未复核前不作为最终事实口径。" },
    { rule_id: "data_status_pending", rule_group: "data_status", title: "待接入", rule: "字段已预留但可信来源尚未接入，不能被读作已有数据。" },
    { rule_id: "data_status_sample", rule_group: "data_status", title: "结构样例", rule: "只用于验证页面结构，不进入模型或分析。" },
    { rule_id: "derived_boundary", rule_group: "derived_comparisons", title: "派生比较边界", rule: "只保存最高、最低、均值、五年变化、均值差距和排名变化，不生成风险指数或预测。" },
    { rule_id: "china_exposure_boundary", rule_group: "china_exposure_candidates", title: "暴露变量候选库边界", rule: "暴露变量候选库不等于中国经济暴露指数；金额、主体、年份和来源未齐时不得指数化。" },
    { rule_id: "analysis_checklist", rule_group: "analysis", title: "进入后续分析条件", rule: "必须同时具备国家或地区、时间、数值、单位、来源名称、来源链接、来源等级、数据状态，并存在于指标和来源字典中。" },
    { rule_id: "political_review", rule_group: "political_fields", title: "政治人物字段复核", rule: "政府首脑、国家元首、执政结构和党派缩写只有官方来源复核后才能作为正式字段展示。" },
  ];
}

const countryRecords = countryMetadataRecords;
const indicatorRecords = indicatorDictionaryRecords.map((indicator) => ({
  indicator_id: indicator.indicatorId,
  name_zh: indicator.nameZh,
  name_en: indicator.nameEn,
  category: indicator.category,
  unit: indicator.unit,
  frequency: indicator.frequency,
  source_priority: indicator.sourcePriority,
  included_in_derived_comparison: indicator.includedInDerivedComparison,
  future_model_eligible: indicator.futureModelEligible,
  model_use: indicator.modelUse,
  direction_meaning: indicator.directionMeaning,
  upward_meaning: indicator.upwardMeaning,
  missing_value_treatment: indicator.missingValueTreatment,
  transform: indicator.transform,
  updated_at: indicator.updatedAt,
}));
const observationRecords = [...economicObservationRecords(), ...extendedObservationRecords()];
const sourceRecords = sourceDictionaryRecords;
const chinaProjectExportRecords = chinaProjectRecords.map((project) => {
  const verification = verifyChinaProject(project);
  return {
    project_id: project.projectId,
    project_name: project.projectName,
    country_slug: project.countrySlug,
    region_name: project.regionName,
    sector: project.sector,
    chinese_actor: project.chineseActor,
    local_actor: project.localActor,
    amount: project.amount,
    currency: project.currency,
    amount_status: project.amount === null ? "amount_missing" : "amount_available",
    year: project.year,
    project_status: project.projectStatus,
    status_timeline: project.statusTimeline,
    amount_evidence: project.amountEvidence,
    actor_evidence: project.actorEvidence,
    source_url: project.sourceUrl,
    source_reliability_level: project.sourceReliabilityLevel,
    risk_tags: project.riskTags,
    quantification_status: project.quantificationStatus,
    is_quantifiable: verification.conclusion === "quantifiable",
    exposure_variable_fit: project.exposureVariableFit,
    exposure_variable_note: project.exposureVariableNote,
    status: project.status,
    note: project.note,
    verification_conclusion: verification.conclusion,
    verification_label_zh: chinaProjectVerificationLabel(verification.conclusion),
    verification_reason: verification.reason,
    verification_rule: verification.rule,
    verification_checks: {
      has_amount: verification.hasAmount,
      has_actors: verification.hasActors,
      has_year: verification.hasYear,
      has_reliable_source: verification.hasReliableSource,
      has_clear_event: verification.hasClearEvent,
    },
  };
});

const chinaExposureCandidateRecords = chinaProjectExportRecords.map((project) => ({
  candidate_id: `china_exposure:${project.project_id}`,
  project_id: project.project_id,
  country_id: project.country_slug,
  variable_family: project.exposure_variable_fit === "strong_candidate" ? "project_amount_or_capacity" : project.exposure_variable_fit === "partial_candidate" ? "event_or_presence" : "context_only",
  candidate_status: project.verification_conclusion,
  can_enter_future_model: project.verification_conclusion === "quantifiable" || project.verification_conclusion === "partially_quantifiable",
  is_index_output: false,
  amount_available: project.amount !== null,
  amount: project.amount,
  currency: project.currency,
  year: project.year,
  chinese_actor: project.chinese_actor,
  local_actor: project.local_actor,
  source_url: project.source_url,
  source_reliability_level: project.source_reliability_level,
  exposure_variable_fit: project.exposure_variable_fit,
  exposure_variable_note: project.exposure_variable_note,
  verification_reason: project.verification_reason,
  boundary_note: "暴露变量候选库仅保存变量候选，不生成中国经济暴露指数。",
}));

const dataQualityRecords = dataQualityCheckRecords();
const derivedComparisonExportRecords = derivedComparisonRecords();
const methodologyRecords = methodologyRuleRecords();

writeLayer("countries", countryRecords, {
  primary_key: "country_id",
  relation_note: "All observations, projects, derived comparisons, and exposure candidates should reference country_id.",
});
writeLayer("indicators", indicatorRecords, {
  primary_key: "indicator_id",
});
writeLayer("sources", sourceRecords, {
  primary_key: "source_id",
  reliability_levels: {
    A: "Official statistical agencies, central banks, EU institutions, international organizations.",
    B: "Mainstream news agencies, authoritative think tanks, official annual reports.",
    C: "Local media, company announcements, industry websites.",
    D: "Unverified secondary sources, social media, unclear provenance.",
  },
});
writeLayer("observations", observationRecords, {
  note: "Unified research observations. Includes macro_time_series for ten countries and v4_extended observations for V4 countries.",
});
writeLayer("data_quality_checks", dataQualityRecords, {
  scope: "V4 countries x 12 V4 indicators x 2021-2025 = 240 observation positions.",
});
writeLayer("derived_comparisons", derivedComparisonExportRecords, {
  model_boundary: "Fact-derived comparison layer only. No risk score, forecast, scenario, or model output.",
});
writeLayer("china_projects", chinaProjectExportRecords, {
  model_boundary: "Project verification data only. No China exposure index is computed.",
});
writeLayer("china_exposure_candidates", chinaExposureCandidateRecords, {
  model_boundary: "Candidate variable layer only. It is not a China exposure index.",
});
writeLayer("methodology_rules", methodologyRecords, {
  model_boundary: "Rules and boundaries only; no model, forecast, or scenario output.",
});
writeJson("research_data_layers.json", envelope("research_data_layers", researchDataLayerFiles.map((layer) => ({
  ...layer,
  json_file: `${layer.id}.json`,
  csv_file: `${layer.id}.csv`,
}))));
writeJson("derived_metrics.json", envelope("derived_metrics", derivedMetricRecords(), {
  compatibility_note: "Deprecated compatibility alias. Prefer derived_comparisons.json.",
  model_boundary: "Fact-derived comparison layer only. No risk score, forecast, scenario, or model output.",
}));

console.log(`Exported research data JSON to ${path.relative(projectRoot, outDir)}`);
