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

function countryNameForId(countryId) {
  return countryMetadataRecords.find((country) => country.country_id === countryId)?.name_zh ?? countryId;
}

const verificationConclusionLabels = {
  quantifiable: "可量化",
  partially_quantifiable: "部分可量化",
  background_only: "仅作背景",
  excluded: "不进入分析",
};

function amountStatusForProject(project) {
  if (!project.sourceUrl) return "待接入";
  if (project.amount === null) return "金额缺失";
  if (!project.currency) return "金额部分核验";
  if (project.sourceReliabilityLevel === "A") return "金额已核验";
  return "金额部分核验";
}

function exposureVariableFitForProject(project) {
  const text = `${project.sector} ${project.riskTags.join(" ")} ${project.exposureVariableNote}`.toLowerCase();

  if (project.exposureVariableFit === "not_ready") return "不进入暴露变量";
  if (project.exposureVariableFit === "context_only") return "仅背景材料";
  if (/finance|financial|bank|jt|金融|股权|资产|收购/.test(text)) return "金融暴露候选";
  if (/rail|logistics|物流|铁路|转运|通道/.test(text)) return "物流暴露候选";
  if (/battery|ev|auto|automotive|电池|新能源|汽车|供应链|产能/.test(text)) return "供应链暴露候选";
  if (/investment|factory|plant|manufacturing|投资|工厂|制造/.test(text)) return "投资暴露候选";
  if (/presence|entity|company|企业|实体/.test(text)) return "企业存在候选";

  return project.amount !== null ? "投资暴露候选" : "仅背景材料";
}

function exposureDimensionForProject(project) {
  const fit = exposureVariableFitForProject(project);
  const text = `${project.sector} ${project.riskTags.join(" ")} ${project.exposureVariableNote}`.toLowerCase();

  if (fit === "投资暴露候选") return "投资暴露";
  if (fit === "供应链暴露候选") return "供应链暴露";
  if (fit === "物流暴露候选") return "物流暴露";
  if (fit === "金融暴露候选") return "金融暴露";
  if (fit === "企业存在候选") return "企业存在";
  if (/trade|贸易/.test(text)) return "贸易暴露";
  if (/technology|equipment|设备|技术/.test(text)) return "技术/设备暴露";
  if (/subsidy|investigation|tariff|监管|调查|关税|争议/.test(text)) return "政策争议";

  return "仅背景";
}

function candidateVariableTypeForProject(project) {
  if (project.amount !== null) return "金额变量";
  if (/持续|运营|启动|调整|调查|至今/.test(project.year) || project.statusTimeline.length > 0) return "状态变量";
  if (project.chineseActor && project.localActor) return "存在变量";
  if (project.riskTags.length > 0) return "文本标签变量";
  return "不可量化";
}

function quantificationStatusForVerification(conclusion) {
  const labels = {
    quantifiable: "可量化",
    partially_quantifiable: "部分可量化",
    background_only: "暂不可量化",
    excluded: "不适合量化",
  };

  return labels[conclusion] ?? "暂不可量化";
}

function modelReadinessForVerification(conclusion) {
  const labels = {
    quantifiable: "可作为未来模型候选",
    partially_quantifiable: "需补数据后再评估",
    background_only: "仅作背景解释",
    excluded: "不进入模型",
  };

  return labels[conclusion] ?? "需补数据后再评估";
}

function requiredDataForCandidate(project) {
  const base = ["项目名称", "国家", "行业", "中国主体", "当地主体", "年份", "来源链接", "来源等级"];
  const dimension = exposureDimensionForProject(project);

  if (dimension === "物流暴露") return [...base, "年度 TEU 或货运量", "年度货值", "口岸或线路主体"].join("；");
  if (dimension === "供应链暴露") return [...base, "投资金额", "产能", "工厂状态", "股权或合作关系"].join("；");
  if (dimension === "金融暴露") return [...base, "金额", "股比", "治理权", "所有权链条"].join("；");
  if (dimension === "投资暴露") return [...base, "投资金额", "产能或建设阶段"].join("；");

  return [...base, "可量化口径"].join("；");
}

