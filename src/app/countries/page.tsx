import Link from "next/link";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { getChinaProjectRecords } from "@/lib/extendedData";

export default function CountriesPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Countries</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">国家档案</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        每个国家页都以地图仪表盘为主体，展示政治支持率、经济强度、基础底图、一级行政区、二级行政区入口和可选文字资料。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {countries.map((country) => {
          const projectRecords = getChinaProjectRecords(country.slug);
          const partyStatus = country.parties.some((party) => party.shortName === "TBD") ? "pending" : "manual";
          const projectStatus = projectRecords.length > 0 ? "manual" : "pending";

          return (
            <Link key={country.slug} href={`/countries/${country.slug}`} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-sm text-[var(--muted)]">{country.nameEn}</p>
              <h2 className="mt-2 text-2xl font-semibold">{country.nameZh}</h2>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{country.summaryZh}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{country.regions.length} 个一级行政区</span>
              </div>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">党派样本库</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <DataStatusBadge status={partyStatus} />
                    <SourceStatusBadge status={partyStatus} />
                  </div>
                  <p className="mt-2 leading-5 text-[var(--muted)]">用于页面结构和政党关系展示；不是正式统计数量。</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">对华经贸项目表</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <DataStatusBadge status={projectStatus} />
                    <SourceStatusBadge status={projectStatus} />
                  </div>
                  <p className="mt-2 leading-5 text-[var(--muted)]">{projectRecords.length > 0 ? "已按固定字段整理项目样本，金额、主体和量化状态仍逐条复核。" : "项目表待接入。"}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
