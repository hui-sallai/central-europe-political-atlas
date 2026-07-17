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
const { sourceDictionaryRows } = require("../src/lib/sourceDictionary.ts");
const { getV4DataQualitySummary, v4QualityCountrySlugs } = require("../src/lib/v4DataQuality.ts");
const { verifyChinaProject, chinaProjectVerificationLabel } = require("../src/lib/chinaProjectVerification.ts");

const economicIndicatorIdByMetric = {
  population: "population",
  gdp: "gdp_current_eur",
  gdpPerCapita: "gdp_per_capita_eur",
  growth: "real_gdp_growth",
  inflation: "hicp_inflation",
  unemployment: "unemployment_rate",
};

const categoryLabels = {
  macro: "基础宏观",
  fiscal: "财政",
  external: "外部经济",
  investment: "投资",
  energy: "能源",
  industry: "产业",
};

const computedIndicatorIds = new Set(["trade_balance", "automotive_export_share"]);
const v4ExtendedIndicatorIds = new Set(v4TemplateIndicatorIds);

function sourceReliabilityLevel(indicator) {
  return indicator.sourcePriority.some((source) => /Eurostat|统计|央行|IMF|OECD|UNCTAD|World Bank|欧盟/i.test(source)) ? "A" : "B";
}

function countryCoverage(indicator) {
  return v4ExtendedIndicatorIds.has(indicator.indicatorId) ? "V4 四国" : "十国";
}

function yearCoverage(indicator) {
  return v4ExtendedIndicatorIds.has(indicator.indicatorId) ? "2021-2025" : "2021-2025";
}

function sourceIdFromText(value) {
  const text = (value ?? "").toLowerCase();

  if (!text) return "pending_sources";
  if (text.includes("eurostat")) return "eurostat";
  if (text.includes("statistics") || text.includes("statistical") || text.includes("gus") || text.includes("ksh") || text.includes("czso") || text.includes("统计")) return "national_statistics";
  if (text.includes("central bank") || text.includes("bank polski") || text.includes("央行")) return "national_central_banks";
  if (text.includes("oecd") || text.includes("imf") || text.includes("world bank") || text.includes("unctad")) return "international_organizations";
  if (text.includes("europa.eu") || text.includes("european commission") || text.includes("欧盟")) return "eu_institutions";
  if (text.includes("government") || text.includes("ministry") || text.includes("kormany") || text.includes("政府")) return "official_government";
  if (text.includes("reuters") || text.includes("apnews") || text.includes("associated press")) return "mainstream_wire";
  if (text.includes("sample") || text.includes("结构样例")) return "sample_sources";

  return "manual_sources";
}

function sourceIdForChinaProject(project) {
  const text = `${project.sourceUrl} ${project.sourceReliabilityLevel}`.toLowerCase();

  if (text.includes("reuters") || text.includes("apnews")) return "mainstream_wire";
  if (text.includes("europa.eu")) return "eu_institutions";
  if (text.includes("gov") || text.includes("bbrailway")) return "official_government";
  if (text.includes("catl") || text.includes("changhong") || text.includes("inobat") || text.includes("jtfg") || text.includes("crexpress")) return "company_announcements";
  if (project.sourceReliabilityLevel === "A") return "official_government";
  if (project.sourceReliabilityLevel === "B") return "mainstream_wire";
  if (project.sourceReliabilityLevel === "C") return "industry_sites";

  return "pending_sources";
}

function sourceRecordForId(sourceId) {
  return sourceDictionaryRows.find((source) => source.sourceId === sourceId);
}

function sourceStatusLabel(sourceId) {
  const sourceStatus = sourceRecordForId(sourceId)?.sourceStatus ?? "pending";
  const labels = {
    official: "官方",
    manual: "人工整理",
    pending: "待接入",
    sample: "结构样例",
  };

  return labels[sourceStatus] ?? "待接入";
}

