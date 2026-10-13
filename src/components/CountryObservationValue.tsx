import Link from "next/link";
import type { Observation } from "@/types/Observation";
import { countryObservationSummary } from "@/lib/countryObservationPresentation";
import { sourceInstitution } from "@/lib/researchSnapshot";
import { englishUnit } from "@/i18n/presentation";
import { formatWithUnit } from "@/lib/format";
import { getCanonicalSourceCheck } from "@/lib/canonicalSourceCheck";

// Why the latest period has no published value, as established by re-running the record's own source query.
const AVAILABILITY: Record<string, { zh: string; en: string }> = {
  not_yet_published_at_source: { zh: "官方来源尚未发布该年度", en: "Not yet published by the official source" },
  missing_at_source: { zh: "官方来源缺少该年度数值", en: "Value missing at the official source" },
  confidential_at_source: { zh: "官方来源将该数值标为保密", en: "Marked confidential by the official source" },
  not_available_for_country_at_source: { zh: "该来源数据集不覆盖此国家", en: "The source dataset does not cover this country" },
  published_at_source_not_imported: { zh: "官方来源已发布，尚未导入", en: "Published by the official source; not yet imported" },
  published_at_source_with_definition_flag: { zh: "来源已发布但标注口径不同；未作为可比数据导入", en: "Published at source with a definition-differs flag; not imported as comparable" },
  source_acquisition_failure: { zh: "最近一次来源检查失败", en: "The latest source check failed" },
  not_applicable_by_research_rule: { zh: "按研究规则不适用", en: "Not applicable under the research rules" },
};

export function CountryObservationValue({ series, country, indicator, locale = "zh-CN" }: { series: Observation[]; country: string; indicator: string; locale?: "zh-CN" | "en" }) {
  const en = locale === "en", prefix = en ? "/en" : "";
  const { published, record, value, unavailable } = countryObservationSummary(series);
  const check = getCanonicalSourceCheck(country, indicator);
  const evidence = check?.availability ? AVAILABILITY[check.availability] : undefined;
  const years = (list: number[]) => list.join(en ? ", " : "、");
  const reason = unavailable === "pending" && evidence ? `${en ? evidence.en : evidence.zh}${check?.availability_year ? ` (${check.availability_year})` : ""}` : unavailable === "pending" ? en ? "Pending publication / connection" : "待发布／待接入" : unavailable === "not_applicable" ? en ? "Not applicable; no substitute series" : "不适用；不替换为其他口径" : en ? "Missing published observation" : "缺少已发布观测";
  return <div data-country-observation={indicator} data-observation-year={published?.year ?? ""} data-observation-status={published?.status ?? unavailable}>
    <p className="metric-number mt-1 text-sm font-semibold">{formatWithUnit(value, record ? en ? englishUnit(record.unit) : record.unit : "", { maximumFractionDigits: record?.unit.includes("欧元") ? 0 : 1 })}</p>
    <p className="mt-1 text-xs text-[var(--muted)]">{published ? `${en ? "Observation" : "观测年份"}: ${published.year} · ${en ? "Published" : "已发布"} (${published.status})` : reason}</p>
    {!published && record ? <p className="mt-1 text-xs text-[var(--muted)]">{en ? "Latest record" : "最新记录"}: {record.year} · {en ? englishUnit(record.unit) : record.unit}</p> : null}
    <details className="mt-2 text-xs text-[var(--muted)]"><summary>{en ? "Source and status" : "来源与状态"}</summary><div className="mt-2 space-y-2 break-words">
      {record?.source_url ? <a className="text-[var(--accent)] underline" href={record.source_url} target="_blank" rel="noreferrer"><span lang="zh-CN" data-original-language="zh-CN">{sourceInstitution(record.source_name, record.source_url)} · {record.source_name}</span></a> : <p>{en ? "Source metadata unavailable" : "来源元数据不可用"}</p>}
      <p>{en ? "Dataset" : "数据集"}: {record?.source_dataset ? <span lang="zh-CN" data-original-language="zh-CN">{record.source_dataset}</span> : en ? "Not separately recorded" : "未单独记录"}</p>
      <p>{en ? "Record updated" : "记录更新时间"}: {record?.updated_at || "—"} · {en ? "Not the official release or retrieval date." : "不等同于官方发布日期或获取日期。"}</p>
      {check?.checked ? <div data-source-check={check.checked}>
        <p>{en ? "Source last checked" : "最近一次来源检查"}: {check.checked}{check.source_latest ? ` · ${en ? "latest period at source" : "来源最新期"}: ${check.source_latest}` : ""}</p>
        <p>{en ? "Source dataset last updated" : "来源数据集更新时间"}: {check.source_updated ?? "—"} · {en ? "The official release date of an individual observation is not provided by the source." : "来源不提供单个观测的官方发布日期。"}</p>
        {published && evidence && check.availability_year && check.availability_year > published.year ? <p data-availability={check.availability}>{check.availability_year}: {en ? evidence.en : evidence.zh}</p> : null}
        {check.newer_at_source.length ? <p data-newer-at-source>{en ? `The source now has ${years(check.newer_at_source)}; not imported, because this series is a protected model input.` : `来源已有 ${years(check.newer_at_source)} 年数据；该序列是受保护的模型输入，尚未导入。`}</p> : null}
        {check.revised_years.length ? <p data-revised-at-source>{en ? `The source now reports a different value for ${years(check.revised_years)}; the stored value is unchanged pending owner review.` : `来源对 ${years(check.revised_years)} 年给出了不同数值；在所有者审阅前，已存数值保持不变。`}</p> : null}
        {check.definition_flag ? <p data-definition-flag>{en ? "The source marks this series with a definition or break flag." : "来源对该序列标注了口径差异或序列断点。"}</p> : null}
      </div> : <p>{en ? "Source check: not available for this series." : "来源检查：该序列暂无。"}</p>}
      {record?.comparability_status && record.comparability_status !== "comparable" ? <p>{en ? "Comparability restriction" : "可比性限制"}: {record.comparability_status}</p> : null}
      {record?.notes ? <div lang="zh-CN" data-original-language="zh-CN"><p>{record.notes}</p></div> : null}
    </div></details>
    <Link className="mt-2 inline-flex text-xs text-[var(--accent)] underline" href={`${prefix}/data/?country=${country}&indicator=${indicator}&tab=annual`}>{en ? "Full annual series" : "完整年度序列"}</Link>
  </div>;
}
