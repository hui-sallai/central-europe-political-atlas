"use client";
import { LocalizedContent } from "@/i18n/LocalizedContent";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HistoricalCoverage, useHistoricalCoverage } from "./HistoricalCoverage";
import { commonObservationPeriods, inRanges, compactPeriods, contractFor } from "@/lib/historicalCoverage";
import { regionalHistoricalPoints, type RegionalHistoryRuntime, regionalDifference, type RegionalComparisonPoint } from "@/lib/regionalComparison";
import { RegionHistoryTrend } from "@/components/RegionHistoryTrend";
import { formatNumber as sharedFormatNumber, formatWithUnit } from "@/lib/format";
import { buildMapSvg, exportMap } from "@/lib/mapExport";
import { PLATFORM_NAME, PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl, sourceInstitution, type SnapshotRow } from "@/lib/researchSnapshot";
import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];
type Feature = {
  properties: { region_id?: string; region_code?: string; region_name?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Polygon | MultiPolygon };
};

type Country = {
  country_id: string;
  country_name_zh: string;
  country_name_en: string;
  geometry_url: string;
  region_count: number;
  approved_layers: string[];
  rejected_layers: string[];
  source_name: string;
  source_url: string;
  attribution: string;
  blocker: string;
  latest_common_year: string;
  admin_level: string;
  classification_system: string;
  comparison_group: string;
};

type Region = {
  region_id: string;
  country_id: string;
  region_name_zh: string;
  region_name_en: string;
  region_name_local: string;
  admin_level: string;
  admin_code: string;
  capital_or_main_city: string;
};

type Observation = {
  region_observation_id: string;
  country_id: string;
  region_id: string;
  region_indicator_id: string;
  year: string;
  value: number;
  unit: string;
  value_status: string;
  source_name: string;
  source_url: string;
  source_reliability: string;
  calculation_method: string;
  last_updated: string;
  notes: string;
};

type Project = {
  project_location_id: string;
  project_id: string;
  project_name: string;
  country_id: string;
  region_id: string;
  region_name: string;
  city_or_locality: string;
  location_role: string;
  location_precision: string;
  marker_type: string;
  confidence: string;
  source_reliability: string;
  source_url: string;
  chinese_actor: string;
  local_actor: string;
  sector: string;
  project_status: string;
  project_status_code: string;
  amount: number | null;
  currency: string | null;
  year: string;
  quantification_status: string;
  risk_tags: string[];
  note: string;
};

type Layer = {
  layer_id: string;
  name_zh: string;
  group: string;
  unit: string;
  layer_type: string;
  comparison_allowed: boolean;
  definition: string;
  source_requirement: string;
  interpretation_boundary: string;
};

type Eligibility = {
  country_id: string;
  layer_id: string;
  admin_level: string;
  definition: string;
  unit: string;
  available_years: string[];
  latest_available_year: string;
  comparison_eligible: boolean;
  blocker: string;
};

type MapMode = "country" | "comparison";
type Classification = "quantile" | "equal_interval";

const width = 660;
const height = 430;
const padding = 24;
const colors = ["#e7efeb", "#cbded6", "#a9cbbd", "#78ad9a", "#3e7d70"];
const noDataColor = "var(--map-nodata)";

function polygons(feature: Feature): MultiPolygon {
  return feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as Polygon] : feature.geometry.coordinates as MultiPolygon;
}

function positionsFor(feature: Feature) {
  return polygons(feature).flatMap((polygon) => polygon.flat());
}

function projector(features: Feature[]) {
  const points = features.flatMap(positionsFor);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minLon = Math.min(...xs);
  const maxLon = Math.max(...xs);
  const minLat = Math.min(...ys);
  const maxLat = Math.max(...ys);
  const lonScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const xSpan = (maxLon - minLon) * lonScale || 1;
  const ySpan = maxLat - minLat || 1;
  const scale = Math.min((width - padding * 2) / xSpan, (height - padding * 2) / ySpan);
  const offsetX = (width - xSpan * scale) / 2;
  const offsetY = (height - ySpan * scale) / 2;
  return ([lon, lat]: Position): Position => [offsetX + (lon - minLon) * lonScale * scale, offsetY + (maxLat - lat) * scale];
}

function pathFor(feature: Feature, project: (position: Position) => Position) {
  return polygons(feature).map((polygon) => polygon.map((ring) => `${ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ")} Z`).join(" ")).join(" ");
}