function valueStatusLabel(status, value, isCalculated) {
  if (status === "sample") return "结构样例";
  if (value === null || value === undefined || status === "pending") return "待接入";
  if (isCalculated) return "计算值";
  if (status === "manual") return "人工整理";
  if (status === "official") return "正式数据";

  return "不进入分析";
}

function calculationMethodForIndicator(indicatorId) {
  if (indicatorId === "trade_balance") {
    return "出口 - 进口";
  }

  if (indicatorId === "automotive_export_share") {
    return "NACE C29 机动车、挂车和半挂车制造业出口 / 全部 NACE 出口";
  }

  return "无";
}

function standardObservationRecord({
  observationId,
  countryId,
  indicatorId,
  year,
  value,
  unit,
  sourceId,
  sourceName,
  sourceUrl,
  status,
  lastUpdated,
  notes,
  dataset,
}) {
  const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
  const source = sourceRecordForId(sourceId);
  const isCalculated = computedIndicatorIds.has(indicatorId) && value !== null && value !== undefined;
  const valueStatus = valueStatusLabel(status, value, isCalculated);
  const isPending = valueStatus === "待接入";
  const isStructuralSample = valueStatus === "结构样例";
  const isV4Extended = dataset === "v4_extended";
  const comparisonEligible = Boolean(value !== null && value !== undefined && !isStructuralSample);
  const v4DerivedEligible = Boolean(isV4Extended && comparisonEligible && indicator?.includedInDerivedComparison);
  const noteText = notes?.trim() || "无";

  return {
    observation_id: observationId,
    country_id: countryId,
    indicator_id: indicatorId,
    year,
    period_type: "annual",
    period: year,
    value,
    unit,
    value_status: valueStatus,
    source_id: sourceId,
    source_name: sourceName || source?.nameZh || "待接入",
    source_url: sourceUrl || source?.url || "",
    source_reliability: source?.reliabilityLevel ?? "D",
    source_status: sourceStatusLabel(sourceId),
    last_updated: lastUpdated || generatedAt,
    is_official_data: valueStatus === "正式数据",
    is_pending: isPending,
    is_calculated: valueStatus === "计算值",
    is_manual: valueStatus === "人工整理",
    is_structural_sample: isStructuralSample,
    is_in_cross_country_comparison: comparisonEligible && (dataset === "macro_time_series" || Boolean(indicator?.includedInDerivedComparison)),
    is_in_five_year_change: comparisonEligible && (dataset === "macro_time_series" || Boolean(indicator?.includedInDerivedComparison)),
    is_in_mean_gap: v4DerivedEligible,
    is_in_ranking_change: v4DerivedEligible,
    missing_reason: isPending ? noteText || "数值待接入" : "无",
    calculation_method: valueStatus === "计算值" ? calculationMethodForIndicator(indicatorId) : "无",
    notes: noteText,
  };
}

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
        const rawValue = row[metric.id];
        const value = metric.id === "population" && rawValue !== null ? rawValue * 1_000_000 : rawValue;
        const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
        const sourceLinks = getEconomicMetricSourceLinks(countrySlug, metric.id, row.year, value);
        const sourceName = sourceLinks.map((item) => item.label).join(" / ") || row.source;
        const metricNote = metric.id === "population" ? "年初人口；单位已按指标字典转换为人。" : metric.note;

        return standardObservationRecord({
          observationId: `macro:${countrySlug}:${indicatorId}:${row.year}`,
          countryId: countrySlug,
          indicatorId,
          year: row.year,
          value,
          unit: indicator?.unit ?? metric.unit,
          sourceId: sourceIdFromText(sourceName),
          sourceName,
          sourceUrl: sourceLinks[0]?.url ?? "",
          status: value === null ? "pending" : "official",
          lastUpdated: indicator?.updatedAt ?? generatedAt,
          notes: `${metricNote} 数据来源：${row.source}`,
          dataset: "macro_time_series",
        });
      }),
    ),
  );
}

