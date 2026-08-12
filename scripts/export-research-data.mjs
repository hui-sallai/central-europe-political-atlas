import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(projectRoot, "public", "research-data");
const canonicalDataDir = path.join(projectRoot, "src", "data");
const generatedAt = "2026-08-12";
const schemaVersion = "research-data-v0.1";
const canonicalGeneratedAt = "2026-08-12";
const canonicalSchemaVersion = "data-foundation-v0.76";
const chinaExposureDatabaseUpdatedAt = "2026-08-11";

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
const { countries: countryUiRecords } = require("../src/lib/data.ts");
const { regionMetadataRecords } = require("../src/lib/regions.ts");
const { regionBoundaryRecords } = require("../src/lib/regionBoundaries.ts");
const { regionIndicatorRecords } = require("../src/lib/regionIndicators.ts");
const { regionObservationRecords } = require("../src/lib/regionObservations.ts");
const {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ReadinessGateSummary,
  hungaryNuts3RegionIdMatchSummary,
  hungaryNuts3SandboxQaSummary,
  hungaryNuts3ValidationManifestSummary,
  hungaryNuts3VisualQaSummary,
  regionQualityCheckRecords,
  regionQualitySummary,
} = require("../src/lib/regionQualityChecks.ts");
const { regionSourceRecords } = require("../src/lib/regionSources.ts");
const { projectLocationRecords } = require("../src/lib/projectLocations.ts");
const { mapLayerRecords } = require("../src/lib/mapLayers.ts");
const {
  chinaProjectRecords,
  extendedObservations,
  v4TemplateIndicatorIds,
  getExtendedIndicator,
  getExtendedObservations,
  getLatestExtendedObservation,
} = require("../src/lib/extendedData.ts");
const { indicatorDictionaryRecords } = require("../src/lib/indicatorDictionary.ts");
const { sourceDictionaryRows } = require("../src/lib/sourceDictionary.ts");
const { eventLibraryItems, eventTypeValues, toEventRecord } = require("../src/lib/newsData.ts");
const { v4PendingModelInputIndicators } = require("../src/lib/v4ModelInputIndicators.ts");
const { transmissionIndicators, transmissionObservations } = require("../src/lib/transmissionData.ts");
const { getV4DataQualitySummary, v4QualityCountrySlugs } = require("../src/lib/v4DataQuality.ts");
const { verifyChinaProject, chinaProjectVerificationLabel } = require("../src/lib/chinaProjectVerification.ts");
const { modelCards, modelOutputs } = require("../src/lib/modelFramework.ts");
const {
  chinaExposureModelCard,
  chinaExposureOutputs,
  chinaExposureVariables,
  chinaExposureCoverageAudit,
  chinaProjectCoverageAudit,
  chinaTradeQa,
} = require("../src/lib/chinaExposureModel.ts");

const economicIndicatorIdByMetric = {
  population: "population",
  gdp: "gdp_current_eur",
  gdpPerCapita: "gdp_per_capita_eur",
  growth: "real_gdp_growth",
  inflation: "hicp_inflation",
  unemployment: "unemployment_rate",
};

const canonicalObservationSeedPath = path.join(canonicalDataDir, "observations", "observations.json");
const canonicalObservationSeed = fs.existsSync(canonicalObservationSeedPath)
  ? JSON.parse(fs.readFileSync(canonicalObservationSeedPath, "utf8")).records
  : [];

const economicMetricOptions = [
  { id: "gdp", label: "GDP", unit: "百万欧元", note: "名义 GDP，当年价格。" },
  { id: "gdpPerCapita", label: "人均 GDP", unit: "欧元", note: "按 GDP 与人口换算。" },
  { id: "growth", label: "GDP 实际增长", unit: "%", note: "链式体量，较上年变化率。" },
  { id: "inflation", label: "CPI / HICP 通胀率", unit: "%", note: "年均消费者价格变化率；欧盟国家采用 HICP。" },
  { id: "unemployment", label: "失业率", unit: "%", note: "15-74 岁劳动力口径。" },
  { id: "population", label: "人口", unit: "百万人", note: "年初人口，百万人。" },
];

const economicSourceLabelByCountry = {
  germany: "Eurostat / Destatis",
  poland: "Eurostat / Statistics Poland",
  hungary: "Eurostat / Hungarian Central Statistical Office",
  romania: "Eurostat / INSSE",
  czechia: "Eurostat / Czech Statistical Office",
  slovakia: "Eurostat / Statistical Office of the Slovak Republic",
  slovenia: "Eurostat / SURS",
  serbia: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import",
  austria: "Eurostat / Statistics Austria",
  croatia: "Eurostat / Croatian Bureau of Statistics",
};

function canonicalSeedObservation(countrySlug, metricId, year) {
  const indicatorId = economicIndicatorIdByMetric[metricId];
  return canonicalObservationSeed.find((observation) =>
    observation.country_slug === countrySlug && observation.indicator === indicatorId && String(observation.year) === String(year));
}

const economicTimeSeriesByCountry = Object.fromEntries(
  Array.from(new Set(canonicalObservationSeed.map((observation) => observation.country_slug))).map((countrySlug) => {
    const years = Array.from(new Set(
      canonicalObservationSeed
        .filter((observation) => observation.country_slug === countrySlug && Object.values(economicIndicatorIdByMetric).includes(observation.indicator))
        .map((observation) => String(observation.year)),
    )).sort();
    const rows = years.map((year) => {
      const value = (metricId) => canonicalSeedObservation(countrySlug, metricId, year)?.value ?? null;
      const source = economicSourceLabelByCountry[countrySlug] ?? "来源待接入";
      const population = value("population");
      return {
        year,
        population: population === null ? null : population / 1_000_000,
        gdp: value("gdp"),
        gdpPerCapita: value("gdpPerCapita"),
        growth: value("growth"),
        inflation: value("inflation"),
        unemployment: value("unemployment"),
        source,
      };
    });
    return [countrySlug, rows];
  }),
);

function getEconomicMetricSourceLinks(countrySlug, metricId, year) {
  const observation = canonicalSeedObservation(countrySlug, metricId, year);
  if (!observation?.source_url) return [];
  return [{ label: observation.source_name, url: observation.source_url, note: observation.notes }];
}

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
  return "十国";
}