function availableDataForCandidate(project) {
  return [
    "项目名称",
    "国家",
    project.regionName ? "地区/城市" : "",
    project.sector ? "行业" : "",
    project.chineseActor ? "中国主体" : "",
    project.localActor ? "当地主体" : "",
    project.year ? "年份/状态时间" : "",
    project.amount !== null ? "金额" : "",
    project.sourceUrl ? "来源链接" : "",
    project.sourceReliabilityLevel ? "来源等级" : "",
  ].filter(Boolean).join("；");
}

function missingDataForCandidate(project) {
  const missing = [];
  if (project.amount === null) missing.push("金额或年度流量");
  if (project.currency === null) missing.push("币种或金额口径");
  if (/待|缺失|拆分|核验/.test(project.actorEvidence)) missing.push("主体链条复核");
  if (/TEU|货值|产量|产能|股比|治理权|补贴|合同/.test(project.exposureVariableNote)) missing.push("产能/货运量/股权/合同等量化字段");

  return missing.length > 0 ? missing.join("；") : "核心字段已具备，仍需正式分析前复核口径";
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
  return v4QualityCountrySlugs.flatMap((countryId) =>
    v4TemplateIndicatorIds.flatMap((indicatorId) =>
      ["2021", "2022", "2023", "2024", "2025"].map((year) => {
        const observationId = `v4:${countryId}:${indicatorId}:${year}`;
        const observation = observationRecords.find((item) => item.observation_id === observationId);
        const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
        const valuePresent = observation?.value !== null && observation?.value !== undefined;
        const unitPresent = Boolean(observation?.unit);
        const sourceNamePresent = Boolean(observation?.source_name);
        const sourceUrlPresent = Boolean(observation?.source_url);
        const sourceReliabilityPresent = Boolean(observation?.source_reliability);
        const statusPresent = Boolean(observation?.value_status);
        const lastUpdatedPresent = Boolean(observation?.last_updated);
        const sourceReliability = observation?.source_reliability ?? "D";
        const methodologicallyConsistent = Boolean(
          observation &&
          indicator &&
          observation.unit === indicator.unit &&
          sourceReliabilityPresent &&
          (observation.is_calculated ? observation.calculation_method !== "无" : true) &&
          !observation.is_structural_sample,
        );
        const readyForExport = Boolean(
          observation &&
          unitPresent &&
          sourceNamePresent &&
          sourceUrlPresent &&
          sourceReliabilityPresent &&
          statusPresent &&
          lastUpdatedPresent &&
          (valuePresent || observation.is_pending),
        );
        const readyForDerivedComparison = Boolean(observation?.is_in_mean_gap && observation?.is_in_ranking_change && methodologicallyConsistent);
        const readyForFutureModelCandidate = Boolean(
          observation &&
          indicator?.futureModelEligible &&
          !observation.is_pending &&
          !observation.is_structural_sample &&
          (sourceReliability === "A" || sourceReliability === "B") &&
          methodologicallyConsistent,
        );
        const qualityIssues = [
          observation ? "" : "观测记录缺失",
          valuePresent || observation?.is_pending ? "" : "数值缺失但未标记待接入",
          unitPresent ? "" : "单位缺失",
          sourceNamePresent ? "" : "来源名称缺失",
          sourceUrlPresent ? "" : "来源链接缺失",
          sourceReliabilityPresent ? "" : "来源等级缺失",
          statusPresent ? "" : "数据状态缺失",
          lastUpdatedPresent ? "" : "更新时间缺失",
          methodologicallyConsistent ? "" : "方法或单位需复核",
        ].filter(Boolean);
        const qualityStatus =
          observation?.is_structural_sample || sourceReliability === "D"
            ? "不进入分析"
            : observation?.is_pending
              ? "待接入"
              : qualityIssues.length > 0
                ? "需复核"
                : observation?.is_calculated || observation?.is_manual
                  ? "部分通过"
                  : "通过";

        return {
          check_id: `v4_quality:${countryId}:${indicatorId}:${year}`,
          observation_id: observationId,
          country_id: countryId,
          indicator_id: indicatorId,
          year,
          value_present: valuePresent,
          unit_present: unitPresent,
          source_name_present: sourceNamePresent,
          source_url_present: sourceUrlPresent,
          source_reliability_present: sourceReliabilityPresent,
          status_present: statusPresent,
          last_updated_present: lastUpdatedPresent,
          is_official_data: Boolean(observation?.is_official_data),
          is_pending: Boolean(observation?.is_pending),
          is_calculated: Boolean(observation?.is_calculated),
          is_manual: Boolean(observation?.is_manual),
          is_cross_country_comparable: Boolean(observation?.is_in_cross_country_comparison),
          is_time_series_comparable: Boolean(observation?.is_in_five_year_change),
          is_methodologically_consistent: methodologicallyConsistent,
          is_ready_for_export: readyForExport,
          is_ready_for_derived_comparison: readyForDerivedComparison,
          is_ready_for_future_model_candidate: readyForFutureModelCandidate,
          missing_reason: observation?.is_pending ? observation.missing_reason || "数值待接入" : "无",
          quality_status: qualityStatus,
          quality_notes: qualityIssues.length > 0 ? qualityIssues.join("；") : qualityStatus === "部分通过" ? "计算值或人工整理字段完整，但需保留计算/复核说明。" : "字段完整，可用于导出与事实对照。",
        };
      }),
    ),
  );
}

