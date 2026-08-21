"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];
type MapFeature = {
  properties: { countrySlug: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Polygon | MultiPolygon };
};

export type HomeMapCountry = {
  slug: string;
  nameZh: string;
  nameEn: string;
  iso2: string;
  indicators: Array<{ id: string; label: string; value: string; year: string }>;
  latestEvent: { id: string; date: string; title: string } | null;
};

const width = 900;
const height = 580;
const padding = 24;
const neutralCountryFill = "#cbc8bf";

function polygons(feature: MapFeature): MultiPolygon {
  return feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as Polygon] : feature.geometry.coordinates as MultiPolygon;
}

function positions(feature: MapFeature) {
  return polygons(feature).flatMap((polygon) => polygon.flat());
}

function projector(features: MapFeature[]) {
  const points = features.flatMap(positions);
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

function pathFor(feature: MapFeature, project: (position: Position) => Position) {
  return polygons(feature).map((polygon) => polygon.map((ring) => `${ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ")} Z`).join(" ")).join(" ");
}

export function HomeResearchMap({ countries }: { countries: HomeMapCountry[] }) {
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedSlug, setSelectedSlug] = useState("poland");
  const selected = countries.find((country) => country.slug === selectedSlug) ?? countries[0];

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/geo/home-countries-simplified.geojson`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((collection) => {
        setFeatures((collection.features as MapFeature[]).filter((feature) => feature.geometry && feature.properties.countrySlug));
        setLoadState("ready");
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadState("error");
      });
    return () => controller.abort();
  }, []);

  const paths = useMemo(() => {
    if (!features.length) return [];
    const project = projector(features);
    return features.map((feature, index) => ({
      key: `${feature.properties.countrySlug}-${index}`,
      slug: feature.properties.countrySlug,
      d: pathFor(feature, project),
    }));
  }, [features]);

  return (
    <section className="home-map-section" aria-labelledby="home-map-title">
      <div className="home-map-heading">
        <div><p className="editorial-kicker">Interactive Research Map</p><h2 id="home-map-title" className="mt-2 text-3xl font-semibold">十国政治经济研究入口</h2></div>
        <p>点击国家查看最新宏观观测和事件，再进入单国档案或完整区域地图。</p>
      </div>
      <div className="home-map-grid">
        <div className="home-map-canvas">
          {loadState === "loading" ? <div className="home-map-message">正在加载轻量国家边界…</div> : null}
          {loadState === "error" ? <div className="home-map-message">地图边界暂时不可用。国家档案与数据入口仍可正常访问。</div> : null}
          {loadState === "ready" ? (
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="中欧十国互动研究地图">
              {paths.map((item) => {
                const active = item.slug === selectedSlug;
                const country = countries.find((candidate) => candidate.slug === item.slug);
                const fill = active ? "var(--accent)" : neutralCountryFill;
                return <path key={item.key} d={item.d} fill={fill} stroke="#f7f5ef" strokeWidth="1.4" className={`home-country-shape${active ? " is-selected" : ""}`} role="button" tabIndex={0} aria-label={`选择${country?.nameZh ?? item.slug}`} onClick={() => setSelectedSlug(item.slug)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedSlug(item.slug); }}><title>{country?.nameZh ?? item.slug}</title></path>;
              })}
            </svg>
          ) : null}
          <div className="home-country-selector" aria-label="国家快捷选择">
            {countries.map((country) => <button key={country.slug} type="button" aria-pressed={country.slug === selectedSlug} onClick={() => setSelectedSlug(country.slug)}>{country.iso2}</button>)}
          </div>
        </div>
        <aside className="home-country-panel">
          <p className="editorial-kicker">Selected Country</p>
          <h3>{selected.nameZh}</h3>
          <p className="home-country-en">{selected.nameEn}</p>
          <dl className="home-country-metrics">
            {selected.indicators.map((indicator) => <div key={indicator.id}><dt>{indicator.label}</dt><dd>{indicator.value}</dd><span>{indicator.year}</span></div>)}
          </dl>
          <div className="home-latest-event">
            <p>Latest verified event</p>
            {selected.latestEvent ? <Link href={`/news?country=${selected.slug}#${selected.latestEvent.id}`}><span>{selected.latestEvent.date}</span>{selected.latestEvent.title}</Link> : <span>当前无已核验事件。</span>}
          </div>
          <div className="home-map-actions"><Link href={`/countries/${selected.slug}`}>国家档案</Link><Link href={`/news?country=${selected.slug}`}>相关事件</Link><Link href={`/map?country=${selected.slug}`}>完整地图</Link></div>
        </aside>
      </div>
    </section>
  );
}
