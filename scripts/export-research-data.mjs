import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(projectRoot, "public", "research-data");
const generatedAt = "2026-07-05";
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

const { countries } = require("../src/lib/data.ts");
const {
  chinaProjectRecords,
  countryTableRecords,
  extendedObservations,
  sourceTableRecords,
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

function normalizeCountry(country) {
  const tableRecord = countryTableRecords.find((item) => item.countrySlug === country.slug);

  return {
    country_slug: country.slug,
    country_code: tableRecord?.countryCode ?? country.iso2,
    iso2: country.iso2,
    name_zh: country.nameZh,
    name_en: country.nameEn,
    capital_zh: country.capitalZh,
    polity_zh: country.polityZh,
    parliament_zh: country.parliamentZh,
    currency: country.currency,
    eu_member: country.euMember,
    eurozone_member: tableRecord?.eurozoneMember ?? false,
    nato_member: country.natoMember,
    regional_group: tableRecord?.regionalGroup ?? "Central Europe sample",
    priority: tableRecord?.priority ?? null,
    v4_template_country: v4QualityCountrySlugs.includes(country.slug),
    notes: tableRecord?.notes ?? country.summaryZh,
  };
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

const countryRecords = countries.map(normalizeCountry);
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
const sourceRecords = sourceTableRecords.map((source) => ({
  source_id: source.sourceId,
  source_name: source.sourceName,
  source_type: source.sourceType,
  reliability_level: source.reliabilityLevel,
  url: source.url,
  update_frequency: source.updateFrequency,
  usage_notes: source.usageNotes,
}));
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
    year: project.year,
    project_status: project.projectStatus,
    status_timeline: project.statusTimeline,
    amount_evidence: project.amountEvidence,
    actor_evidence: project.actorEvidence,
    source_url: project.sourceUrl,
    source_reliability_level: project.sourceReliabilityLevel,
    risk_tags: project.riskTags,
    quantification_status: project.quantificationStatus,
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

writeJson("countries.json", envelope("countries", countryRecords));
writeJson("indicators.json", envelope("indicators", indicatorRecords));
writeJson("observations.json", envelope("observations", observationRecords, {
  note: "Unified research observations. Includes macro_time_series for ten countries and v4_extended observations for V4 countries.",
}));
writeJson("sources.json", envelope("sources", sourceRecords, {
  reliability_levels: {
    A: "Official statistical agencies, central banks, EU institutions, international organizations.",
    B: "Mainstream news agencies, authoritative think tanks, official annual reports.",
    C: "Local media, company announcements, industry websites.",
    D: "Unverified secondary sources, social media, unclear provenance.",
  },
}));
writeJson("china_projects.json", envelope("china_projects", chinaProjectExportRecords, {
  model_boundary: "Project verification data only. No China exposure index is computed.",
}));
writeJson("derived_metrics.json", envelope("derived_metrics", derivedMetricRecords(), {
  model_boundary: "Fact-derived comparison layer only. No risk score, forecast, scenario, or model output.",
}));

console.log(`Exported research data JSON to ${path.relative(projectRoot, outDir)}`);