function centerFor(feature: Feature, project: (position: Position) => Position) {
  const points = positionsFor(feature);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return project([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
}

function thresholdsFor(values: number[], classification: Classification) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return [];
  const binCount = Math.min(5, new Set(sorted).size);
  if (binCount <= 1) return [];
  if (classification === "equal_interval") {
    const min = sorted[0];
    const max = sorted.at(-1) ?? min;
    return Array.from({ length: binCount - 1 }, (_, index) => min + ((max - min) * (index + 1)) / binCount);
  }
  return Array.from({ length: binCount - 1 }, (_, index) => sorted[Math.ceil(((index + 1) * sorted.length) / binCount) - 1]);
}

function colorFor(value: number | null, thresholds: number[]) {
  if (value === null) return noDataColor;
  const index = thresholds.findIndex((threshold) => value <= threshold);
  return colors[index === -1 ? thresholds.length : index];
}

function formatNumber(value: number | null, maximumFractionDigits = 1) {
  return sharedFormatNumber(value, { maximumFractionDigits });
}

function intersectYears(yearGroups: string[][]) {
  if (!yearGroups.length) return [];
  return yearGroups[0].filter((year) => yearGroups.every((group) => group.includes(year))).sort();
}

function countryPath(countryId: string) {
  return `/countries/${countryId}`;
}

function MapPane({
  country,
  layer,
  year,
  observations,
  projects,
  sharedThresholds,
  classification,
  selectedRegionIds,
  onRegionClick,
  onProjectClick,
}: {
  country: Country;
  layer: string;
  year: string;
  observations: Observation[];
  projects: Project[];
  sharedThresholds: number[] | null;
  classification: Classification;
  selectedRegionIds: string[];
  onRegionClick: (regionId: string) => void;
  onProjectClick: (project: Project) => void;
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [hovered, setHovered] = useState<{ regionId: string; name: string; code: string; value: number | null } | null>(null);

  useEffect(() => {
    if (!country.geometry_url || !country.approved_layers.includes("regional_boundary")) {
      return;
    }
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}${country.geometry_url}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((collection) => {
        const next = (collection.features as Feature[]).filter((feature) => feature.properties.region_id && feature.geometry);
        setFeatures(next);
        setLoadState("ready");
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadState("error");
      });
    return () => controller.abort();
  }, [country]);

  const project = useMemo(() => features.length ? projector(features) : null, [features]);
  const paths = useMemo(() => project ? features.map((feature) => ({ feature, d: pathFor(feature, project) })) : [], [features, project]);
  const currentObservations = observations.filter((item) => item.country_id === country.country_id && item.region_indicator_id === layer && item.year === year);
  const valueByRegion = new Map(currentObservations.map((item) => [item.region_id, item.value]));
  const noDataPatternId = `no-data-${country.country_id}`;
  const selectedFeature = features.find((feature) => selectedRegionIds.includes(feature.properties.region_id ?? ""));
  const selectedHere = selectedFeature ? { name: selectedFeature.properties.region_name ?? selectedFeature.properties.region_id ?? "", value: valueByRegion.get(selectedFeature.properties.region_id ?? "") ?? null } : null;
  const localThresholds = thresholdsFor(currentObservations.map((item) => item.value), classification);
  const thresholds = sharedThresholds ?? localThresholds;
  const countryProjects = projects.filter((item) => item.country_id === country.country_id);

  return (
    <LocalizedContent>{<article className="border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <div><p className="font-semibold">{country.country_name_zh}</p><p className="text-xs text-[var(--muted)]">{country.classification_system} / {country.admin_level}</p></div>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{country.region_count} 区域</span>
      </div>
      {loadState === "loading" ? <div className="grid h-[340px] place-items-center text-sm text-[var(--muted)]">正在按国家加载边界…</div> : null}
      {loadState === "error" ? <div className="grid h-[340px] place-items-center bg-amber-50 p-6 text-center text-sm text-amber-950">空间比较待接入：{country.blocker}</div> : null}
      {loadState === "ready" && project ? (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${country.country_name_zh}${year ? ` ${year}` : ""} 区域事实地图`} data-map-export={country.country_id}>
            <defs><pattern id={noDataPatternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={noDataColor} /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--map-hatch)" strokeWidth="2" /></pattern></defs>
            {[...paths].sort((a, b) => Number(selectedRegionIds.includes(a.feature.properties.region_id ?? "")) - Number(selectedRegionIds.includes(b.feature.properties.region_id ?? ""))).map(({ feature, d }) => {
              const regionId = feature.properties.region_id ?? "";
              const value = valueByRegion.get(regionId) ?? null;
              const selected = selectedRegionIds.includes(regionId);
              const isHovered = hovered?.regionId === regionId;
              const choropleth = !(layer === "regional_boundary" || layer === "china_project_locations");
              return <path key={regionId} d={d} fill={!choropleth ? "var(--map-neutral)" : value === null ? `url(#${noDataPatternId})` : colorFor(value, thresholds)} stroke={selected ? "var(--foreground)" : isHovered ? "var(--muted)" : "var(--map-border)"} strokeWidth={selected ? 2.4 : isHovered ? 1.6 : 0.75} className="cursor-pointer" onMouseEnter={() => setHovered({ regionId, name: feature.properties.region_name ?? regionId, code: feature.properties.region_code ?? "—", value })} onMouseLeave={() => setHovered(null)} onClick={() => onRegionClick(regionId)} />;
            })}
            {layer === "china_project_locations" ? countryProjects.map((item, index) => {
              const feature = features.find((candidate) => candidate.properties.region_id === item.region_id);
              if (!feature) return null;
              const [x, y] = centerFor(feature, project);
              const offset = (index % 4) * 5;
              const city = item.location_precision === "city_level" || item.location_precision === "exact_site";
              return city
                ? <circle key={item.project_location_id} cx={x + offset} cy={y - offset} r="5.5" fill="#9d654d" stroke="var(--map-border)" strokeWidth="1.5" className="cursor-pointer" onClick={() => onProjectClick(item)}><title lang="zh-CN" data-original-language="zh-CN">{item.project_name}</title></circle>
                : <rect key={item.project_location_id} x={x - 5 + offset} y={y - 5 - offset} width="10" height="10" rx="2" fill="#6f7f99" stroke="var(--map-border)" strokeWidth="1.5" className="cursor-pointer" onClick={() => onProjectClick(item)}><title lang="zh-CN" data-original-language="zh-CN">{item.project_name}</title></rect>;
            }) : null}
          </svg>
          <div className="min-h-12 border-t border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--muted)]" aria-live="polite">
            {hovered ? <><strong className="text-[var(--foreground)]">{hovered.name}</strong> · {hovered.code} · {layer === "regional_boundary" ? "边界" : hovered.value === null ? "该年份无数据" : `${formatNumber(hovered.value)}${currentObservations[0]?.unit ? ` ${currentObservations[0].unit}` : ""}`} · {year || "不适用"}</> : selectedHere ? <>已选：<strong className="text-[var(--foreground)]">{selectedHere.name}</strong> · {layer === "regional_boundary" ? "边界" : selectedHere.value === null ? "该年份无数据" : `${formatNumber(selectedHere.value)}${currentObservations[0]?.unit ? ` ${currentObservations[0].unit}` : ""}`} · {year || "不适用"}（悬停其他区域可比较）</> : "悬停查看区域、代码、指标值与年份；点击加入区域比较。"}
          </div>
        </>
      ) : null}
    </article>}</LocalizedContent>
  );
}

