"use client";

import { admittedCountrySlugs } from "@/lib/politicalAdmission";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { localizedRoute, type Locale } from "@/i18n/config";
import { homeMapMessages } from "@/i18n/homeMapMessages";

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
  latestEvent: { id: string; date: string; title: string; titleLanguage?: string; originalLanguageLabel?: string } | null;
};

const width = 900;
const height = 580;
const padding = 24;
const neutralCountryFill = "var(--map-country)";

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

// Place each label within the extent of the largest mainland polygon.
function labelPosition(feature: MapFeature, project: (point: Position) => Position): Position {
  const rings = polygons(feature).map(polygon => polygon[0].map(project));
  const extents = rings.map(ring => {
    const xs = ring.map(([x]) => x), ys = ring.map(([,y]) => y);
    return {left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys)};
  });
  const area = (box: typeof extents[number]) => (box.right-box.left)*(box.bottom-box.top);
  const main = extents.reduce((a,b) => area(a)>area(b) ? a : b);
  return [(main.left+main.right)/2, (main.top+main.bottom)/2];
}

export function HomeResearchMap({ countries, locale = "zh-CN" }: { countries: HomeMapCountry[]; locale?: Locale }) {
  const en = locale === "en";
  const m = homeMapMessages[locale];
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
    const slugs = [...new Set(features.map(f=>f.properties.countrySlug))];
    return slugs.map(slug=>{
      const regions = features.filter(f=>f.properties.countrySlug===slug);
      const centers = regions.map(f=>labelPosition(f,project));
      const mean = centers.reduce(([x,y],[cx,cy])=>[x+cx/centers.length,y+cy/centers.length] as Position,[0,0] as Position);
      const distance = ([x,y]:Position)=>Math.hypot(x-mean[0],y-mean[1]);
      const label = centers.reduce((a,b)=>distance(a)<distance(b)?a:b);
      return {key:slug,slug,label,d:regions.map(f=>pathFor(f,project)).join(" ")};
    });
  }, [features]);

  return (
    <section className="home-map-section" aria-labelledby="home-map-title">
      <div className="home-map-heading">
        <div><p className="editorial-kicker">Interactive Research Map</p><h2 id="home-map-title" className="mt-2 text-3xl font-semibold">{en ? "Explore the atlas" : "探索十国地图"}</h2></div>
        <p>{en ? "Select a country to explore its data and research." : "选择国家，查看档案、数据与研究入口。"}</p>
      </div>
      <div className="home-map-grid">
        <div className="home-map-canvas">
          {loadState === "loading" ? <div className="home-map-message">{m.loading}</div> : null}
          {loadState === "error" ? <div className="home-map-message">{m.error}</div> : null}
          {loadState === "ready" ? (
            <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={m.map}>
              {paths.map((item) => {
                const active = item.slug === selectedSlug;
                const country = countries.find((candidate) => candidate.slug === item.slug);
                const fill = active ? "var(--accent)" : neutralCountryFill;
                return <path key={item.key} d={item.d} fill={fill} stroke="var(--map-border)" strokeWidth="1.4" className={`home-country-shape${active ? " is-selected" : ""}`} role="button" aria-pressed={active} tabIndex={0} aria-label={`${m.select}${en ? country?.nameEn ?? item.slug : country?.nameZh ?? item.slug}`} onClick={() => setSelectedSlug(item.slug)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedSlug(item.slug); } }}><title>{en ? country?.nameEn ?? item.slug : country?.nameZh ?? item.slug}</title></path>;
              })}
              <g aria-hidden="true" pointerEvents="none" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="700">
                {paths.map(item => <text key={item.key} x={item.label[0]} y={item.label[1]} fill="var(--ink)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">{countries.find(c=>c.slug===item.slug)?.iso2}</text>)}
              </g>
            </svg>
          ) : null}
          <div className="home-country-selector" style={{position:"static",marginTop:"0.75rem"}} aria-label={m.shortcuts}>
            {countries.map((country) => <button key={country.slug} title={en ? country.nameEn : country.nameZh} type="button" aria-pressed={country.slug === selectedSlug} onClick={() => setSelectedSlug(country.slug)}>{country.iso2}</button>)}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]" data-source-attribution="geoboundaries">{m.boundaryAttribution} <a className="underline" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/geo/BOUNDARY-LICENSES.txt`}>{m.boundaryLicences}</a></p>
        </div>
        <aside className="home-country-panel">
          <p className="editorial-kicker">Selected Country</p>
          <h3 aria-live="polite">{en ? selected.nameEn : selected.nameZh}</h3>
          {!en && <p className="home-country-en">{selected.nameEn}</p>}
          <div className="home-map-actions"><Link href={localizedRoute(`/countries/${selected.slug}/`, locale)}>{m.profile}</Link><Link href={localizedRoute(`/data/?country=${selected.slug}`, locale)}>{en ? "National economic data" : "国家经济数据"}</Link><Link href={localizedRoute(`/politics/${admittedCountrySlugs.includes(selected.slug) ? `${selected.slug}/` : ""}`, locale)}>{en ? "Politics and elections" : "政治制度与选举"}</Link><Link href={localizedRoute(`/models/?country=${selected.slug}`, locale)}>{en ? "Research and models" : "研究与模型"}</Link><Link href={localizedRoute(`/map/?country=${selected.slug}`, locale)}>{m.fullMap}</Link></div>
        </aside>
      </div>
    </section>
  );
}
