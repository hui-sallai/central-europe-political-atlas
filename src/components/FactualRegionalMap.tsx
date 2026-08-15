"use client";

import { useEffect, useMemo, useState } from "react";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];
type Feature = {
  properties: { region_id?: string; region_code?: string; region_name?: string; source_url?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Polygon | MultiPolygon };
};
type Observation = { region_id: string; region_indicator_id: string; year: string; value: number | string | null; unit: string; source_name: string; source_url: string; value_status: string };

const width = 760;
const height = 520;
const padding = 28;
const file = "/data/boundaries/v086/hungary_nuts3_gisco_2024.geojson";
const layerOptions = [
  ["regional_boundary", "行政边界"],
  ["regional_population", "区域人口"],
  ["regional_gdp", "区域 GDP"],
  ["regional_gdp_per_capita", "区域人均 GDP"],
] as const;

function polygons(feature: Feature): MultiPolygon {
  return feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as Polygon] : feature.geometry.coordinates as MultiPolygon;
}

function projector(features: Feature[]) {
  const points = features.flatMap((feature) => polygons(feature).flatMap((polygon) => polygon.flat()));
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

function factualFill(value: number | null, min: number, max: number) {
  if (value === null) return "#e5e7df";
  const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const lightness = 88 - ratio * 38;
  return `hsl(164 28% ${lightness}%)`;
}

export function FactualRegionalMap({ observations }: { observations: Observation[] }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [layer, setLayer] = useState<(typeof layerOptions)[number][0]>("regional_boundary");
  const [activeRegionId, setActiveRegionId] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}${file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((collection) => {
        const next = collection.features.filter((feature: Feature) => feature.properties.region_id && feature.geometry);
        setFeatures(next);
        setActiveRegionId(next[0]?.properties.region_id ?? "");
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadError(true);
      });
    return () => controller.abort();
  }, []);

  const latestObservations = useMemo(() => {
    const matching = observations.filter((observation) => observation.region_indicator_id === layer && observation.value !== null);
    const latestYear = matching.map((observation) => observation.year).sort().at(-1);
    return matching.filter((observation) => observation.year === latestYear);
  }, [layer, observations]);
  const observationByRegion = useMemo(() => new Map(latestObservations.map((observation) => [observation.region_id, observation])), [latestObservations]);
  const values = latestObservations.map((observation) => Number(observation.value)).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const paths = useMemo(() => {
    if (!features.length) return [];
    const project = projector(features);
    return features.map((feature) => ({ feature, d: pathFor(feature, project) }));
  }, [features]);
  const activeFeature = features.find((feature) => feature.properties.region_id === activeRegionId);
  const activeObservations = observations.filter((observation) => observation.region_id === activeRegionId && observation.year === "2024");
  const activeLayerObservation = observationByRegion.get(activeRegionId);

  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Factual Layer / Hungary Pilot</p>
          <h2 className="mt-3 text-2xl font-semibold">匈牙利 NUTS3 事实地图</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">仅显示已通过独立展示闸门的边界与 P0 官方区域事实。色阶不表示风险、预测或政策优劣。</p>
        </div>
        <label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">图层
          <select value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)]">
            {layerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f7f8f4] p-3">
          {loadError ? <p className="p-6 text-sm text-rose-700">事实边界文件读取失败。</p> : null}
          {!features.length && !loadError ? <p className="p-6 text-sm text-[var(--muted)]">正在读取已核验边界…</p> : null}
          {features.length ? <svg viewBox={`0 0 ${width} ${height}`} className="h-full max-h-[520px] w-full" role="img" aria-label="匈牙利 NUTS3 事实区域地图">
            <rect width={width} height={height} rx="22" fill="#f7f8f4" />
            {paths.map(({ feature, d }) => {
              const regionId = feature.properties.region_id ?? "";
              const observation = observationByRegion.get(regionId);
              const numericValue = observation ? Number(observation.value) : null;
              const active = regionId === activeRegionId;
              return <path key={regionId} d={d} fill={layer === "regional_boundary" ? (active ? "#8fbdb2" : "#c7d9d2") : factualFill(Number.isFinite(numericValue) ? numericValue : null, min, max)} fillRule="evenodd" stroke={active ? "#234b47" : "#657f79"} strokeWidth={active ? 1.35 : 0.7} vectorEffect="non-scaling-stroke" tabIndex={0} onMouseEnter={() => setActiveRegionId(regionId)} onFocus={() => setActiveRegionId(regionId)} onClick={() => setActiveRegionId(regionId)} className="cursor-pointer outline-none"><title>{`${feature.properties.region_name} / ${observation ? `${observation.value} ${observation.unit}` : "边界图层"}`}</title></path>;
            })}
          </svg> : null}
        </div>
        <aside className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Region Profile</p>
          <h3 className="mt-3 text-lg font-semibold">{activeFeature?.properties.region_name ?? "请选择区域"}</h3>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{activeFeature?.properties.region_code} / {activeRegionId}</p>
          {activeLayerObservation ? <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-lg font-semibold">{activeLayerObservation.value} <span className="text-xs text-[var(--muted)]">{activeLayerObservation.unit} / {activeLayerObservation.year}</span></p> : null}
          <dl className="mt-4 grid gap-3 text-sm">
            {activeObservations.map((observation) => <div key={observation.region_indicator_id}><dt className="text-xs text-[var(--muted)]">{layerOptions.find(([id]) => id === observation.region_indicator_id)?.[1]}</dt><dd className="mt-1 font-semibold">{observation.value} {observation.unit}</dd></div>)}
          </dl>
          {activeLayerObservation?.source_url ? <a className="mt-5 inline-flex text-xs font-semibold text-[var(--accent)] underline" href={activeLayerObservation.source_url.split(" | ")[0]} target="_blank" rel="noreferrer">核验 Eurostat 来源</a> : null}
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">数据年份固定显示；缺失值不会用国家值代填。点击或悬停区域可更新档案。</p>
        </aside>
      </div>
    </section>
  );
}