function extendedObservationRecords() {
  return extendedObservations.map((observation) => standardObservationRecord({
    observationId: `v4:${observation.countrySlug}:${observation.indicatorId}:${observation.date}`,
    countryId: observation.countrySlug,
    indicatorId: observation.indicatorId,
    year: observation.date,
    value: observation.value,
    unit: observation.unit,
    sourceId: sourceIdFromText(`${observation.sourceName} ${observation.sourceUrl}`),
    sourceName: observation.sourceName,
    sourceUrl: observation.sourceUrl,
    status: observation.status,
    lastUpdated: observation.updatedAt,
    notes: observation.note ?? "",
    dataset: "v4_extended",
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
const indicatorRecords = indicatorDictionaryRecords.map((indicator) => {
  const isComputed = computedIndicatorIds.has(indicator.indicatorId);
  const entersV4Comparisons = indicator.includedInDerivedComparison;

  return {
    indicator_id: indicator.indicatorId,
    name_zh: indicator.nameZh,
    name_en: indicator.nameEn,
    indicator_category: indicator.category,
    section: categoryLabels[indicator.category] ?? indicator.category,
    unit: indicator.unit,
    frequency: indicator.frequency,
    country_coverage: countryCoverage(indicator),
    year_coverage: yearCoverage(indicator),
    primary_source: indicator.sourcePriority[0] ?? "待接入",
    backup_source: indicator.sourcePriority.slice(1).join(" / ") || "待接入",
    source_reliability_level: sourceReliabilityLevel(indicator),
    is_raw_value: !isComputed,
    is_computed_value: isComputed,
    is_derived_value: false,
    included_in_cross_country_comparison: entersV4Comparisons,
    included_in_five_year_change: entersV4Comparisons,
    included_in_mean_gap: entersV4Comparisons,
    included_in_rank_change: entersV4Comparisons,
    future_model_candidate: indicator.futureModelEligible,
    upward_meaning: indicator.upwardMeaning,
    missing_value_treatment: indicator.missingValueTreatment,
    pending_value_treatment: "待接入行保留指标单位，数值显示待接入，状态与来源状态均显示待接入。",
    updated_at: indicator.updatedAt,
    note: `转换方式：${indicator.transform}；当前仅作为研究数据结构字段，不代表模型已启用。`,
  };
});
const observationRecords = [...economicObservationRecords(), ...extendedObservationRecords()];
const sourceRecords = sourceDictionaryRows.map((source) => ({
  source_id: source.sourceId,
  name_zh: source.nameZh,
  name_en: source.nameEn,
  source_type: source.sourceType,
  coverage: source.coverage,
  indicator_coverage: source.indicatorCoverage,
  url: source.url,
  reliability_level: source.reliabilityLevel,
  source_status: source.sourceStatus,
  update_frequency: source.updateFrequency,
  can_be_official_data: source.canBeOfficialData,
  can_be_event_basis: source.canBeEventBasis,
  supplemental_only: source.supplementalOnly,
  excluded_from_analysis: source.excludedFromAnalysis,
  last_checked_at: source.lastCheckedAt,
  note: source.note,
}));
const chinaProjectExportRecords = chinaProjectRecords.map((project) => {
  const verification = verifyChinaProject(project);
  const sourceId = sourceIdForChinaProject(project);
  const sourceReliability = sourceDictionaryRows.find((source) => source.sourceId === sourceId)?.reliabilityLevel ?? project.sourceReliabilityLevel;

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
    source_id: sourceId,
    source_url: project.sourceUrl,
    source_reliability_level: sourceReliability,
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
  scope: "10 countries x 6 macro indicators x 2021-2025 plus 4 V4 countries x 12 extended indicators x 2021-2025 = 540 annual observations.",
  primary_key: "observation_id",
  relation_note: "Every observation references country_id, indicator_id, and source_id.",
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
