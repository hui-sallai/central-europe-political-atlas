"use client";

import { useState } from "react";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import { getBasicIndicators } from "@/lib/basicIndicators";
import type { Country } from "@/lib/data";
import { getChinaProjectRecords, getNewsEventRecords, getV4TemplateCoverage } from "@/lib/extendedData";

type DetailMode = "map" | "reading";

type CountryDetailModeTabsProps = {
  country: Country;
};

const detailModes: { id: DetailMode; label: string; description: string }[] = [
  {
    id: "map",
    label: "地图层级",
    description: "默认视图：切换党派支持率、经济占位色阶和基础底图。",
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

export function CountryDetailModeTabs({ country }: CountryDetailModeTabsProps) {
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];
  const basicIndicators = getBasicIndicators(country.slug);
  const projectRecords = getChinaProjectRecords(country.slug);
  const newsEventRecords = getNewsEventRecords(country.slug);
  const v4Coverage = getV4TemplateCoverage(country.slug);
  const isV4Country = v4CountrySlugs.includes(country.slug);
  const partyStatus = country.parties.some((party) => party.shortName === "TBD") ? "pending" : "manual";
  const governingParties = country.parties.filter((party) => party.role === "governing" || party.role === "support");

  return (
    <section className="mt-8">
      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="card p-6">
          <p className="eyebrow">1. Country Profile</p>
          <h2 className="mt-3 text-2xl font-semibold">国家基础档案</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["首都", country.capitalZh],
              ["政体", country.polityZh],
              ["议会结构", country.parliamentZh],
              ["货币", country.currency],
              ["政府首脑", country.headOfGovernmentZh],
              ["国家元首", country.headOfStateZh],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/60 p-3">
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
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
            <p className="eyebrow">3. V4 Extended Data Completeness</p>
            <h2 className="mt-3 text-2xl font-semibold">V4 扩展数据完整度</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {isV4Country ? "该国属于 V4 第一批扩展数据模板，已按财政、外部、投资、能源和产业指标验收。" : "该国不属于 V4 第一批扩展数据模板，扩展数据字段已预留但尚未接入。"}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{isV4Country ? "接入进度" : "当前状态"}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">{isV4Country ? `${v4Coverage.present.length}/${v4Coverage.total}` : "待接入"}</p>
            <div className="mt-2">
              <DataStatusBadge status={isV4Country && v4Coverage.complete ? "official" : "pending"} />
            </div>
          </div>
        </div>
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
            note: projectRecords.length > 0 ? `已整理 ${projectRecords.length} 个项目样本；金额、主体和量化状态仍需逐条复核。` : "项目表入口已预留，项目级来源待接入。",
          },
          {
            eyebrow: "6. Party / Politics Samples",
            label: "党派 / 政治样本区",
            statusText: "待核验",
            statusKind: partyStatus as "manual" | "pending",
            note: governingParties.length > 0 ? "党派、执政结构和政治样本需继续与官方政府名单、议会席位和选举结果复核。" : "政治样本字段已预留，可信来源待接入。",
          },
          {
            eyebrow: "7. News Event Entry",
            label: "新闻事件入口",
            statusText: "待接入",
            statusKind: "pending" as const,
            note: newsEventRecords.length > 0 ? "当前仅有结构样例或候选事件；正式新闻事件库尚未接入，不进入模型。" : "新闻事件库入口已预留，正式新闻源待接入。",
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
