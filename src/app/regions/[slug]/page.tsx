import Link from "next/link";
import { notFound } from "next/navigation";
import { Admin2Explorer } from "@/components/Admin2Explorer";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { countries, getRegion } from "@/lib/data";

type RegionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return countries.flatMap((country) => country.regions.map((region) => ({ slug: region.slug })));
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = await params;
  const result = getRegion(slug);

  if (!result) {
    notFound();
  }

  const { country, region } = result;

  return (
    <main className="page-shell">
      <p className="eyebrow">Regional Profile</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">{region.nameZh}</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{region.nameEn}</p>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="card p-6">
          <h2 className="text-xl font-semibold">区域概况</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-[var(--muted)]">所属国家</dt>
              <dd className="mt-1 font-semibold">
                <Link href={`/countries/${country.slug}`} className="hover:text-[var(--accent)]">
                  {country.nameZh}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">行政类型</dt>
              <dd className="mt-1 font-semibold">{region.typeZh}</dd>
            </div>
            {region.capitalZh ? (
              <div>
                <dt className="text-[var(--muted)]">行政中心</dt>
                <dd className="mt-1 font-semibold">{region.capitalZh}</dd>
              </div>
            ) : null}
          </dl>
        </aside>

        <div className="card p-6">
          <p className="eyebrow">Data Status</p>
          <h2 className="mt-3 text-xl font-semibold">区域数据状态</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <DataStatusBadge status="sample" />
            <DataStatusBadge status="pending" />
          </div>
          <p className="mt-4 leading-8 text-[var(--muted)]">
            这里预留一级行政区的政治支持率、地方主政人员、正式选举结果、主要城市和基础经济指标。当前只验证页面结构和选择交互，不填充未经核验的具体数值。
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["政治支持率", "地方主政人员", "区域经济指标"].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                <p className="text-sm font-semibold">{item}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <DataStatusBadge status="pending" />
                  <span className="text-xs text-[var(--muted)]">未接入可信来源</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Admin2Explorer country={country} region={region} />
    </main>
  );
}
