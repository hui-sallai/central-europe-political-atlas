import Link from "next/link";
import { countries } from "@/lib/data";

export default function CountriesPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Countries</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">国家档案</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        每个国家页都以地图仪表盘为主体，展示政治支持率、经济强度、基础底图、一级行政区、二级行政区入口和可选文字资料。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {countries.map((country) => (
          <Link key={country.slug} href={`/countries/${country.slug}`} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm text-[var(--muted)]">{country.nameEn}</p>
            <h2 className="mt-2 text-2xl font-semibold">{country.nameZh}</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{country.summaryZh}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{country.regions.length} 个一级行政区</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{country.parties.length} 个党派样本</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{country.chinaProjects.length} 个经贸项目样本</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
