"use client";

import { useState } from "react";
import { DataLayerOverview } from "@/components/DataLayerOverview";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { chinaProjectVerificationLabel, verifyChinaProject } from "@/lib/chinaProjectVerification";
import { getCountryMetadata } from "@/lib/countryMetadata";
import type { Country } from "@/lib/data";
import { getChinaProjectRecords, getNewsEventRecords, getV4ObservationCoverage, getV4TemplateCoverage } from "@/lib/extendedData";

type DetailMode = "map" | "reading";

type CountryDetailModeTabsProps = {
  country: Country;
};

const detailModes: { id: DetailMode; label: string; description: string }[] = [
  {
    id: "map",
    label: "地图层级",
    description: "默认视图：真实行政边界待接入；当前仅保留地图工作台入口和结构样例。",
  },
  {
    id: "reading",
    label: "文字资料",
    description: "作为同一国家页内的阅读层，整理政治、党派、对华经贸、来源与数据状态。",
  },
];

const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];

function StatusTextPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] font-semibold leading-none text-[var(--muted)]">
      {label}
    </span>
  );
}

function CoverageStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
    </div>
  );
}

export function CountryDetailModeTabs({ country }: CountryDetailModeTabsProps) {
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];
  const basicIndicators = getBasicIndicators(country.slug);
  const projectRecords = getChinaProjectRecords(country.slug);
  const newsEventRecords = getNewsEventRecords(country.slug);
  const v4Coverage = getV4TemplateCoverage(country.slug);
  const v4ObservationCoverage = getV4ObservationCoverage(country.slug);
  const metadata = getCountryMetadata(country.slug);
  const isV4Country = v4CountrySlugs.includes(country.slug);
  const partyStatus = country.parties.some((party) => party.shortName === "TBD") ? "pending" : "manual";
  const governingParties = country.parties.filter((party) => party.role === "governing" || party.role === "support");
  const projectVerificationSummary = projectRecords.length > 0
    ? Object.entries(projectRecords.reduce(
        (acc, project) => {
          const verification = verifyChinaProject(project);
          acc[verification.conclusion] += 1;
          return acc;
        },
        { quantifiable: 0, partially_quantifiable: 0, background_only: 0, excluded: 0 },
      ))
        .filter(([, count]) => count > 0)
        .map(([conclusion, count]) => `${chinaProjectVerificationLabel(conclusion as ReturnType<typeof verifyChinaProject>["conclusion"])} ${count}`)
        .join("；")
    : "";

  return (
    <section className="mt-8">
      <DataLayerOverview countrySlug={country.slug} compact title={`${country.nameZh}数据层总览`} />

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="card p-6">
          <p className="eyebrow">1. Country Profile</p>
          <h2 className="mt-3 text-2xl font-semibold">国家基础档案</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              { label: "首都", value: country.capitalZh },
              { label: "政体", value: country.polityZh },
              { label: "议会结构", value: country.parliamentZh },
              { label: "货币", value: country.currency },
              { label: "政府首脑", value: metadata?.head_of_government ?? "待核验", sourceNote: metadata?.head_of_government_source_status ?? "待核验" },
              { label: "国家元首", value: metadata?.head_of_state ?? "待核验", sourceNote: metadata?.head_of_state_source_status ?? "待核验" },
            ].map((item) => {
              const politicalSourceNote = item.sourceNote ?? "待核验";
              const personStatus = item.sourceNote ? {
                note: `来源状态：${politicalSourceNote}；不进入模型。`,
              } : null;

              return (
                <div key={item.label} className="rounded-2xl bg-white/60 p-3">
                  <dt className="text-xs text-[var(--muted)]">{item.label}</dt>
                  <dd className="mt-1 font-semibold">{item.value}</dd>
                  {personStatus ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] leading-4 text-[var(--muted)]">{personStatus.note}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </dl>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{country.summaryZh}</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">2. Basic Macro Data</p>
          <h2 className="mt-3 text-2xl font-semibold">基础宏观数据</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {basicIndicators.length > 0 ? basicIndicators.slice(0, 6).map((indicator) => (
              <div key={indicator.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--muted)]">{indicator.label}</p>
                  <DataStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                </div>
                <p className="mt-2 font-semibold">{indicator.value}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{indicator.year} / {indicator.source}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 sm:col-span-2 lg:col-span-3">
                <DataStatusBadge status="pending" />
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">基础宏观数据待接入官方统计来源。</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">{isV4Country ? "3. V4 Extended Data Completeness" : "3. Extended Data Status"}</p>
            <h2 className="mt-3 text-2xl font-semibold">{isV4Country ? "V4 扩展数据完整度" : "扩展数据待接入"}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {isV4Country
                ? "该国属于 V4 第一批扩展数据模板。完整度分为指标覆盖、观测值覆盖和正式数据覆盖，避免把 12/12 指标误读为全部年份观测值均已正式接入。"
                : "该国扩展数据字段已预留但尚未接入；不会显示横向比较或模板验收。"}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{isV4Country ? "接入进度" : "当前状态"}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
              {isV4Country ? `${v4ObservationCoverage.present}/${v4ObservationCoverage.expected}` : "待接入"}
            </p>
            <div className="mt-2">
              <DataStatusBadge status={isV4Country && v4ObservationCoverage.pending === 0 ? "official" : "pending"} />
            </div>
          </div>
        </div>
        {isV4Country ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            <CoverageStat
              label="观测值覆盖率"
              value={`${v4ObservationCoverage.present}/${v4ObservationCoverage.expected}`}
              note={`2021-2025 共 ${v4ObservationCoverage.expected} 个观测位置；已接入 ${v4ObservationCoverage.present}，待接入 ${v4ObservationCoverage.pending}。`}
            />
            <CoverageStat
              label="正式数据覆盖率"
              value={`${v4ObservationCoverage.official}/${v4ObservationCoverage.expected}`}
              note={`正式数据 ${v4ObservationCoverage.official}；待接入 ${v4ObservationCoverage.pending}；计算值 ${v4ObservationCoverage.computed}；人工整理 ${v4ObservationCoverage.manual}。`}
            />
            <CoverageStat
              label="数据质量状态"
              value={v4ObservationCoverage.pending === 0 ? "通过" : "部分通过"}
              note="与 data_quality_checks 的字段完整性、来源等级和派生比较资格保持同步。"
            />
            <CoverageStat
              label="项目核验状态"
              value={projectRecords.length > 0 ? `${projectRecords.length} 项` : "待接入"}
              note={projectRecords.length > 0 ? `项目核验结论：${projectVerificationSummary}。` : "该国对华项目表待接入。"}
            />
            <CoverageStat
              label="导出结构"
              value="已覆盖该国"
              note="countries、observations、data_quality_checks、derived_comparisons、china_projects 与候选变量导出层均可追溯到 country_id。"
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <CoverageStat
              label="基础宏观数据"
              value="已进入 observations"
              note="人口、GDP、人均 GDP、增长、通胀和失业率已纳入标准观测值表。"
            />
            <CoverageStat
              label="V4 扩展数据"
              value="待接入"
              note="财政、外部、投资、能源和产业扩展指标不在非 V4 国家页做模板验收。"
            />
            <CoverageStat
              label="对华项目"
              value="待接入"
              note="非 V4 国家暂不扩项目核验表，不进入暴露变量候选库。"
            />
            <CoverageStat
              label="区域层"
              value="待接入"
              note="真实行政边界、区域经济、区域选举和区域对华项目数据均待接入。"
            />
          </div>
        )}
      </section>

      <div className="card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="px-2">
            <p className="eyebrow">4. Map Layer Dashboard</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{activeModeInfo.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {detailModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  activeMode === mode.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
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
          {
            eyebrow: "5. China Economic Projects",
            label: "对华经贸项目",
            statusText: "待量化",
            statusKind: "manual" as const,
            note: projectRecords.length > 0 ? `已整理 ${projectRecords.length} 个项目；核验结论：${projectVerificationSummary}。金额证据、主体核验和暴露变量适配仍逐条复核。` : "项目表入口已预留，项目级来源待接入。",
          },
          {
            eyebrow: "6. Party / Politics Samples",
            label: "党派 / 政治样本区",
            statusText: "待核验 / 不进入模型",
            statusKind: partyStatus as "manual" | "pending",
            note: governingParties.length > 0 ? "党派、执政结构和政治样本需继续与官方政府名单、议会席位和选举结果复核；当前不进入模型。" : "政治样本字段已预留，可信来源待接入；当前不进入模型。",
          },
          {
            eyebrow: "7. News Event Entry",
            label: "新闻事件入口",
            statusText: "待接入",
            statusKind: "pending" as const,
            note: newsEventRecords.length > 0 ? "新闻事件入口已保留；正式新闻源和事件库口径按后续数据接入同步。" : "新闻事件库入口已预留，正式新闻源待接入。",
          },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <p className="eyebrow">{item.eyebrow}</p>
            <div className="flex items-start justify-between gap-3">
              <h3 className="mt-2 font-semibold">{item.label}</h3>
              <div className="flex flex-wrap justify-end gap-1.5">
                <StatusTextPill label={item.statusText} />
                <DataStatusBadge status={item.statusKind} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
