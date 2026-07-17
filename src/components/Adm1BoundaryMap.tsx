"use client";

import { useEffect, useMemo, useState } from "react";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { boundaryFeatureToRegionSlug, countryGeoJsonFiles, supplementalRegionMarkers } from "@/lib/boundaryMap";
import { countries } from "@/lib/data";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];

type GeoFeature = {
  type: "Feature";
  properties: {
    shapeName?: string;
    shapeISO?: string;
    shapeGroup?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Polygon | MultiPolygon;
  };
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type MapFeature = GeoFeature & {
  countrySlug: string;
  regionSlug?: string;
};

type Adm1BoundaryMapProps = {
  compact?: boolean;
  enableRegionSelection?: boolean;
  focusCountrySlug?: string;
  regionMetricValues?: Record<string, number>;
  selectedCountrySlug: string;
  selectedRegionSlug?: string;
  onSelectCountry: (slug: string) => void;
  onSelectRegion: (countrySlug: string, regionSlug?: string) => void;
};

const viewBox = {
  width: 900,
  height: 640,
  padding: 28,
};

const countryMapColors: Record<string, string> = {
  germany: "#8db7c5",
  poland: "#d9a45e",
  hungary: "#78b8ad",
  romania: "#8ab1d2",
  czechia: "#9d99cf",
  slovakia: "#9bc184",
  slovenia: "#c0bd71",
  serbia: "#b69acd",
  austria: "#d28d78",
  croatia: "#d2a76f",
};

function getFeaturePolygons(feature: GeoFeature): MultiPolygon {
  if (feature.geometry.type === "Polygon") {
    return [feature.geometry.coordinates as Polygon];
  }
  return feature.geometry.coordinates as MultiPolygon;
}

function collectPositions(features: MapFeature[]) {
  const positions: Position[] = [];
  for (const feature of features) {
    for (const polygon of getFeaturePolygons(feature)) {
      for (const ring of polygon) {
        positions.push(...ring);
      }
    }
  }
  return positions;
}

function createProjector(features: MapFeature[]) {
  const positions = collectPositions(features);
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lon, lat] of positions) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const centerLat = (minLat + maxLat) / 2;
  const longitudeScale = Math.cos((centerLat * Math.PI) / 180);
  const minX = minLon * longitudeScale;
  const maxX = maxLon * longitudeScale;
  const xSpan = maxX - minX || 1;
  const latSpan = maxLat - minLat || 1;
  const scale = Math.min((viewBox.width - viewBox.padding * 2) / xSpan, (viewBox.height - viewBox.padding * 2) / latSpan);
  const mapWidth = xSpan * scale;
  const mapHeight = latSpan * scale;
  const offsetX = (viewBox.width - mapWidth) / 2;
  const offsetY = (viewBox.height - mapHeight) / 2;

  return ([lon, lat]: Position) => {
    const projectedX = lon * longitudeScale;
    const x = offsetX + (projectedX - minX) * scale;
    const y = offsetY + (maxLat - lat) * scale;
    return [x, y] as Position;
  };
}

