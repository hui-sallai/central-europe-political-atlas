"use client";

import Link from "next/link";
import { useState } from "react";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import { DataLayerOverview } from "@/components/DataLayerOverview";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { chinaProjectVerificationLabel, verifyChinaProject } from "@/lib/chinaProjectVerification";
import { getCountryMetadata } from "@/lib/countryMetadata";
import type { Country } from "@/lib/data";
import { getChinaProjectRecords, getExtendedObservationCoverage } from "@/lib/extendedData";
import { getEventsForCountry } from "@/lib/researchData";
import { getModelCard, getModelOutputsForCountry, modelCards } from "@/lib/modelFramework";
import { calculateScenario, scenarioDefinitions } from "@/lib/scenarioFramework";
import { getChinaExposureOutput } from "@/lib/chinaExposureModel";
import { getTransmissionObservations } from "@/lib/transmissionData";
import { getCountryParitySummary, coverageMatrix } from "@/lib/dataParityQa";
import type { RegionalCoverageV087Record } from "@/lib/spatialDataV087";
import { regionalIndicatorGapAuditV089 } from "@/lib/spatialResearchV089";

type DetailMode = "map" | "reading";

const detailModes: { id: DetailMode; label: string; description: string }[] = [
  { id: "map", label: "地图层级", description: "国家空间入口、图层状态与二级行政区接入位置。" },
  { id: "reading", label: "文字资料", description: "政治、党派、对华经贸、来源与数据状态的阅读层。" },
];

function CoverageStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
    </div>
  );
}

