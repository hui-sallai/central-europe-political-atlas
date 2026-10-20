"use client";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { monthlyIndicators } from "@/lib/monthlyComparison";
import { handoffIndicator, handoffMonths, handoffPeriod, monthlyHandoff, type MonthlyComparisonCoverage } from "@/lib/monthlyComparisonHandoff";

export function MonthlyComparisonHandoff({ countries, country, indicator: sourceIndicator, fromYear, toYear, coverage, ready }: {
  countries: { slug: string; name: string; name_zh: string }[]; country: string; indicator: string; fromYear: string; toYear: string; coverage: MonthlyComparisonCoverage; ready: boolean;
}) {
  const en = useLocale() === "en", t = (zh: string, english: string) => en ? english : zh;
  const [additional, setAdditional] = useState<string[]>([]), [explicitIndicator, setExplicitIndicator] = useState("");
  const extra = additional.filter(c => c !== country);
  const indicator = handoffIndicator(sourceIndicator, explicitIndicator), exact = handoffIndicator(sourceIndicator);
  const period = indicator ? handoffPeriod(coverage, country, indicator, fromYear, toYear) : null;
  const handoff = ready ? monthlyHandoff({ country, additional: extra, countries: countries.map(c => c.slug), sourceIndicator, explicitIndicator, fromYear, toYear, coverage, en }) : null;
  const name = (slug: string) => { const item = countries.find(c => c.slug === slug); return (en ? item?.name : item?.name_zh) ?? slug; };
  return <details className="border-b border-[var(--line)] py-4" data-monthly-handoff>
    <summary className="cursor-pointer font-semibold text-[var(--accent)]">{t("比较多个国家的月度走势", "Compare Monthly Trends Across Countries")}</summary>
    <div className="mt-4 rounded-lg border border-[var(--line)] p-4">
      <p className="text-sm">{t("保留当前报告国，请自行选择1–4个其他国家，总计2–5国；不会自动选择第二个国家。", "The reporting country stays selected. Choose 1–4 additional countries, for 2–5 in total; no second country is selected automatically.")}</p>
      {!exact ? <label className="mt-3 block text-sm">{t("当前指标没有精确对应项；请明确选择一个受支持的比较指标", "No exact mapping for this indicator; explicitly choose a supported comparison indicator")}<select className="field-control mt-2" value={explicitIndicator} onChange={e => setExplicitIndicator(e.target.value)}><option value="">{t("请选择，不自动替换", "Choose; no automatic substitution")}</option>{Object.entries(monthlyIndicators).map(([id, item]) => <option key={id} value={id}>{en ? item.en : item.zh}</option>)}</select></label> : <p className="mt-2 text-sm">{t("沿用指标：", "Indicator retained: ")}{en ? monthlyIndicators[exact as keyof typeof monthlyIndicators].en : monthlyIndicators[exact as keyof typeof monthlyIndicators].zh}</p>}
      <fieldset className="mt-4 flex flex-wrap gap-3"><legend className="mb-2 text-sm font-semibold">{t("比较国家（包含当前报告国）", "Comparison countries (including reporting country)")}</legend>{countries.map(c => {
        const primary = c.slug === country, checked = primary || extra.includes(c.slug);
        const months = period && indicator ? handoffMonths(coverage, c.slug, indicator, period.from, period.to) : [];
        return <label key={c.slug} className="text-sm"><input type="checkbox" checked={checked} disabled={primary || (!checked && (extra.length >= 4 || !months.length || !ready))} onChange={() => setAdditional(checked ? extra.filter(slug => slug !== c.slug) : [...extra, c.slug])} /> {name(c.slug)}{primary ? t("（当前报告国）", " (reporting country)") : null}<span className="ml-1 text-xs text-[var(--muted)]">{months.length ? `${months.length} ${t("个合格月份", "eligible months")}` : t("无合格月份", "no eligible months")}</span></label>;
      })}</fieldset>
      <p className="mt-3 text-sm" data-handoff-period>{period ? <>{t("年份筛选对应月份：", "Year filters as calendar months: ")}{period.requestedFrom} – {period.requestedTo}<br />{t("实际传递期间：", "Transferred period: ")}{period.from} – {period.to}</> : t("所选年份范围内，当前报告国与比较指标没有合格的已发布月度观测，或期间无效；不改用其他期间。", "No eligible published monthly observations for the reporting country and comparison indicator in this year range, or the range is invalid. No alternative period is substituted.")}</p>
      {period?.clipped ? <p className="mt-2 text-xs">{t("范围已截取到所选年份内当前报告国的实际合格覆盖；独立历史补充中更早的月份，以及未纳入现有发布观测的月份不传递。", "The range is clipped to the reporting country's actual eligible coverage within the selected years. Earlier separate historical backfills and months outside existing published coverage are not transferred.")}</p> : null}
      <p className="mt-2 text-xs text-[var(--muted)]">{t("年份起止按1月至12月转换；最早/最新使用合格覆盖边界，独立历史补充不在此链接中拼接。期间内缺口仍保留缺失，不保证所有国家有共同月份。目标工作台会重新核验当前已发布数据；此链接不冻结数据或形成研究结论。", "Year bounds map to January–December; earliest/latest use eligible coverage boundaries. Separate historical backfills are not spliced into this comparison. Internal gaps remain missing; a common month across all countries is not guaranteed. The comparison workbench rechecks current published data. This link is not a frozen dataset or a research conclusion.")}</p>
      {!ready ? <p role="status" className="mt-2 text-sm">{t("等待当前高频观测读取完成；读取失败时无法生成比较链接。", "Waiting for the current high-frequency observations; no comparison link is generated if loading fails.")}</p> : null}
      {handoff ? <a data-monthly-entry className="mt-4 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]" href={handoff.url}>{t("打开所选国家的月度比较", "Open monthly comparison for selected countries")}</a> : <button type="button" disabled className="mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-sm opacity-60">{t("请选择2–5个有合格覆盖的国家与有效期间", "Choose 2–5 countries with eligible coverage and a valid period")}</button>}
    </div>
  </details>;
}
