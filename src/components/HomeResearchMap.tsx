"use client";

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
  latestEvent: { id: string; date: string; title: string } | null;
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
    return features.map((feature, index) => ({
      key: `${feature.properties.countrySlug}-${index}`,
      slug: feature.properties.countrySlug,
      d: pathFor(feature, project),
    }));
  }, [features]);

  return (
    <section className="home-map-section" aria-labelledby="home-map-title">
      <div className="home-map-heading">
        <div><p className="editorial-kicker">Interactive Research Map</p><h2 id="home-map-title" className="mt-2 text-3xl font-semibold">{m.title}</h2></div>
        <p>{m.intro}</p>
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
                return <path key={item.key} d={item.d} fill={fill} stroke="var(--map-border)" strokeWidth="1.4" className={`home-country-shape${active ? " is-selected" : ""}`} role="button" tabIndex={0} aria-label={`${m.select}${en ? country?.nameEn ?? item.slug : country?.nameZh ?? item.slug}`} onClick={() => setSelectedSlug(item.slug)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedSlug(item.slug); }}><title>{en ? country?.nameEn ?? item.slug : country?.nameZh ?? item.slug}</title></path>;
              })}
            </svg>
          ) : null}
          <div className="home-country-selector" aria-label={m.shortcuts}>
            {countries.map((country) => <button key={country.slug} type="button" aria-pressed={country.slug === selectedSlug} onClick={() => setSelectedSlug(country.slug)}>{country.iso2}</button>)}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]" data-source-attribution="geoboundaries">{m.boundaryAttribution} <a className="underline" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/geo/BOUNDARY-LICENSES.txt`}>{m.boundaryLicences}</a></p>
        </div>
        <aside className="home-country-panel">
          <p className="editorial-kicker">Selected Country</p>
          <h3>{en ? selected.nameEn : selected.nameZh}</h3>
          <p className="home-country-en">{selected.nameEn}</p>
          <dl className="home-country-metrics">
            {selected.indicators.map((indicator) => <div key={indicator.id}><dt>{indicator.label}</dt><dd>{indicator.value}</dd><dd className="home-country-year">{indicator.year}</dd></div>)}
          </dl>
          <div className="home-latest-event">
            <p>Latest verified event</p>
            {selected.latestEvent ? <Link href={localizedRoute(`/news?country=${selected.slug}#${selected.latestEvent.id}`, locale)}><span>{selected.latestEvent.date}</span>{en ? <div lang="zh-CN" data-original-language="zh-CN">{selected.latestEvent.title}</div> : selected.latestEvent.title}</Link> : <span>{m.noEvent}</span>}
          </div>
          <div className="home-map-actions"><Link href={localizedRoute(`/countries/${selected.slug}`, locale)}>{m.profile}</Link><Link href={localizedRoute(`/news?country=${selected.slug}`, locale)}>{m.events}</Link><Link href={localizedRoute(`/map?country=${selected.slug}`, locale)}>{m.fullMap}</Link></div>
        </aside>
      </div>
    </section>
  );
}
