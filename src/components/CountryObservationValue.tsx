import Link from "next/link";
import type { Observation } from "@/types/Observation";
import { countryObservationSummary } from "@/lib/countryObservationPresentation";
import { sourceInstitution } from "@/lib/researchSnapshot";
import { englishUnit } from "@/i18n/presentation";
import { formatWithUnit } from "@/lib/format";

export function CountryObservationValue({ series, country, indicator, locale = "zh-CN" }: { series: Observation[]; country: string; indicator: string; locale?: "zh-CN" | "en" }) {
  const en = locale === "en", prefix = en ? "/en" : "";
  const { published, record, value, unavailable } = countryObservationSummary(series);
  const reason = unavailable === "pending" ? en ? "Pending publication / connection" : "待发布／待接入" : unavailable === "not_applicable" ? en ? "Not applicable; no substitute series" : "不适用；不替换为其他口径" : en ? "Missing published observation" : "缺少已发布观测";
  return <div data-country-observation={indicator} data-observation-year={published?.year ?? ""} data-observation-status={published?.status ?? unavailable}>
    <p className="metric-number mt-1 text-sm font-semibold">{formatWithUnit(value, record ? en ? englishUnit(record.unit) : record.unit : "", { maximumFractionDigits: record?.unit.includes("欧元") ? 0 : 1 })}</p>
    <p className="mt-1 text-xs text-[var(--muted)]">{published ? `${en ? "Observation" : "观测年份"}: ${published.year} · ${en ? "Published" : "已发布"} (${published.status})` : reason}</p>
    {!published && record ? <p className="mt-1 text-xs text-[var(--muted)]">{en ? "Latest record" : "最新记录"}: {record.year} · {en ? englishUnit(record.unit) : record.unit}</p> : null}
    <details className="mt-2 text-xs text-[var(--muted)]"><summary>{en ? "Source and status" : "来源与状态"}</summary><div className="mt-2 space-y-2 break-words">
      {record?.source_url ? <a className="text-[var(--accent)] underline" href={record.source_url} target="_blank" rel="noreferrer"><span lang="zh-CN" data-original-language="zh-CN">{sourceInstitution(record.source_name, record.source_url)} · {record.source_name}</span></a> : <p>{en ? "Source metadata unavailable" : "来源元数据不可用"}</p>}
      <p>{en ? "Dataset" : "数据集"}: {record?.source_dataset ? <span lang="zh-CN" data-original-language="zh-CN">{record.source_dataset}</span> : en ? "Not separately recorded" : "未单独记录"}</p>
      <p>{en ? "Record updated" : "记录更新时间"}: {record?.updated_at || "—"} · {en ? "Not the official release or retrieval date." : "不等同于官方发布日期或获取日期。"}</p>
      <p>{en ? "Verification / retrieval date: not separately recorded." : "核验／获取日期：未单独记录。"}</p>
      {record?.comparability_status && record.comparability_status !== "comparable" ? <p>{en ? "Comparability restriction" : "可比性限制"}: {record.comparability_status}</p> : null}
      {record?.notes ? <div lang="zh-CN" data-original-language="zh-CN"><p>{record.notes}</p></div> : null}
    </div></details>
    <Link className="mt-2 inline-flex text-xs text-[var(--accent)] underline" href={`${prefix}/data/?country=${country}&indicator=${indicator}&tab=annual`}>{en ? "Full annual series" : "完整年度序列"}</Link>
  </div>;
}