function polygonToPath(polygon: Polygon, project: (position: Position) => Position) {
  return polygon
    .map((ring) =>
      ring
        .map((position, index) => {
          const [x, y] = project(position);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z",
    )
    .join(" ");
}

function featureToPath(feature: MapFeature, project: (position: Position) => Position) {
  return getFeaturePolygons(feature).map((polygon) => polygonToPath(polygon, project)).join(" ");
}

function getCountryColor(countrySlug: string) {
  const country = countries.find((item) => item.slug === countrySlug);
  return countryMapColors[countrySlug] ?? country?.parties.find((party) => party.role === "governing")?.color ?? "#29415f";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return { h: hue / 6, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }) {
  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let hue = t;
    if (hue < 0) hue += 1;
    if (hue > 1) hue -= 1;
    if (hue < 1 / 6) return p + (q - p) * 6 * hue;
    if (hue < 1 / 2) return q;
    if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255,
  };
}

function getRegionChoroplethColor(countrySlug: string, value: number) {
  const base = rgbToHsl(hexToRgb(getCountryColor(countrySlug)));
  const intensity = clamp(value, 0, 1);

  return rgbToHex(
    hslToRgb({
      h: base.h,
      s: clamp(base.s + 0.18, 0.34, 0.62),
      l: clamp(0.78 - intensity * 0.34, 0.36, 0.78),
    }),
  );
}

export function Adm1BoundaryMap({
  compact = false,
  enableRegionSelection = true,
  focusCountrySlug,
  regionMetricValues,
  selectedCountrySlug,
  selectedRegionSlug,
  onSelectCountry,
  onSelectRegion,
}: Adm1BoundaryMapProps) {
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBoundaries() {
      try {
        const collections = await Promise.all(
          Object.entries(countryGeoJsonFiles).map(async ([countrySlug, url]) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`${url} returned ${response.status}`);
            }
            const collection = (await response.json()) as GeoCollection;
            return collection.features.map((feature) => ({
              ...feature,
              countrySlug,
              regionSlug: boundaryFeatureToRegionSlug[countrySlug]?.[feature.properties.shapeName ?? ""],
            }));
          }),
        );

        if (!cancelled) {
          setFeatures(collections.flat());
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load boundaries");
        }
      }
    }

    loadBoundaries();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFeatures = useMemo(
    () => (focusCountrySlug ? features.filter((feature) => feature.countrySlug === focusCountrySlug) : features),
    [features, focusCountrySlug],
  );
  const visibleMarkers = useMemo(
    () => {
      if (!enableRegionSelection) {
        return [];
      }
      return focusCountrySlug ? supplementalRegionMarkers.filter((marker) => marker.countrySlug === focusCountrySlug) : supplementalRegionMarkers;
    },
    [enableRegionSelection, focusCountrySlug],
  );
  const project = useMemo(() => (visibleFeatures.length > 0 ? createProjector(visibleFeatures) : null), [visibleFeatures]);
  const featurePaths = useMemo(() => {
    if (!project) {
      return [];
    }

    return visibleFeatures.map((feature) => ({
      feature,
      path: featureToPath(feature, project),
      shapeName: feature.properties.shapeName ?? "Unknown region",
    }));
  }, [project, visibleFeatures]);
  const countryOutlinePaths = useMemo(() => {
    const pathByCountry = new Map<string, string[]>();
    for (const item of featurePaths) {
      const paths = pathByCountry.get(item.feature.countrySlug) ?? [];
      paths.push(item.path);
      pathByCountry.set(item.feature.countrySlug, paths);
    }

    return Array.from(pathByCountry, ([countrySlug, paths]) => ({
      countrySlug,
      path: paths.join(" "),
    }));
  }, [featurePaths]);
  const focusCountry = focusCountrySlug ? countries.find((country) => country.slug === focusCountrySlug) : undefined;

  if (focusCountrySlug && !countryGeoJsonFiles[focusCountrySlug]) {
    return (
      <div className="flex min-h-[420px] flex-col justify-between rounded-[24px] border border-[var(--line)] bg-[#edf0e8] p-6">
        <div>
          <p className="eyebrow">Boundary Pending</p>
          <h3 className="mt-3 text-2xl font-semibold">{focusCountry?.nameZh ?? focusCountrySlug} 边界待接入</h3>
          <div className="mt-3">
            <DataStatusBadge status="pending" />
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            边界数据接入前仅显示结构样例；当前仅保留地图工作台入口。
          </p>
        </div>
        <div className="mt-6 grid max-h-[260px] gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
          {(focusCountry?.regions ?? []).map((region) => (
            <div key={region.slug} className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
              <p className="text-sm font-semibold">{region.nameZh}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{region.nameEn}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-[24px] border border-[var(--line)] bg-[#edf0e8] p-8 text-center text-sm text-[var(--muted)] ${compact ? "h-full min-h-0" : "min-h-[360px]"}`}>
        边界数据加载失败：{error}
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`flex items-center justify-center rounded-[24px] border border-[var(--line)] bg-[#edf0e8] p-8 text-sm text-[var(--muted)] ${compact ? "h-full min-h-0" : "min-h-[360px]"}`}>
        边界数据接入前仅显示结构样例；当前仅保留地图工作台入口。
      </div>
    );
  }

  return (
    <div className={`${compact ? "flex h-full min-h-0 flex-col" : ""} overflow-hidden rounded-[24px] border border-[var(--line)] bg-[#edf0e8]`}>
      <svg
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        role="img"
        aria-label="地图工作台结构样例"
        className={`w-full ${compact ? "home-map-svg min-h-0 flex-1" : "h-full min-h-[580px]"}`}
      >
        <rect width={viewBox.width} height={viewBox.height} fill="#edf0e8" />
        <path d="M52 105 C180 20 365 18 535 45 C735 78 875 220 880 385 C885 545 720 625 495 628 C250 632 45 535 25 355 C12 235 18 145 52 105 Z" fill="#e1e7dd" />

        {featurePaths.map(({ feature, path, shapeName }) => {
          const country = countries.find((item) => item.slug === feature.countrySlug);
          const isSelected = selectedCountrySlug === feature.countrySlug;
          const isRegionSelected = enableRegionSelection && selectedRegionSlug === feature.regionSlug;
          const metricValue = feature.regionSlug ? regionMetricValues?.[feature.regionSlug] : undefined;
          const hasMetricValue = typeof metricValue === "number";
          const fill = hasMetricValue && focusCountrySlug ? getRegionChoroplethColor(feature.countrySlug, metricValue) : getCountryColor(feature.countrySlug);
          const metricOpacity = typeof metricValue === "number" ? 0.28 + metricValue * 0.62 : undefined;
          const selectFeature = () => {
            if (enableRegionSelection) {
              onSelectRegion(feature.countrySlug, feature.regionSlug);
              return;
            }
            onSelectCountry(feature.countrySlug);
          };
          const visualPath = (
            <path
              d={path}
              fill={fill}
              fillOpacity={isRegionSelected ? 0.96 : hasMetricValue && focusCountrySlug ? 0.94 : metricOpacity ?? (isSelected ? 1 : 0.92)}
              stroke={isRegionSelected ? "#788487" : enableRegionSelection ? "#f1eadf" : "#fbf7ee"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={isRegionSelected ? 0.58 : enableRegionSelection ? 0.64 : 0.5}
              strokeWidth={isRegionSelected ? 0.32 : enableRegionSelection ? 0.2 : 0.12}
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
              pointerEvents={enableRegionSelection ? undefined : "none"}
              className={enableRegionSelection ? "transition hover:fill-opacity-95" : "transition"}
            />
          );

          if (!enableRegionSelection) {
            return (
              <g key={`${feature.countrySlug}-${shapeName}`}>
                {visualPath}
              </g>
            );
          }

          return (
            <g
              key={`${feature.countrySlug}-${shapeName}`}
              role="button"
              tabIndex={0}
              aria-label={`选择 ${country?.nameZh ?? feature.countrySlug}`}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: "none" }}
              onClick={selectFeature}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  selectFeature();
                }
              }}
            >
              {visualPath}
              <title>{`${shapeName} / ${country?.nameZh ?? feature.countrySlug}`}</title>
            </g>
          );
        })}

        {countryOutlinePaths.map((outline) => {
          const isSelected = selectedCountrySlug === outline.countrySlug;
          return (
            <path
              key={`outline-${outline.countrySlug}`}
              d={outline.path}
              fill="none"
              stroke={isSelected ? "#26333a" : "#52605c"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={isSelected ? 0.78 : 0.48}
              strokeWidth={isSelected ? 1.05 : 0.72}
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
              pointerEvents="none"
            />
          );
        })}

        {!enableRegionSelection ? countryOutlinePaths.map((outline) => {
          const country = countries.find((item) => item.slug === outline.countrySlug);

          return (
            <g
              key={`country-hit-${outline.countrySlug}`}
              role="button"
              tabIndex={-1}
              aria-label={`选择 ${country?.nameZh ?? outline.countrySlug}`}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: "none" }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelectCountry(outline.countrySlug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelectCountry(outline.countrySlug);
                }
              }}
            >
              <path
                d={outline.path}
                fill="transparent"
                stroke="transparent"
                strokeWidth={8}
                pointerEvents="all"
                vectorEffect="non-scaling-stroke"
                shapeRendering="geometricPrecision"
              />
              <title>{country?.nameZh ?? outline.countrySlug}</title>
            </g>
          );
        }) : null}

        {visibleMarkers.map((marker) => {
          const [x, y] = project([marker.lon, marker.lat]);
          const isSelected = selectedCountrySlug === marker.countrySlug;
          const isRegionSelected = enableRegionSelection && selectedRegionSlug === marker.regionSlug;
          const selectMarker = () => {
            if (enableRegionSelection) {
              onSelectRegion(marker.countrySlug, marker.regionSlug);
              return;
            }
            onSelectCountry(marker.countrySlug);
          };
          return (
            <g
              key={marker.regionSlug}
              role="button"
              tabIndex={0}
              aria-label={`选择 ${marker.label}`}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: "none" }}
              onClick={selectMarker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  selectMarker();
                }
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={isRegionSelected ? 10 : isSelected ? 7 : 5}
                fill="#ffffff"
                stroke="#20242a"
                strokeWidth={isRegionSelected ? "1.8" : "1.1"}
                vectorEffect="non-scaling-stroke"
                className="transition hover:r-9"
              />
              <title>{marker.label}</title>
            </g>
          );
        })}
      </svg>
      {compact ? (
        <div className="border-t border-[var(--line)] bg-white/70 px-3 py-2 text-[10px] font-semibold leading-4 text-[var(--muted)]">
          边界数据接入前仅显示结构样例。
        </div>
      ) : (
        <div className="grid gap-3 border-t border-[var(--line)] bg-white/70 px-4 py-3 text-xs text-[var(--muted)] sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" />
            当前国家
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-white ring-2 ring-[#20242a]" />
            {enableRegionSelection ? "当前区域" : "一级行政区边界"}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-10 rounded-full bg-gradient-to-r from-white to-[var(--accent)] ring-1 ring-[var(--line)]" />
            结构样例 / 不进入模型
          </span>
        </div>
      )}
    </div>
  );
}