export function ComparativeSpatialWorkbench({
  countries,
  regions,
  observations,
  projects,
  layers,
  eligibility,
}: {
  countries: Country[];
  regions: Region[];
  observations: Observation[];
  projects: Project[];
  layers: Layer[];
  eligibility: Eligibility[];
}) {
  const readyCountries = useMemo(() => countries.filter((country) => country.approved_layers.includes("regional_boundary")), [countries]);
  const defaultCountry = readyCountries.find((country) => country.country_id === "hungary") ?? readyCountries[0];
  const [mode, setMode] = useState<MapMode>("country");
  const [countryIds, setCountryIds] = useState<string[]>(defaultCountry ? [defaultCountry.country_id] : []);
  const [layer, setLayer] = useState("regional_gdp_per_capita");
  const [year, setYear] = useState("2024");
  const [classification, setClassification] = useState<Classification>("quantile");
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [activeRegionId, setActiveRegionId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urlReady, setUrlReady] = useState(false);
  const {inventory: coverageInventory, error: coverageError}=useHistoricalCoverage();
  const [comparisonYear,setComparisonYear]=useState("");
  const [historyLoadState,setHistoryLoadState]=useState("loading");
  const [historyByCountry,setHistoryByCountry]=useState<Record<string,RegionalHistoryRuntime>>({});
  const [loadedObservations, setLoadedObservations] = useState<Observation[]>(observations);
  const [loadedCountryKey, setLoadedCountryKey] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const validRequestedCountries = (params.get("countries") ?? params.get("country") ?? "").split(",").filter((id) => readyCountries.some((country) => country.country_id === id)).slice(0, 4);
      const comparisonRequested = params.get("mode") === "comparison" || validRequestedCountries.length > 1;
      const firstRequested = readyCountries.find((country) => country.country_id === validRequestedCountries[0]);
      const sameLevelCountries = comparisonRequested && firstRequested
        ? validRequestedCountries.filter((id) => readyCountries.find((country) => country.country_id === id)?.comparison_group === firstRequested.comparison_group)
        : validRequestedCountries.slice(0, 1);
      const requestedMode = comparisonRequested && sameLevelCountries.length >= 2 ? "comparison" : "country";
      if (sameLevelCountries.length) setCountryIds(requestedMode === "comparison" ? sameLevelCountries : sameLevelCountries.slice(0, 1));
      setMode(requestedMode);
      if (params.get("layer")) setLayer(params.get("layer")!);
      if (params.get("year")) setYear(params.get("year")!);
      if (params.has("comparison_year")) setComparisonYear(params.get("comparison_year")!);
      if (params.get("classification") === "equal_interval") setClassification("equal_interval");
      const requestedRegions = (params.get("regions") ?? "").split(",").filter(Boolean).slice(0, 5);
      setSelectedRegionIds(requestedRegions);
      setActiveRegionId(requestedRegions[0] ?? "");
      setSelectedProjectId(params.get("project") ?? "");
      setSectorFilter(params.get("sector") ?? "all");
      setStatusFilter(params.get("status") ?? "all");
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [readyCountries]);

  const selectedCountries = countryIds.map((id) => readyCountries.find((country) => country.country_id === id)).filter(Boolean) as Country[];
  const selectedCountryKey = selectedCountries.map((country) => country.country_id).join(",");
  useEffect(() => {
    if (!selectedCountryKey) return;
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    Promise.all(selectedCountryKey.split(",").map((countryId) =>
      fetch(`${basePath}/data/regional/v089/map-observations/${countryId}.json`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then((payload) => payload.records as Observation[]),
    )).then((groups) => { setLoadedObservations(groups.flat()); setLoadedCountryKey(selectedCountryKey); }).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLoadedObservations([]);
    });
    return () => controller.abort();
  }, [selectedCountryKey]);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all(selectedCountryKey.split(',').filter(Boolean).map(async country=>{
      const response=await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??''}/research-data/regional-history/${country}.json`,{signal:controller.signal});
      if(!response.ok)return null;
      const data=await response.json() as RegionalHistoryRuntime;
      return data.country_id===country?data:null;
    })).then(rows=>{if(!controller.signal.aborted){setHistoryByCountry(Object.fromEntries(rows.filter((r):r is RegionalHistoryRuntime=>r!==null).map(r=>[r.country_id,r])));setHistoryLoadState(rows.some(r=>r===null)?'error':'ready');}}).catch(()=>{if(!controller.signal.aborted){setHistoryByCountry({});setHistoryLoadState('error');}});
    return()=>controller.abort();
  },[selectedCountryKey]);
  const mapObservations = loadedObservations;
  const comparisonGroup = selectedCountries[0]?.comparison_group;
  const comparableCountryOptions = readyCountries.filter((country) => country.comparison_group === comparisonGroup);
  const layerOptions = layers.filter((candidate) => {
    if (mode === "country") return selectedCountries[0]?.approved_layers.includes(candidate.layer_id);
    return candidate.comparison_allowed && selectedCountries.length >= 2 && selectedCountries.every((country) => eligibility.some((record) => record.country_id === country.country_id && record.layer_id === candidate.layer_id && record.comparison_eligible));
  });
  const effectiveLayer = layerOptions.some((candidate) => candidate.layer_id === layer) ? layer : layerOptions.find((candidate) => candidate.layer_id === "regional_population")?.layer_id ?? layerOptions[0]?.layer_id ?? "regional_boundary";
  const currentLayer = layers.find((candidate) => candidate.layer_id === effectiveLayer);
  const yearGroups = selectedCountries.map((country) => eligibility.find((record) => record.country_id === country.country_id && record.layer_id === effectiveLayer)?.available_years ?? []);
  const countryYears = currentLayer?.layer_type === "choropleth"
    ? mode === "comparison" ? intersectYears(yearGroups) : yearGroups[0] ?? []
    : [];
  const selectedFrames = selectedRegionIds.map(id => {
    const region = regions.find(r => r.region_id === id);
    const country = selectedCountries.find(c => c.country_id === region?.country_id);
    const gate = eligibility.find(e => e.country_id === region?.country_id && e.layer_id === effectiveLayer);
    return region && country && gate ? `${gate.definition}|${gate.unit}|${region.admin_level}|${country.classification_system}` : null;
  });
  const commonFrame = selectedFrames.every(f => f !== null && f === selectedFrames[0]);
  const availableYears = selectedRegionIds.length > 1 ? countryYears.filter(y => commonFrame && selectedRegionIds.every(id => mapObservations.some(o => o.region_id === id && o.region_indicator_id === effectiveLayer && o.year === y && Number.isFinite(o.value)))) : countryYears;
  const effectiveYear = currentLayer?.layer_type === "choropleth" ? year : "";

  useEffect(() => {
    if (!urlReady || !selectedCountries.length) return;
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.searchParams.set("country", selectedCountries[0].country_id);
    if (mode === "comparison") url.searchParams.set("countries", selectedCountries.map((country) => country.country_id).join(","));
    else url.searchParams.delete("countries");
    url.searchParams.set("layer", effectiveLayer);
    if (comparisonYear) url.searchParams.set("comparison_year",comparisonYear); else url.searchParams.delete("comparison_year");
    if (effectiveYear) url.searchParams.set("year", effectiveYear); else url.searchParams.delete("year");
    url.searchParams.set("classification", classification);
    if (selectedRegionIds.length) url.searchParams.set("regions", selectedRegionIds.join(",")); else url.searchParams.delete("regions");
    if (selectedProjectId) url.searchParams.set("project", selectedProjectId); else url.searchParams.delete("project");
    if (sectorFilter !== "all") url.searchParams.set("sector", sectorFilter); else url.searchParams.delete("sector");
    if (statusFilter !== "all") url.searchParams.set("status", statusFilter); else url.searchParams.delete("status");
    window.history.replaceState({}, "", url);
  }, [classification, comparisonYear, effectiveLayer, effectiveYear, mode, selectedCountries, selectedProjectId, selectedRegionIds, sectorFilter, statusFilter, urlReady]);

  const filteredProjects = projects.filter((project) =>
    ["high", "medium"].includes(project.confidence) &&
    selectedCountries.some((country) => country.country_id === project.country_id) &&
    (sectorFilter === "all" || project.sector === sectorFilter) &&
    (statusFilter === "all" || project.project_status_code === statusFilter),
  );
  const sectors = [...new Set(projects.filter((project) => ["high", "medium"].includes(project.confidence)).map((project) => project.sector))].sort();
  const statuses = [...new Set(projects.filter((project) => ["high", "medium"].includes(project.confidence)).map((project) => project.project_status_code))].sort();
  const scaleValues = mapObservations.filter((item) => selectedCountries.some((country) => country.country_id === item.country_id) && item.region_indicator_id === effectiveLayer && item.year === effectiveYear).map((item) => item.value);
  const sharedThresholds = mode === "comparison" ? thresholdsFor(scaleValues, classification) : null;
  const legendThresholds = sharedThresholds ?? thresholdsFor(scaleValues, classification);
  const legendItems = (scaleValues.length ? colors.slice(0, legendThresholds.length + 1) : []).map((color, index) => ({ color, label: index === 0 ? `≤ ${formatNumber(legendThresholds[0] ?? scaleValues[0] ?? 0)}` : index <= legendThresholds.length - 1 ? `${formatNumber(legendThresholds[index - 1])}–${formatNumber(legendThresholds[index])}` : `> ${formatNumber(legendThresholds.at(-1) ?? 0)}` }));
  // Map export (SVG / PNG): the panes on screen plus title, legend and source/boundary attribution; light print palette.
  const locale = useLocale();
  const currentMapSpec = () => {
    if (!currentLayer) throw new Error("No selected map layer");
    const names = selectedCountries.map((country) => locale === "en" ? country.country_name_en : country.country_name_zh).join(locale === "en" ? ", " : "、");
    const accessed = new Date().toLocaleDateString("sv-SE");
    return {
      title: `${locale === "en" ? englishText(currentLayer.name_zh) : currentLayer.name_zh} · ${names}`,
      subtitle: locale === "en" ? `${englishText(currentLayer.unit)} · ${effectiveYear || "Year not applicable"} · ${classification === "quantile" ? "Quantile classes" : "Equal-interval classes"} · Regional factual description, not a ranking conclusion` : `${currentLayer.unit} · ${effectiveYear || "年份不适用"} · ${classification === "quantile" ? "分位数分级（Quantile）" : "等距分级（Equal interval）"} · 区域事实描述，不构成排名结论`,
      legend: legendItems,
      noDataLabel: locale === "en" ? "No data (hatched)" : "无数据（斜线）",
      source: locale === "en" ? `Data: ${selectedCountries.map(country => country.source_name).join(" / ")}; administrative boundaries: ${selectedCountries.map(country => country.attribution).join(" / ")}. Exported from ${PLATFORM_NAME} (${PLATFORM_VERSION.split(" ")[0]}), ${accessed}.` : `数据：${selectedCountries.map((country) => country.source_name).join(" / ")}；行政边界：${selectedCountries.map((country) => country.attribution).join(" / ")}。导出自 ${PLATFORM_NAME}（${PLATFORM_VERSION.split(" ")[0]}），${accessed}。`,
      fileName: `atlas-map-${currentLayer.layer_id}-${selectedCountries.map((country) => country.country_id).join("-")}-${effectiveYear || "na"}`,
    };
  };
  const exportCurrentMap = (format: "svg" | "png") => { void exportMap(currentMapSpec(), format); };
  const mapSnapshot = () => {
    const paneCountries = [...document.querySelectorAll<SVGSVGElement>("svg[data-map-export]")].map((svg) => svg.dataset.mapExport);
    if (selectedCountries.some((country) => !paneCountries.includes(country.country_id))) throw new Error("Map geometry not ready");
    const visibleObservations = mapObservations.filter((item) => selectedCountries.some((country) => country.country_id === item.country_id) && item.region_indicator_id === effectiveLayer && item.year === effectiveYear);
    const snapshotRows: SnapshotRow[] = currentLayer?.layer_type === "choropleth" ? regions.filter((region) => selectedCountries.some((country) => country.country_id === region.country_id)).map((region) => {
      const record = visibleObservations.find((item) => item.region_id === region.region_id);
      const country = selectedCountries.find((item) => item.country_id === region.country_id)!;
      return { id: record?.region_observation_id ?? `${region.region_id}:${effectiveLayer}:${effectiveYear}`, country: region.country_id, indicator: effectiveLayer, period: effectiveYear, value: record?.value ?? null, unit: record?.unit ?? currentLayer?.unit ?? "", layer: "regional_descriptive", status: record?.value_status ?? "missing", region_id: region.region_id, region_name: region.region_name_zh, region_code: region.admin_code, classification_system: country.classification_system, admin_level: country.admin_level, selected_region: selectedRegionIds.includes(region.region_id), definition: currentLayer?.definition,
        source: { institution: sourceInstitution(record?.source_name ?? country.source_name, record?.source_url ?? country.source_url), dataset: record?.source_name ?? country.source_name, source_url: record?.source_url ?? country.source_url, updated_at: record?.last_updated, unit: record?.unit ?? currentLayer?.unit, reliability: record?.source_reliability, definition: currentLayer?.definition, source_layer: "regional_descriptive" } };
    }) : effectiveLayer === "china_project_locations" ? filteredProjects.map((item) => ({ id: item.project_location_id, country: item.country_id, indicator: effectiveLayer, period: item.year, value: item.amount, unit: item.currency ?? "", layer: "project_location_descriptive", status: item.project_status, region_id: item.region_id, project_name: item.project_name, confidence: item.confidence, location_precision: item.location_precision, source: { institution: "原始项目来源（见链接）", dataset: item.project_name, source_url: item.source_url, reliability: item.source_reliability, source_layer: "project_location_descriptive" } })) : regions.filter((region) => selectedCountries.some((country) => country.country_id === region.country_id)).map((region) => {
      const country = selectedCountries.find((item) => item.country_id === region.country_id)!;
      return { id: region.region_id, country: region.country_id, indicator: "regional_boundary", period: "", value: null, unit: "", layer: "geography_descriptive", status: "boundary_only", region_code: region.admin_code, classification_system: country.classification_system, admin_level: country.admin_level, selected_region: selectedRegionIds.includes(region.region_id), source: { institution: country.source_name, dataset: country.classification_system, source_url: country.source_url, source_layer: "geography_descriptive" } };
    });
    return { title: currentMapSpec().title, view_type: "regional_map" as const, page_path: "/map/", shareable_view_url: currentSnapshotUrl("/map/"), countries: selectedCountries.map((country) => country.country_id), indicators: [effectiveLayer], rows: snapshotRows,
      filters: { mode, layer: effectiveLayer, year: effectiveYear, classification, selected_regions: selectedRegionIds, project: selectedProjectId, sector: sectorFilter, status: statusFilter }, comparison: { scale: mode === "comparison" ? "shared" : "national", thresholds: legendThresholds },
      comparability_status: mode === "comparison" ? "same_level_definition_unit_year" : "within_country_geography_only",
      limitations: [currentLayer?.interpretation_boundary ?? "", "区域选择只作高亮；快照保留地图上全部区域，包括斜线缺失区域。", ...selectedCountries.map((country) => `${country.country_id}: ${country.classification_system} / ${country.admin_level}; ${country.attribution}`)].filter(Boolean),
      figure: { name: "map.svg" as const, svg: buildMapSvg(currentMapSpec()), metadata: { layer: effectiveLayer, year: effectiveYear, classification, thresholds: legendThresholds, legend: legendItems, palette: "neutral_print", geographies: selectedCountries.map((country) => ({ country: country.country_id, classification: country.classification_system, level: country.admin_level, attribution: country.attribution })) } },
    };
  };
  const selectedRegions = selectedRegionIds.map((id) => regions.find((region) => region.region_id === id)).filter(Boolean) as Region[];
  const activeRegion = regions.find((region) => region.region_id === activeRegionId) ?? selectedRegions[0];
  const selectedProject = projects.find((project) => project.project_location_id === selectedProjectId || project.project_id === selectedProjectId);
  const profileYear = effectiveYear || selectedCountries[0]?.latest_common_year || "2024";
  const layerGroups = [...new Set(layerOptions.map((item) => item.group))];

  const onRegionClick = (regionId: string) => {
    setActiveRegionId(regionId);
    setSelectedProjectId("");
    setSelectedRegionIds((current) => current.includes(regionId) ? current.filter((id) => id !== regionId) : current.length < 5 ? [...current, regionId] : [...current.slice(1), regionId]);
  };
  const onProjectClick = (project: Project) => {
    setSelectedProjectId(project.project_location_id);
    setActiveRegionId(project.region_id);
    setSelectedRegionIds((current) => current.includes(project.region_id) ? current : current.length < 5 ? [...current, project.region_id] : [...current.slice(1), project.region_id]);
  };
  const setSingleCountry = (countryId: string) => {
    setCountryIds([countryId]);
    setSelectedRegionIds([]);
    setActiveRegionId("");
    setSelectedProjectId("");
  };
  const toggleComparisonCountry = (countryId: string) => {
    setCountryIds((current) => current.includes(countryId)
      ? current.length > 2 ? current.filter((id) => id !== countryId) : current
      : current.length < 4 ? [...current, countryId] : current);
    setSelectedRegionIds([]);
  };
  const activateComparison = () => {
    const base = selectedCountries[0] ?? defaultCountry;
    const peers = readyCountries.filter((country) => country.comparison_group === base?.comparison_group && country.country_id !== base?.country_id);
    setCountryIds(base && peers[0] ? [base.country_id, peers[0].country_id] : countryIds);
    setMode("comparison");
    setSelectedRegionIds([]);
  };

  const observationFor = (regionId: string, indicatorId: string) => mapObservations.find((item) => item.region_id === regionId && item.region_indicator_id === indicatorId && item.year === profileYear);
  const activeLayerObservation = activeRegion ? observationFor(activeRegion.region_id, effectiveLayer) : undefined;
  const countryBenchmarkRecords = activeRegion ? mapObservations.filter((item) => item.country_id === activeRegion.country_id && item.region_indicator_id === effectiveLayer && item.year === profileYear) : [];
  const countryBenchmarkMean = countryBenchmarkRecords.length ? countryBenchmarkRecords.reduce((sum, item) => sum + item.value, 0) / countryBenchmarkRecords.length : null;
  const rankingRows = mapObservations
    .filter((item) => selectedCountries.some((country) => country.country_id === item.country_id) && item.region_indicator_id === effectiveLayer && item.year === effectiveYear)
    .sort((a, b) => b.value - a.value);

  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const historicalPoints=Object.values(historyByCountry).filter(d=>selectedCountryKey.split(',').includes(d.country_id)).flatMap(regionalHistoricalPoints);
  const regionalRows=selectedRegions.map(region=>{
    const country=selectedCountries.find(c=>c.country_id===region.country_id);
    const gate=eligibility.find(g=>g.country_id===region.country_id&&g.layer_id===effectiveLayer);
    const permitted=!!country&&!!gate&&currentLayer?.layer_type==='choropleth'&&(selectedCountries.length===1||(!!currentLayer.comparison_allowed&&gate.comparison_eligible));
    const contract=contractFor(coverageInventory,region.country_id,effectiveLayer,"annual",region.region_id);
    const geography=contract?.nuts?.vintage??"";
    const frame=`${gate?.definition}|${geography}|${region.admin_level}`;
    const ranges=coverageInventory?.comparability.regional[effectiveLayer]?.by_country[region.country_id]?.common_comparable_years.ranges??[];
    const current=loadedCountryKey===selectedCountryKey?mapObservations.filter(r=>r.region_id===region.region_id&&r.region_indicator_id===effectiveLayer).map(r=>({period:r.year,value:r.value,unit:r.unit,eligible:permitted&&!!geography&&inRanges(r.year,ranges),frame,sources:[{dataset:r.source_name,url:r.source_url}],status:'published_snapshot',classification:geography,level:region.admin_level,definition:gate?.definition??''})):[];
    const keys=new Set(current.map(r=>r.period));
    const history=historicalPoints.filter(r=>r.region_id===region.region_id&&r.indicator===effectiveLayer&&!keys.has(r.year)).map(r=>({period:r.year,value:r.value,unit:r.unit,eligible:permitted&&r.status==='comparable_stable_code'&&(r.level===region.admin_level||(region.country_id==='poland'&&region.admin_level==='ADM1'&&r.level==='ADM1 (NUTS2 source codes)'))&&geography===r.classification.replace(/\s/g,'')&&inRanges(r.year,ranges),frame,sources:r.sources,status:r.status,classification:geography,level:region.admin_level,definition:gate?.definition??''}));
    return [...current,...history];
  });
  const comparisonYears=commonObservationPeriods(regionalRows);
  const chosenComparisonYear=comparisonYear||effectiveYear;
  const comparisonRecord=(region:Region)=>regionalRows[selectedRegions.findIndex(r=>r.region_id===region.region_id)]?.find(r=>r.period===chosenComparisonYear);
  const comparisonPoint = (region: Region): RegionalComparisonPoint | null => {
    const row=comparisonRecord(region);
    return row?{value:row.value,year:row.period,unit:row.unit,definition:row.definition,classification:row.classification,level:row.level,eligible:row.eligible}:null;
  };
  const referenceRegion = selectedRegions[0];
  const referencePoint = referenceRegion ? comparisonPoint(referenceRegion) : null;
  return (
    <LocalizedContent labels={Object.fromEntries(regions.map(region => [region.region_name_zh, region.region_name_en]))}>{<section className="spatial-workbench-layout mt-6 border-y border-[var(--line)] py-5">
      <div className="spatial-workbench-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="eyebrow">Spatial Research Workbench</p><h2 className="mt-3 text-2xl font-semibold">区域比较研究工作台</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">选择国家、事实指标与年份，比较同层级区域并追溯来源。就业、失业和制造业图层只在统计层级直接匹配时开放，不生成风险、预测或综合评分。</p></div>
        <div className="flex rounded-full border border-[var(--line)] bg-white p-1">
          <button type="button" onClick={() => { setMode("country"); setCountryIds([selectedCountries[0]?.country_id ?? defaultCountry.country_id]); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "country" ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)]"}`}>单国模式</button>
          <button type="button" onClick={activateComparison} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "comparison" ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--muted)]"}`}>跨国比较</button>
        </div>
      </div>

      <div className="spatial-control-rail mt-5 grid gap-3">
        <ResearchSnapshotExport disabled={!currentLayer || loadedCountryKey !== selectedCountryKey} create={mapSnapshot} />
        <label className="text-xs font-semibold text-[var(--muted)]">国家
          {mode === "country" ? <select value={selectedCountries[0]?.country_id ?? ""} onChange={(event) => setSingleCountry(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{countries.map((country) => <option key={country.country_id} value={country.country_id} disabled={!country.approved_layers.includes("regional_boundary")}>{country.country_name_zh}{country.approved_layers.includes("regional_boundary") ? "" : " · 待接入"}</option>)}</select> : <span className="mt-2 block rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{selectedCountries.map((country) => country.country_name_zh).join(" / ")}</span>}
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">图层
          <select value={effectiveLayer} onChange={(event) => setLayer(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{layerGroups.map((group) => <optgroup key={group} label={group}>{layerOptions.filter((item) => item.group === group).map((item) => <option key={item.layer_id} value={item.layer_id}>{item.name_zh}</option>)}</optgroup>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">年份
          <select value={effectiveYear} onChange={(event) => setYear(event.target.value)} disabled={!availableYears.length} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] disabled:bg-[var(--surface-muted)]">{effectiveYear && !availableYears.includes(effectiveYear) ? <option value={effectiveYear}>{locale === "en" ? "Requested year" : "请求年份"}: {effectiveYear}</option> : null}{availableYears.length ? availableYears.map((item) => <option key={item} value={item}>{item}</option>) : <option value="">不适用</option>}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">分级方法
          <select value={classification} onChange={(event) => setClassification(event.target.value as Classification)} disabled={currentLayer?.layer_type !== "choropleth"} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]"><option value="quantile">分位数 Quantile</option><option value="equal_interval">等距 Equal interval</option></select>
        </label>
      </div>

      {currentLayer?.layer_type === "choropleth" && !availableYears.includes(effectiveYear) ? <p className="mt-3 text-sm" role="status">{t("请求年份没有同口径覆盖，未自动替换。", "The requested year has no matching coverage and has not been replaced.")} {availableYears.length ? <button type="button" className="underline text-[var(--accent)]" onClick={()=>setYear(availableYears.at(-1)!)}>{t("使用最新共同可用年份", "Use latest common available year")} · {availableYears.at(-1)}</button> : t("没有通过比较资格检查的共同年份。", "No common year passes the comparison gates.")}</p> : null}
      {currentLayer ? <div className="spatial-layer-meta mt-4 grid gap-2 border border-[var(--line)] bg-white/65 p-4 text-xs"><div><span className="text-[var(--muted)]">定义</span><p className="mt-1 leading-5">{currentLayer.definition}</p></div><div><span className="text-[var(--muted)]">单位 / 年份</span><p className="mt-1 font-semibold">{currentLayer.unit} / {effectiveYear || "不适用"}</p></div><div><span className="text-[var(--muted)]">空间层级</span><p className="mt-1 font-semibold">{selectedCountries.map((item) => item.admin_level).join(" / ")}</p></div><div><span className="text-[var(--muted)]">比较资格</span><p className="mt-1 leading-5">{mode === "comparison" ? "同层级、同定义、同单位、同年" : "本国内描述性比较"}</p></div></div> : null}

      {mode === "comparison" ? <div className="spatial-comparison-control mt-4 border border-[var(--line)] bg-[var(--surface-muted)] p-4"><p className="text-xs font-semibold text-[var(--muted)]">选择 2–4 个同层级国家 · 当前层级 {comparisonGroup}</p><div className="mt-3 flex flex-wrap gap-2">{readyCountries.map((country) => { const allowed = comparableCountryOptions.some((item) => item.country_id === country.country_id); const active = countryIds.includes(country.country_id); return <button key={country.country_id} type="button" disabled={!allowed || (!active && countryIds.length >= 4)} onClick={() => toggleComparisonCountry(country.country_id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] bg-white text-[var(--muted)] disabled:opacity-35"}`}>{country.country_name_zh} · {country.admin_level}</button>; })}</div><p className="mt-3 text-xs text-[var(--muted)]">Comparison year: <strong>{effectiveYear || "不可用"}</strong> · 原因：latest common comparable year。Scale: Cross-country comparable。</p></div> : <p className="spatial-comparison-control mt-4 text-xs text-[var(--muted)]">Scale: National · 当前国家可使用本国分布分级；切换到跨国比较后自动改用共同尺度。</p>}

      {effectiveLayer === "china_project_locations" ? <div className="spatial-project-controls mt-4 grid gap-3"><label className="text-xs font-semibold text-[var(--muted)]">行业<select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="all">全部行业</option>{sectors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[var(--muted)]">项目状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="all">全部状态</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">仅显示 high / medium 位置置信度。圆点表示城市/精确层级，方点表示区域参考；均不代表项目经济影响。</div></div> : null}

      <div className={`spatial-map-stage mt-5 grid gap-4 ${mode === "comparison" ? "xl:grid-cols-2" : "xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]"}`}>
        <div className={`grid gap-4 ${mode === "comparison" ? "md:grid-cols-2 xl:col-span-2" : ""}`}>
          {selectedCountries.map((country) => <MapPane key={country.country_id} country={country} layer={effectiveLayer} year={effectiveYear} observations={mapObservations} projects={filteredProjects} sharedThresholds={sharedThresholds} classification={classification} selectedRegionIds={selectedRegionIds} onRegionClick={onRegionClick} onProjectClick={onProjectClick} />)}
        </div>
        {mode === "country" ? <aside className="border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="eyebrow">Region Profile</p>
          {selectedProject ? <div className="mt-3"><h3 lang="zh-CN" data-original-language="zh-CN" className="text-xl font-semibold">{selectedProject.project_name}</h3>{locale === "en" ? <p className="mt-2 text-xs text-[var(--muted)]">Project names and attributed record prose remain in their original language; no automatic translation is applied.</p> : null}<dl className="mt-4 grid gap-3 text-sm">{[["中方主体", selectedProject.chinese_actor], ["当地主体", selectedProject.local_actor], ["行业", selectedProject.sector], ["状态", selectedProject.project_status], ["年份", selectedProject.year], ["金额", selectedProject.amount === null ? "未接入可靠金额" : `${formatNumber(selectedProject.amount)} ${selectedProject.currency ?? ""}`], ["位置精度", `${selectedProject.location_precision} / ${selectedProject.confidence}`], ["区域", `${selectedProject.region_name} · ${selectedProject.city_or_locality}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold" {...(["中方主体", "当地主体", "行业", "区域"].includes(String(label)) ? { lang: "zh-CN", "data-original-language": "zh-CN" } : {})}>{value}</dd></div>)}</dl><div className="mt-4 rounded-xl border border-[var(--line)] p-3"><p className="text-xs font-semibold text-[var(--muted)]">区域上下文 · {profileYear}</p><div className="mt-2 grid grid-cols-2 gap-2">{[["人口", "regional_population"], ["人均 GDP", "regional_gdp_per_capita"], ["失业率", "regional_unemployment_rate"], ["制造业 GVA 比重", "regional_manufacturing_share"]].map(([label, indicatorId]) => { const item = observationFor(selectedProject.region_id, indicatorId); return <div key={indicatorId}><p className="text-[10px] text-[var(--muted)]">{label}</p><p className="mt-1 text-xs font-semibold">{item ? formatWithUnit(item.value, item.unit) : "数据不可用"}</p></div>; })}</div></div><a href={selectedProject.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">核验项目来源</a><p className="mt-3 text-xs leading-5 text-[var(--muted)]">项目与区域指标是上下文关联，不构成因果影响判断。</p></div> : activeRegion ? <div className="mt-3"><h3 className="text-xl font-semibold">{activeRegion.region_name_zh}</h3><p className="mt-1 text-sm text-[var(--muted)]">{activeRegion.region_name_local} · {activeRegion.admin_code} · {activeRegion.admin_level}</p><dl className="mt-4 grid gap-3 text-sm">{[["人口", "regional_population"], ["GDP", "regional_gdp"], ["人均 GDP", "regional_gdp_per_capita"], ["失业率", "regional_unemployment_rate"], ["就业率", "regional_employment_rate"], ["制造业 GVA 比重", "regional_manufacturing_share"], ["人口变化 2021–2024", "regional_population_change_pct"], ["人均 GDP 变化 2021–2024", "regional_gdp_per_capita_change_pct"]].map(([label, indicatorId]) => { const observation = observationFor(activeRegion.region_id, indicatorId); return <div key={indicatorId} className="rounded-xl bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold">{observation ? formatWithUnit(observation.value, observation.unit) : "数据不可用"}</dd></div>; })}</dl><RegionHistoryTrend regionName={locale === "en" ? activeRegion.region_name_en : activeRegion.region_name_zh} regionId={activeRegion.region_id} countryId={activeRegion.country_id} stored={mapObservations.filter((item) => item.region_id === activeRegion.region_id)} /><p className="mt-3 text-xs text-[var(--muted)]">已核验项目记录：{projects.filter((item) => item.region_id === activeRegion.region_id && ["high", "medium"].includes(item.confidence)).length} · 当前数据库为 0 不代表该区域不存在相关活动。</p><div className="mt-4 flex flex-wrap gap-3"><Link href={countryPath(activeRegion.country_id)} className="text-sm font-semibold text-[var(--accent)] hover:underline">查看国家档案</Link></div><details className="mt-4 rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer text-sm font-semibold">View Data Trace</summary>{["regional_population", "regional_gdp", "regional_gdp_per_capita", "regional_unemployment_rate", "regional_employment_rate", "regional_manufacturing_share", "regional_population_change_pct", "regional_gdp_per_capita_change_pct", "regional_unemployment_change_pp"].map((indicatorId) => { const item = observationFor(activeRegion.region_id, indicatorId); return item ? <div key={item.region_observation_id} className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-5"><p className="font-mono">{item.region_observation_id}</p><p>{item.year} · {item.value} {item.unit} · {item.value_status}</p><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">{item.source_name} / {item.source_reliability} 级</a><p className="text-[var(--muted)]">{item.calculation_method || item.notes}</p></div> : null; })}</details></div> : <div className="mt-4 text-sm leading-6 text-[var(--muted)]"><p className="font-semibold text-[var(--foreground)]">尚未选择区域</p><ol className="mt-2 list-decimal space-y-1 pl-5"><li>在左侧地图上点击任一区域，查看人口、GDP、失业率等区域档案。</li><li>最多可选 5 个区域，下方“区域对比”表会并排显示。</li><li>斜线填充表示该年份没有数据，不代表数值为 0。</li><li>点击项目标记可查看项目事实与所在区域。</li></ol></div>}
        </aside> : null}
      </div>

      {activeRegion && activeLayerObservation && countryBenchmarkMean !== null && currentLayer?.layer_type === "choropleth" ? <div className="mt-4 border-y border-[var(--line)] bg-[var(--surface)] p-4 text-xs leading-5"><strong>{activeRegion.region_name_zh} · {currentLayer.name_zh}描述性基准：</strong> 区域值 {formatNumber(activeLayerObservation.value)} {activeLayerObservation.unit}；本国同层级区域均值 {formatNumber(countryBenchmarkMean)} {activeLayerObservation.unit}；差距 {formatNumber(activeLayerObservation.value - countryBenchmarkMean)} {activeLayerObservation.unit}。该差距只表示事实位置，不代表风险或政策优劣。</div> : null}

      {currentLayer?.layer_type === "choropleth" ? <div className="mt-4 border-y border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="w-full text-xs font-semibold text-[var(--muted)] sm:w-auto">图例 · {currentLayer.name_zh} · {currentLayer.unit} · {effectiveYear || "年份不适用"} · {classification === "quantile" ? "Quantile" : "Equal interval"}</span>{legendItems.map((item) => <span key={item.color} className="inline-flex items-center gap-1.5 text-xs"><span className="h-3.5 w-6 rounded-sm border border-black/10" style={{ backgroundColor: item.color }} />{item.label}</span>)}<span className="inline-flex items-center gap-1.5 text-xs"><span className="h-3.5 w-6 rounded-sm border border-black/10" style={{ background: `repeating-linear-gradient(45deg, ${noDataColor} 0 3px, var(--map-hatch) 3px 5px)` }} />无数据（斜线）</span><span className="ml-auto flex gap-2" data-print="hide"><button type="button" onClick={() => exportCurrentMap("svg")} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">导出地图（SVG）</button><button type="button" onClick={() => exportCurrentMap("png")} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">导出地图（PNG）</button></span></div></div> : null}

      <section className="mt-5 editorial-panel p-4 space-y-3" data-regional-comparison>
        <h3 className="text-lg font-semibold">{t("同年区域指标比较", "Same-period regional comparison")}</h3>
        <p className="text-sm">{locale === "en" ? englishText(currentLayer?.name_zh ?? "") : currentLayer?.name_zh} · {chosenComparisonYear || "—"} · {currentLayer?.unit}. {t("地图快照", "Map snapshot")}: {effectiveYear || "—"}. {t("快照年份", "Snapshot years")}: {availableYears.join(", ") || "—"}</p>
        <details><summary className="cursor-pointer text-sm font-semibold">{t("选择 2–5 个区域", "Choose 2–5 regions")}</summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{regions.filter(r => selectedCountries.some(c => c.country_id === r.country_id)).map(r => <label className="text-sm" key={r.region_id}><input type="checkbox" checked={selectedRegionIds.includes(r.region_id)} disabled={!selectedRegionIds.includes(r.region_id) && selectedRegionIds.length >= 5} onChange={() => onRegionClick(r.region_id)} /> {locale === "en" ? r.region_name_en : r.region_name_zh} · {r.admin_code}</label>)}</div></details>
        <label className="block max-w-sm text-sm">{t("共同合格比较年份", "Common eligible comparison year")}<select className="field-control mt-2" value={comparisonYear} onChange={e=>setComparisonYear(e.target.value)}><option value="">{t("当前地图年份", "Current map year")} · {effectiveYear}</option>{comparisonYear&&!comparisonYears.includes(comparisonYear)?<option value={comparisonYear}>{comparisonYear} · {t("无合格观测", "No eligible observation")}</option>:null}{comparisonYears.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        {historyLoadState!=="ready"?<p className="text-xs" role="status">{historyLoadState==="error"?t("区域历史读取不完整；仅列出已加载且合格的观测，不能据此判断来源没有更早历史。", "Regional history could not be fully loaded; only loaded eligible observations are listed. This does not establish that earlier source history is absent."):t("正在读取区域历史覆盖…", "Loading regional historical coverage…")}</p>:null}
        <p className="text-xs" data-regional-common-periods>{t("实际共同合格年份", "Actual common eligible years")}: {selectedRegions.length>=2?compactPeriods(comparisonYears):"—"}. {t("历史比较选择不改变地图快照或地图导出年份。", "Historical comparison selection does not change the map snapshot or its export year.")}</p>
        {selectedRegions.length < 2 ? <p className="text-sm">{t("选择至少两个区域查看数值与差值。", "Choose at least two regions to inspect values and differences.")}</p> : <>
          <p className="text-xs">{t("差值参照（首个所选区域）", "Difference reference (first selected region)")}: {locale === "en" ? referenceRegion.region_name_en : referenceRegion.region_name_zh}. {t("差值为该区域减参照区域；仅同年、同单位、同定义及同地理版本时计算。", "Differences are region minus reference, only for matching years, units, definitions and geographic versions.")}</p>
          <div role="region" tabIndex={0} className="data-table-viewport" aria-label={t("同年区域比较（可滚动）", "Same-period regional comparison (scrollable)")}><table className="research-data-table min-w-[680px] w-full text-left text-sm"><thead><tr>{[t("区域与代码", "Region and code"),t("统计区划／层级", "Geographic version / level"),t("时期", "Period"),t("数值", "Value"),t("差值", "Difference"),t("相对差异（%）", "Relative difference (%)"),t("来源", "Source")].map(h => <th className="p-2" scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{selectedRegions.map(region => {
            const point = comparisonPoint(region), difference = regionalDifference(referencePoint,point), record = comparisonRecord(region);
            return <tr key={region.region_id}><th scope="row" className="p-2 font-normal">{locale === "en" ? region.region_name_en : region.region_name_zh} · {region.admin_code}</th><td className="p-2">{point?.classification ?? "—"} · {region.admin_level}<span className="block text-xs text-[var(--muted)]">{t("地图区划", "Map geography")}: {selectedCountries.find(c=>c.country_id===region.country_id)?.classification_system}</span></td><td className="p-2">{point?.year ?? "—"}</td><td className="p-2">{point?.eligible ? `${point.value.toLocaleString(locale,{maximumFractionDigits:20})} ${point.unit}` : t("无已发布数值", "No published value")}</td><td className="p-2">{difference ? `${difference.absolute.toLocaleString(locale,{maximumFractionDigits:6})} ${difference.unit}` : t("缺少同口径可比观测", "No matching comparable observation")}</td><td className="p-2">{difference?.relative == null ? "—" : difference.relative.toLocaleString(locale,{maximumFractionDigits:3})}</td><td className="p-2">{record ? record.sources.map(source=><a key={source.url} className="block underline text-[var(--accent)]" href={source.url}>{source.dataset}</a>) : "—"}</td></tr>;
          })}</tbody></table></div>
        </>}
        <details><summary className="cursor-pointer text-sm">{t("各区域历史覆盖与限制", "Regional historical coverage and exclusions")}</summary><p className="mt-2 text-xs">{eligibility.find(g=>g.country_id===selectedRegions[0]?.country_id&&g.layer_id===effectiveLayer)?.definition}</p>{selectedRegions.map((r,i)=><HistoricalCoverage key={r.region_id} inventory={coverageInventory} error={coverageError} country={r.country_id} region={r.region_id} indicator={effectiveLayer} periods={regionalRows[i].map(p=>p.period)}/>)}</details>
        <p className="text-xs text-[var(--muted)]">{t("此比较使用已发布快照和清单准入的稳定代码历史。早期 NUTS 回溯值和断点前历史仍可单独查看，不用于差值计算。", "This comparison uses published snapshots and inventory-admitted stable-code history. Earlier NUTS backcasts and pre-break histories remain viewable separately and are excluded from differences.")}</p>
      </section>
      <section className="mt-5 border-y border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Region Comparison</p><h3 className="mt-2 text-xl font-semibold">区域对比 · 已选 {selectedRegions.length} / 5</h3></div><button type="button" onClick={() => { setSelectedRegionIds([]); setActiveRegionId(""); }} className="text-sm font-semibold text-[var(--accent)]">清空选择</button></div>
        <div className="wide-table-scroll mt-4 max-w-full" tabIndex={0} role="region" aria-label="数据表（可横向滚动）"><table className="research-data-table w-full min-w-[1450px] border-separate border-spacing-0 text-left text-xs"><thead><tr className="text-[var(--muted)]">{["区域", "国家", "层级", "人口", "人均 GDP", "失业率", "就业率", "制造业 GVA 比重", "人均 GDP 变化", "已核验项目"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead><tbody>{selectedRegions.length ? selectedRegions.map((region) => { const country = countries.find((item) => item.country_id === region.country_id); const value = (indicatorId: string) => { const item = observationFor(region.region_id, indicatorId); return item ? formatWithUnit(item.value, item.unit) : "—"; }; return <tr key={region.region_id}><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{region.region_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3">{country?.country_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3">{region.admin_level}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_population")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_gdp_per_capita")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_unemployment_rate")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_employment_rate")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_manufacturing_share")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_gdp_per_capita_change_pct")}</td><td className="border-b border-[var(--line)] px-3 py-3">{projects.filter((item) => item.region_id === region.region_id && ["high", "medium"].includes(item.confidence)).length}</td></tr>; }) : <tr><td colSpan={10} className="py-6 text-center text-[var(--muted)]">点击地图区域选择 2–5 个比较对象；只显示同年可用值。</td></tr>}</tbody></table></div>
      </section>

      {currentLayer?.layer_type === "choropleth" ? <section className="mt-5 border-y border-[var(--line)] bg-[var(--surface)] p-4"><p className="eyebrow">Factual Indicator Ranking</p><h3 className="mt-2 text-xl font-semibold">事实指标排名</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{mode === "comparison" ? "同层级、同定义、同单位、同年份的跨国区域排名。" : "同一国家内部区域排名。"} 不代表风险或政策优劣。</p><div className="wide-table-scroll mt-4 max-w-full" tabIndex={0} role="region" aria-label="数据表（可横向滚动）"><table className="research-data-table w-full min-w-[760px] border-separate border-spacing-0 text-left text-xs"><thead><tr className="text-[var(--muted)]">{["排名", "区域", "国家", "代码", "数值", "年份", "单位"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead><tbody>{rankingRows.map((item, index) => { const region = regions.find((candidate) => candidate.region_id === item.region_id); const country = countries.find((candidate) => candidate.country_id === item.country_id); return <tr key={item.region_observation_id}><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{index + 1}</td><td className="border-b border-[var(--line)] px-3 py-3">{region?.region_name_zh ?? item.region_id}</td><td className="border-b border-[var(--line)] px-3 py-3">{country?.country_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3 font-mono">{region?.admin_code}</td><td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{formatNumber(item.value)}</td><td className="border-b border-[var(--line)] px-3 py-3">{item.year}</td><td className="border-b border-[var(--line)] px-3 py-3">{item.unit}</td></tr>; })}</tbody></table></div></section> : null}

      <details className="mt-5 border-y border-[var(--line)] bg-[var(--surface-muted)] p-4"><summary className="cursor-pointer font-semibold">来源、覆盖与比较方法</summary><div className="mt-4 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-3"><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Source</strong><p className="mt-2 text-[var(--muted)]">{selectedCountries.map((country) => country.source_name).join(" / ")}</p></div><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Coverage</strong><p className="mt-2 text-[var(--muted)]">年份选项只从真实观测生成；缺失区域保持 neutral no-data，不显示 0。</p></div><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Methodology</strong><p className="mt-2 text-[var(--muted)]">跨国比较要求层级、指标定义、单位与年份一致。项目位置只作事实和上下文连接，不作因果解释。</p></div></div></details>
    </section>}</LocalizedContent>
  );
}