function derivedComparisonRecords() {
  return derivedMetricRecords()
    .filter((record) => record.indicator_id)
    .map((record) => {
      const valueFor = (countryId) => record.latest_values.find((item) => item.country_slug === countryId)?.value ?? null;
      const gapFor = (countryId) => record.mean_comparison.find((item) => item.country_slug === countryId)?.gap_to_v4_mean ?? null;
      const changeFor = (countryId) => record.five_year_change.find((item) => item.country_slug === countryId)?.change ?? null;
      const rankFor = (countryId) => record.rank_change.find((item) => item.country_slug === countryId)?.latest_rank ?? null;
      const biggestGap = record.mean_comparison
        .filter((item) => item.gap_to_v4_mean !== null)
        .sort((a, b) => Math.abs(b.gap_to_v4_mean) - Math.abs(a.gap_to_v4_mean))[0];
      const biggestChange = record.five_year_change
        .filter((item) => item.change !== null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
      const qualityCells = dataQualityCheckRecords().filter((cell) => cell.indicator_id === record.indicator_id);
      const latestValueCount = record.latest_values.filter((item) => item.value !== null).length;
      const missingObservationCount = qualityCells.filter((cell) => cell.is_pending).length;
      const comparisonStatus =
        qualityCells.some((cell) => cell.quality_status === "不进入分析")
          ? "不进入分析"
          : latestValueCount === 0
            ? "待接入"
            : latestValueCount < 4
              ? "数据不足"
              : missingObservationCount > 0
                ? "部分可比较"
                : "可比较";

      return {
        comparison_id: record.derived_metric_id.replace("v4_latest_comparison:", "v4_derived_comparison:"),
        section: categoryLabels[record.category] ?? record.category,
        indicator_id: record.indicator_id,
        indicator_name: record.indicator_name_zh,
        latest_comparable_year: record.latest_values.map((item) => item.date).filter(Boolean).sort().at(-1) ?? "",
        poland_value: valueFor("poland"),
        hungary_value: valueFor("hungary"),
        czechia_value: valueFor("czechia"),
        slovakia_value: valueFor("slovakia"),
        unit: record.unit,
        highest_value: record.highest_value,
        highest_country: record.highest_countries.join(" / ") || "",
        lowest_value: record.lowest_value,
        lowest_country: record.lowest_countries.join(" / ") || "",
        v4_average: record.v4_mean,
        poland_gap_from_v4_average: gapFor("poland"),
        hungary_gap_from_v4_average: gapFor("hungary"),
        czechia_gap_from_v4_average: gapFor("czechia"),
        slovakia_gap_from_v4_average: gapFor("slovakia"),
        largest_gap_country: biggestGap?.country_slug ?? "",
        largest_gap_value: biggestGap?.gap_to_v4_mean ?? null,
        poland_five_year_change: changeFor("poland"),
        hungary_five_year_change: changeFor("hungary"),
        czechia_five_year_change: changeFor("czechia"),
        slovakia_five_year_change: changeFor("slovakia"),
        largest_five_year_change_country: biggestChange?.country_slug ?? "",
        largest_five_year_change_value: biggestChange?.change ?? null,
        poland_rank: rankFor("poland"),
        hungary_rank: rankFor("hungary"),
        czechia_rank: rankFor("czechia"),
        slovakia_rank: rankFor("slovakia"),
        missing_observation_count: missingObservationCount,
        calculated_value_count: qualityCells.filter((cell) => cell.is_calculated).length,
        comparison_status: comparisonStatus,
        interpretation_boundary: "仅表示事实位置，不代表风险、预测或政策优劣。",
        notes: "派生自 V4 2021-2025 扩展观测值；待接入值不参与最高、最低、均值、差距、变化和排名计算。",
      };
    });
}

function methodologyRuleRecords() {
  return [
    {
      rule_id: "official_observation_entry",
      rule_category: "观测值规则",
      rule_name: "正式数据进入观测值表规则",
      rule_description: "正式观测值必须同时具备国家、指标、年份、数值、单位、来源名称、来源链接、来源等级、数据状态和更新时间。",
      applies_to: "observations",
      required_fields: ["country_id", "indicator_id", "year", "value", "unit", "source_name", "source_url", "source_reliability", "value_status", "last_updated"],
      allowed_statuses: ["正式数据", "计算值", "人工整理"],
      excluded_statuses: ["结构样例", "不进入分析"],
      source_requirement: "A/B 级来源可作为正式观测值依据；C 级仅作补充线索；D 级不得进入正式观测值。",
      quality_requirement: "必须通过 data_quality_checks 中的字段完整性、来源完整性和方法一致性检查。",
      model_boundary: "可作为未来模型候选输入，但不代表模型已启用。",
      export_boundary: "可导出至 observations.json/csv。",
      last_updated: generatedAt,
      notes: "待核验政治样本和结构样例不得伪装为正式观测值。",
    },
    {
      rule_id: "pending_data_retention",
      rule_category: "数据状态规则",
      rule_name: "待接入数据保留但不参与比较规则",
      rule_description: "待接入字段可以保留在表结构中，用于提示缺口，但不得参与横向比较、五年变化、均值差距或排名变化计算。",
      applies_to: "observations,data_quality_checks,derived_comparisons",
      required_fields: ["value_status", "missing_reason", "source_id"],
      allowed_statuses: ["待接入"],
      excluded_statuses: ["正式数据"],
      source_requirement: "待接入来源使用 pending_sources 或明确缺失原因。",
      quality_requirement: "必须标注 is_pending=true，并在缺失原因中说明尚未接入的字段。",
      model_boundary: "不进入模型候选输入。",
      export_boundary: "可导出，但只能作为数据缺口记录。",
      last_updated: generatedAt,
      notes: "待接入不得显示为 0、百分比或事实数值。",
    },
    {
      rule_id: "calculated_value_labeling",
      rule_category: "数据状态规则",
      rule_name: "计算值标注规则",
      rule_description: "由现有观测值计算得到的贸易差额、汽车出口占比等指标必须明确标注为计算值，并保留计算方法。",
      applies_to: "observations,indicators,data_quality_checks",
      required_fields: ["is_calculated", "calculation_method", "unit", "source_url"],
      allowed_statuses: ["计算值"],
      excluded_statuses: ["结构样例"],
      source_requirement: "计算值的输入来源必须可回溯，优先使用 A/B 级来源。",
      quality_requirement: "计算方法不得为“无”；单位必须与指标字典一致。",
      model_boundary: "可作为未来模型候选，但必须在解释层说明为计算值。",
      export_boundary: "可导出，并必须保留 calculation_method。",
      last_updated: generatedAt,
      notes: "计算值不是模型输出，只是事实型转换或派生口径。",
    },
    {
      rule_id: "derived_value_interpretation_boundary",
      rule_category: "派生比较规则",
      rule_name: "派生值解释边界规则",
      rule_description: "派生比较只保存最高值、最低值、V4 均值、均值差距、五年变化和排名变化。",
      applies_to: "derived_comparisons",
      required_fields: ["comparison_id", "indicator_id", "v4_average", "largest_gap_value", "largest_five_year_change_value", "comparison_status", "interpretation_boundary"],
      allowed_statuses: ["可比较", "部分可比较", "数据不足", "待接入"],
      excluded_statuses: ["不进入分析"],
      source_requirement: "必须由 observations 和 data_quality_checks 中的可比观测值派生。",
      quality_requirement: "解释边界必须固定为：仅表示事实位置，不代表风险、预测或政策优劣。",
      model_boundary: "不生成风险指数、不生成预测、不生成政策优劣判断。",
      export_boundary: "可导出至 derived_comparisons.json/csv。",
      last_updated: generatedAt,
      notes: "派生比较表是研究解释材料，不是模型页。",
    },
    {
      rule_id: "source_reliability_abcd",
      rule_category: "可靠性等级规则",
      rule_name: "A/B/C/D 来源可靠性规则",
      rule_description: "A 级为官方统计、官方机构、正式数据库；B 级为权威媒体、智库、企业公告、年报；C 级为地方媒体、行业网站、二级转述；D 级为无法核验、结构样例或占位内容。",
      applies_to: "sources,observations,china_projects,news_events",
      required_fields: ["source_id", "source_reliability", "source_url"],
      allowed_statuses: ["A", "B", "C", "D"],
      excluded_statuses: [],
      source_requirement: "A/B 级可作为正式数据或事件依据；C 级只作补充线索；D 级不进入正式数据、事件库和模型计算。",
      quality_requirement: "每个正式数据点必须有来源等级；缺失来源等级不得通过质量验收。",
      model_boundary: "D 级来源不得进入未来模型候选。",
      export_boundary: "必须在 sources.json/csv 和相关记录中保留 source_reliability。",
      last_updated: generatedAt,
      notes: "来源等级不等于政治立场判断，只表示可核验程度。",
    },
    {
      rule_id: "source_status_levels",
      rule_category: "来源等级规则",
      rule_name: "来源状态等级规则",
      rule_description: "来源状态统一使用官方、人工整理、待接入、结构样例四类，用于区分来源是否可直接支撑正式数据或仅用于结构展示。",
      applies_to: "sources,observations,china_projects,news_events",
      required_fields: ["source_id", "source_status", "source_reliability", "source_url"],
      allowed_statuses: ["官方", "人工整理", "待接入", "结构样例"],
      excluded_statuses: ["未标注来源", "无明确出处"],
      source_requirement: "官方来源可直接作为正式数据候选；人工整理必须回链原始来源；待接入和结构样例不得作为正式依据。",
      quality_requirement: "每条正式记录必须同时有来源状态和可靠性等级。",
      model_boundary: "待接入和结构样例来源不进入未来模型候选。",
      export_boundary: "来源状态必须随 sources.json/csv 和相关数据层导出。",
      last_updated: generatedAt,
      notes: "来源状态解决“来源是否已经接入”的问题，可靠性等级解决“来源可核验程度”的问题。",
    },
    {
      rule_id: "source_dictionary_reference",
      rule_category: "来源字典规则",
      rule_name: "来源字典引用规则",
      rule_description: "所有观测值、项目、新闻事件和候选变量必须通过 source_id 或来源字段回链来源字典。",
      applies_to: "sources,observations,china_projects,china_exposure_candidates,news_events",
      required_fields: ["source_id", "source_name", "source_url", "source_reliability"],
      allowed_statuses: ["官方", "人工整理", "待接入", "结构样例"],
      excluded_statuses: [],
      source_requirement: "来源类型、可靠性等级、来源状态、更新频率和使用边界必须在来源字典中存在。",
      quality_requirement: "缺少来源链接或来源等级的记录不得进入正式分析。",
      model_boundary: "来源字典只提供准入边界，不生成模型判断。",
      export_boundary: "可导出至 sources.json/csv。",
      last_updated: generatedAt,
      notes: "人工整理来源必须回链原始资料，不能单独作为正式依据。",
    },
    {
      rule_id: "indicator_dictionary_reference",
      rule_category: "指标字典规则",
      rule_name: "指标字典引用规则",
      rule_description: "所有观测值和派生比较必须通过 indicator_id 引用指标字典，不能在展示层临时发明指标口径。",
      applies_to: "indicators,observations,derived_comparisons,data_quality_checks",
      required_fields: ["indicator_id", "unit", "frequency", "source_priority", "future_model_eligible"],
      allowed_statuses: ["正式数据", "计算值", "待接入"],
      excluded_statuses: ["结构样例"],
      source_requirement: "指标主来源和备用来源必须在指标字典中定义。",
      quality_requirement: "观测值单位必须与指标字典一致。",
      model_boundary: "是否可作为未来模型候选变量只表示资格，不代表模型已启用。",
      export_boundary: "可导出至 indicators.json/csv。",
      last_updated: generatedAt,
      notes: "当前指标字典覆盖 18 个指标。",
    },
    {
      rule_id: "china_project_verification_four_classes",
      rule_category: "项目核验规则",
      rule_name: "对华项目四类核验规则",
      rule_description: "对华项目按可量化、部分可量化、仅作背景、不进入分析四类核验结论管理。",
      applies_to: "china_projects",
      required_fields: ["project_id", "country_id", "chinese_actor", "local_actor", "year", "source_url", "source_reliability", "verification_conclusion"],
      allowed_statuses: ["可量化", "部分可量化", "仅作背景", "不进入分析"],
      excluded_statuses: [],
      source_requirement: "有金额、有主体、有年份、有来源为可量化；无金额但有明确事件和主体为部分可量化；只有新闻线索为仅作背景；无可靠来源为不进入分析。",
      quality_requirement: "必须写明金额证据/缺失原因、主体核验、状态时间线和来源等级。",
      model_boundary: "对华项目核验表不生成中国经济暴露指数。",
      export_boundary: "可导出至 china_projects.json/csv。",
      last_updated: generatedAt,
      notes: "现阶段优先 V4 项目；非 V4 项目继续待接入。",
    },
    {
      rule_id: "china_exposure_candidate_not_index",
      rule_category: "暴露变量候选规则",
      rule_name: "暴露变量候选不等于指数规则",
      rule_description: "暴露变量候选库只判断项目能否作为未来变量，不生成指数、国家排名、风险分数或政策判断。",
      applies_to: "china_exposure_candidates",
      required_fields: ["candidate_id", "project_id", "exposure_dimension", "candidate_variable_type", "quantification_status", "model_readiness", "not_index_score", "interpretation_boundary"],
      allowed_statuses: ["可量化", "部分可量化", "暂不可量化", "不适合量化"],
      excluded_statuses: ["指数分数", "风险分数", "国家排名"],
      source_requirement: "候选变量必须回链到 china_projects 和可核验来源。",
      quality_requirement: "必须列明 required_data、available_data、missing_data 和 model_readiness。",
      model_boundary: "不生成中国经济暴露指数；不输出国家排名；不输出风险分数；不输出政策判断。",
      export_boundary: "可导出至 china_exposure_candidates.json/csv。",
      last_updated: generatedAt,
      notes: "not_index_score 必须为 true。",
    },
    {
      rule_id: "political_person_fields_review",
      rule_category: "政治人物复核规则",
      rule_name: "政治人物字段待核验规则",
      rule_description: "政府首脑、国家元首、执政结构和党派缩写只有官方来源复核后才能作为正式字段展示。",
      applies_to: "countries,country_pages,map_page",
      required_fields: ["head_of_government", "head_of_government_source_status", "head_of_state", "head_of_state_source_status", "political_sample_status"],
      allowed_statuses: ["官方来源", "人工整理", "待核验"],
      excluded_statuses: ["未标注缩写", "裸露党派缩写", "结构样例"],
      source_requirement: "政治人物字段优先使用政府、总统府、议会或官方机构来源。",
      quality_requirement: "未核验前显示待核验；政治样本标注人工整理/不进入模型。",
      model_boundary: "政治人物和政党样本暂不进入当前分析和模型。",
      export_boundary: "可作为 countries 元数据导出，但必须带来源状态。",
      last_updated: generatedAt,
      notes: "首页和地图页不得裸露 KO/TD/NL 等未解释缩写。",
    },
    {
      rule_id: "structural_sample_exclusion",
      rule_category: "不进入模型规则",
      rule_name: "结构样例不进入分析规则",
      rule_description: "结构样例仅用于验证页面结构、地图入口和新闻样式，不进入正式数据、事件库、派生比较或模型候选。",
      applies_to: "map_page,news_page,observations,methodology",
      required_fields: ["data_status", "source_status"],
      allowed_statuses: ["结构样例，不进入模型"],
      excluded_statuses: ["正式数据", "可比较"],
      source_requirement: "结构样例来源等级为 D 或 sample_sources。",
      quality_requirement: "必须明确标注结构样例，不得显示为 0、95%、84% 等事实数值。",
      model_boundary: "不进入任何模型、预测、指数或风险判断。",
      export_boundary: "可导出为结构说明，但不得进入正式观测值比较。",
      last_updated: generatedAt,
      notes: "地图真实行政边界待接入时，只保留工作台入口和结构样例说明。",
    },
    {
      rule_id: "news_current_phase_exclusion",
      rule_category: "不进入模型规则",
      rule_name: "新闻区暂不进入当前阶段规则",
      rule_description: "新闻区当前只作为事件库预留和少量正式事件展示，不进入当前数据比较、模型、预测或指数计算。",
      applies_to: "news_page,news_events",
      required_fields: ["event_id", "date", "country_id", "title", "source_id", "status"],
      allowed_statuses: ["已接入", "暂不评价", "结构样例"],
      excluded_statuses: ["模型输入", "风险分数"],
      source_requirement: "新闻事件至少需要来源名称、来源链接和来源等级；结构样例明确标注不进入模型。",
      quality_requirement: "正式新闻事件和结构样例必须分区展示。",
      model_boundary: "新闻区暂不进入模型阶段。",
      export_boundary: "未来可导出 news_events；当前不作为模型输入。",
      last_updated: generatedAt,
      notes: "每周新闻更新仅限国家级新闻，不自动更新民调等数据。",
    },
    {
      rule_id: "no_model_pages_current_phase",
      rule_category: "不进入模型规则",
      rule_name: "模型页暂不新增规则",
      rule_description: "当前阶段不新增 /models、/forecast、/scenario，不输出财政压力指数、产业依赖指数、中国暴露指数、风险指数或选举预测。",
      applies_to: "site_routes,methodology,data_exports",
      required_fields: ["model_boundary", "export_boundary"],
      allowed_statuses: ["结构准备", "未来模型候选"],
      excluded_statuses: ["模型已启用", "预测已输出", "风险指数"],
      source_requirement: "任何未来模型必须先完成数据字典、来源字典、质量验收和方法论更新。",
      quality_requirement: "现阶段所有导出层只能声明候选资格和解释边界。",
      model_boundary: "不新增模型页，不输出模型结果。",
      export_boundary: "导出文件只提供研究数据结构，不代表模型已经启用。",
      last_updated: generatedAt,
      notes: "这是 v0.8 的硬边界。",
    },
    {
      rule_id: "research_data_export_boundary",
      rule_category: "导出规则",
      rule_name: "研究数据导出边界规则",
      rule_description: "导出层提供 JSON/CSV 研究数据结构，供未来 Python/R/Stata 读取，但不是对外 API，也不是模型输出。",
      applies_to: "countries,indicators,sources,observations,data_quality_checks,derived_comparisons,china_projects,china_exposure_candidates,methodology_rules",
      required_fields: ["schema_version", "generated_at", "data_type", "record_count", "records"],
      allowed_statuses: ["可导出", "待接入", "结构说明"],
      excluded_statuses: ["风险分数", "预测结果"],
      source_requirement: "导出记录必须保留可追溯字段或明确缺失原因。",
      quality_requirement: "导出前必须通过字段结构检查和枚举检查。",
      model_boundary: "导出文件不代表模型已启用。",
      export_boundary: "JSON/CSV 均可公开读取，但需保留数据边界说明。",
      last_updated: generatedAt,
      notes: "当前 9 个逻辑数据层均从导出脚本生成。",
    },
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
  const sourceRecord = sourceRecordForId(sourceId);

  return {
    project_id: project.projectId,
    project_name: project.projectName,
    country_id: project.countrySlug,
    country_name: countryNameForId(project.countrySlug),
    region_or_city: project.regionName,
    sector: project.sector,
    chinese_actor: project.chineseActor,
    local_actor: project.localActor,
    amount_value: project.amount,
    amount_currency: project.currency,
    verification_conclusion: verificationConclusionLabels[verification.conclusion],
    verification_reason: verification.reason,
    verification_rule: verification.rule,
    amount_status: amountStatusForProject(project),
    amount_evidence_or_missing_reason: project.amountEvidence,
    actor_verification: project.actorEvidence,
    year: project.year,
    project_status: project.projectStatus,
    status_timeline: project.statusTimeline,
    source_id: sourceId,
    source_name: sourceRecord?.nameZh ?? sourceId,
    source_url: project.sourceUrl,
    source_reliability: project.sourceReliabilityLevel,
    is_quantifiable: verification.conclusion === "quantifiable",
    exposure_variable_fit: exposureVariableFitForProject(project),
    tags: project.riskTags,
    notes: `${project.note} ${project.exposureVariableNote}`,
    last_updated: generatedAt,
  };
});

const chinaExposureCandidateRecords = chinaProjectRecords.map((project) => {
  const verification = verifyChinaProject(project);
  const exposureDimension = exposureDimensionForProject(project);
  const variableType = candidateVariableTypeForProject(project);
  const quantificationStatus = quantificationStatusForVerification(verification.conclusion);
  const modelReadiness = modelReadinessForVerification(verification.conclusion);

  return {
    candidate_id: `china_exposure:${project.projectId}`,
    project_id: project.projectId,
    country_id: project.countrySlug,
    exposure_dimension: exposureDimension,
    candidate_variable_name: `${countryNameForId(project.countrySlug)}-${project.projectName}-${exposureDimension}`,
    candidate_variable_type: variableType,
    required_data: requiredDataForCandidate(project),
    available_data: availableDataForCandidate(project),
    missing_data: missingDataForCandidate(project),
    evidence_status: verificationConclusionLabels[verification.conclusion],
    source_reliability: project.sourceReliabilityLevel,
    quantification_status: quantificationStatus,
    time_coverage: project.year,
    spatial_coverage: project.regionName,
    model_readiness: modelReadiness,
    not_index_score: true,
    interpretation_boundary: "暴露变量候选库不生成中国经济暴露指数；不输出国家排名；不输出风险分数；不输出政策判断。",
    notes: `${project.exposureVariableNote} ${verification.reason}`,
  };
});

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
