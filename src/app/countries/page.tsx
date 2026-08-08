import Link from "next/link";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getCountry } from "@/lib/data";
import { researchCountries } from "@/lib/researchData";
import type { DataStatus } from "@/types/researchData";

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
        十国国家入口按研究深度分为 V4 深度样本与六个扩展样本。国家卡片只显示数据覆盖状态；完整观测值、字段字典与 QA 记录集中在数据工作台。
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["V4 深度样本", "4 国", "接入扩展经济序列、项目核验与区域准备记录。"],
          ["扩展样本", "6 国", "保留基础宏观数据与后续接入入口。"],
          ["模型输出", "未启用", "样例与待核验内容不进入模型。"],
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
          const country = getCountry(countryRecord.slug);
          if (!country) return null;
          const isV4 = v4CountrySlugs.has(countryRecord.slug);
          const macroStatus = compactStatus(countryRecord.macro_status);
          const projectStatus = compactStatus(countryRecord.project_status);
          const regionalStatus = countryRecord.slug === "hungary"
            ? "边界证据已记录，展示未启用"
            : isV4
              ? "准备中"
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
                  {isV4 ? "V4 深度样本" : "扩展样本"}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{country.summaryZh}</p>
              <dl className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  ["基础宏观数据", macroStatus],
                  ["对华项目", projectStatus],
                  ["区域数据", regionalStatus],
                  ["事件数据", eventStatus],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-3">
                    <dt className="text-xs text-[var(--muted)]">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <DataStatusBadge status={isV4 ? "manual" : "pending"} />
                <span className="text-xs text-[var(--muted)]">一级行政区：{country.regions.length}</span>
                <span className="ml-auto text-sm font-semibold text-[var(--accent)]">进入国家页</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
