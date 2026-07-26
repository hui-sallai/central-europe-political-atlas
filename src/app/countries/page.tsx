import Link from "next/link";
import { DataLayerOverview } from "@/components/DataLayerOverview";
import { countries } from "@/lib/data";
import { getCountryMetadata } from "@/lib/countryMetadata";
import { getChinaProjectRecords } from "@/lib/extendedData";

const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];

export default function CountriesPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Countries</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">国家档案</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        每个国家页都以地图仪表盘为主体，展示政治样本色阶、经济强度、基础底图、一级行政区、二级行政区入口和可选文字资料。
      </p>
      <section className="mt-6">
        <DataLayerOverview compact title="国家层级数据总览" />
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {countries.map((country) => {
          const metadata = getCountryMetadata(country.slug);
          const projectRecords = getChinaProjectRecords(country.slug);
          const isV4Country = v4CountrySlugs.includes(country.slug);
          const partyStatus = metadata?.political_sample_status.includes("人工整理") ? "manual" : "pending";
          const projectStatus = projectRecords.length > 0 ? "manual" : "pending";
          const partyStatusText = metadata?.political_sample_status ?? (isV4Country ? "待核验 / 人工整理" : "待接入");
          const partySourceStatus = partyStatus === "manual" ? "人工整理" : "待接入";
          const projectSourceStatus = projectStatus === "manual" ? "人工整理" : "待接入";
          const regionalDataStatus = isV4Country ? "区域数据准备中" : "区域数据待接入";
          const regionalDataItems = isV4Country
            ? [
                ["v0.9 第一批状态", "区域数据准备中"],
                ["区域主键", "已预留"],
                ["边界来源", "待接入"],
                ["区域统计", "待接入"],
                ["项目定位", "准备中"],
                ["真实地图展示", "未启用"],
              ]
            : [
                ["v0.9 第一批状态", "暂不进入 v0.9 第一批"],
                ["区域主键", "国家级待接入"],
                ["边界来源", "待接入"],
                ["区域统计", "待接入"],
                ["项目定位", "待接入"],
                ["真实地图展示", "未启用"],
              ];

          return (
            <Link key={country.slug} href={`/countries/${country.slug}`} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-sm text-[var(--muted)]">{country.nameEn}</p>
              <h2 className="mt-2 text-2xl font-semibold">{country.nameZh}</h2>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{country.summaryZh}</p>
              <div className="mt-5 grid gap-2 text-xs">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <p className="font-semibold text-[var(--muted)]">一级行政区数量</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{country.regions.length}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">党派样本库状态</p>
                  <div className="mt-2 grid gap-2">
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">待核验</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">来源状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">{partySourceStatus}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">模型状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">不进入模型</span>
                    </div>
                  </div>
                  <p className="mt-2 leading-5 text-[var(--muted)]">{partyStatusText}；用于页面结构和政党关系展示，不是正式统计数量。</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">对华经贸项目表状态</p>
                  <div className="mt-2 grid gap-2">
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">{projectRecords.length > 0 ? "待核验" : "待接入"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">来源状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">{projectSourceStatus}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <span className="font-semibold text-[var(--muted)]">量化状态：</span>
                      <span className="text-right font-semibold text-[var(--foreground)]">{projectRecords.length > 0 ? "逐条复核" : "待接入"}</span>
                    </div>
                  </div>
                  <p className="mt-2 leading-5 text-[var(--muted)]">{projectRecords.length > 0 ? "已按固定字段整理项目样本，金额、主体和量化状态仍逐条复核。" : "项目表待接入。"}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">countries 元数据状态</p>
                  <p className="mt-2 leading-5 text-[var(--muted)]">
                    {metadata ? `${metadata.v4_extended_status} / ${metadata.map_region_status} / ${metadata.news_event_status}` : "待接入"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-3">
                  <p className="font-semibold text-[var(--foreground)]">区域数据状态</p>
                  <p className="mt-2 leading-5 text-[var(--muted)]">{regionalDataStatus}</p>
                  <div className="mt-3 grid gap-2">
                    {regionalDataItems.map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                        <span className="font-semibold text-[var(--muted)]">{label}</span>
                        <span className="text-right font-semibold text-[var(--foreground)]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
