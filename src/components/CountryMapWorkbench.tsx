"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Adm1BoundaryMap } from "@/components/Adm1BoundaryMap";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import type { Country } from "@/lib/data";
import { getCountryLayerData, getLayerOption, getRegionMetricMap, mapLayerOptions, type MapLayer } from "@/lib/mapLayerData";

type CountryMapWorkbenchProps = {
  country: Country;
};

type Adm2Plan = {
  unitZh: string;
  unitNative: string;
  boundaryCandidate: string;
  sourceCandidate: string;
  notes: string;
};

const adm2Plans: Record<string, Adm2Plan> = {
  poland: {
    unitZh: "县 / 具县权城市",
    unitNative: "powiat / miasta na prawach powiatu",
    boundaryCandidate: "geoBoundaries ADM2 或 GUS / PRG 边界",
    sourceCandidate: "Statistics Poland, PKW",
    notes: "适合按县级单位接入人口、地方政府、选举结果和区域经济指标。",
  },
  hungary: {
    unitZh: "区 / 布达佩斯区",
    unitNative: "jaras / Budapest kerulet",
    boundaryCandidate: "geoBoundaries ADM2 或 KSH 行政区边界",
    sourceCandidate: "KSH, National Election Office",
    notes: "匈牙利应区分普通县下辖区与布达佩斯城区，避免再用方向性分类。",
  },
  czechia: {
    unitZh: "区",
    unitNative: "okres",
    boundaryCandidate: "geoBoundaries ADM2 或 CSU / RUIAN 边界",
    sourceCandidate: "Czech Statistical Office, Volby.cz",
    notes: "可先作为选举与人口统计的县级分析单元，后续再细化到城市。",
  },
  slovakia: {
    unitZh: "区",
    unitNative: "okres",
    boundaryCandidate: "geoBoundaries ADM2 或 Statistical Office 边界",
    sourceCandidate: "Statistical Office of the Slovak Republic, volby.statistics.sk",
    notes: "适合接入区级人口、失业、选举和产业分布数据。",
  },
  germany: {
    unitZh: "县 / 非县辖城市",
    unitNative: "Landkreis / kreisfreie Stadt",
    boundaryCandidate: "geoBoundaries ADM2 或 Destatis / BKG 边界",
    sourceCandidate: "Destatis, Federal Returning Officer",
    notes: "适合接入县级经济、人口、选举和产业结构数据。",
  },
  romania: {
    unitZh: "市镇 / 城市 / 区",
    unitNative: "municipiu / oras / comuna",
    boundaryCandidate: "geoBoundaries ADM2 或 INS / ANCPI 边界",
    sourceCandidate: "National Institute of Statistics, Permanent Electoral Authority",
    notes: "可先以县为一级分析，后续下钻到市镇级单位。",
  },
  slovenia: {
    unitZh: "市镇",
    unitNative: "obcina",
    boundaryCandidate: "geoBoundaries ADM2 或 SURS 边界",
    sourceCandidate: "Statistical Office of Slovenia, State Election Commission",
    notes: "斯洛文尼亚适合直接接入市镇级人口、选举和经济指标。",
  },
  serbia: {
    unitZh: "市镇 / 城市",
    unitNative: "opstina / grad",
    boundaryCandidate: "geoBoundaries ADM2 或 Statistical Office 边界",
    sourceCandidate: "Statistical Office of Serbia, Republic Electoral Commission",
    notes: "需单独处理科索沃相关边界与政治表述口径。",
  },
  austria: {
    unitZh: "区 / 法定城市",
    unitNative: "Bezirk / Statutarstadt",
    boundaryCandidate: "geoBoundaries ADM2 或 Statistics Austria 边界",
    sourceCandidate: "Statistics Austria, Interior Ministry elections",
    notes: "适合接入区级人口、经济、选举和产业数据。",
  },
  croatia: {
    unitZh: "市镇 / 城市",
    unitNative: "opcina / grad",
    boundaryCandidate: "geoBoundaries ADM2 或 Croatian Bureau of Statistics 边界",
    sourceCandidate: "Croatian Bureau of Statistics, State Electoral Commission",
    notes: "可先以县为一级分析，后续下钻到城市和市镇级单位。",
  },
};

const adm2Fields = ["名称", "原文名", "所属一级区", "行政中心", "人口", "面积", "最近选举", "来源链接"];

