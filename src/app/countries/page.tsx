import Link from "next/link";
import type { Metadata } from "next";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getExtendedObservationCoverage } from "@/lib/extendedData";
import { researchCountries } from "@/lib/researchData";
import { regionalCoverageMatrixV087, spatialV087Summary } from "@/lib/spatialDataV087";
import type { DataStatus } from "@/types/researchData";

export const metadata: Metadata = {
  title: "国家研究目录",
  description: "十国国家档案、数据完整度、模型可用性、事件与区域资料入口。",
};

const v4CountrySlugs = new Set(["poland", "hungary", "czechia", "slovakia"]);

function compactStatus(value: DataStatus) {
  if (value === "official") return "已接入";
  if (value === "verified") return "待核验";
  return "待接入";
}

export default function CountriesPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Country Research Directory</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">国家档案</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        十国均使用同一套基础宏观与核心扩展指标结构。国家卡片只显示数据覆盖状态；完整观测值、来源和 QA 记录集中在数据工作台。
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["统一核心指标", "10 国", "基础宏观与 12 项扩展指标采用同一字典和观测值结构。"],
          ["扩展观测位置", "600 个", "十国 × 12 指标 × 2021–2025；缺失值明确保留待接入。"],
          ["区域空间主键", `${spatialV087Summary.region_count} 个`, `十国均完成逐国 QA；${spatialV087Summary.public_boundary_country_count} 国通过事实边界展示闸门。`],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {researchCountries.map((countryRecord) => {
          const isV4 = v4CountrySlugs.has(countryRecord.slug);
          const extendedCoverage = getExtendedObservationCoverage(countryRecord.slug);
          const macroStatus = compactStatus(countryRecord.macro_status);
          const projectStatus = compactStatus(countryRecord.project_status);
          const regionalCoverage = regionalCoverageMatrixV087.find((record) => record.country_id === countryRecord.slug);
          const regionalStatus = regionalCoverage
            ? `${regionalCoverage.region_count} 区域 / P0 ${regionalCoverage.p0_indicator_count}/3 / ${regionalCoverage.public_layer_count} 个公开图层`
            : compactStatus(countryRecord.region_status);
          const eventStatus = countryRecord.event_status === "verified" ? "人工整理" : "待编码";

          return (
            <Link key={countryRecord.slug} href={`/countries/${countryRecord.slug}`} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">{countryRecord.name}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{countryRecord.name_zh}</h2>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {isV4 ? "V4 / 十国统一样本" : "十国统一样本"}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{countryRecord.summary_zh}</p>
              <dl className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  ["基础宏观数据", macroStatus],
                  ["核心扩展数据", `${extendedCoverage.present}/${extendedCoverage.expected} 已接入`],
                  ["对华项目", projectStatus],
                  ["区域数据", regionalStatus],
                  ["事件数据", eventStatus],
                  ["Map Ready", regionalCoverage?.public_layer_count ? `${regionalCoverage.public_layer_count} factual layers ready` : "Spatial QA pending"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-3">
                    <dt className="text-xs text-[var(--muted)]">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {extendedCoverage.pending === 0 ? (
                  <DataStatusBadge status="official" />
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">部分接入</span>
                )}
                <span className="text-xs text-[var(--muted)]">一级行政区：{countryRecord.admin1_count}</span>
                <span className="ml-auto text-sm font-semibold text-[var(--accent)]">进入国家页</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