function yearCoverage(indicator) {
  return "2021-2025";
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
  applicabilityStatus,
  comparabilityStatus,
  sourceDataset,
  sourceQueryUrl,
  numerator,
  denominator,
  numeratorSourceUrl,
  denominatorSourceUrl,
  calculationFormula,
  calculationYear,
}) {
  const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
  const source = sourceRecordForId(sourceId);
  const isCalculated = computedIndicatorIds.has(indicatorId) && value !== null && value !== undefined;
  const valueStatus = valueStatusLabel(status, value, isCalculated);
  const isPending = valueStatus === "待接入";
  const isStructuralSample = valueStatus === "结构样例";
  const isCoreExtended = dataset === "v4_extended" || dataset === "parity_extended";
  const normalizedApplicability = applicabilityStatus ?? "applicable";
  const normalizedComparability = comparabilityStatus ?? (isPending ? "pending" : "comparable");
  const comparisonEligible = Boolean(
    value !== null
    && value !== undefined
    && !isStructuralSample
    && normalizedApplicability === "applicable"
    && normalizedComparability === "comparable",
  );
  const derivedEligible = Boolean(isCoreExtended && comparisonEligible && indicator?.includedInDerivedComparison);
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
    is_in_mean_gap: derivedEligible,
    is_in_ranking_change: derivedEligible,
    missing_reason: isPending ? noteText || "数值待接入" : "无",
    calculation_method: valueStatus === "计算值" ? calculationMethodForIndicator(indicatorId) : "无",
    applicability_status: normalizedApplicability,
    comparability_status: normalizedComparability,
    source_dataset: sourceDataset || sourceName || source?.nameEn || "待接入",
    source_query_url: sourceQueryUrl || sourceUrl || source?.url || "",
    numerator: numerator ?? null,
    denominator: denominator ?? null,
    numerator_source_url: numeratorSourceUrl || "",
    denominator_source_url: denominatorSourceUrl || "",
    calculation_formula: calculationFormula || (valueStatus === "计算值" ? calculationMethodForIndicator(indicatorId) : "无"),
    calculation_year: calculationYear ?? (valueStatus === "计算值" ? Number(year) : null),
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

function writeCanonicalCollection(folder, records, extra = {}) {
  const directory = path.join(canonicalDataDir, folder);
  fs.mkdirSync(directory, { recursive: true });
  const payload = {
    schema_version: canonicalSchemaVersion,
    generated_at: canonicalGeneratedAt,
    data_type: folder,
    record_count: records.length,
    ...extra,
    records,
  };
  fs.writeFileSync(path.join(directory, `${folder}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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
  return extendedObservations.map((observation) => {
    const isV4Country = v4QualityCountrySlugs.includes(observation.countrySlug);
    return standardObservationRecord({
      observationId: `${isV4Country ? "v4" : "parity"}:${observation.countrySlug}:${observation.indicatorId}:${observation.date}`,
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
      dataset: isV4Country ? "v4_extended" : "parity_extended",
      applicabilityStatus: observation.applicabilityStatus,
      comparabilityStatus: observation.comparabilityStatus,
      sourceDataset: observation.sourceDataset,
      sourceQueryUrl: observation.sourceQueryUrl,
      numerator: observation.numerator,
      denominator: observation.denominator,
      numeratorSourceUrl: observation.numeratorSourceUrl,
      denominatorSourceUrl: observation.denominatorSourceUrl,
      calculationFormula: observation.calculationFormula,
      calculationYear: observation.calculationYear,
    });
  });
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
  const parityCountrySlugs = countryMetadataRecords.map((country) => country.country_id);
  const transmissionIndicatorIds = transmissionIndicators.map((indicator) => indicator.id);
  const qaIndicatorIds = [...v4TemplateIndicatorIds, ...transmissionIndicatorIds];
  return parityCountrySlugs.flatMap((countryId) =>
    qaIndicatorIds.flatMap((indicatorId) => {
      const isTransmission = transmissionIndicatorIds.includes(indicatorId);
      const years = isTransmission ? ["2023", "2024"] : ["2021", "2022", "2023", "2024", "2025"];
      return years.map((year) => {
        const observationId = isTransmission
          ? `transmission:${countryId}:${indicatorId}:${year}`
          : `${v4QualityCountrySlugs.includes(countryId) ? "v4" : "parity"}:${countryId}:${indicatorId}:${year}`;
        const observation = observationRecords.find((item) => item.observation_id === observationId);
        const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId)
          ?? transmissionIndicators.find((item) => item.id === indicatorId);
        const indicatorUnit = indicator?.unit;
        const indicatorModelEligible = indicator?.futureModelEligible ?? indicator?.future_model_candidate ?? false;
        const valuePresent = observation?.value !== null && observation?.value !== undefined;
        const unitPresent = Boolean(observation?.unit);
        const sourceNamePresent = Boolean(observation?.source_name);
        const sourceUrlPresent = Boolean(observation?.source_url);
        const sourceReliabilityPresent = Boolean(observation?.source_reliability);
        const statusPresent = Boolean(observation?.value_status);
        const lastUpdatedPresent = Boolean(observation?.last_updated);
        const sourceReliability = observation?.source_reliability ?? "D";
        const applicabilityStatus = observation?.applicability_status ?? "applicable";
        const comparabilityStatus = observation?.comparability_status ?? (observation?.is_pending ? "pending" : "comparable");
        const calculationTraceComplete = !observation?.is_calculated || Boolean(
          observation.calculation_formula && observation.calculation_year && observation.source_dataset && observation.source_query_url,
        );
        const methodologicallyConsistent = Boolean(
          observation &&
          indicator &&
          observation.unit === indicatorUnit &&
          sourceReliabilityPresent &&
          calculationTraceComplete &&
          !observation.is_structural_sample &&
          applicabilityStatus === "applicable" &&
          comparabilityStatus === "comparable",
        );
        const readyForExport = Boolean(
          observation &&
          unitPresent &&
          sourceNamePresent &&
          sourceUrlPresent &&
          sourceReliabilityPresent &&
          statusPresent &&
          lastUpdatedPresent &&
          (valuePresent || observation.is_pending || applicabilityStatus === "not_applicable"),
        );
        const duplicateCount = observation ? observationRecords.filter((item) => item.country_id === countryId && item.indicator_id === indicatorId && String(item.year) === year).length : 0;
        const series = observationRecords
          .filter((item) => item.country_id === countryId && item.indicator_id === indicatorId && item.value !== null)
          .sort((a, b) => Number(a.year) - Number(b.year));
        const currentIndex = observation ? series.findIndex((item) => item.observation_id === observation.observation_id) : -1;
        const previous = currentIndex > 0 ? series[currentIndex - 1] : undefined;
        const percentageUnit = observation?.unit === "%" || observation?.unit === "% GDP" || observation?.unit === "% exports";
        const reviewReasons = [
          duplicateCount > 1 ? "duplicate_observation" : "",
          percentageUnit && valuePresent && (observation.value < -100 || observation.value > 300) ? "impossible_percentage" : "",
          previous && previous.value !== 0 && observation?.value !== 0 && Math.sign(previous.value) !== Math.sign(observation.value) ? "sign_reversal" : "",
          previous && Math.abs(observation.value - previous.value) / Math.max(Math.abs(previous.value), 1) > 1.5 ? "abnormal_yoy_jump" : "",
        ].filter(Boolean);
        const readyForDerivedComparison = Boolean(observation?.is_in_cross_country_comparison && methodologicallyConsistent && reviewReasons.length === 0);
        const readyForFutureModelCandidate = Boolean(
          observation &&
          indicatorModelEligible &&
          !observation.is_pending &&
          !observation.is_structural_sample &&
          (sourceReliability === "A" || sourceReliability === "B") &&
          methodologicallyConsistent,
        );
        const qualityIssues = [
          observation ? "" : "观测记录缺失",
          valuePresent || observation?.is_pending || applicabilityStatus === "not_applicable" ? "" : "数值缺失但未标记待接入",
          unitPresent ? "" : "单位缺失",
          sourceNamePresent ? "" : "来源名称缺失",
          sourceUrlPresent ? "" : "来源链接缺失",
          sourceReliabilityPresent ? "" : "来源等级缺失",
          statusPresent ? "" : "数据状态缺失",
          lastUpdatedPresent ? "" : "更新时间缺失",
          methodologicallyConsistent || applicabilityStatus === "not_applicable" || comparabilityStatus === "definition_mismatch" ? "" : "方法、单位或可比性需复核",
          calculationTraceComplete ? "" : "计算值追溯字段不完整",
          reviewReasons.length > 0 ? `异常值复核：${reviewReasons.join(",")}` : "",
        ].filter(Boolean);
        const qualityStatus =
          applicabilityStatus === "not_applicable"
            ? "不适用"
            : comparabilityStatus === "definition_mismatch"
              ? "定义不一致"
              : observation?.is_structural_sample || sourceReliability === "D"
            ? "不进入分析"
            : observation?.is_pending
              ? "待接入"
              : qualityIssues.length > 0
                ? "需复核"
                : observation?.is_manual
                  ? "部分通过"
                  : "通过";

        return {
          check_id: `parity_quality:${countryId}:${indicatorId}:${year}`,
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
          applicability_status: applicabilityStatus,
          comparability_status: comparabilityStatus,
          definition_mismatch: comparabilityStatus === "definition_mismatch",
          source_reliability: sourceReliability,
          calculation_trace_complete: calculationTraceComplete,
          review_required: reviewReasons.length > 0,
          review_reasons: reviewReasons,
          missing_reason: applicabilityStatus === "not_applicable" ? "不适用" : observation?.is_pending ? observation.missing_reason || "数值待接入" : "无",
          quality_status: qualityStatus,
          quality_notes: qualityIssues.length > 0 ? qualityIssues.join("；") : qualityStatus === "部分通过" ? "计算值或人工整理字段完整，但需保留计算/复核说明。" : "字段完整，可用于导出与事实对照。",
        };
      });
    }),
  );
}

function derivedComparisonRecords() {
  const countries = countryMetadataRecords.map((country) => country.country_id);
  const quality = dataQualityCheckRecords();

  return v4TemplateIndicatorIds.map((indicatorId) => {
    const indicator = indicatorDictionaryRecords.find((item) => item.indicatorId === indicatorId);
    const excludedCountries = countries.filter((countryId) => quality.some(
      (cell) => cell.country_id === countryId && cell.indicator_id === indicatorId && cell.comparability_status === "definition_mismatch",
    ));
    const eligibleCountries = countries.filter((countryId) => !excludedCountries.includes(countryId));
    const commonYear = [2025, 2024, 2023, 2022, 2021].find((year) => eligibleCountries.every((countryId) => quality.some(
      (cell) => cell.country_id === countryId && cell.indicator_id === indicatorId && Number(cell.year) === year && cell.is_ready_for_derived_comparison,
    ))) ?? null;
    const values = countries.map((countryId) => {
      const observation = commonYear === null ? undefined : observationRecords.find(
        (item) => item.country_id === countryId && item.indicator_id === indicatorId && Number(item.year) === commonYear,
      );
      const ready = Boolean(observation && quality.some((cell) => cell.observation_id === observation.observation_id && cell.is_ready_for_derived_comparison));
      return { country_id: countryId, value: ready ? observation.value : null };
    });
    const numericValues = values.filter((item) => item.value !== null);
    const average = numericValues.length ? numericValues.reduce((sum, item) => sum + item.value, 0) / numericValues.length : null;
    const ranked = [...numericValues].sort((a, b) => b.value - a.value);
    const highest = ranked[0] ?? null;
    const lowest = ranked.at(-1) ?? null;
    const gaps = values.map((item) => ({ ...item, gap: item.value !== null && average !== null ? item.value - average : null }));
    const largestGap = gaps.filter((item) => item.gap !== null).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
    const valueFor = (countryId) => values.find((item) => item.country_id === countryId)?.value ?? null;
    const gapFor = (countryId) => gaps.find((item) => item.country_id === countryId)?.gap ?? null;
    const rankFor = (countryId) => {
      const index = ranked.findIndex((item) => item.country_id === countryId);
      return index < 0 ? null : index + 1;
    };

    return {
      comparison_id: `ten_country_derived_comparison:${indicatorId}`,
      comparison_scope: "ten_country_comparable_subset",
      section: categoryLabels[indicator?.category] ?? indicator?.category ?? "unknown",
      indicator_id: indicatorId,
      indicator_name: indicator?.nameZh ?? indicatorId,
      latest_comparable_year: commonYear,
      country_values: values,
      eligible_countries: eligibleCountries,
      excluded_countries: excludedCountries,
      poland_value: valueFor("poland"),
      hungary_value: valueFor("hungary"),
      czechia_value: valueFor("czechia"),
      slovakia_value: valueFor("slovakia"),
      unit: indicator?.unit ?? "",
      highest_value: highest?.value ?? null,
      highest_country: highest?.country_id ?? "",
      lowest_value: lowest?.value ?? null,
      lowest_country: lowest?.country_id ?? "",
      v4_average: average,
      ten_country_comparable_average: average,
      poland_gap_from_v4_average: gapFor("poland"),
      hungary_gap_from_v4_average: gapFor("hungary"),
      czechia_gap_from_v4_average: gapFor("czechia"),
      slovakia_gap_from_v4_average: gapFor("slovakia"),
      largest_gap_country: largestGap?.country_id ?? "",
      largest_gap_value: largestGap?.gap ?? null,
      poland_five_year_change: null,
      hungary_five_year_change: null,
      czechia_five_year_change: null,
      slovakia_five_year_change: null,
      largest_five_year_change_country: "",
      largest_five_year_change_value: null,
      poland_rank: rankFor("poland"),
      hungary_rank: rankFor("hungary"),
      czechia_rank: rankFor("czechia"),
      slovakia_rank: rankFor("slovakia"),
      missing_observation_count: quality.filter((cell) => cell.indicator_id === indicatorId && (cell.is_pending || cell.comparability_status === "definition_mismatch")).length,
      calculated_value_count: quality.filter((cell) => cell.indicator_id === indicatorId && cell.is_calculated).length,
      comparison_status: commonYear === null ? "数据不足" : excludedCountries.length ? "部分可比较" : "可比较",
      interpretation_boundary: "仅表示同年、同定义、质量通过记录的事实位置，不代表风险、预测或政策优劣。",
      notes: "v0.76 使用最新共同年份；定义不一致、待接入、不适用或质量未通过记录不进入排名和均值。旧 V4 字段仅为展示兼容。",
    };
  });
}

function coverageMatrixRecords() {
  const countries = countryMetadataRecords.map((country) => country.country_id);
  const indicatorIds = [...v4TemplateIndicatorIds, ...transmissionIndicators.map((indicator) => indicator.id)];
  const quality = dataQualityCheckRecords();
  const commonYearByIndicator = new Map(derivedComparisonRecords().map((record) => [record.indicator_id, record.latest_comparable_year]));

  return countries.flatMap((countryId) => indicatorIds.map((indicatorId) => {
    const expectedYears = transmissionIndicators.some((indicator) => indicator.id === indicatorId)
      ? [2023, 2024]
      : [2021, 2022, 2023, 2024, 2025];
    const cells = quality.filter((cell) => cell.country_id === countryId && cell.indicator_id === indicatorId);
    const availableYears = cells.filter((cell) => cell.value_present && cell.comparability_status === "comparable").map((cell) => Number(cell.year));
    const pendingYears = cells.filter((cell) => cell.is_pending && cell.comparability_status === "pending").map((cell) => Number(cell.year));
    const missingYears = expectedYears.filter((year) => !cells.some((cell) => Number(cell.year) === year));
    const notApplicableYears = cells.filter((cell) => cell.applicability_status === "not_applicable").map((cell) => Number(cell.year));
    const definitionMismatchYears = cells.filter((cell) => cell.comparability_status === "definition_mismatch").map((cell) => Number(cell.year));
    const applicableCount = expectedYears.length - notApplicableYears.length;
    const sourceReliability = [...new Set(cells.map((cell) => cell.source_reliability))].sort().join("/") || "D";
    const qualityStatuses = [...new Set(cells.map((cell) => cell.quality_status))];
    const modelEligible = cells.some((cell) => cell.is_ready_for_future_model_candidate);

    return {
      coverage_id: `coverage:${countryId}:${indicatorId}`,
      country_id: countryId,
      indicator_id: indicatorId,
      expected_years: expectedYears,
      available_years: availableYears,
      pending_years: pendingYears,
      missing_years: missingYears,
      not_applicable_years: notApplicableYears,
      definition_mismatch_years: definitionMismatchYears,
      source_reliability: sourceReliability,
      quality_status: qualityStatuses,
      model_eligibility: modelEligible,
      latest_available_year: availableYears.at(-1) ?? null,
      latest_common_year: commonYearByIndicator.get(indicatorId) ?? null,
      coverage_ratio: applicableCount === 0 ? 1 : availableYears.length / applicableCount,
      review_required_count: cells.filter((cell) => cell.review_required).length,
      comparison_note: "latest_common_year 只基于同定义、同单位、质量通过的记录；传导指标的共同年份由 QA 层按同规则消费。",
    };
  }));
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
      rule_id: "event_database_v035_gate",
      rule_category: "事件编码规则",
      rule_name: "v0.35 事件数据库准入规则",
      rule_description: "事件从可追溯来源和中文摘要开始，完成 actor、event_type、direction、intensity、affected_indicator、duration、confidence 等字段后，才具备未来模型候选资格。",
      applies_to: "news_page,events,indicators,observations",
      required_fields: ["event_id", "date", "country_code", "actor", "event_type", "direction", "intensity", "affected_indicator", "affected_model", "duration", "confidence", "source_status", "enters_model"],
      allowed_statuses: ["coded", "partial", "pending"],
      excluded_statuses: ["结构样例进入模型", "低置信度事件进入模型", "风险分数"],
      source_requirement: "正式事件必须有来源名称、来源链接和来源状态；结构样例与缺少来源的记录明确保持 enters_model=false。",
      quality_requirement: "事件类型限于 v0.35 九类枚举；affected_indicator 必须引用 indicators 中存在的 indicator_id。",
      model_boundary: "事件编码不是事实预测。低置信度、部分编码、结构样例和来源不完整事件不得进入模型；v0.35 全部记录保持 enters_model=false。",
      export_boundary: "events 可导出供未来 Python/R/Stata 读取，但当前不作为已启用模型输入。",
      last_updated: "2026-08-09",
      notes: "新闻更新仅限国家级事件来源；不自动更新民调等数据。",
    },
    {
      rule_id: "transparent_models_v050_scope",
      rule_category: "模型透明度规则",
      rule_name: "v0.50 透明模型范围规则",
      rule_description: "统一 /models 页面保留 v0.50 三项基础模型，并在 v0.70 对 V4 启用产业依赖规则模型；/scenarios 只提供条件式比较，/forecast 不存在，地图风险图层不启用。",
      applies_to: "models_page,country_pages,methodology,model_cards,model_outputs",
      required_fields: ["model_id", "country", "score", "direction", "main_drivers", "data_completeness", "confidence", "calculation_date", "input_observation_ids"],
      allowed_statuses: ["sufficient", "partial", "insufficient"],
      excluded_statuses: ["机器学习黑箱", "选举预测", "地图风险图层", "无来源补值"],
      source_requirement: "每个分数必须追溯到 official/verified 且 A/B 级来源的 observation；结构样例、待接入值和事件强度不进入基础分数。",
      quality_requirement: "标准化边界、权重、完整度门槛、置信度和限制必须在 Model Card 中公开。",
      model_boundary: "分数是比较与分析工具，不是客观风险真值、预测、评级或政策评价。",
      export_boundary: "model_cards 与 model_outputs 可导出；缺少完整启用输入的国家 score 保持 null。",
      last_updated: "2026-08-11",
      notes: "Industrial Dependency v0.70 使用制造业占比、汽车出口占比、对德国出口依赖和工业电价；FDI 权重为 0，China Exposure 仍只保留后续接口。",
    },
    {
      rule_id: "industrial_dependency_transmission_v070",
      rule_category: "透明模型规则",
      rule_name: "v0.70 产业依赖与冲击传导规则",
      rule_description: "V4 产业依赖模型只接纳通过来源、单位、状态和计算口径验收的制造业、汽车出口、双边出口与工业电价观测。",
      applies_to: "indicators,observations,model_cards,model_outputs,scenarios_page,country_pages",
      required_fields: ["observation_id", "indicator_id", "value", "unit", "source_url", "source_reliability", "calculation_method"],
      allowed_statuses: ["正式数据", "白名单计算值"],
      excluded_statuses: ["待接入", "结构样例", "人工推测", "无来源数值"],
      source_requirement: "优先使用 Eurostat 与 UN Comtrade A 级来源；对德依赖必须使用双边货物出口比重，能源价格必须使用直接价格观测。",
      quality_requirement: "计算值必须保留分子、分母或半年值口径；FDI 年流量不直接映射依赖方向，当前正式权重为 0。",
      model_boundary: "不预测选举，不生成供应链黑箱分数；情景冲击是用户假设，不是未来事实。",
      export_boundary: "model_cards、model_outputs、indicators 与 observations 保留完整追踪；地图图层接口保持未启用。",
      last_updated: "2026-08-11",
      notes: "Energy Price Shock 与 Germany Demand Slowdown 仅在有合格 V4 基线输入时可计算；不使用能源进口依赖或总出口作替代。",
    },
    {
      rule_id: "research_data_export_boundary",
      rule_category: "导出规则",
      rule_name: "研究数据导出边界规则",
      rule_description: "导出层提供 JSON/CSV 研究数据结构，供 Python/R/Stata 复核；model_outputs 是透明规则结果，不是对外预测 API。",
      applies_to: "countries,regions,region_boundaries,region_indicators,region_observations,region_quality_checks,region_sources,project_locations,map_layers,indicators,sources,observations,data_quality_checks,derived_comparisons,china_projects,china_exposure_candidates,methodology_rules,model_cards,model_outputs",
      required_fields: ["schema_version", "generated_at", "data_type", "record_count", "records"],
      allowed_statuses: ["可导出", "待接入", "结构说明"],
      excluded_statuses: ["风险分数", "预测结果"],
      source_requirement: "导出记录必须保留可追溯字段或明确缺失原因。",
      quality_requirement: "导出前必须通过字段结构检查和枚举检查。",
      model_boundary: "导出文件不代表模型已启用。",
      export_boundary: "JSON/CSV 均可公开读取，但需保留数据边界说明。",
      last_updated: generatedAt,
      notes: "当前 17 个逻辑数据层均从导出脚本生成；regions 为 v0.9 区域主键层，region_boundaries 为边界来源登记层，region_indicators 为区域指标字典，region_observations 为区域观测值主表，region_quality_checks 为区域数据质量验收层，region_sources 为区域来源字典，project_locations 为对华项目地区定位表，map_layers 为地图图层注册表。",
    },
    {
      rule_id: "hungary_boundary_readiness_gate",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 展示准入闸门规则",
      rule_description: "视觉 QA 通过只是必要条件；许可、权威拓扑和最终 region_id 匹配全部通过前，不得启用正式真实地图展示。",
      applies_to: "region_quality_checks,map_layers,map_page,hungary_country_page",
      required_fields: ["license_checked", "authoritative_topology_checked", "region_id_final_matched", "visual_qa_passed", "public_display_ready", "is_ready_for_display", "readiness_gate_status"],
      allowed_statuses: ["not_ready_for_public_display", "ready_for_public_display"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层"],
      source_requirement: "许可状态、权威拓扑验收和最终主键匹配必须有可核验记录。",
      quality_requirement: "三项前置条件未全部通过时，public_display_ready 与 is_ready_for_display 必须为 false。",
      model_boundary: "准入闸门不生成风险指数、预测、中国经济暴露指数或区域评分。",
      export_boundary: "随 region_quality_checks、map_layers 和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: generatedAt,
      notes: "v0.14 Hungary boundary readiness gate；当前 gate_status=not_ready_for_public_display。",
    },
    {
      rule_id: "hungary_boundary_license_topology_evidence",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 许可与权威拓扑证据规则",
      rule_description: "许可记录与权威拓扑证据是正式展示前的必要条件；视觉 QA 通过不能替代许可、权威拓扑或最终主键验收。",
      applies_to: "region_sources,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page",
      required_fields: ["license_source", "license_url", "attribution_required", "attribution_text", "license_checked", "authoritative_topology_method", "authoritative_topology_checked", "topology_evidence_status", "region_id_final_matched", "public_display_ready", "is_ready_for_display"],
      allowed_statuses: ["evidence_recorded_pending_verification", "sandbox_basic_topology_passed_pending_authoritative_validation", "not_ready_for_public_display"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层"],
      source_requirement: "许可来源、许可链接与署名文本必须来自可核验官方页面；权威拓扑方法和证据状态必须单独记录。",
      quality_requirement: "license_checked 或 authoritative_topology_checked 为 false 时，public_display_ready 与 is_ready_for_display 必须为 false。",
      model_boundary: "证据记录不生成风险指数、预测、中国经济暴露指数或区域评分。",
      export_boundary: "随既有四个区域表和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-07-31",
      notes: "v0.15 Hungary boundary license and topology evidence record；当前真实地图展示未启用。",
    },
    {
      rule_id: "hungary_boundary_final_region_id_matching",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 主键匹配准备摘要规则",
      rule_description: "v0.16.1 仅记录初步准备摘要；20 / 20 候选且初步无缺失、无重复，不等于最终主键匹配通过。",
      applies_to: "regions,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page",
      required_fields: ["expected_region_count", "nuts_code_count", "region_id_candidate_count", "unmatched_region_count", "duplicate_region_id_count", "duplicate_nuts_code_count", "region_id_final_matched", "region_id_match_evidence_status", "public_display_ready", "is_ready_for_display"],
      allowed_statuses: ["precheck_zero_exceptions_pending_final_review", "final_match_verified"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层"],
      source_requirement: "主键匹配证据必须同时核对 NUTS code、region_id、名称变体和边界文件属性字段。",
      quality_requirement: "region_id_final_matched=false 时，public_display_ready 与 is_ready_for_display 必须保持 false。",
      model_boundary: "主键匹配准备摘要不生成风险指数、预测、中国经济暴露指数或区域评分。",
      export_boundary: "随既有四个区域表和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "v0.16.1 Hungary region-id matching readiness summary；当前 20 / 20 候选初步检查通过，最终核验尚未完成。",
    },
    {
      rule_id: "hungary_nuts3_validation_manifest",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 validation manifest 规则",
      rule_description: "v0.17 只建立可追溯 validation manifest 和 20 条待最终核验明细；manifest 建立不等于许可、权威拓扑、最终主键或正式展示通过。",
      applies_to: "regions,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page,methodology_page",
      required_fields: ["manifest_id", "source_file", "filtered_file", "country_id", "admin_level", "nuts_version", "coordinate_system", "expected_region_count", "feature_count", "nuts_code_count", "region_id_candidate_count", "matched_region_count", "unmatched_region_count", "duplicate_region_id_count", "duplicate_nuts_code_count", "missing_geometry_count", "visual_qa_passed", "license_checked", "authoritative_topology_checked", "region_id_final_matched", "public_display_ready", "is_ready_for_display", "manifest_status", "last_updated", "notes", "region_records"],
      allowed_statuses: ["manifest_created_pending_final_validation", "pending_final_validation"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层", "中国经济暴露指数", "区域评分"],
      source_requirement: "manifest 必须关联实际沙盒 GeoJSON，并为每条 NUTS3 记录保留 nuts_code、region_id_candidate、region_name、geometry_present、重复检查和 match_status。",
      quality_requirement: "license_checked、authoritative_topology_checked 与 region_id_final_matched 均未通过时，public_display_ready 和 is_ready_for_display 必须保持 false。",
      model_boundary: "validation manifest 只用于核验记录，不生成模型、风险、预测、指数或区域评分。",
      export_boundary: "随既有四个区域数据层和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "20 条明细的 match_status 均保持 pending_final_validation；不伪造最终核验结论。",
    },
    {
      rule_id: "hungary_nuts3_validation_manifest_detail_record",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 validation manifest 明细核验规则",
      rule_description: "v0.18 逐条核对 20 条 NUTS3 manifest 明细并记录匹配、重复与几何完整性结果；明细核验完成不等于正式展示资格通过。",
      applies_to: "regions,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page,methodology_page",
      required_fields: ["manifest_id", "validation_file", "detail_record_count", "matched_region_count", "unmatched_region_count", "duplicate_region_id_count", "duplicate_nuts_code_count", "missing_geometry_count", "manifest_detail_validation_status", "manifest_status", "license_checked", "authoritative_topology_checked", "region_id_final_matched", "public_display_ready", "is_ready_for_display", "region_records"],
      allowed_statuses: ["manifest_detail_validation_recorded", "detail_validation_recorded_pending_final_region_id_verification"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层", "中国经济暴露指数", "区域评分"],
      source_requirement: "manifest 必须关联实际沙盒 GeoJSON；20 条 region_records 必须保留 nuts_code、region_id_candidate、region_name、geometry_present、重复检查、match_status 与 notes。",
      quality_requirement: "明细数量、匹配数量、缺失、重复与几何完整性必须由 validation manifest 记录；license_checked、authoritative_topology_checked 或 region_id_final_matched 未通过时，展示闸门保持 false。",
      model_boundary: "明细核验只记录边界数据完整性，不生成模型、风险、预测、指数或区域评分。",
      export_boundary: "随既有四个区域数据层和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "manifest_status=manifest_detail_validation_recorded；public_display_ready=false；is_ready_for_display=false。",
    },
    {
      rule_id: "hungary_nuts3_final_region_id_match_decision",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 最终主键匹配判定规则",
      rule_description: "v0.19 基于 20 条 validation manifest 明细记录，对 NUTS code、region_id candidate 与 geometry feature 的一对一关系作出最终判定。",
      applies_to: "regions,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page,methodology_page",
      required_fields: ["expected_region_count", "feature_count", "nuts_code_count", "region_id_candidate_count", "detail_record_count", "matched_region_count", "unmatched_region_count", "duplicate_region_id_count", "duplicate_nuts_code_count", "missing_geometry_count", "region_id_final_matched", "region_id_match_decision_status", "license_checked", "authoritative_topology_checked", "public_display_ready", "is_ready_for_display"],
      allowed_statuses: ["final_match_recorded", "pending_final_manual_review"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层", "中国经济暴露指数", "区域评分"],
      source_requirement: "最终判定必须读取实际 GeoJSON 与 validation manifest，并确认 20 条代码、候选主键和几何要素唯一一对一对应。",
      quality_requirement: "即使 region_id_final_matched=true，只要 license_checked 或 authoritative_topology_checked=false，public_display_ready 与 is_ready_for_display 必须保持 false。",
      model_boundary: "最终主键匹配判定不生成模型、风险、预测、指数或区域评分。",
      export_boundary: "随既有四个区域数据层和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "region_id_final_matched=true；region_id_match_decision_status=final_match_recorded；正式地图展示仍未启用。",
    },
    {
      rule_id: "hungary_gisco_license_verification_decision",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 GISCO 许可核验判定规则",
      rule_description: "v0.20 核验 Eurostat GISCO NUTS 2024 的公开非商业研究展示条件、署名要求和使用边界；许可通过不等于正式地图展示通过。",
      applies_to: "region_sources,region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page,methodology_page",
      required_fields: ["license_source", "license_url", "attribution_required", "attribution_text", "license_review_status", "license_checked", "license_review_date", "license_decision_note", "region_id_final_matched", "authoritative_topology_checked", "public_display_ready", "is_ready_for_display"],
      allowed_statuses: ["verified_for_public_research_display", "pending_official_terms_review", "not_ready_for_public_display"],
      excluded_statuses: ["正式地图已启用", "商业使用已授权", "风险图层", "预测图层", "真实党派支持率图层", "中国经济暴露指数", "区域评分"],
      source_requirement: "许可判定必须引用 Eurostat/GISCO 官方 NUTS 页面和 statistical-units 使用条件，并记录 © EuroGeographics 边界署名要求。",
      quality_requirement: "license_checked=true 仅覆盖公开非商业研究展示；authoritative_topology_checked=false 时，public_display_ready 与 is_ready_for_display 必须保持 false。",
      model_boundary: "许可核验不生成模型、风险、预测、指数或区域评分。",
      export_boundary: "随既有四个区域数据层和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "license_review_status=verified_for_public_research_display；商业使用需另行联系 EuroGeographics；正式地图展示仍未启用。",
    },
    {
      rule_id: "hungary_authoritative_topology_validation_decision",
      rule_category: "区域边界准入规则",
      rule_name: "匈牙利 NUTS3 权威拓扑验收判定规则",
      rule_description: "v0.21 基于 GISCO NUTS 2024 Level 3 官方几何、20 条 validation manifest 明细和可复现几何检查，记录权威拓扑验收判定；验收通过不自动启用正式地图。",
      applies_to: "region_boundaries,region_quality_checks,map_layers,map_page,hungary_country_page,methodology_page",
      required_fields: ["topology_validation_method", "topology_validation_status", "topology_validation_date", "topology_decision_note", "geometry_valid_count", "invalid_geometry_count", "duplicate_geometry_count", "coordinate_system", "authoritative_topology_checked", "region_id_final_matched", "license_checked", "public_display_ready", "is_ready_for_display"],
      allowed_statuses: ["authoritative_topology_validated", "pending_authoritative_topology_review", "not_ready_for_public_display"],
      excluded_statuses: ["正式地图已启用", "风险图层", "预测图层", "真实党派支持率图层", "中国经济暴露指数", "区域评分"],
      source_requirement: "权威拓扑判定必须使用 Eurostat GISCO NUTS 2024 Level 3 官方几何，并与 validation manifest 的 20 条记录交叉核对。",
      quality_requirement: "Polygon/MultiPolygon 类型、空几何、坐标范围、闭环、退化环、自交、明显跨要素相交、重复几何、CRS 和 manifest 数量必须有明确记录。",
      model_boundary: "权威拓扑验收不生成模型、风险、预测、指数或区域评分。",
      export_boundary: "随既有 region_boundaries、region_quality_checks、map_layers 和 methodology_rules 导出；不新增第 18 张表。",
      last_updated: "2026-08-02",
      notes: "authoritative_topology_checked=true；public_display_ready=false；is_ready_for_display=false；正式展示仍需下一阶段单独准入。",
    },
    {
      rule_id: "cross_country_data_parity_qa_v076",
      rule_category: "观测值规则",
      rule_name: "十国数据可比性与缺口收口规则",
      rule_description: "v0.76 从 canonical observations 自动计算覆盖率、最新可得年份、最新共同年份、可比性、来源等级、质量状态与模型准入；不以填满表格为目标。",
      applies_to: "observations,data_quality_checks,derived_comparisons,model_outputs,scenario_results,data_page,country_pages",
      required_fields: ["country_id", "indicator_id", "year", "value", "unit", "value_status", "source_name", "source_url", "source_reliability", "comparability_status", "applicability_status", "last_updated"],
      allowed_statuses: ["comparable", "partial_comparability", "definition_mismatch", "pending", "not_applicable", "review_required"],
      excluded_statuses: ["结构样例", "无来源观测", "定义不一致排名", "跨年份排名", "自动插值"],
      source_requirement: "优先使用 Eurostat、UN Comtrade、IMF、OECD、国家统计局、央行和部委等 A/B 级来源；无法保持同定义时继续 pending 或 definition_mismatch。",
      quality_requirement: "跨国排名、均值差距和模型输入必须同年、同单位、同定义、A/B 级来源且质量通过；计算值还须保留分子、分母、源数据集、查询链接、公式与年份。",
      model_boundary: "v0.76 不修改模型公式、权重或阈值；只按新增合格 observation 重算 availability。异常值仅标记 review_required，不自动修改。",
      export_boundary: "复用 observations、data_quality_checks 和 derived_comparisons；不新增逻辑层。",
      last_updated: "2026-08-12",
      notes: "德国 germany_export_dependence=not_applicable；塞尔维亚财政与经常账户当前为 definition_mismatch，不进入十国排名。",
    },
  ];
}

const countryRecords = countryMetadataRecords;
const baseIndicatorRecords = indicatorDictionaryRecords.map((indicator) => {
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
const transmissionIndicatorRecords = transmissionIndicators.map((indicator) => ({
  indicator_id: indicator.id,
  name_zh: indicator.name_zh,
  name_en: indicator.name,
  indicator_category: indicator.category,
  section: categoryLabels[indicator.category] ?? indicator.category,
  unit: indicator.unit,
  frequency: indicator.frequency,
  country_coverage: indicator.id === "germany_export_dependence" ? "十国；德国自身不适用" : "十国",
  year_coverage: "2023-2024",
  primary_source: indicator.source_type,
  backup_source: "各国统计局 / 国家能源监管机构",
  source_reliability_level: "A",
  is_raw_value: indicator.id === "energy_inflation",
  is_computed_value: indicator.id !== "energy_inflation",
  is_derived_value: false,
  included_in_cross_country_comparison: true,
  included_in_five_year_change: false,
  included_in_mean_gap: false,
  included_in_rank_change: false,
  future_model_candidate: indicator.future_model_candidate,
  upward_meaning: indicator.description,
  missing_value_treatment: "缺失保持 null，不插值、不以相关但不同口径的变量替代。",
  pending_value_treatment: "待接入记录不进入模型或情景重算。",
  updated_at: indicator.last_updated,
  note: "v0.70 transmission data；计算值必须保留原始查询和计算口径。",
}));
const indicatorRecords = [...baseIndicatorRecords, ...transmissionIndicatorRecords];

const transmissionObservationRecords = transmissionObservations.map((observation) => ({
  observation_id: observation.id,
  country_id: observation.country_slug,
  indicator_id: observation.indicator,
  year: observation.year,
  period_type: "annual",
  period: observation.year,
  value: observation.value,
  unit: observation.unit,
  value_status: observation.applicability_status === "not_applicable" ? "不适用" : observation.value === null ? "待接入" : observation.status === "calculated" ? "计算值" : "正式数据",
  source_id: observation.source,
  source_name: observation.source_name,
  source_url: observation.source_url,
  source_reliability: observation.source_reliability,
  source_status: "官方",
  last_updated: observation.updated_at,
  is_official_data: observation.status === "official",
  is_pending: observation.value === null && observation.applicability_status !== "not_applicable",
  is_calculated: observation.status === "calculated",
  is_manual: false,
  is_structural_sample: false,
  is_in_cross_country_comparison: observation.value !== null && observation.comparability_status !== "definition_mismatch" && observation.applicability_status !== "not_applicable",
  is_in_five_year_change: false,
  is_in_mean_gap: false,
  is_in_ranking_change: false,
  missing_reason: observation.applicability_status === "not_applicable" ? "不适用" : observation.value === null ? observation.notes : "无",
  calculation_method: observation.status === "calculated" ? observation.notes : "无",
  applicability_status: observation.applicability_status ?? "applicable",
  comparability_status: observation.comparability_status ?? (observation.value === null ? "pending" : "comparable"),
  source_dataset: observation.source_dataset ?? observation.source_name,
  source_query_url: observation.source_query_url ?? observation.source_url,
  numerator: observation.numerator ?? null,
  denominator: observation.denominator ?? null,
  numerator_source_url: observation.numerator_source_url ?? "",
  denominator_source_url: observation.denominator_source_url ?? "",
  calculation_formula: observation.calculation_formula ?? (observation.status === "calculated" ? observation.notes : "无"),
  calculation_year: observation.calculation_year ?? (observation.status === "calculated" ? observation.year : null),
  notes: observation.notes,
}));
const observationRecords = [...economicObservationRecords(), ...extendedObservationRecords(), ...transmissionObservationRecords];
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
    project_status_code: project.projectStatusCode,
    status_timeline: project.statusTimeline,
    source_id: sourceId,
    source_name: sourceRecord?.nameZh ?? sourceId,
    source_url: project.sourceUrl,
    source_reliability: project.sourceReliabilityLevel,
    is_quantifiable: verification.conclusion === "quantifiable",
    exposure_variable_fit: exposureVariableFitForProject(project),
    exposure_dimensions: project.exposureDimensions,
    related_indicator_ids: project.relatedIndicatorIds,
    related_event_ids: project.relatedEventIds,
    tags: project.riskTags,
    announced_amount: project.announcedAmount ?? null,
    verified_amount: project.verifiedAmount ?? null,
    amount_eur: project.amountEur ?? null,
    amount_as_pct_gdp: project.amountAsPctGdp ?? null,
    amount_as_pct_fdi_stock_or_inflow: project.amountAsPctFdiStockOrInflow ?? null,
    exchange_rate_source: project.exchangeRateSource ?? null,
    exchange_rate_date: project.exchangeRateDate ?? null,
    amount_calculation_trace: project.amountCalculationTrace ?? null,
    notes: `${project.note} ${project.exposureVariableNote}`,
    last_updated: chinaExposureDatabaseUpdatedAt,
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
    related_indicator_ids: project.relatedIndicatorIds,
    related_event_ids: project.relatedEventIds,
    not_index_score: true,
    interpretation_boundary: "暴露变量候选库不生成中国经济暴露指数；不输出国家排名；不输出风险分数；不输出政策判断。",
    notes: `${project.exposureVariableNote} ${verification.reason}`,
  };
});

function canonicalStatus(value) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("official") || text.includes("正式")) return "official";
  if (text.includes("verified") || text.includes("已核验") || text.includes("已接入")) return "verified";
  if (text.includes("calculated") || text.includes("计算")) return "calculated";
  if (text.includes("derived") || text.includes("派生")) return "derived";
  if (text.includes("sample") || text.includes("样例")) return "sample";
  if (text.includes("placeholder") || text.includes("占位")) return "placeholder";
  return "pending";
}

const countryBySlug = new Map(countryRecords.map((country) => [country.country_id, country]));
const countryUiBySlug = new Map(countryUiRecords.map((country) => [country.slug, country]));
const canonicalCountryRecords = countryRecords.map((country) => ({
  id: country.iso3,
  slug: country.country_id,
  iso2: country.iso2,
  iso3: country.iso3,
  name: country.name_en,
  name_zh: country.name_zh,
  local_name: country.local_name,
  region: "Central Europe",
  group: country.regional_group,
  capital: country.capital,
  currency: country.currency,
  status: canonicalStatus(country.country_profile_status),
  macro_status: canonicalStatus(country.basic_macro_status),
  project_status: canonicalStatus(country.china_project_status),
  region_status: canonicalStatus(country.map_region_status),
  event_status: canonicalStatus(country.news_event_status),
  summary_zh: countryUiBySlug.get(country.country_id)?.summaryZh ?? country.notes,
  china_trade_note: countryUiBySlug.get(country.country_id)?.chinaTradeNote ?? "对华经贸项目数据待接入。",
  admin1_count: countryUiBySlug.get(country.country_id)?.regions.length ?? 0,
  last_updated: country.last_updated_at,
}));

const canonicalIndicatorRecords = [
  ...indicatorDictionaryRecords.map((indicator) => ({
    id: indicator.indicatorId,
    name: indicator.nameEn,
    name_zh: indicator.nameZh,
    category: indicator.category,
    unit: indicator.unit,
    frequency: indicator.frequency,
    source_type: indicator.sourcePriority[0] ?? "pending",
    status: "verified",
    future_model_candidate: indicator.futureModelEligible,
    description: indicator.upwardMeaning,
    last_updated: indicator.updatedAt,
  })),
  ...transmissionIndicators,
  ...v4PendingModelInputIndicators,
];

const canonicalObservationRecords = observationRecords.map((observation) => {
  const country = countryBySlug.get(observation.country_id);
  return {
    id: observation.observation_id,
    country: country?.iso3 ?? observation.country_id.toUpperCase(),
    country_slug: observation.country_id,
    indicator: observation.indicator_id,
    year: Number(observation.year),
    value: observation.value,
    unit: observation.unit,
    status: canonicalStatus(observation.value_status),
    source: observation.source_id,
    source_name: observation.source_name,
    source_url: observation.source_url,
    source_reliability: observation.source_reliability,
    updated_at: observation.last_updated,
    applicability_status: observation.applicability_status,
    comparability_status: observation.comparability_status,
    source_dataset: observation.source_dataset,
    source_query_url: observation.source_query_url,
    numerator: observation.numerator,
    denominator: observation.denominator,
    numerator_source_url: observation.numerator_source_url,
    denominator_source_url: observation.denominator_source_url,
    calculation_formula: observation.calculation_formula,
    calculation_year: observation.calculation_year,
    notes: observation.notes,
  };
});

const canonicalSourceRecords = sourceRecords.map((source) => ({
  id: source.source_id,
  name: source.name_en,
  name_zh: source.name_zh,
  type: source.source_type,
  url: source.url,
  reliability: source.reliability_level,
  status: canonicalStatus(source.source_status),
  update_frequency: source.update_frequency,
  usage_note: source.note,
}));

const canonicalEventRecords = eventLibraryItems.map((item) => {
  const event = toEventRecord(item);
  return {
    id: event.event_id,
    event_id: event.event_id,
    date: event.date,
    country: countryBySlug.get(item.countrySlug)?.iso3 ?? item.countrySlug.toUpperCase(),
    country_slug: item.countrySlug,
    country_name: item.countryZh,
    region_code: event.region_code,
    actor: event.actor,
    event_type: event.event_type,
    direction: event.direction,
    intensity: event.intensity,
    affected_indicator: event.affected_indicator,
    affected_model: event.affected_model,
    related_project_ids: event.related_project_ids,
    duration: event.duration,
    confidence: event.confidence,
    source_status: event.source_status,
    enters_model: event.enters_model,
    coding_status: event.coding_status,
    data_status: canonicalStatus(item.dataStatus),
    model_note: event.model_note,
    title: item.title,
    topic: item.topic,
    summary: item.summary,
    source_name: item.sourceLabel,
    source_url: item.sourceUrl ?? null,
    language: item.language,
  };
});

const canonicalProjectRecords = chinaProjectExportRecords.map((project) => ({
  id: project.project_id,
  name: project.project_name,
  country: countryBySlug.get(project.country_id)?.iso3 ?? project.country_id.toUpperCase(),
  country_slug: project.country_id,
  city: project.region_or_city,
  sector: project.sector,
  company: project.chinese_actor,
  local_actor: project.local_actor,
  investment: project.amount_value,
  currency: project.amount_currency,
  year: project.year,
  status: project.project_status,
  data_status: project.verification_conclusion === "可量化" ? "verified" : "pending",
  risk_tags: project.tags,
  source: project.source_id,
  source_name: project.source_name,
  source_url: project.source_url,
  source_reliability: project.source_reliability,
  verified: project.verification_conclusion === "可量化",
  verification_status: project.verification_conclusion,
  verification_note: project.verification_reason,
  quantification_status: project.verification_conclusion === "可量化"
    ? "可量化"
    : project.verification_conclusion === "部分可量化"
      ? "部分可量化"
      : project.verification_conclusion === "仅作背景"
        ? "暂不可量化"
        : "不适合量化",
  amount_status: project.amount_status,
  amount_evidence: project.amount_evidence_or_missing_reason,
  actor_verification: project.actor_verification,
  status_timeline: project.status_timeline,
  related_indicator_ids: project.related_indicator_ids,
  related_event_ids: project.related_event_ids,
  exposure_dimensions: project.exposure_dimensions,
  model_boundary: "项目只建立 Event → Project → Indicator 关系；当前不生成中国经济暴露指数、风险分数或预测。",
}));

const dataQualityRecords = dataQualityCheckRecords();
const coverageMatrixExportRecords = coverageMatrixRecords();
const derivedComparisonExportRecords = derivedComparisonRecords();
const methodologyRecords = methodologyRuleRecords();

writeLayer("countries", countryRecords, {
  primary_key: "country_id",
  relation_note: "All observations, projects, derived comparisons, and exposure candidates should reference country_id.",
});
writeLayer("regions", regionMetadataRecords, {
  scope: "v0.21 regions metadata. Hungary NUTS3 records final region-id, licence, and authoritative topology decisions while public display remains disabled; non-V4 countries keep national-level pending placeholders.",
  primary_key: "region_id",
  relation_note: "Every region references country_id from countries. ADM2 is intentionally excluded from the current boundary verification pass.",
  model_boundary: "Region metadata only. No regional risk layer, forecast, election model, or ADM2 analysis is generated.",
});
writeLayer("region_boundaries", regionBoundaryRecords, {
  scope: "v0.21 authoritative topology validation registry. hu_nuts3_gisco_2024 records authoritative_topology_validated while remaining not_ready_for_display.",
  primary_key: "boundary_id",
  relation_note: "Every boundary record references region_id from regions and country_id from countries.",
  validation_note: "Records track source credibility, public display licence, simplification readiness, front-end suitability, region_id matching, admin codes, and historical boundary issues before geometry ingestion.",
  model_boundary: "Boundary source registry only. No real boundary rendering, regional risk layer, forecast, or election model is generated.",
});
writeLayer("region_indicators", regionIndicatorRecords, {
  scope: "v0.9 regional indicator dictionary. It is intentionally separate from national indicators.",
  primary_key: "region_indicator_id",
  relation_note: "Future region_observations should reference region_indicator_id and region_id. National observations continue to use indicator_id from indicators.",
  validation_note: "First batch covers 10 regional indicators only; national 18 indicators are not automatically downscaled.",
  model_boundary: "Dictionary only. No regional model, risk layer, forecast, or election prediction is generated.",
});
writeLayer("region_observations", regionObservationRecords, {
  scope: "v0.9 regional observation table. First batch creates pending observation positions for V4 ADM1 regions and five regional indicators.",
  primary_key: "region_observation_id",
  relation_note: "Every record references region_id from regions and region_indicator_id from region_indicators. It does not use national indicator_id.",
  validation_note: "Missing regional values are kept as null with value_status=pending. No zero-filling or structural sample values are generated.",
  model_boundary: "Observation structure only. Pending rows do not enter map layers, regional comparison, or future model candidate inputs.",
});
writeLayer("region_quality_checks", regionQualityCheckRecords, {
  scope: "v0.21 regional data quality checks. Hungary NUTS3 records final region-id matching, GISCO licence, and authoritative topology as passed while formal display remains disabled.",
  primary_key: "region_check_id",
  summary: regionQualitySummary,
  sandbox_qa_summary: hungaryNuts3SandboxQaSummary,
  visual_qa_summary: hungaryNuts3VisualQaSummary,
  readiness_gate_summary: hungaryNuts3ReadinessGateSummary,
  region_id_match_summary: hungaryNuts3RegionIdMatchSummary,
  validation_manifest_summary: hungaryNuts3ValidationManifestSummary,
  license_verification_decision_summary: hungaryGiscoLicenseVerificationDecisionSummary,
  authoritative_topology_validation_decision_summary: hungaryAuthoritativeTopologyValidationDecisionSummary,
  relation_note: "Every check references region_id from regions and region_indicator_id from region_indicators. Boundary readiness is cross-checked through region_boundaries.",
  validation_note: "Basic topology QA does not replace authoritative validation. A 20/20 pre-match does not set region_id_matched=true, and pending rows remain explicit.",
  model_boundary: "Quality checks only. No regional model, risk layer, forecast, election prediction, or live boundary rendering is generated.",
});
writeLayer("region_sources", regionSourceRecords, {
  scope: "v0.21 regional source dictionary. GISCO NUTS 2024 records the verified public non-commercial research display terms and required attribution.",
  primary_key: "region_source_id",
  relation_note: "Future region_observations, region_boundaries, election regional data, and project_locations should reference region_source_id where applicable.",
  validation_note: "Licence status is mandatory because regional maps and boundaries may involve public display, simplification, redistribution, and commercial-use constraints.",
  model_boundary: "Source dictionary only. No regional model, risk layer, forecast, election prediction, or live boundary rendering is generated.",
});
writeLayer("project_locations", projectLocationRecords, {
  scope: "v0.9 project location bridge table. It maps current V4 china_projects to regions where the project geography is clear enough.",
  primary_key: "project_location_id",
  relation_note: "Every record references project_id from china_projects and, where available, region_id from regions.",
  validation_note: "Coordinates remain null until a verifiable geocoding or official site source is added. Region mapping does not mean exact site location is verified.",
  model_boundary: "Location bridge only. No China exposure index, regional risk layer, forecast, or live project map layer is generated.",
});
writeLayer("map_layers", mapLayerRecords, {
  scope: "v0.21 map layer registry. hu_nuts3_boundary_pilot records authoritative_topology_validated; is_ready_for_display and public_display_ready remain false.",
  primary_key: "layer_id",
  relation_note: "Each layer declares its data_source_table, geometry_source_table, indicator_or_variable, tooltip fields, filters, source requirements, and quality requirements.",
  validation_note: "All registered real boundary and analytical layers keep is_ready_for_display=false until boundary, source, observation, project-location, and quality checks pass.",
  model_boundary: "Registry only. No risk layer, prediction layer, party-support layer, China exposure index, or live boundary rendering is generated.",
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
  scope: "十国 300 个基础宏观观测、600 个核心扩展观测位置和 80 个 transmission 观测位置；缺失值保持 pending。",
  primary_key: "observation_id",
  relation_note: "Every observation references country_id, indicator_id, and source_id.",
});
writeLayer("data_quality_checks", dataQualityRecords, {
  scope: "10 countries x 12 core extended indicators x 2021-2025 plus 4 transmission indicators x 2023-2024 = 680 QA positions.",
  summary: {
    total_positions: dataQualityRecords.length,
    passed: dataQualityRecords.filter((item) => item.quality_status === "通过").length,
    partially_passed: dataQualityRecords.filter((item) => item.quality_status === "部分通过").length,
    pending: dataQualityRecords.filter((item) => item.quality_status === "待接入").length,
    review_required: dataQualityRecords.filter((item) => item.quality_status === "需复核").length,
    not_applicable: dataQualityRecords.filter((item) => item.quality_status === "不适用").length,
    definition_mismatch: dataQualityRecords.filter((item) => item.quality_status === "定义不一致").length,
  },
  coverage_matrix: coverageMatrixExportRecords,
});
writeLayer("derived_comparisons", derivedComparisonExportRecords, {
  model_boundary: "Fact-derived comparison layer only. No risk score, forecast, scenario, or model output.",
});
writeLayer("china_projects", chinaProjectExportRecords, {
  stage: "v0.40 China Exposure Database",
  relation_note: "Project records may reference event ids and indicator ids. These links are research relationships, not model outputs.",
  model_boundary: "Project verification data only. No China exposure index, risk score, or prediction is computed.",
});
writeLayer("china_exposure_candidates", chinaExposureCandidateRecords, {
  model_boundary: "Candidate variable layer only. It is not a China exposure index.",
});
writeLayer("methodology_rules", methodologyRecords, {
  model_boundary: "Rules and boundaries only; no model, forecast, or scenario output.",
});
writeLayer("model_cards", modelCards, {
  schema_version: "transparent-model-v0.70",
  primary_key: "model_id",
  model_boundary: "Public formulas and limitations only. No machine learning, election forecast, or map risk layer.",
});
writeLayer("model_outputs", modelOutputs, {
  schema_version: "transparent-model-v0.70",
  relation_note: "Every published score retains input_observation_ids and complete input traces.",
  model_boundary: "Scores are comparative analytical tools, not objective risk truths, predictions, or policy ratings.",
});
writeLayer("china_exposure_variables", chinaExposureVariables, {
  schema_version: "china-economic-exposure-v0.81",
  primary_key: "variable_id + country_slug",
  relation_note: "Each calculated variable retains source URLs, method, completeness, eligibility, limitations, and numerator/denominator trace where applicable.",
  model_boundary: "Dimension input layer only. Missing China-origin FDI remains unavailable; project samples and events are not converted into political-risk scores.",
});
writeLayer("china_exposure_outputs", chinaExposureOutputs, {
  schema_version: "china-economic-exposure-v0.81",
  primary_key: "model_id + country_slug",
  model_card: chinaExposureModelCard,
  relation_note: "Dimension-first outputs link back to china_exposure_variables, projects, events, and canonical observations.",
  model_boundary: "Economic exposure is not political influence, geopolitical risk, investment quality, policy merit, or a forecast. Overall output remains unavailable unless at least three core dimensions are sufficient and comparable.",
});
writeLayer("china_exposure_coverage_audit", chinaExposureCoverageAudit, {
  schema_version: "china-exposure-coverage-audit-v0.81",
  primary_key: "country_slug + dimension",
  relation_note: "Country by dimension readiness audit. It distinguishes partial evidence from unavailable data and lists missing variables.",
  model_boundary: "Coverage readiness is not a country ranking, exposure score, political influence score, or risk score.",
});
writeLayer("china_trade_qa", chinaTradeQa, {
  schema_version: "china-trade-qa-v0.81",
  primary_key: "country_slug + year",
  relation_note: "Structural QA for 2024 UN Comtrade HS TOTAL bilateral numerators and world denominators.",
  model_boundary: "QA records do not alter the v0.80 trade normalization or weights.",
});
writeLayer("china_project_coverage_audit", chinaProjectCoverageAudit, {
  schema_version: "china-project-coverage-audit-v0.81",
  primary_key: "country_slug",
  relation_note: "Representative project-database coverage audit. Missing records are never interpreted as zero exposure.",
  model_boundary: "Project coverage is not a census and does not generate a risk or influence score.",
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

writeCanonicalCollection("countries", canonicalCountryRecords, {
  primary_key: "id",
  relation_note: "observations.country, events.country, and projects.country reference ISO3 country ids.",
});
writeCanonicalCollection("indicators", canonicalIndicatorRecords, {
  primary_key: "id",
  pending_v4_indicator_count: v4PendingModelInputIndicators.length,
  model_boundary: "Pending indicator definitions are input contracts only; they have no fabricated observations.",
});
writeCanonicalCollection("observations", canonicalObservationRecords, {
  primary_key: "id",
  model_boundary: "All current national factual model inputs must originate here. Pending values remain null.",
});
writeCanonicalCollection("sources", canonicalSourceRecords, { primary_key: "id" });
writeCanonicalCollection("events", canonicalEventRecords, {
  schema_version: "event-database-v0.35",
  generated_at: chinaExposureDatabaseUpdatedAt,
  primary_key: "id",
  event_types: eventTypeValues,
  model_boundary: "Coded events only record indicator and future-model associations. All current records keep enters_model=false and generate no scores or forecasts.",
});
writeCanonicalCollection("projects", canonicalProjectRecords, {
  schema_version: "china-exposure-database-v0.40",
  generated_at: chinaExposureDatabaseUpdatedAt,
  primary_key: "id",
  relation_note: "related_event_ids and related_indicator_ids establish Event → Project → Indicator research links.",
  model_boundary: "Project records do not generate a China exposure index, risk score, or prediction.",
});

console.log(`Exported research data JSON to ${path.relative(projectRoot, outDir)}`);
console.log(`Exported canonical data foundation to ${path.relative(projectRoot, canonicalDataDir)}`);
