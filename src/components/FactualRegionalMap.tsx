"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { mapCountryFromLocation, serverMapCountryFallback, subscribeToMapCountry, updateMapCountry } from "@/lib/mapCountrySelection";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];
type Feature = {
  properties: { region_id?: string; region_code?: string; region_name?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Polygon | MultiPolygon };
};
type Observation = {
  country_id: string;
  region_id: string;
  region_indicator_id: string;
  year: string;
  value: number | string | null;
  unit: string;
  source_name: string;
  source_url: string;
};
type ProjectReference = {
  project_location_id: string;
  project_name: string;
  region_id: string;
  city_or_locality: string;
  location_role: string;
  location_precision: string;
  marker_type: "exact_point" | "regional_reference" | "not_mapped";
  confidence: string;
  source_url: string;
  default_display: boolean;
  optional_display: boolean;
};
type MapCountry = {
  country_id: string;
  country_name_zh: string;
  country_name_en: string;
  geometry_url: string;
  region_count: number;
  approved_layers: string[];
  rejected_layers: string[];
  latest_common_year: string;
  source_name: string;
  source_url: string;
  attribution: string;
  blocker: string;
  project_references: ProjectReference[];
};

const width = 760;
const height = 520;
const emptyFeatures: Feature[] = [];
const padding = 28;
const layerLabels: Record<string, string> = {
  regional_boundary: "行政边界",
  regional_population: "区域人口",
  regional_gdp: "区域 GDP",
  regional_gdp_per_capita: "区域人均 GDP",
  regional_unemployment_rate: "区域失业率",
  regional_manufacturing_share: "区域制造业比重",
  china_project_locations: "对华项目区域参考",
};
const scaleColors = ["#e5eee9", "#c9ded5", "#a8cbbb", "#76ad99", "#3f7f70"];

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

function referencePoint(feature: Feature, project: (position: Position) => Position) {
  const points = positionsFor(feature);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return project([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
}

function quantileThresholds(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return [];
  const binCount = Math.min(5, new Set(sorted).size);
  return Array.from({ length: Math.max(0, binCount - 1) }, (_, index) => sorted[Math.ceil(((index + 1) * sorted.length) / binCount) - 1]);
}

function colorFor(value: number | null, thresholds: number[]) {
  if (value === null) return "#e5e7df";
  const index = thresholds.findIndex((threshold) => value <= threshold);
  return scaleColors[index === -1 ? thresholds.length : index];
}

function formatValue(value: number) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value);
}

