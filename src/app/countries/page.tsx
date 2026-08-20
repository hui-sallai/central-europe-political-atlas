import Link from "next/link";
import type { Metadata } from "next";
import { modelOutputs } from "@/lib/modelFramework";
import { getLatestObservation, researchCountries, researchEvents, researchProjects } from "@/lib/researchData";
import { regionalCoverageMatrixV087 } from "@/lib/spatialDataV087";

export const metadata: Metadata = {
  title: "国家研究目录",
  description: "十国经济、政治事件、项目、模型与区域地图入口。",
};

const coreIndicators = [
  ["real_gdp_growth", "GDP 增长"],
  ["hicp_inflation", "通胀"],
  ["unemployment_rate", "失业率"],
  ["gdp_per_capita_eur", "人均 GDP"],
] as const;

function formatValue(value: number | null, unit: string) {
  if (value === null) return "待接入";
  const formatted = value.toLocaleString("zh-CN", { maximumFractionDigits: unit === "欧元" ? 0 : 1 });
  return `${formatted}${unit === "%" ? "%" : unit === "欧元" ? " €" : ` ${unit}`}`;
}

export default function CountriesPage() {
  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">Countries</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">十国研究目录</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">从同一入口查看国家经济、政治事件、对华项目、复合指标和区域地图。卡片只呈现研究可用性，不展开内部 QA 与 schema。</p>
      </header>

      <section className="mt-8 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
        {researchCountries.map((country) => {
          const observations = coreIndicators.map(([indicatorId, label]) => ({
            label,
            observation: getLatestObservation(country.slug, indicatorId),
          }));
          const availableModels = modelOutputs.filter((output) => output.country_slug === country.slug && output.score !== null).length;
          const recentEvents = researchEvents.filter((event) => event.country_slug === country.slug && event.data_status === "verified").length;
          const projects = researchProjects.filter((project) => project.country_slug === country.slug).length;
          const regional = regionalCoverageMatrixV087.find((record) => record.country_id === country.slug);

          return (
            <article key={country.slug} className="bg-[var(--surface)] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{country.iso2} · {country.region}</p>
                  <h2 className="mt-2 text-3xl font-semibold">{country.name_zh}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{country.name}</p>
                </div>
                <Link href={`/countries/${country.slug}`} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">打开档案</Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                {observations.map(({ label, observation }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
                    <p className="metric-number mt-1 text-sm font-semibold">{observation ? formatValue(observation.value, observation.unit) : "待接入"}</p>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">{observation?.year ?? "—"}</p>
                  </div>
                ))}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-px border-y border-[var(--line)] bg-[var(--line)] text-sm sm:grid-cols-4">
                {[
                  ["模型", `${availableModels} 可用`],
                  ["事件", `${recentEvents} 条`],
                  ["项目", `${projects} 项`],
                  ["区域地图", regional?.public_layer_count ? `${regional.public_layer_count} 图层` : "待接入"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[var(--surface)] py-3 pr-3">
                    <dt className="text-[10px] text-[var(--muted)]">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{country.summary_zh}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
