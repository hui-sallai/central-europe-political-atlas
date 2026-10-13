import Link from "next/link";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import { countryModelMeaning, countryModelRange } from "@/lib/countryModelPresentation";
import { englishText } from "@/i18n/reviewedText";
import { statusLabels } from "@/lib/uiLabels";
import { formatNumber } from "@/lib/format";

export function CountryModelSnapshot({ output, card, locale = "zh-CN" }: { output: ModelOutput; card?: ModelCard; locale?: "zh-CN" | "en" }) {
  const en = locale === "en", prefix = en ? "/en" : "";
  const text = (value: string) => en ? englishText(value) : value;
  const availability = en && output.availability === "insufficient" ? englishText("输入不足") : text(statusLabels[output.availability]);
  const range = card ? countryModelRange(card) : null;
  return <article className="border-t border-[var(--line)] py-4 first:border-t-0" data-country-model={output.model_id}>
    <div className="flex items-start justify-between gap-4"><h3 className="text-sm font-semibold">{card ? en ? card.name : card.name_zh : en ? "Model metadata unavailable" : "模型说明不可用"}</h3><p className="metric-number text-xl font-semibold text-[var(--accent)]" data-model-score>{formatNumber(output.score, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</p></div>
    <p className="mt-2 text-xs text-[var(--muted)]" data-model-availability>{availability} · {en ? "Data completeness" : "数据完整度"}: {formatNumber(output.data_completeness)}%</p>
    <p className="mt-2 text-xs text-[var(--muted)]">{en ? "Reference year" : "参照年份"}: <span data-model-reference-year>{output.input_year ?? "—"}</span> · {output.year_alignment_status === "aligned_common_year" ? en ? "Inputs share the same year" : "输入使用同一参照年份" : en ? "Insufficient aligned inputs" : "同期输入不足"}</p>
    <p className="mt-2 text-xs text-[var(--muted)]">{en ? "Defined score range" : "正式定义的分数范围"}: {range ?? (en ? "Not separately defined" : "未单独定义")}</p>
    {card ? <><p className="mt-3 text-xs leading-6 text-[var(--muted)]">{en ? "Included dimensions" : "纳入维度"}: {card.inputs.map(input => text(input.label)).join(" / ")}</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{countryModelMeaning(card, locale)}</p></> : null}
    {output.score === null ? <p className="mt-2 text-xs text-[var(--warning)]">{en ? "No score: eligible inputs do not meet the existing completeness requirements." : "不输出分数：合格输入未达到现有完整度要求。"}</p> : null}
    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{text(output.interpretation_boundary)}</p>
    {card ? <details className="mt-3 text-xs text-[var(--muted)]"><summary>{en ? "Calculation and limitations" : "计算口径与限制"}</summary><div className="mt-2 space-y-2">{[card.calculation_logic, ...card.limitations].map(value => { const translated = text(value); return /[\u3400-\u9fff]/u.test(translated) && en ? <div key={value} lang="zh-CN" data-original-language="zh-CN"><p>{value}</p></div> : <p key={value}>{translated}</p>; })}</div></details> : null}
    <nav className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--accent)]" aria-label={en ? "Model details" : "模型详情"}><Link href={`${prefix}/models/?tab=run&skill=composite_indicators&model=${output.model_id}&country=${output.country_slug}`}>{en ? "Open this model" : "打开此模型"}</Link><Link href={`${prefix}/methodology/#models`}>{en ? "Methodology" : "方法说明"}</Link></nav>
  </article>;
}