export function CountryDetailModeTabs({ country, regionalCoverage }: { country: Country; regionalCoverage?: RegionalCoverageV087Record }) {
  const regionalGapAudit = regionalIndicatorGapAuditV089.find((record) => record.country_id === country.slug);
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];
  const basicIndicators = getBasicIndicators(country.slug);
  const projectRecords = getChinaProjectRecords(country.slug);
  const eventRecords = getEventsForCountry(country.slug);
  const modelOutputs = getModelOutputsForCountry(country.slug);
  const scenarioSensitivity = scenarioDefinitions.map((definition) => ({
    definition,
    result: calculateScenario({
      definition,
      countrySlug: country.slug,
      shockValue: definition.default_shock_value,
      cards: modelCards,
      outputs: modelOutputs,
    }),
  }));
  const chinaExposure = getChinaExposureOutput(country.slug);
  const codedEventCount = eventRecords.filter((event) => event.coding_status === "coded" && event.data_status === "verified").length;
  const projectLinkedEventCount = eventRecords.filter((event) => event.related_project_ids.length > 0).length;
  const coverage = getExtendedObservationCoverage(country.slug);
  const transmissionCoverage = getTransmissionObservations(country.slug);
  const paritySummary = getCountryParitySummary(country.slug);
  const countryCommonYears = coverageMatrix
    .filter((row) => row.countrySlug === country.slug && row.latestCommonYear !== null)
    .map((row) => row.latestCommonYear as number);
  const latestCommonYear = countryCommonYears.length > 0 ? Math.min(...countryCommonYears) : null;
  const latestCommonYearMax = countryCommonYears.length > 0 ? Math.max(...countryCommonYears) : null;
  const latestCommonYearLabel = latestCommonYear === null
    ? "待确认"
    : latestCommonYear === latestCommonYearMax
      ? String(latestCommonYear)
      : `${latestCommonYear}–${latestCommonYearMax}`;
  const metadata = getCountryMetadata(country.slug);
  const hasManualPolitics = country.parties.some((party) => party.shortName !== "TBD");
  const projectSummary = projectRecords.length > 0
    ? Object.entries(projectRecords.reduce(
        (acc, project) => {
          acc[verifyChinaProject(project).conclusion] += 1;
          return acc;
        },
        { quantifiable: 0, partially_quantifiable: 0, background_only: 0, excluded: 0 },
      ))
        .filter(([, count]) => count > 0)
        .map(([status, count]) => `${chinaProjectVerificationLabel(status as ReturnType<typeof verifyChinaProject>["conclusion"])} ${count}`)
        .join("；")
    : "待接入";

  const regionalItems = regionalCoverage
    ? [
        { label: "区域主键", value: `${regionalCoverage.region_count} 个` },
        { label: "分析层级", value: `${regionalCoverage.classification_system} / ${regionalCoverage.admin_level}` },
        { label: "边界几何", value: `${regionalCoverage.geometry_count} / ${regionalCoverage.region_count}` },
        { label: "区域事实", value: `${regionalCoverage.factual_observation_count} 条 / 最新 ${regionalCoverage.latest_year}` },
        { label: "P0 / P1 指标", value: `${regionalCoverage.p0_indicator_count} / 3；${regionalCoverage.p1_indicator_count} / 3` },
        { label: "公开事实图层", value: `${regionalCoverage.public_layer_count} 个` },
        { label: "区域指标", value: `${regionalCoverage.p0_indicator_count + regionalCoverage.p1_indicator_count} / 6` },
        { label: "项目区域映射", value: `${regionalCoverage.project_mapped_count} 条 / ${regionalCoverage.project_display_eligible_count} 条可作为城市参考` },
        { label: "事实边界展示", value: regionalCoverage.boundary_ready ? "可用" : "未启用" },
      ]
    : [];

  return (
    <section className="mt-8">
      <DataLayerOverview countrySlug={country.slug} compact title={`${country.nameZh}数据状态`} />

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="card p-6">
          <p className="eyebrow">Country Profile</p>
          <h2 className="mt-3 text-2xl font-semibold">国家基础档案</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              { label: "首都", value: country.capitalZh },
              { label: "政体", value: country.polityZh },
              { label: "议会结构", value: country.parliamentZh },
              { label: "货币", value: country.currency },
              { label: "政府首脑", value: metadata?.head_of_government ?? "待核验", source: metadata?.head_of_government_source_status },
              { label: "国家元首", value: metadata?.head_of_state ?? "待核验", source: metadata?.head_of_state_source_status },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/60 p-3">
                <dt className="text-xs text-[var(--muted)]">{item.label}</dt>
                <dd className="mt-1 font-semibold">{item.value}</dd>
                {item.source ? <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">来源状态：{item.source}；未核验字段不进入模型。</p> : null}
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{country.summaryZh}</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Basic Macro Data</p>
          <h2 className="mt-3 text-2xl font-semibold">基础宏观数据</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {basicIndicators.slice(0, 6).map((indicator) => (
              <div key={indicator.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--muted)]">{indicator.label}</p>
                  <DataStatusBadge status={indicator.status} />
                </div>
                <p className="mt-2 font-semibold">{indicator.value}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{indicator.year} / {indicator.source}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {chinaExposure ? (
        <section className="mt-4 card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">China Exposure Evidence / v0.82</p>
              <h2 className="mt-3 text-2xl font-semibold">中国经济暴露数据准备度 · v0.82</h2>
            </div>
            <Link href="/models" className="text-sm font-semibold text-[var(--accent)] hover:underline">查看变量与 Model Card</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {chinaExposure.dimensions.map((dimension) => (
              <article key={dimension.dimension} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <p className="font-semibold">{dimension.name_zh}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{dimension.score === null ? "不输出分数" : dimension.score.toFixed(1)}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{dimension.availability} / 完整度 {dimension.data_completeness}%</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">总体输出：{chinaExposure.overall_decision}。暴露不等于政治影响力、地缘政治风险或投资质量；相关事件 {chinaExposure.related_event_ids.length} 条只作解释。</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">项目库覆盖：{chinaExposure.project_database_coverage}；主要缺口：{chinaExposure.priority_gaps.join(" / ") || "无"}。</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">China FDI：{chinaExposure.china_fdi_availability}；贸易最新年份：{chinaExposure.trade_latest_year ?? "待接入"}；当前充分维度：{chinaExposure.sufficient_dimension_count}。项目未记录不解释为零暴露。</p>
        </section>
      ) : null}

      <section className="mt-4 card p-6">
        <p className="eyebrow">Data Coverage</p>
        <h2 className="mt-3 text-2xl font-semibold">核心扩展数据完整度</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoverageStat label="指标覆盖" value="12 / 12" note="十国统一使用财政、外部、投资、能源与产业指标模板。" />
          <CoverageStat label="Latest common year" value={latestCommonYearLabel} note="不同指标的最新共同年份范围；比较仍逐指标锁定同一年。" />
          <CoverageStat label="待接入 / Model Ready" value={`${paritySummary?.pending ?? coverage.pending} / ${paritySummary?.modelReady ?? 0}`} note="前者为待接入位置；后者为扩展与传导指标中达到现有模型准入的数量。" />
          <CoverageStat label="Transmission Data" value={`${transmissionCoverage.filter((item) => item.value !== null).length} / 8`} note="德国自身对德出口依赖为不适用，不记作 0 或缺失。" />
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">主要数据缺口</p>
          <p className="mt-2 text-sm leading-6">
            {paritySummary?.priorityGaps.length ? paritySummary.priorityGaps.join("；") : "当前没有高优先级缺口。"}
          </p>
        </div>
      </section>

      <section className="mt-4 card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Scenario Sensitivity</p><h2 className="mt-3 text-2xl font-semibold">该国可运行的条件式情景</h2></div>
          <Link href={`/scenarios?country=${country.slug}`} className="text-sm font-semibold text-[var(--accent)] hover:underline">进入完整 Scenario Workspace</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {scenarioSensitivity.map(({ definition, result }) => (
            <Link key={definition.scenario_id} href={`/scenarios?scenario=${definition.scenario_id}&country=${country.slug}&shock=${definition.default_shock_value}`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 hover:border-[var(--accent)]">
              <p className="font-semibold">{definition.name_zh}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">default {definition.default_shock_value} {definition.shock_unit}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{result.status === "available" ? `Change ${result.score_change !== null && result.score_change > 0 ? "+" : ""}${result.score_change?.toFixed(1)}` : "unavailable"}</p>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">只显示国家级模型是否可重算。区域资料缺失只隐藏 structural context，不绕过模型准入，也不生成区域情景分数。</p>
      </section>

      <section className="mt-4 card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Transparent Models</p>
            <h2 className="mt-3 text-2xl font-semibold">透明模型摘要</h2>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]">
            <Link href="/models" className="hover:underline">查看输入、权重与 Model Card</Link>
            <Link href="/scenarios" className="hover:underline">进入条件式情景模拟</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modelOutputs.map((output) => {
            const card = getModelCard(output.model_id);
            return (
              <article key={output.model_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{card?.name_zh ?? output.model_id}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">数据完整度 {output.data_completeness}% / 置信度 {output.confidence}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {output.availability === "sufficient" ? "可计算" : output.availability === "partial" ? "部分可计算" : "不可计算"}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--accent)]">{output.score === null ? "不输出分数" : output.score.toFixed(1)}</p>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">分数不进入地图图层，不代表预测或客观风险真值。</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-4 card p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Regional And Map Status</p>
            <h2 className="mt-3 text-2xl font-semibold">区域数据与地图状态</h2>
          </div>
          <DataStatusBadge status={regionalCoverage?.public_layer_count ? "official" : "pending"} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {regionalItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {regionalCoverage
            ? `Regional Profile 已接入统一空间主键。主要缺口：${regionalGapAudit?.priority_gaps.join("；") || regionalCoverage.priority_gaps.join("；") || "当前优先指标无新增缺口"}。劳动力指标只在统计层级直接对应时开放，未通过 public display gate 的图层不显示。`
            : "区域空间资料待接入。"}
        </p>
        {regionalCoverage?.public_layer_count ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/map?country=${country.slug}&layer=regional_boundary`} className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              View Spatial Profile
            </Link>
            <Link href={`/map?country=${country.slug}&layer=regional_gdp_per_capita`} className="inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)]">
              查看区域人均 GDP
            </Link>
            <Link href={`/map?country=${country.slug}&layer=china_project_locations`} className="inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)]">
              查看项目位置
            </Link>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">事实地图未启用：{regionalCoverage?.blocker || "空间准入记录待完成"}</p>
        )}
      </section>

      <div className="mt-4 card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="px-2">
            <p className="eyebrow">Country View</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{activeModeInfo.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {detailModes.map((mode) => (
              <button key={mode.id} type="button" onClick={() => setActiveMode(mode.id)} className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${activeMode === mode.id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeMode === "map" ? <CountryMapWorkbench country={country} factualBoundaryReady={regionalCoverage?.boundary_ready} /> : null}
      {activeMode === "reading" ? <CountryReadingTabs country={country} /> : null}

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        {[
          { label: "对华经贸项目", status: projectRecords.length > 0 ? "核验中" : "待接入", note: projectRecords.length > 0 ? `${projectRecords.length} 项；${projectSummary}；已关联事件 ${projectLinkedEventCount} 条。` : "项目表入口已预留。", href: "/data" },
          { label: "党派 / 政治样本", status: "待核验", note: `${hasManualPolitics ? "人工整理" : "待接入"}；不进入模型。`, href: null },
          { label: "政治经济事件", status: eventRecords.length > 0 ? `${codedEventCount} 条已编码` : "待接入", note: `${eventRecords.length} 条记录；事件与指标关联在事件库统一管理，当前均不进入模型。`, href: eventRecords[0] ? `/news#${eventRecords[0].id}` : "/news" },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{item.label}</p>
            <p className="mt-2 font-semibold">{item.status}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
            {item.href ? <Link href={item.href} className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline">{item.label === "对华经贸项目" ? "进入项目数据" : "查看相关事件"}</Link> : null}
          </article>
        ))}
      </section>
    </section>
  );
}
