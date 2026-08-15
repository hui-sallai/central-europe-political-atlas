import { modelCards, modelOutputs } from "./modelFramework";
import countriesJson from "../data/countries/countries.json";
import eventsJson from "../data/events/events.json";
import projectsJson from "../data/projects/projects.json";
import {
  calculateScenario,
  getSensitivityShockValues,
  scenarioBacktestRegistry,
  scenarioDefinitions,
  transmissionChannels,
} from "./scenarioFramework";
import {
  spatialResearchObservationsV089,
  spatialResearchRegionsV089,
} from "./spatialResearchV089";
import type {
  ScenarioEvidenceLink,
  ScenarioId,
  ScenarioRegionalContext,
  ScenarioSensitivityPoint,
} from "@/types/Scenario";
import type { Country } from "@/types/Country";
import type { Event } from "@/types/Event";
import type { Project } from "@/types/Project";

const researchCountries = countriesJson.records as Country[];
const researchEvents = eventsJson.records as Event[];
const researchProjects = projectsJson.records as Project[];

const contextIndicatorsByScenario: Record<ScenarioId, string[]> = {
  inflation_resurgence: ["regional_unemployment_rate", "regional_employment_rate", "regional_gdp_per_capita"],
  eu_funds_delay: ["regional_gdp_per_capita", "regional_population"],
  energy_price_shock: ["regional_manufacturing_share"],
  germany_demand_slowdown: ["regional_manufacturing_share", "regional_employment_rate", "regional_unemployment_rate"],
};

const mapLayerByScenario: Record<ScenarioId, string> = {
  inflation_resurgence: "regional_unemployment_rate",
  eu_funds_delay: "regional_gdp_per_capita",
  energy_price_shock: "regional_manufacturing_share",
  germany_demand_slowdown: "regional_manufacturing_share",
};

const regionalIndicatorNames: Record<string, string> = {
  regional_population: "区域人口",
  regional_gdp_per_capita: "区域人均 GDP",
  regional_unemployment_rate: "区域失业率",
  regional_employment_rate: "区域就业率",
  regional_manufacturing_share: "区域制造业 GVA 比重",
};

const regionNameById = new Map(spatialResearchRegionsV089.map((region) => [region.region_id, region.region_name_zh]));
const regionLevelById = new Map(spatialResearchRegionsV089.map((region) => [region.region_id, region.admin_level]));

function latestRegionalFacts(countrySlug: string, indicatorId: string) {
  const records = spatialResearchObservationsV089.filter((record) => (
    record.country_id === countrySlug && record.region_indicator_id === indicatorId
  ));
  const latestYear = [...new Set(records.map((record) => record.year))].sort().at(-1);
  if (!latestYear) return [];
  return records
    .filter((record) => record.year === latestYear)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((record) => ({
      region_id: record.region_id,
      region_name: regionNameById.get(record.region_id) ?? record.region_id,
      admin_level: regionLevelById.get(record.region_id) ?? "unknown",
      indicator_id: indicatorId,
      indicator_name: regionalIndicatorNames[indicatorId] ?? indicatorId,
      year: record.year,
      value: record.value,
      unit: record.unit,
      source_name: record.source_name,
      source_url: record.source_url,
    }));
}

export const scenarioRegionalContexts: ScenarioRegionalContext[] = researchCountries.flatMap((country) => (
  scenarioDefinitions.map((definition) => {
    const contextIndicatorIds = contextIndicatorsByScenario[definition.scenario_id];
    const values = contextIndicatorIds.flatMap((indicatorId) => latestRegionalFacts(country.slug, indicatorId));
    const status = values.length > 0 ? "available" as const : "unavailable" as const;
    return {
      scenario_id: definition.scenario_id,
      country_slug: country.slug,
      status,
      context_indicator_ids: contextIndicatorIds,
      values,
      map_layer_id: status === "available" ? mapLayerByScenario[definition.scenario_id] : null,
      interpretation_boundary: "区域排序只表示同国、同年事实指标位置，用于 structural context；不是情景分数、衰退概率或区域风险。",
      unavailable_reason: status === "unavailable"
        ? country.slug === "serbia" ? "Serbia regional comparison pending。国家级情景不因此被阻断。" : "当前展示层级没有通过质量闸门的对应区域事实。"
        : null,
    };
  })
));

function eventReliability(sourceStatus: string) {
  return sourceStatus === "official" ? "A" : sourceStatus === "manual" ? "B" : "C";
}

export const scenarioEvidenceLinks: ScenarioEvidenceLink[] = researchCountries.flatMap((country) => (
  scenarioDefinitions.flatMap((definition) => {
    const eventLinks: ScenarioEvidenceLink[] = researchEvents
      .filter((event) => event.country_slug === country.slug && event.data_status === "verified")
      .filter((event) => event.affected_indicator.some((indicator) => definition.affected_indicators.includes(indicator) || definition.contextual_variables.includes(indicator)))
      .map((event) => ({
        evidence_link_id: `${definition.scenario_id}_event_${event.id}`,
        scenario_id: definition.scenario_id,
        country_slug: country.slug,
        evidence_type: "event",
        evidence_id: event.id,
        title: event.title,
        relation: event.affected_indicator.some((indicator) => definition.direct_variables.includes(indicator)) ? "direct" : "contextual",
        source_name: event.source_name,
        source_url: event.source_url,
        source_reliability: eventReliability(event.source_status),
        evidence_status: event.coding_status,
        enters_score: false,
      }));
    const projectLinks: ScenarioEvidenceLink[] = researchProjects
      .filter((project) => project.country_slug === country.slug)
      .filter((project) => project.related_indicator_ids.some((indicator) => definition.affected_indicators.includes(indicator) || definition.contextual_variables.includes(indicator)))
      .map((project) => ({
        evidence_link_id: `${definition.scenario_id}_project_${project.id}`,
        scenario_id: definition.scenario_id,
        country_slug: country.slug,
        evidence_type: "project",
        evidence_id: project.id,
        title: project.name,
        relation: project.related_indicator_ids.some((indicator) => definition.direct_variables.includes(indicator)) ? "direct" : "contextual",
        source_name: project.source_name,
        source_url: project.source_url,
        source_reliability: project.source_reliability,
        evidence_status: project.verification_status,
        enters_score: false,
      }));
    return [...eventLinks, ...projectLinks];
  })
));

