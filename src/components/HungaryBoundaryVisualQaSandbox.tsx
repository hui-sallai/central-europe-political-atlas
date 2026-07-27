"use client";

import { useEffect, useMemo, useState } from "react";

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];

type HungaryBoundaryFeature = {
  type: "Feature";
  properties: {
    NUTS_ID?: string;
    NAME_LATN?: string;
    NUTS_NAME?: string;
    region_id?: string | null;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Polygon | MultiPolygon;
  };
};

type HungaryBoundaryCollection = {
  type: "FeatureCollection";
  features: HungaryBoundaryFeature[];
};

const viewBox = { width: 760, height: 520, padding: 28 };
const sandboxFile = "/data/boundaries/sandbox/hu_nuts3_gisco_2024.geojson";

function polygonsForFeature(feature: HungaryBoundaryFeature): MultiPolygon {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Polygon]
    : (feature.geometry.coordinates as MultiPolygon);
}

function collectPositions(features: HungaryBoundaryFeature[]) {
  return features.flatMap((feature) => polygonsForFeature(feature).flatMap((polygon) => polygon.flat()));
}

function createProjector(features: HungaryBoundaryFeature[]) {
  const positions = collectPositions(features);
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  for (const [longitude, latitude] of positions) {
    minLongitude = Math.min(minLongitude, longitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }
  const centerLatitude = (minLatitude + maxLatitude) / 2;
  const longitudeScale = Math.cos((centerLatitude * Math.PI) / 180);
  const minX = minLongitude * longitudeScale;
  const maxX = maxLongitude * longitudeScale;
  const xSpan = maxX - minX || 1;
  const ySpan = maxLatitude - minLatitude || 1;
  const scale = Math.min(
    (viewBox.width - viewBox.padding * 2) / xSpan,
    (viewBox.height - viewBox.padding * 2) / ySpan,
  );
  const offsetX = (viewBox.width - xSpan * scale) / 2;
  const offsetY = (viewBox.height - ySpan * scale) / 2;

  return ([longitude, latitude]: Position) => [
    offsetX + (longitude * longitudeScale - minX) * scale,
    offsetY + (maxLatitude - latitude) * scale,
  ] as Position;
}

function polygonPath(polygon: Polygon, project: (position: Position) => Position) {
  return polygon
    .map((ring) =>
      `${ring
        .map((position, index) => {
          const [x, y] = project(position);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ")} Z`,
    )
    .join(" ");
}

function featurePath(feature: HungaryBoundaryFeature, project: (position: Position) => Position) {
  return polygonsForFeature(feature).map((polygon) => polygonPath(polygon, project)).join(" ");
}

export function HungaryBoundaryVisualQaSandbox() {
  const [features, setFeatures] = useState<HungaryBoundaryFeature[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [activeFeature, setActiveFeature] = useState<HungaryBoundaryFeature | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    fetch(`${basePath}${sandboxFile}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Boundary sandbox request failed: ${response.status}`);
        return response.json() as Promise<HungaryBoundaryCollection>;
      })
      .then((collection) => {
        const validFeatures = collection.features.filter(
          (feature) =>
            (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") &&
            Array.isArray(feature.geometry.coordinates) &&
            feature.geometry.coordinates.length > 0,
        );
        setFeatures(validFeatures);
        setActiveFeature(validFeatures[0] ?? null);
        setLoadState("loaded");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState("error");
      });

    return () => controller.abort();
  }, []);

  const paths = useMemo(() => {
    if (!features.length) return [];
    const project = createProjector(features);
    return features.map((feature) => ({ feature, path: featurePath(feature, project) }));
  }, [features]);

  return (
    <section className="mt-5 rounded-2xl border border-dashed border-[var(--accent)] bg-[#eef3ef] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Internal Visual QA Sandbox</p>
          <h3 className="mt-2 text-xl font-semibold">匈牙利 NUTS3 边界沙盒预览</h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted)]">
            仅用于人工检查边界形状、视图定位和候选 tooltip；该预览不属于正式地图图层，也不代表许可、权威拓扑或最终主键验收通过。
          </p>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          ready_for_public_display: false
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f7f8f4] p-3">
          {loadState === "loading" ? <p className="text-sm text-[var(--muted)]">正在读取沙盒边界文件…</p> : null}
          {loadState === "error" ? <p className="text-sm text-rose-700">沙盒文件读取失败；不影响正式地图，因为正式展示未启用。</p> : null}
          {loadState === "loaded" ? (
            <svg viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} className="h-full max-h-[500px] w-full" role="img" aria-label="匈牙利 NUTS3 内部视觉 QA 沙盒">
              <rect width={viewBox.width} height={viewBox.height} rx="22" fill="#f7f8f4" />
              {paths.map(({ feature, path }, index) => {
                const code = feature.properties.NUTS_ID ?? `feature-${index + 1}`;
                const isActive = activeFeature?.properties.NUTS_ID === feature.properties.NUTS_ID;
                return (
                  <path
                    key={code}
                    d={path}
                    fill={isActive ? "#8fbdb2" : "#c7d9d2"}
                    fillRule="evenodd"
                    stroke={isActive ? "#385e59" : "#6e8882"}
                    strokeWidth={isActive ? 1.4 : 0.8}
                    vectorEffect="non-scaling-stroke"
                    tabIndex={0}
                    onMouseEnter={() => setActiveFeature(feature)}
                    onFocus={() => setActiveFeature(feature)}
                    className="cursor-default outline-none transition-colors"
                  >
                    <title>{`${code} / ${feature.properties.NAME_LATN ?? feature.properties.NUTS_NAME ?? "待核验"} / ${feature.properties.region_id ?? "region_id candidate pending"}`}</title>
                  </path>
                );
              })}
            </svg>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">QA Tooltip Candidate</p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">NUTS code</dt>
              <dd className="mt-1 font-mono font-semibold">{activeFeature?.properties.NUTS_ID ?? "待检查"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">region name</dt>
              <dd className="mt-1 font-semibold">{activeFeature?.properties.NAME_LATN ?? activeFeature?.properties.NUTS_NAME ?? "待检查"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">region_id candidate</dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold">{activeFeature?.properties.region_id ?? "待检查"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">feature rendered</dt>
              <dd className="mt-1 font-semibold">{loadState === "loaded" ? `${features.length} / 20` : "待加载"}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
            fit bounds、tooltip、视觉重叠与破碎边界仍需人工确认。能渲染不等于可分析或可公开展示。
          </p>
        </aside>
      </div>
    </section>
  );
}
