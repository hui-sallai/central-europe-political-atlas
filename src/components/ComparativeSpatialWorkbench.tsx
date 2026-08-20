"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
const noDataColor = "#e6e7e2";

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
  if (value === null || !Number.isFinite(value)) return "数据不可用";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits }).format(value);
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
  const localThresholds = thresholdsFor(currentObservations.map((item) => item.value), classification);
  const thresholds = sharedThresholds ?? localThresholds;
  const countryProjects = projects.filter((item) => item.country_id === country.country_id);

  return (
    <article className="border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <div><p className="font-semibold">{country.country_name_zh}</p><p className="text-xs text-[var(--muted)]">{country.classification_system} / {country.admin_level}</p></div>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{country.region_count} 区域</span>
      </div>
      {loadState === "loading" ? <div className="grid h-[340px] place-items-center text-sm text-[var(--muted)]">正在按国家加载边界…</div> : null}
      {loadState === "error" ? <div className="grid h-[340px] place-items-center bg-amber-50 p-6 text-center text-sm text-amber-950">空间比较待接入：{country.blocker}</div> : null}
      {loadState === "ready" && project ? (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${country.country_name_zh}${year ? ` ${year}` : ""} 区域事实地图`}>
            {paths.map(({ feature, d }) => {
              const regionId = feature.properties.region_id ?? "";
              const value = valueByRegion.get(regionId) ?? null;
              const selected = selectedRegionIds.includes(regionId);
              return <path key={regionId} d={d} fill={layer === "regional_boundary" || layer === "china_project_locations" ? "#f7f5ef" : colorFor(value, thresholds)} stroke={selected ? "#245c52" : "#ffffff"} strokeWidth={selected ? 1.6 : 0.75} className="cursor-pointer transition-opacity hover:opacity-80" onMouseEnter={() => setHovered({ regionId, name: feature.properties.region_name ?? regionId, code: feature.properties.region_code ?? "—", value })} onMouseLeave={() => setHovered(null)} onClick={() => onRegionClick(regionId)} />;
            })}
            {layer === "china_project_locations" ? countryProjects.map((item, index) => {
              const feature = features.find((candidate) => candidate.properties.region_id === item.region_id);
              if (!feature) return null;
              const [x, y] = centerFor(feature, project);
              const offset = (index % 4) * 5;
              const city = item.location_precision === "city_level" || item.location_precision === "exact_site";
              return city
                ? <circle key={item.project_location_id} cx={x + offset} cy={y - offset} r="5.5" fill="#9d654d" stroke="#fff" strokeWidth="1.5" className="cursor-pointer" onClick={() => onProjectClick(item)}><title>{item.project_name}</title></circle>
                : <rect key={item.project_location_id} x={x - 5 + offset} y={y - 5 - offset} width="10" height="10" rx="2" fill="#6f7f99" stroke="#fff" strokeWidth="1.5" className="cursor-pointer" onClick={() => onProjectClick(item)}><title>{item.project_name}</title></rect>;
            }) : null}
          </svg>
          <div className="min-h-12 border-t border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--muted)]" aria-live="polite">
            {hovered ? <><strong className="text-[var(--foreground)]">{hovered.name}</strong> · {hovered.code} · {layer === "regional_boundary" ? "边界" : `${formatNumber(hovered.value)}${currentObservations[0]?.unit ? ` ${currentObservations[0].unit}` : ""}`} · {year || "不适用"}</> : "悬停查看区域、代码、指标值与年份；点击加入区域比较。"}
          </div>
        </>
      ) : null}
    </article>
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
  const [loadedObservations, setLoadedObservations] = useState<Observation[]>(observations);

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
      if (params.get("classification") === "equal_interval") setClassification("equal_interval");
      const requestedRegions = (params.get("regions") ?? "").split(",").filter(Boolean).slice(0, 5);
      setSelectedRegionIds(requestedRegions);
      setActiveRegionId(requestedRegions[0] ?? "");
      setSelectedProjectId(params.get("project") ?? "");
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
    )).then((groups) => setLoadedObservations(groups.flat())).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLoadedObservations([]);
    });
    return () => controller.abort();
  }, [selectedCountryKey]);
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
  const availableYears = currentLayer?.layer_type === "choropleth"
    ? mode === "comparison" ? intersectYears(yearGroups) : yearGroups[0] ?? []
    : [];
  const effectiveYear = availableYears.includes(year) ? year : availableYears.at(-1) ?? "";

  useEffect(() => {
    if (!urlReady || !selectedCountries.length) return;
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.searchParams.set("country", selectedCountries[0].country_id);
    if (mode === "comparison") url.searchParams.set("countries", selectedCountries.map((country) => country.country_id).join(","));
    else url.searchParams.delete("countries");
    url.searchParams.set("layer", effectiveLayer);
    if (effectiveYear) url.searchParams.set("year", effectiveYear); else url.searchParams.delete("year");
    url.searchParams.set("classification", classification);
    if (selectedRegionIds.length) url.searchParams.set("regions", selectedRegionIds.join(",")); else url.searchParams.delete("regions");
    if (selectedProjectId) url.searchParams.set("project", selectedProjectId); else url.searchParams.delete("project");
    window.history.replaceState({}, "", url);
  }, [classification, effectiveLayer, effectiveYear, mode, selectedCountries, selectedProjectId, selectedRegionIds, urlReady]);

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

  return (
    <section className="spatial-workbench-layout mt-6 border-y border-[var(--line)] py-5">
      <div className="spatial-workbench-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="eyebrow">Spatial Research Workbench</p><h2 className="mt-3 text-2xl font-semibold">区域比较研究工作台</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">选择国家、事实指标与年份，比较同层级区域并追溯来源。就业、失业和制造业图层只在统计层级直接匹配时开放，不生成风险、预测或综合评分。</p></div>
        <div className="flex rounded-full border border-[var(--line)] bg-white p-1">
          <button type="button" onClick={() => { setMode("country"); setCountryIds([selectedCountries[0]?.country_id ?? defaultCountry.country_id]); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "country" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>单国模式</button>
          <button type="button" onClick={activateComparison} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "comparison" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>跨国比较</button>
        </div>
      </div>

      <div className="spatial-control-rail mt-5 grid gap-3">
        <label className="text-xs font-semibold text-[var(--muted)]">国家
          {mode === "country" ? <select value={selectedCountries[0]?.country_id ?? ""} onChange={(event) => setSingleCountry(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{countries.map((country) => <option key={country.country_id} value={country.country_id} disabled={!country.approved_layers.includes("regional_boundary")}>{country.country_name_zh}{country.approved_layers.includes("regional_boundary") ? "" : " · 待接入"}</option>)}</select> : <span className="mt-2 block rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{selectedCountries.map((country) => country.country_name_zh).join(" / ")}</span>}
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">图层
          <select value={effectiveLayer} onChange={(event) => setLayer(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]">{layerGroups.map((group) => <optgroup key={group} label={group}>{layerOptions.filter((item) => item.group === group).map((item) => <option key={item.layer_id} value={item.layer_id}>{item.name_zh}</option>)}</optgroup>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">年份
          <select value={effectiveYear} onChange={(event) => setYear(event.target.value)} disabled={!availableYears.length} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] disabled:bg-[var(--surface-muted)]">{availableYears.length ? availableYears.map((item) => <option key={item} value={item}>{item}</option>) : <option value="">不适用</option>}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">分级方法
          <select value={classification} onChange={(event) => setClassification(event.target.value as Classification)} disabled={currentLayer?.layer_type !== "choropleth"} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)]"><option value="quantile">分位数 Quantile</option><option value="equal_interval">等距 Equal interval</option></select>
        </label>
      </div>

      {currentLayer ? <div className="spatial-layer-meta mt-4 grid gap-2 border border-[var(--line)] bg-white/65 p-4 text-xs"><div><span className="text-[var(--muted)]">定义</span><p className="mt-1 leading-5">{currentLayer.definition}</p></div><div><span className="text-[var(--muted)]">单位 / 年份</span><p className="mt-1 font-semibold">{currentLayer.unit} / {effectiveYear || "不适用"}</p></div><div><span className="text-[var(--muted)]">空间层级</span><p className="mt-1 font-semibold">{selectedCountries.map((item) => item.admin_level).join(" / ")}</p></div><div><span className="text-[var(--muted)]">比较资格</span><p className="mt-1 leading-5">{mode === "comparison" ? "同层级、同定义、同单位、同年" : "本国内描述性比较"}</p></div></div> : null}

      {mode === "comparison" ? <div className="spatial-comparison-control mt-4 border border-[var(--line)] bg-[var(--surface-muted)] p-4"><p className="text-xs font-semibold text-[var(--muted)]">选择 2–4 个同层级国家 · 当前层级 {comparisonGroup}</p><div className="mt-3 flex flex-wrap gap-2">{readyCountries.map((country) => { const allowed = comparableCountryOptions.some((item) => item.country_id === country.country_id); const active = countryIds.includes(country.country_id); return <button key={country.country_id} type="button" disabled={!allowed || (!active && countryIds.length >= 4)} onClick={() => toggleComparisonCountry(country.country_id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] disabled:opacity-35"}`}>{country.country_name_zh} · {country.admin_level}</button>; })}</div><p className="mt-3 text-xs text-[var(--muted)]">Comparison year: <strong>{effectiveYear || "不可用"}</strong> · 原因：latest common comparable year。Scale: Cross-country comparable。</p></div> : <p className="spatial-comparison-control mt-4 text-xs text-[var(--muted)]">Scale: National · 当前国家可使用本国分布分级；切换到跨国比较后自动改用共同尺度。</p>}

      {effectiveLayer === "china_project_locations" ? <div className="spatial-project-controls mt-4 grid gap-3"><label className="text-xs font-semibold text-[var(--muted)]">行业<select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="all">全部行业</option>{sectors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[var(--muted)]">项目状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="all">全部状态</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">仅显示 high / medium 位置置信度。圆点表示城市/精确层级，方点表示区域参考；均不代表项目经济影响。</div></div> : null}

      <div className={`spatial-map-stage mt-5 grid gap-4 ${mode === "comparison" ? "xl:grid-cols-2" : "xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]"}`}>
        <div className={`grid gap-4 ${mode === "comparison" ? "md:grid-cols-2 xl:col-span-2" : ""}`}>
          {selectedCountries.map((country) => <MapPane key={country.country_id} country={country} layer={effectiveLayer} year={effectiveYear} observations={mapObservations} projects={filteredProjects} sharedThresholds={sharedThresholds} classification={classification} selectedRegionIds={selectedRegionIds} onRegionClick={onRegionClick} onProjectClick={onProjectClick} />)}
        </div>
        {mode === "country" ? <aside className="border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="eyebrow">Region Profile</p>
          {selectedProject ? <div className="mt-3"><h3 className="text-xl font-semibold">{selectedProject.project_name}</h3><dl className="mt-4 grid gap-3 text-sm">{[["中方主体", selectedProject.chinese_actor], ["当地主体", selectedProject.local_actor], ["行业", selectedProject.sector], ["状态", selectedProject.project_status], ["年份", selectedProject.year], ["金额", selectedProject.amount === null ? "未接入可靠金额" : `${formatNumber(selectedProject.amount)} ${selectedProject.currency ?? ""}`], ["位置精度", `${selectedProject.location_precision} / ${selectedProject.confidence}`], ["区域", `${selectedProject.region_name} · ${selectedProject.city_or_locality}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl><div className="mt-4 rounded-xl border border-[var(--line)] p-3"><p className="text-xs font-semibold text-[var(--muted)]">区域上下文 · {profileYear}</p><div className="mt-2 grid grid-cols-2 gap-2">{[["人口", "regional_population"], ["人均 GDP", "regional_gdp_per_capita"], ["失业率", "regional_unemployment_rate"], ["制造业 GVA 比重", "regional_manufacturing_share"]].map(([label, indicatorId]) => { const item = observationFor(selectedProject.region_id, indicatorId); return <div key={indicatorId}><p className="text-[10px] text-[var(--muted)]">{label}</p><p className="mt-1 text-xs font-semibold">{item ? `${formatNumber(item.value)} ${item.unit}` : "数据不可用"}</p></div>; })}</div></div><a href={selectedProject.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">核验项目来源</a><p className="mt-3 text-xs leading-5 text-[var(--muted)]">项目与区域指标是上下文关联，不构成因果影响判断。</p></div> : activeRegion ? <div className="mt-3"><h3 className="text-xl font-semibold">{activeRegion.region_name_zh}</h3><p className="mt-1 text-sm text-[var(--muted)]">{activeRegion.region_name_local} · {activeRegion.admin_code} · {activeRegion.admin_level}</p><dl className="mt-4 grid gap-3 text-sm">{[["人口", "regional_population"], ["GDP", "regional_gdp"], ["人均 GDP", "regional_gdp_per_capita"], ["失业率", "regional_unemployment_rate"], ["就业率", "regional_employment_rate"], ["制造业 GVA 比重", "regional_manufacturing_share"], ["人口变化 2021–2024", "regional_population_change_pct"], ["人均 GDP 变化 2021–2024", "regional_gdp_per_capita_change_pct"]].map(([label, indicatorId]) => { const observation = observationFor(activeRegion.region_id, indicatorId); return <div key={indicatorId} className="rounded-xl bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold">{observation ? `${formatNumber(observation.value)} ${observation.unit}` : "数据不可用"}</dd></div>; })}</dl><p className="mt-3 text-xs text-[var(--muted)]">已核验项目记录：{projects.filter((item) => item.region_id === activeRegion.region_id && ["high", "medium"].includes(item.confidence)).length} · 当前数据库为 0 不代表该区域不存在相关活动。</p><div className="mt-4 flex flex-wrap gap-3"><Link href={countryPath(activeRegion.country_id)} className="text-sm font-semibold text-[var(--accent)] hover:underline">查看国家档案</Link></div><details className="mt-4 rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer text-sm font-semibold">View Data Trace</summary>{["regional_population", "regional_gdp", "regional_gdp_per_capita", "regional_unemployment_rate", "regional_employment_rate", "regional_manufacturing_share", "regional_population_change_pct", "regional_gdp_per_capita_change_pct", "regional_unemployment_change_pp"].map((indicatorId) => { const item = observationFor(activeRegion.region_id, indicatorId); return item ? <div key={item.region_observation_id} className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-5"><p className="font-mono">{item.region_observation_id}</p><p>{item.year} · {item.value} {item.unit} · {item.value_status}</p><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">{item.source_name} / {item.source_reliability} 级</a><p className="text-[var(--muted)]">{item.calculation_method || item.notes}</p></div> : null; })}</details></div> : <p className="mt-4 text-sm leading-6 text-[var(--muted)]">点击区域查看档案，或点击项目标记查看项目事实与区域上下文。</p>}
        </aside> : null}
      </div>

      {activeRegion && activeLayerObservation && countryBenchmarkMean !== null && currentLayer?.layer_type === "choropleth" ? <div className="mt-4 border-y border-[var(--line)] bg-[var(--surface)] p-4 text-xs leading-5"><strong>{activeRegion.region_name_zh} · {currentLayer.name_zh}描述性基准：</strong> 区域值 {formatNumber(activeLayerObservation.value)} {activeLayerObservation.unit}；本国同层级区域均值 {formatNumber(countryBenchmarkMean)} {activeLayerObservation.unit}；差距 {formatNumber(activeLayerObservation.value - countryBenchmarkMean)} {activeLayerObservation.unit}。该差距只表示事实位置，不代表风险或政策优劣。</div> : null}

      {currentLayer?.layer_type === "choropleth" ? <div className="mt-4 border-y border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-[var(--muted)]">图例 · {currentLayer.name_zh} · {currentLayer.unit} · {classification === "quantile" ? "Quantile" : "Equal interval"}</span>{colors.slice(0, legendThresholds.length + 1).map((color, index) => <span key={color} className="inline-flex items-center gap-1 text-xs"><span className="h-3 w-5 rounded-sm" style={{ backgroundColor: color }} />{index === 0 ? `≤ ${formatNumber(legendThresholds[0] ?? scaleValues[0] ?? 0)}` : index <= legendThresholds.length - 1 ? `${formatNumber(legendThresholds[index - 1])}–${formatNumber(legendThresholds[index])}` : `> ${formatNumber(legendThresholds.at(-1) ?? 0)}`}</span>)}<span className="inline-flex items-center gap-1 text-xs"><span className="h-3 w-5 rounded-sm" style={{ backgroundColor: noDataColor }} />无数据</span></div></div> : null}

      <section className="mt-5 border-y border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Region Comparison</p><h3 className="mt-2 text-xl font-semibold">区域对比 · 已选 {selectedRegions.length} / 5</h3></div><button type="button" onClick={() => { setSelectedRegionIds([]); setActiveRegionId(""); }} className="text-sm font-semibold text-[var(--accent)]">清空选择</button></div>
        <div className="wide-table-scroll mt-4 max-w-full"><table className="research-data-table w-full min-w-[1450px] border-separate border-spacing-0 text-left text-xs"><thead><tr className="text-[var(--muted)]">{["区域", "国家", "层级", "人口", "人均 GDP", "失业率", "就业率", "制造业 GVA 比重", "人均 GDP 变化", "已核验项目"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead><tbody>{selectedRegions.length ? selectedRegions.map((region) => { const country = countries.find((item) => item.country_id === region.country_id); const value = (indicatorId: string) => { const item = observationFor(region.region_id, indicatorId); return item ? `${formatNumber(item.value)} ${item.unit}` : "—"; }; return <tr key={region.region_id}><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{region.region_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3">{country?.country_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3">{region.admin_level}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_population")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_gdp_per_capita")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_unemployment_rate")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_employment_rate")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_manufacturing_share")}</td><td className="border-b border-[var(--line)] px-3 py-3">{value("regional_gdp_per_capita_change_pct")}</td><td className="border-b border-[var(--line)] px-3 py-3">{projects.filter((item) => item.region_id === region.region_id && ["high", "medium"].includes(item.confidence)).length}</td></tr>; }) : <tr><td colSpan={10} className="py-6 text-center text-[var(--muted)]">点击地图区域选择 2–5 个比较对象；只显示同年可用值。</td></tr>}</tbody></table></div>
      </section>

      {currentLayer?.layer_type === "choropleth" ? <section className="mt-5 border-y border-[var(--line)] bg-[var(--surface)] p-4"><p className="eyebrow">Factual Indicator Ranking</p><h3 className="mt-2 text-xl font-semibold">事实指标排名</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{mode === "comparison" ? "同层级、同定义、同单位、同年份的跨国区域排名。" : "同一国家内部区域排名。"} 不代表风险或政策优劣。</p><div className="wide-table-scroll mt-4 max-w-full"><table className="research-data-table w-full min-w-[760px] border-separate border-spacing-0 text-left text-xs"><thead><tr className="text-[var(--muted)]">{["排名", "区域", "国家", "代码", "数值", "年份", "单位"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead><tbody>{rankingRows.map((item, index) => { const region = regions.find((candidate) => candidate.region_id === item.region_id); const country = countries.find((candidate) => candidate.country_id === item.country_id); return <tr key={item.region_observation_id}><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{index + 1}</td><td className="border-b border-[var(--line)] px-3 py-3">{region?.region_name_zh ?? item.region_id}</td><td className="border-b border-[var(--line)] px-3 py-3">{country?.country_name_zh}</td><td className="border-b border-[var(--line)] px-3 py-3 font-mono">{region?.admin_code}</td><td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{formatNumber(item.value)}</td><td className="border-b border-[var(--line)] px-3 py-3">{item.year}</td><td className="border-b border-[var(--line)] px-3 py-3">{item.unit}</td></tr>; })}</tbody></table></div></section> : null}

      <details className="mt-5 border-y border-[var(--line)] bg-[var(--surface-muted)] p-4"><summary className="cursor-pointer font-semibold">来源、覆盖与比较方法</summary><div className="mt-4 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-3"><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Source</strong><p className="mt-2 text-[var(--muted)]">{selectedCountries.map((country) => country.source_name).join(" / ")}</p></div><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Coverage</strong><p className="mt-2 text-[var(--muted)]">年份选项只从真实观测生成；缺失区域保持 neutral no-data，不显示 0。</p></div><div className="bg-[var(--surface)] p-4 text-xs leading-5"><strong>Methodology</strong><p className="mt-2 text-[var(--muted)]">跨国比较要求层级、指标定义、单位与年份一致。项目位置只作事实和上下文连接，不作因果解释。</p></div></div></details>
    </section>
  );
}
