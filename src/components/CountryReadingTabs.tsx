"use client";

import { useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { dataStatusItems } from "@/lib/dataStatus";
import type { Country } from "@/lib/data";
import { getChinaProjectRecords } from "@/lib/extendedData";
import { getCountrySources, globalSourceRegistry, sourceCategoryLabels } from "@/lib/sourceRegistry";

type ReadingTab = "summary" | "parties" | "china" | "status" | "sources";

type CountryReadingTabsProps = {
  country: Country;
};

const tabs: { id: ReadingTab; label: string }[] = [
  { id: "summary", label: "政治摘要" },
  { id: "parties", label: "主要党派" },
  { id: "china", label: "对华经贸" },
  { id: "status", label: "数据状态" },
  { id: "sources", label: "资料来源" },
];

function formatProjectAmount(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return "待接入";
  }

  return `${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${currency}`;
}

export function CountryReadingTabs({ country }: CountryReadingTabsProps) {
  const [activeTab, setActiveTab] = useState<ReadingTab>("summary");
  const basicIndicators = getBasicIndicators(country.slug);
  const countrySources = getCountrySources(country.slug);
  const chinaProjectRecords = getChinaProjectRecords(country.slug);

  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Reading Panel</p>
          <h2 className="mt-3 text-2xl font-semibold">文字资料</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">地图承担直观分析；文字资料作为可选阅读，不默认堆满页面。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/60 p-5">
        {activeTab === "summary" ? (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">首都</dt>
                <dd className="mt-1 font-semibold">{country.capitalZh}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">政体</dt>
                <dd className="mt-1 font-semibold">{country.polityZh}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">议会结构</dt>
                <dd className="mt-1 font-semibold">{country.parliamentZh}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">货币</dt>
                <dd className="mt-1 font-semibold">{country.currency}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">政府首脑</dt>
                <dd className="mt-1 font-semibold">{country.headOfGovernmentZh}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">国家元首</dt>
                <dd className="mt-1 font-semibold">{country.headOfStateZh}</dd>
              </div>
            </dl>
            <div>
              <p className="leading-8 text-[var(--muted)]">{country.summaryZh}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{country.governmentZh}</p>
              <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{country.governmentNoteZh}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {basicIndicators.length > 0 ? (
                  basicIndicators.slice(0, 3).map((indicator) => (
                    <div key={indicator.id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--muted)]">{indicator.label}</p>
                        <DataStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                      </div>
                      <p className="mt-2 font-semibold">{indicator.value}</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">{indicator.year} / {indicator.source}</p>
                      <div className="mt-2">
                        <SourceStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 sm:col-span-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">宏观指标未接入官方统计</p>
                      <DataStatusBadge status="pending" />
                    </div>
                    <div className="mt-2">
                      <SourceStatusBadge status="pending" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">正式口径以该国统计部门和经济主管机构最新发布为主。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "parties" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {country.parties.map((party) => (
              <div key={party.shortName} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: party.color }} />
                  <p className="font-semibold">{party.shortName}</p>
                  <span className="text-xs text-[var(--muted)]">{party.role === "governing" ? "执政" : party.role === "support" ? "支持" : "在野"}</span>
                  <DataStatusBadge status={party.shortName === "TBD" ? "pending" : "manual"} />
                </div>
                <div className="mt-2">
                  <SourceStatusBadge status={party.shortName === "TBD" ? "pending" : "manual"} />
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{party.nameZh} / {party.familyZh}</p>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "china" ? (
          <div>
            <p className="leading-7 text-[var(--muted)]">{country.chinaTradeNote}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {chinaProjectRecords.length > 0 ? (
                chinaProjectRecords.map((project) => (
                  <div key={project.projectId} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{project.projectName}</p>
                      <DataStatusBadge status={project.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <SourceStatusBadge status={project.status === "official" ? "official" : project.status === "sample" ? "sample" : project.status === "pending" ? "pending" : "manual"} />
                      <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                        来源链接
                      </a>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                      <div><dt className="font-semibold text-[var(--foreground)]">地区/城市</dt><dd>{project.regionName}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">行业</dt><dd>{project.sector}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">中国主体</dt><dd>{project.chineseActor}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">当地主体</dt><dd>{project.localActor}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">金额 / 币种</dt><dd>{formatProjectAmount(project.amount, project.currency)}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">年份</dt><dd>{project.year}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">状态</dt><dd>{project.projectStatus}</dd></div>
                      <div><dt className="font-semibold text-[var(--foreground)]">暴露指数</dt><dd>{project.exposureIndexEligible ? "候选，待模型启用后复核" : "暂不进入"}</dd></div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.riskTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] text-[var(--muted)]">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{project.note}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 md:col-span-2">
                  <DataStatusBadge status="pending" />
                  <SourceStatusBadge status="pending" className="ml-2" />
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">该国对华经贸项目表待接入项目级来源。</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "sources" ? (
          <div className="grid gap-5">
            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">核心核验链接</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {country.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--accent)]">
                    {source.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">资料库入口</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[...countrySources, ...globalSourceRegistry].map((source) => (
                  <a key={`${source.label}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 transition hover:border-[var(--accent)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{source.label}</p>
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted)]">{source.language}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{sourceCategoryLabels[source.category]}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{source.note}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "status" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {dataStatusItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