export function CountryMapWorkbench({ country }: CountryMapWorkbenchProps) {
  const [selectedRegionSlug, setSelectedRegionSlug] = useState(country.regions[0]?.slug);
  const [activeLayer, setActiveLayer] = useState<MapLayer>("party");
  const selectedRegion = useMemo(
    () => country.regions.find((region) => region.slug === selectedRegionSlug) ?? country.regions[0],
    [country.regions, selectedRegionSlug],
  );
  const activeLayerOption = getLayerOption(activeLayer);
  const layerData = useMemo(() => getCountryLayerData(country, activeLayer), [activeLayer, country]);
  const regionMetricValues = useMemo(() => getRegionMetricMap(country, activeLayer), [activeLayer, country]);
  const selectedRegionDatum = selectedRegion ? layerData.find((item) => item.region.slug === selectedRegion.slug) : undefined;
  const layerDataPreview = layerData.slice(0, 4);
  const adm2Plan = adm2Plans[country.slug];

  function selectRegion(countrySlug: string, regionSlug?: string) {
    if (countrySlug !== country.slug || !regionSlug) {
      return;
    }
    setSelectedRegionSlug(regionSlug);
  }

  return (
    <section className="mt-6 card overflow-hidden p-4">
      <div className="mb-4 flex flex-col gap-3 px-2 pt-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Dynamic Country Map</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">地图图层仪表盘</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            地图可切换为党派支持率、经济占位色阶和基础底图。对华经贸先保留在项目与文字资料层，不单独作为地图图层。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mapLayerOptions.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeLayer === layer.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[24px] bg-white/40 p-2">
          <Adm1BoundaryMap
            focusCountrySlug={country.slug}
            regionMetricValues={regionMetricValues}
            selectedCountrySlug={country.slug}
            selectedRegionSlug={selectedRegion?.slug}
            onSelectCountry={() => undefined}
            onSelectRegion={selectRegion}
          />
        </div>

        <aside className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
          <p className="eyebrow">Map Layer</p>
          <h3 className="mt-3 text-2xl font-semibold">{activeLayerOption.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{activeLayerOption.description}</p>
          <p className="mt-3 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">{activeLayerOption.legend}</p>
          <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <DataStatusBadge status={activeLayerOption.statusKind} />
              <span className="text-xs font-semibold text-[var(--muted)]">{activeLayerOption.dataStatus}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{activeLayerOption.statusNote}</p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              图层类型：{activeLayer === "baseline" ? "边界底图，非评分图层" : "占位样本；不是真实选举数据、不是民调数据、不是模型评分"}
            </p>
          </div>

          {selectedRegion ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">当前一级行政区</p>
              <h3 className="mt-2 text-xl font-semibold">{selectedRegion.nameZh}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{selectedRegion.nameEn}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {selectedRegion.typeZh}
                {selectedRegion.capitalZh ? ` / 行政中心：${selectedRegion.capitalZh}` : ""}
              </p>
              {selectedRegionDatum ? (
                <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <DataStatusBadge status={activeLayerOption.statusKind} />
                    <span className="text-xs font-semibold text-[var(--muted)]">{selectedRegionDatum.displayValue}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    当前区域只显示该图层的数据状态，不显示占位百分比、强度或排名，避免被误读为事实指标。
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {layerDataPreview.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">图层覆盖预览</p>
              <div className="mt-3 space-y-3">
                {layerDataPreview.map((item) => (
                  <div key={item.region.slug} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate font-semibold">{item.region.nameZh}</span>
                    <DataStatusBadge status={activeLayerOption.statusKind} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">二级行政区接入</p>
                <h4 className="mt-2 text-lg font-semibold">{adm2Plan?.unitZh ?? "真实 ADM2 单元"}</h4>
                <p className="mt-1 text-xs text-[var(--muted)]">{adm2Plan?.unitNative ?? "按该国正式行政层级接入"}</p>
              </div>
              <DataStatusBadge status="pending" />
            </div>

            <div className="mt-4 rounded-xl bg-white/75 p-3">
              <p className="text-xs font-semibold text-[var(--muted)]">当前一级区</p>
              <p className="mt-1 text-sm font-semibold">{selectedRegion?.nameZh ?? country.nameZh}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                下一步将在这里加载该一级行政区下的真实二级行政区列表与边界，而不是继续使用 A/B/C/D 样本。
              </p>
            </div>

            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl bg-white/60 p-3">
                <p className="font-semibold">边界候选</p>
                <p className="mt-1 leading-5 text-[var(--muted)]">{adm2Plan?.boundaryCandidate ?? "geoBoundaries ADM2 或官方边界"}</p>
              </div>
              <div className="rounded-xl bg-white/60 p-3">
                <p className="font-semibold">数据候选</p>
                <p className="mt-1 leading-5 text-[var(--muted)]">{adm2Plan?.sourceCandidate ?? "统计局、选举机构和地方政府网站"}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {adm2Fields.map((field) => (
                <span key={field} className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] text-[var(--muted)]">
                  {field}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{adm2Plan?.notes}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {selectedRegion ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
                区域档案预留
              </span>
            ) : null}
            <Link href="/methodology" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold">
              文字资料
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