export function FactualRegionalMap({ countries, observations }: { countries: MapCountry[]; observations: Observation[] }) {
  const defaultCountry = countries.find((country) => country.country_id === "hungary") ?? countries[0];
  const requestedCountryId = useSyncExternalStore(subscribeToMapCountry, mapCountryFromLocation, serverMapCountryFallback);
  const validRequestedCountryId = countries.some((country) => country.country_id === requestedCountryId) ? requestedCountryId : "";
  const countryId = validRequestedCountryId || defaultCountry?.country_id || "";
  const [geometryState, setGeometryState] = useState<{ countryId: string; features: Feature[]; loadError: boolean }>({
    countryId: "",
    features: [],
    loadError: false,
  });
  const [layer, setLayer] = useState("regional_boundary");
  const [activeRegionId, setActiveRegionId] = useState("");
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const selectedCountry = countries.find((country) => country.country_id === countryId) ?? defaultCountry;
  const selectedCountryId = selectedCountry?.country_id ?? "";
  const selectedGeometryUrl = selectedCountry?.geometry_url ?? "";
  const canLoadBoundary = selectedCountry?.approved_layers.includes("regional_boundary") ?? false;
  const activeLayer = selectedCountry?.approved_layers.includes(layer)
    ? layer
    : selectedCountry?.approved_layers[0] ?? "regional_boundary";

  useEffect(() => {
    if (!selectedGeometryUrl || !canLoadBoundary) return;
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}${selectedGeometryUrl}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((collection) => {
        const next = collection.features.filter((feature: Feature) => feature.properties.region_id && feature.geometry);
        setGeometryState({ countryId: selectedCountryId, features: next, loadError: false });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setGeometryState({ countryId: selectedCountryId, features: [], loadError: true });
        }
      });
    return () => controller.abort();
  }, [canLoadBoundary, selectedCountryId, selectedGeometryUrl]);

  const changeCountry = (nextCountry: string) => {
    setLayer(countries.find((country) => country.country_id === nextCountry)?.approved_layers[0] ?? "regional_boundary");
    setActiveRegionId("");
    updateMapCountry(nextCountry);
  };

  const features = geometryState.countryId === selectedCountryId ? geometryState.features : emptyFeatures;
  const loadError = geometryState.countryId === selectedCountryId && geometryState.loadError;

  const latestObservations = useMemo(() => observations.filter(
    (observation) => observation.country_id === countryId && observation.region_indicator_id === activeLayer && observation.value !== null,
  ), [activeLayer, countryId, observations]);
  const observationByRegion = useMemo(() => new Map(latestObservations.map((observation) => [observation.region_id, observation])), [latestObservations]);
  const values = latestObservations.map((observation) => Number(observation.value)).filter(Number.isFinite);
  const thresholds = quantileThresholds(values);
  const project = useMemo(() => features.length ? projector(features) : null, [features]);
  const paths = useMemo(() => project ? features.map((feature) => ({ feature, d: pathFor(feature, project) })) : [], [features, project]);
  const effectiveActiveRegionId = features.some((feature) => feature.properties.region_id === activeRegionId)
    ? activeRegionId
    : features[0]?.properties.region_id ?? "";
  const activeFeature = features.find((feature) => feature.properties.region_id === effectiveActiveRegionId);
  const activeObservations = observations.filter((observation) => observation.country_id === countryId && observation.region_id === effectiveActiveRegionId);
  const activeLayerObservation = observationByRegion.get(effectiveActiveRegionId);
  const activeProjects = selectedCountry?.project_references.filter((record) => record.region_id === effectiveActiveRegionId) ?? [];
  const visibleProjects = selectedCountry?.project_references.filter((record) => record.default_display || (showLowConfidence && record.optional_display)) ?? [];

  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow">Multi-Country Factual Map / v0.87</p>
          <h2 className="mt-3 text-2xl font-semibold">多国事实区域地图</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">只显示通过国家边界闸门和独立图层验收的事实数据。每个国家使用自己的数值分布，不生成风险、预测或跨国假色阶。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">国家
            <select value={countryId} onChange={(event) => changeCountry(event.target.value)} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)]">
              {countries.map((country) => <option key={country.country_id} value={country.country_id}>{country.country_name_zh}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">图层
            <select value={activeLayer} onChange={(event) => setLayer(event.target.value)} disabled={!selectedCountry?.approved_layers.length} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">
              {(selectedCountry?.approved_layers ?? []).map((layerId) => <option key={layerId} value={layerId}>{layerLabels[layerId] ?? layerId}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">区域：{selectedCountry?.region_count ?? 0}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">共同年份：{selectedCountry?.latest_common_year ?? "unavailable"}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">可用图层：{selectedCountry?.approved_layers.length ?? 0}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">未启用：{selectedCountry?.rejected_layers.map((id) => layerLabels[id] ?? id).join(" / ") || "无"}</span>
      </div>

      {!selectedCountry?.approved_layers.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          该国尚未通过公开事实地图闸门。原因：{selectedCountry?.blocker || "准入记录待完成"}。
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f7f8f4] p-3">
            {loadError ? <p className="p-6 text-sm text-rose-700">已批准边界文件读取失败，请复核部署路径。</p> : null}
            {!features.length && !loadError ? <p className="p-6 text-sm text-[var(--muted)]">正在读取该国已批准边界…</p> : null}
            {features.length ? <svg viewBox={`0 0 ${width} ${height}`} className="h-full max-h-[520px] w-full" role="img" aria-label={`${selectedCountry.country_name_zh}事实区域地图`}>
              <rect width={width} height={height} rx="22" fill="#f7f8f4" />
              {paths.map(({ feature, d }) => {
                const regionId = feature.properties.region_id ?? "";
                const observation = observationByRegion.get(regionId);
                const numericValue = observation ? Number(observation.value) : null;
                const active = regionId === effectiveActiveRegionId;
                return <path key={regionId} d={d} fill={activeLayer === "regional_boundary" || activeLayer === "china_project_locations" ? (active ? "#8fbdb2" : "#c7d9d2") : colorFor(Number.isFinite(numericValue) ? numericValue : null, thresholds)} fillRule="evenodd" stroke={active ? "#234b47" : "#657f79"} strokeWidth={active ? 1.25 : 0.65} vectorEffect="non-scaling-stroke" tabIndex={0} onMouseEnter={() => setActiveRegionId(regionId)} onFocus={() => setActiveRegionId(regionId)} onClick={() => setActiveRegionId(regionId)} className="cursor-pointer outline-none"><title>{`${feature.properties.region_name} / ${observation ? `${observation.value} ${observation.unit} / ${observation.year}` : "unavailable"}`}</title></path>;
              })}
              {activeLayer === "china_project_locations" && project ? visibleProjects.map((record) => {
                const feature = features.find((item) => item.properties.region_id === record.region_id);
                if (!feature) return null;
                const [x, y] = referencePoint(feature, project);
                return <g key={record.project_location_id} tabIndex={0} onMouseEnter={() => setActiveRegionId(record.region_id)} onFocus={() => setActiveRegionId(record.region_id)}>
                  <circle cx={x} cy={y} r={record.optional_display ? 4 : 5.5} fill={record.optional_display ? "#b58b54" : "#8f4d3e"} stroke="#fff" strokeWidth="1.5" />
                  <title>{`${record.project_name} / Location precision: ${record.location_precision} / regional reference, not exact coordinates`}</title>
                </g>;
              }) : null}
            </svg> : null}
          </div>

          <aside className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Region Profile</p>
            <h3 className="mt-3 text-lg font-semibold">{activeFeature?.properties.region_name ?? "请选择区域"}</h3>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">{activeFeature?.properties.region_code} / {effectiveActiveRegionId}</p>
            {activeLayerObservation ? <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-lg font-semibold">{formatValue(Number(activeLayerObservation.value))} <span className="text-xs text-[var(--muted)]">{activeLayerObservation.unit} / {activeLayerObservation.year}</span></p> : null}
            <dl className="mt-4 grid gap-3 text-sm">
              {activeObservations.map((observation) => <div key={observation.region_indicator_id}><dt className="text-xs text-[var(--muted)]">{layerLabels[observation.region_indicator_id]}</dt><dd className="mt-1 font-semibold">{formatValue(Number(observation.value))} {observation.unit} / {observation.year}</dd></div>)}
            </dl>
            {activeProjects.length ? <div className="mt-4 border-t border-[var(--line)] pt-4"><p className="text-xs font-semibold text-[var(--muted)]">Mapped projects</p>{activeProjects.map((record) => <div key={record.project_location_id} className="mt-2 rounded-xl bg-[var(--surface-muted)] p-3 text-xs"><p className="font-semibold">{record.project_name}</p><p className="mt-1 text-[var(--muted)]">{record.location_role} / {record.location_precision} / {record.confidence}</p><p className="mt-1 text-[var(--muted)]">区域级参考位置，并非项目精确坐标。</p></div>)}</div> : null}
            {activeLayerObservation?.source_url ? <a className="mt-5 inline-flex text-xs font-semibold text-[var(--accent)] underline" href={activeLayerObservation.source_url.split(" | ")[0]} target="_blank" rel="noreferrer">核验统计来源</a> : null}
            {activeLayer === "china_project_locations" ? <label className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={showLowConfidence} onChange={(event) => setShowLowConfidence(event.target.checked)} />可选显示 low confidence 区域参考</label> : null}
          </aside>
        </div>
      )}

      {activeLayer !== "regional_boundary" && activeLayer !== "china_project_locations" && values.length ? (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-xs">
          <p className="font-semibold">图例：国家内分位数，最多 5 档</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {scaleColors.slice(0, thresholds.length + 1).map((color, index) => {
              const lower = index === 0 ? Math.min(...values) : thresholds[index - 1];
              const upper = index < thresholds.length ? thresholds[index] : Math.max(...values);
              return <span key={`${color}-${index}`} className="flex items-center gap-2"><i className="h-3 w-5 rounded-sm" style={{ background: color }} />{formatValue(lower)}–{formatValue(upper)}</span>;
            })}
          </div>
          <p className="mt-3 text-[var(--muted)]">当前只显示单一国家，不把不同年份、定义或单位放入统一跨国色阶。</p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        来源：{selectedCountry?.source_url ? <a href={selectedCountry.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] underline">{selectedCountry.source_name}</a> : selectedCountry?.source_name}。{selectedCountry?.attribution}
      </p>
    </section>
  );
}
