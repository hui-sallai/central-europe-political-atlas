"use client";

import { useState } from "react";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import { DataLayerOverview } from "@/components/DataLayerOverview";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { chinaProjectVerificationLabel, verifyChinaProject } from "@/lib/chinaProjectVerification";
import { getCountryMetadata } from "@/lib/countryMetadata";
import type { Country } from "@/lib/data";
import { getChinaProjectRecords, getNewsEventRecords, getV4ObservationCoverage } from "@/lib/extendedData";
import {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ValidationManifestSummary,
} from "@/lib/regionQualityChecks";

type DetailMode = "map" | "reading";

const detailModes: { id: DetailMode; label: string; description: string }[] = [
  { id: "map", label: "地图层级", description: "国家空间入口、图层状态与二级行政区接入位置。" },
  { id: "reading", label: "文字资料", description: "政治、党派、对华经贸、来源与数据状态的阅读层。" },
];

const v4CountrySlugs = new Set(["poland", "hungary", "czechia", "slovakia"]);

function CoverageStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
    </div>
  );
}

export function CountryDetailModeTabs({ country }: { country: Country }) {
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];
  const basicIndicators = getBasicIndicators(country.slug);
  const projectRecords = getChinaProjectRecords(country.slug);
  const newsEventRecords = getNewsEventRecords(country.slug);
  const coverage = getV4ObservationCoverage(country.slug);
  const metadata = getCountryMetadata(country.slug);
  const isV4 = v4CountrySlugs.has(country.slug);
  const isHungary = country.slug === "hungary";
  const hasManualPolitics = country.parties.some((party) => party.shortName !== "TBD");
  const projectSummary = projectRecords.length > 0
    ? Object.entries(projectRecords.reduce(
        (acc, project) => {
          acc[verifyChinaProject(project).conclusion] += 1;
          return acc;
        },
        { quantifiable: 0, partially_quantifiable: 0, background_only: 0, excluded: 0 },
      ))
        .filter(([, count]) => count > 0)
        .map(([status, count]) => `${chinaProjectVerificationLabel(status as ReturnType<typeof verifyChinaProject>["conclusion"])} ${count}`)
        .join("；")
    : "待接入";

  const regionalItems = isHungary
    ? [
        { label: "边界层级", value: "NUTS3 / 20 区" },
        { label: "许可核验", value: hungaryGiscoLicenseVerificationDecisionSummary.license_checked ? "已记录" : "待核验" },
        { label: "主键匹配", value: hungaryNuts3ValidationManifestSummary.region_id_final_matched ? "已记录" : "待核验" },
        { label: "权威拓扑", value: hungaryAuthoritativeTopologyValidationDecisionSummary.authoritative_topology_checked ? "已记录" : "待核验" },
        { label: "区域统计", value: "待接入" },
        { label: "正式地图展示", value: "未启用" },
      ]
    : isV4
      ? [
          { label: "区域主键", value: "已预留" },
          { label: "边界来源", value: "待接入" },
          { label: "区域统计", value: "待接入" },
          { label: "项目定位", value: "准备中" },
          { label: "地图图层", value: "已注册，未启用" },
          { label: "正式地图展示", value: "未启用" },
        ]
      : [
          { label: "区域层", value: "暂不进入第一批" },
          { label: "区域主键", value: "国家级待接入" },
          { label: "边界来源", value: "待接入" },
          { label: "区域统计", value: "待接入" },
          { label: "项目定位", value: "待接入" },
          { label: "正式地图展示", value: "未启用" },
        ];

  return (
    <section className="mt-8">
      <DataLayerOverview countrySlug={country.slug} compact title={`${country.nameZh}数据状态`} />

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="card p-6">
          <p className="eyebrow">Country Profile</p>
          <h2 className="mt-3 text-2xl font-semibold">国家基础档案</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              { label: "首都", value: country.capitalZh },
              { label: "政体", value: country.polityZh },
              { label: "议会结构", value: country.parliamentZh },
              { label: "货币", value: country.currency },
              { label: "政府首脑", value: metadata?.head_of_government ?? "待核验", source: metadata?.head_of_government_source_status },
              { label: "国家元首", value: metadata?.head_of_state ?? "待核验", source: metadata?.head_of_state_source_status },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/60 p-3">
                <dt className="text-xs text-[var(--muted)]">{item.label}</dt>
                <dd className="mt-1 font-semibold">{item.value}</dd>
                {item.source ? <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">来源状态：{item.source}；未核验字段不进入模型。</p> : null}
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{country.summaryZh}</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Basic Macro Data</p>
          <h2 className="mt-3 text-2xl font-semibold">基础宏观数据</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {basicIndicators.slice(0, 6).map((indicator) => (
              <div key={indicator.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--muted)]">{indicator.label}</p>
                  <DataStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                </div>
                <p className="mt-2 font-semibold">{indicator.value}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{indicator.year} / {indicator.source}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 card p-6">
        <p className="eyebrow">Data Coverage</p>
        <h2 className="mt-3 text-2xl font-semibold">{isV4 ? "V4 扩展数据完整度" : "扩展数据状态"}</h2>
        {isV4 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CoverageStat label="指标覆盖" value="12 / 12" note="财政、外部、投资、能源与产业指标采用同一模板。" />
            <CoverageStat label="观测值覆盖" value={`${coverage.present} / ${coverage.expected}`} note={`2021–2025 共 ${coverage.expected} 个位置；待接入 ${coverage.pending}。`} />
            <CoverageStat label="正式数据" value={`${coverage.official} / ${coverage.expected}`} note={`计算值 ${coverage.computed}；人工整理 ${coverage.manual}。`} />
            <CoverageStat label="导出与质量记录" value="已覆盖" note="完整观测值、字典和 QA 表保留在数据工作台。" />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CoverageStat label="基础宏观" value="已进入 observations" note="六项基础宏观指标保留标准观测值。" />
            <CoverageStat label="V4 扩展指标" value="待接入" note="不在非 V4 国家页做模板验收。" />
            <CoverageStat label="区域与项目" value="待接入" note="当前只保留结构与后续入口。" />
          </div>
        )}
      </section>

      <section className="mt-4 card p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Regional And Map Status</p>
            <h2 className="mt-3 text-2xl font-semibold">区域数据与地图状态</h2>
          </div>
          <DataStatusBadge status={isHungary ? "manual" : "pending"} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {regionalItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {isHungary
            ? "许可、最终主键和权威拓扑记录已保留；公开展示准入仍未启用。完整技术证据位于数据页与方法论技术说明。"
            : isV4
              ? "该国进入 V4 区域数据准备范围，但真实边界与区域统计尚未接入。"
              : "该国暂不进入第一批区域地图数据准备；当前保留国家级宏观数据和后续接入入口。"}
        </p>
      </section>

      <div className="mt-4 card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="px-2">
            <p className="eyebrow">Country View</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{activeModeInfo.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {detailModes.map((mode) => (
              <button key={mode.id} type="button" onClick={() => setActiveMode(mode.id)} className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${activeMode === mode.id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeMode === "map" ? <CountryMapWorkbench country={country} /> : null}
      {activeMode === "reading" ? <CountryReadingTabs country={country} /> : null}

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        {[
          { label: "对华经贸项目", status: projectRecords.length > 0 ? "待核验" : "待接入", note: projectRecords.length > 0 ? `${projectRecords.length} 项；${projectSummary}。` : "项目表入口已预留。" },
          { label: "党派 / 政治样本", status: "待核验", note: `${hasManualPolitics ? "人工整理" : "待接入"}；不进入模型。` },
          { label: "事件库入口", status: newsEventRecords.length > 0 ? "待编码" : "待接入", note: "新闻摘要与事件编码状态在事件库统一管理。" },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{item.label}</p>
            <p className="mt-2 font-semibold">{item.status}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
