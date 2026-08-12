import Link from "next/link";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { getEventsForCountry, researchCountries } from "@/lib/researchData";
import {
  getChinaProjectRecords,
  getExtendedObservations,
  getExtendedObservationCoverage,
  getExtendedTemplateCoverage,
  v4TemplateIndicatorIds,
} from "@/lib/extendedData";
import { verifyChinaProject } from "@/lib/chinaProjectVerification";

type DataLayerOverviewProps = {
  countrySlug?: string;
  compact?: boolean;
  title?: string;
};

const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];
const countries = researchCountries.map((country) => ({
  ...country,
  nameZh: country.name_zh,
}));

function layerStatusClass(status: "official" | "manual" | "pending" | "sample") {
  const classes = {
    official: "border-emerald-200 bg-emerald-50 text-emerald-800",
    manual: "border-sky-200 bg-sky-50 text-sky-800",
    pending: "border-slate-200 bg-slate-50 text-slate-700",
    sample: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return classes[status];
}

function DataLayerCard({
  title,
  value,
  status,
  description,
  href,
}: {
  title: string;
  value: string;
  status: "official" | "manual" | "pending" | "sample";
  description: string;
  href: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">{title}</p>
          <p className="mt-2 text-xl font-semibold">{value}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${layerStatusClass(status)}`}>
          {status === "official" ? "正式数据" : status === "manual" ? "人工整理" : status === "sample" ? "结构样例" : "待接入"}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{description}</p>
      <Link href={href} className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
        查看完整数据
      </Link>
    </article>
  );
}

export function DataLayerOverview({ countrySlug, compact = false, title = "数据层总览" }: DataLayerOverviewProps) {
  const country = countrySlug ? countries.find((item) => item.slug === countrySlug) : undefined;
  const isCountryMode = Boolean(country);
  const basicIndicators = country ? getBasicIndicators(country.slug) : [];
  const extendedCoverage = country ? getExtendedTemplateCoverage(country.slug) : null;
  const extendedObservationCoverage = country ? getExtendedObservationCoverage(country.slug) : null;
  const countryProfilePending = country?.status !== "official";
  const countryProjects = country ? getChinaProjectRecords(country.slug) : [];
  const allProjects = v4CountrySlugs.flatMap((slug) => getChinaProjectRecords(slug));
  const projectScope = country ? countryProjects : allProjects;
  const verificationCounts = projectScope.reduce(
    (acc, project) => {
      const verification = verifyChinaProject(project);
      acc[verification.conclusion] += 1;
      return acc;
    },
    { quantifiable: 0, partially_quantifiable: 0, background_only: 0, excluded: 0 },
  );
  const events = country ? getEventsForCountry(country.slug) : v4CountrySlugs.flatMap((slug) => getEventsForCountry(slug));
  const codedEventCount = events.filter((event) => event.coding_status === "coded" && event.data_status === "verified").length;
  const extendedObservationCount = country ? getExtendedObservations(country.slug).length : 0;
  const regionCount = country?.admin1_count ?? countries.reduce((sum, item) => sum + item.admin1_count, 0);
  const dataHref = "/data";
  const countryHref = country ? `/countries/${country.slug}` : "/countries";

  const extendedLayer = country
    ? [{
        title: "核心扩展数据覆盖",
        value: `${extendedObservationCoverage?.present ?? 0}/${extendedObservationCoverage?.expected ?? 60} 已接入`,
        status: extendedObservationCoverage && extendedObservationCoverage.pending === 0 ? "official" as const : "pending" as const,
        description: `十国统一使用 12 项财政、外部、投资、能源与产业指标；指标覆盖 ${extendedCoverage?.present.length ?? 0}/${extendedCoverage?.total ?? v4TemplateIndicatorIds.length}，2021-2025 待接入 ${extendedObservationCoverage?.pending ?? 0}，原始记录 ${extendedObservationCount} 条。`,
        href: "/data",
      }]
    : [];

  const layers = [
    {
      title: "国家基础档案",
      value: country ? country.nameZh : `${countries.length} 国`,
      status: countryProfilePending ? "pending" as const : "manual" as const,
      description: country
        ? countryProfilePending
          ? "政体、议会结构和国家摘要已集中展示；政府首脑或国家元首仍显示待核验，不填入未经来源确认的姓名。"
          : "政体、议会结构、政府首脑、国家元首和国家摘要已在国家页集中展示。"
        : "十国国家卡片已建立；深度扩展数据只在对应国家工作台内展示。",
      href: countryHref,
    },
    {
      title: "基础宏观数据",
      value: country ? `${basicIndicators.length} 项` : `${countries.length} 国 × 6 项`,
      status: "official" as const,
      description: "人口、GDP、人均 GDP、增长、通胀和失业率以官方统计或 Eurostat 链接为主。",
      href: dataHref,
    },
    ...extendedLayer,
    {
      title: "对华经贸项目",
      value: country ? `${countryProjects.length} 项` : `${allProjects.length} 项`,
      status: projectScope.length > 0 ? "manual" as const : "pending" as const,
      description: `核验结论：可量化 ${verificationCounts.quantifiable}，部分可量化 ${verificationCounts.partially_quantifiable}，仅作背景 ${verificationCounts.background_only}，不进入分析 ${verificationCounts.excluded}。`,
      href: dataHref,
    },
    {
      title: "政治经济事件",
      value: `${codedEventCount}/${events.length} 已编码`,
      status: codedEventCount > 0 ? "manual" as const : "pending" as const,
      description: "事件库保存来源、中文摘要、编码状态和指标关联；当前全部记录均不进入模型。",
      href: "/news",
    },
    {
      title: "地图与区域层",
      value: `${regionCount} 个一级区域`,
      status: "sample" as const,
      description: country
        ? "区域层结构样例和后续接入入口已保留；完整边界说明见国家页地图图层仪表盘。"
        : "区域层结构样例和后续接入入口已保留；完整边界说明见地图页。",
      href: country ? `/countries/${country.slug}` : "/map",
    },
  ];

  return (
    <section className={`rounded-3xl border border-[var(--line)] bg-white/50 ${compact ? "p-4" : "p-6"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Data Layers</p>
          <h2 className={`${compact ? "mt-2 text-xl" : "mt-3 text-2xl"} font-semibold`}>{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            按页面层级展示当前已有数据、待接入数据和结构样例；先看这里，再进入具体表格。
          </p>
        </div>
        <DataStatusBadge status="pending" />
      </div>
      <div className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {layers.map((layer) => (
          <DataLayerCard key={layer.title} {...layer} />
        ))}
      </div>
    </section>
  );
}