function evidenceQuality(countrySlug: string, scenarioId: ScenarioId) {
  const records = scenarioEvidenceLinks.filter((record) => record.country_slug === countrySlug && record.scenario_id === scenarioId);
  if (!records.length) return 0;
  const points: number[] = records.map((record) => record.source_reliability === "A" ? 100 : record.source_reliability === "B" ? 80 : record.source_reliability === "C" ? 50 : 0);
  return Math.round(points.reduce((sum, point) => sum + point, 0) / points.length);
}

export const scenarioResults = researchCountries.flatMap((country) => scenarioDefinitions.map((definition) => {
  const regionalContext = scenarioRegionalContexts.find((item) => item.country_slug === country.slug && item.scenario_id === definition.scenario_id);
  return calculateScenario({
    definition,
    countrySlug: country.slug,
    shockValue: definition.default_shock_value,
    cards: modelCards,
    outputs: modelOutputs,
    regionalContextCoverage: regionalContext?.status === "available" ? 100 : 0,
    evidenceQuality: evidenceQuality(country.slug, definition.scenario_id),
  });
}));

export const scenarioSensitivity: ScenarioSensitivityPoint[] = researchCountries.flatMap((country) => scenarioDefinitions.flatMap((definition) => (
  getSensitivityShockValues(definition).map((shockValue) => {
    const regionalContext = scenarioRegionalContexts.find((item) => item.country_slug === country.slug && item.scenario_id === definition.scenario_id);
    const result = calculateScenario({
      definition,
      countrySlug: country.slug,
      shockValue,
      cards: modelCards,
      outputs: modelOutputs,
      regionalContextCoverage: regionalContext?.status === "available" ? 100 : 0,
      evidenceQuality: evidenceQuality(country.slug, definition.scenario_id),
    });
    return {
      scenario_id: definition.scenario_id,
      country_slug: country.slug,
      shock_value: shockValue,
      baseline_score: result.baseline_score,
      scenario_score: result.scenario_score,
      score_change: result.score_change,
      status: result.status,
    };
  })
)));

export const scenarioTransmissionInputs = [...new Set(transmissionChannels.map((channel) => channel.affected_indicator))].map((indicatorId) => {
  const channels = transmissionChannels.filter((channel) => channel.affected_indicator === indicatorId);
  const nationalTraces = modelOutputs.flatMap((output) => output.inputs.filter((input) => input.indicator_id === indicatorId));
  const regionalFacts = spatialResearchObservationsV089.filter((record) => record.region_indicator_id === indicatorId);
  const countryCount = new Set([
    ...modelOutputs.filter((output) => output.inputs.some((input) => input.indicator_id === indicatorId)).map((output) => output.country_slug),
    ...regionalFacts.map((record) => record.country_id),
  ]).size;
  return {
    indicator_id: indicatorId,
    role: [...new Set(channels.map((channel) => channel.direct_or_indirect))].join(" / "),
    scenario_usage: [...new Set(channels.map((channel) => channel.scenario_id))],
    model_usage: [...new Set(channels.map((channel) => channel.affected_model))],
    availability: `${countryCount} / 10 countries`,
    source: [...new Set([...nationalTraces.map((trace) => trace.source_name), ...regionalFacts.map((record) => record.source_name)])].join(" / ") || "待接入",
    enters_recalculation: channels.some((channel) => channel.direct_or_indirect === "direct" && scenarioDefinitions.some((definition) => definition.scenario_id === channel.scenario_id && definition.adjusted_indicator_id === indicatorId)),
  };
});

const activeProjectPattern = /运营|在建|施工|投产|生产|工厂|控股|收购/;
const excludedProjectPattern = /终止|取消|退出|暂停/;
export const chinaProjectDisruptionDecision = {
  decision: "context_only" as const,
  eligible_project_ids: researchProjects.filter((project) => (
    project.verified
    && project.investment !== null
    && Boolean(project.city)
    && activeProjectPattern.test(project.status)
    && !excludedProjectPattern.test(project.status)
  )).map((project) => project.id),
  reason: "少数项目满足主体、地点、金额和状态条件，可用于 project disruption context；但缺少统一产能、年度流量与经验弹性，不能计算精确 GDP、就业或 China Exposure 冲击。",
  score_enabled: false,
};

export const scenarioExportLayers = {
  scenario_definitions: scenarioDefinitions,
  transmission_channels: transmissionChannels,
  scenario_results: scenarioResults,
  scenario_evidence_links: scenarioEvidenceLinks,
  scenario_sensitivity: scenarioSensitivity,
  backtest_registry: scenarioBacktestRegistry,
};
