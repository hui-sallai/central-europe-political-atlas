import Link from "next/link";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { countries } from "@/lib/data";
import {
  getChinaProjectRecords,
  getExtendedObservations,
  getNewsEventRecords,
  getV4TemplateCoverage,
  v4TemplateIndicatorIds,
} from "@/lib/extendedData";
import { getV4DataQualitySummary } from "@/lib/v4DataQuality";
import { verifyChinaProject } from "@/lib/chinaProjectVerification";

type DataLayerOverviewProps = {
  countrySlug?: string;
  compact?: boolean;
  title?: string;
};

const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];

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
  const v4Coverage = country ? getV4TemplateCoverage(country.slug) : null;
  const isV4Country = country ? v4CountrySlugs.includes(country.slug) : false;
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
  const newsEvents = country ? getNewsEventRecords(country.slug) : v4CountrySlugs.flatMap((slug) => getNewsEventRecords(slug));
  const formalNewsCount = newsEvents.filter((event) => event.status !== "sample").length;
  const v4Quality = getV4DataQualitySummary();
  const extendedObservationCount = country ? getExtendedObservations(country.slug).length : v4Quality.summary.presentCells;
  const regionCount = country?.regions.length ?? countries.reduce((sum, item) => sum + item.regions.length, 0);
  const dataHref = "/data";
  const countryHref = country ? `/countries/${country.slug}` : "/countries";

  const layers = [
    {
      title: "国家基础档案",
      value: country ? country.nameZh : `${countries.length} 国`,
      status: "manual" as const,
      description: country ? "政体、议会结构、政府首脑、国家元首和国家摘要已在国家页集中展示。" : "十国国家卡片已建立，V4 为第一批深度数据样本。",
      href: countryHref,
    },
    {
      title: "基础宏观数据",
      value: country ? `${basicIndicators.length} 项` : `${countries.length} 国 × 6 项`,
      status: "official" as const,
      description: "人口、GDP、人均 GDP、增长、通胀和失业率以官方统计或 Eurostat 链接为主。",
      href: dataHref,
    },
    {
      title: "V4 扩展观测值",
      value: country ? (isV4Country ? `${v4Coverage?.present.length ?? 0}/${v4Coverage?.total ?? v4TemplateIndicatorIds.length} 指标` : "待接入") : `${v4Quality.summary.presentCells}/${v4Quality.summary.expectedCells} 格`,
      status: isCountryMode && !isV4Country ? "pending" as const : "official" as const,
      description: country
        ? isV4Country
          ? `该国已有财政、外部、投资、能源和产业扩展指标；观测值共 ${extendedObservationCount} 条。`
          : "非 V4 国家暂不接入扩展历史序列，只保留字段位置。"
        : "V4 四国 × 12 指标 × 2021-2025 已形成历史观测格，并带质量验收。",
      href: "/data",
    },
    {
      title: "对华经贸项目",
      value: country ? `${countryProjects.length} 项` : `${allProjects.length} 项`,
      status: projectScope.length > 0 ? "manual" as const : "pending" as const,
      description: `核验结论：可量化 ${verificationCounts.quantifiable}，部分可量化 ${verificationCounts.partially_quantifiable}，仅作背景 ${verificationCounts.background_only}，不进入分析 ${verificationCounts.excluded}。`,
      href: dataHref,
    },
    {
      title: "新闻事件",
      value: country ? `${formalNewsCount}/${newsEvents.length} 正式` : `${formalNewsCount}/${newsEvents.length} 正式`,
      status: formalNewsCount > 0 ? "manual" as const : "pending" as const,
      description: "新闻区只保存标题、来源链接、主题和中文摘要；样例新闻不进入模型。",
      href: "/news",
    },
    {
      title: "地图与区域层",
      value: `${regionCount} 个一级区域`,
      status: "sample" as const,
      description: "ADM1 边界用于地图承接；党派、区域经济和二级行政区细节仍为待接入或结构样例。",
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
        <DataStatusBadge status="manual" />
      </div>
      <div className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {layers.map((layer) => (
          <DataLayerCard key={layer.title} {...layer} />
        ))}
      </div>
    </section>
  );
}
