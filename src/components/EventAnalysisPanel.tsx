import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";
import { formatWithUnit } from "@/lib/format";
import { getCountryObservations, getResearchIndicator, researchCountries } from "@/lib/researchData";
import { isPublished } from "@/lib/freshnessCore";
import { newsTranslations } from "@/lib/newsTranslations";
import { eventActors, eventAnalysisLevels, getEventAnalysis, type Bi, type EvidenceKind, type LinkBasis, type MeasureStatus } from "@/lib/eventAnalysisLinks";
import type { Event } from "@/types/Event";
import type { EventWindowGate } from "@/types/EventWindow";

// Reusable four-level event analysis view. Levels 1–3 are documentary and qualitative; level 4 only reports what the
// existing event-window engine's gates allow. Content depth and statistical eligibility are shown separately, and
// nothing here computes or implies an event-specific effect.
export type WindowAvailability = { outcome: string; label: string; pre: number; post: number; gate: EventWindowGate; linked: boolean };

const STATUS: Record<MeasureStatus, Bi> = {
  announced: { zh: "已公告（尚未证实实施）", en: "Announced (implementation not established)" },
  adopted: { zh: "已通过（有待实施）", en: "Adopted (to be implemented)" },
  implemented: { zh: "已实施的措施或行动", en: "Measure or action carried out" },
};
const KIND: Record<EvidenceKind, Bi> = {
  observed_fact: { zh: "已观察的事实", en: "Observed fact" },
  documented_mechanism: { zh: "有文件依据的机制", en: "Documented mechanism" },
  research_hypothesis: { zh: "研究假设", en: "Research hypothesis" },
};
const BASIS: Record<LinkBasis, Bi> = {
  documented: { zh: "来源明确说明", en: "Stated in the source" },
  proposed: { zh: "研究假设", en: "Research hypothesis" },
  unsupported: { zh: "未建立关联", en: "No link established" },
};
const GATE: Record<EventWindowGate, Bi> = {
  full: { zh: "完整窗口可用", en: "Full window available" },
  exploratory: { zh: "仅探索性短窗口", en: "Exploratory short window only" },
  insufficient_data: { zh: "数据不足", en: "Insufficient data" },
};

function Level({ n, title, state, children }: { n: number; title: string; state: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-4" data-event-level={n}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-base font-semibold"><span className="metric-number mr-2 text-xs text-[var(--muted)]">{n}</span>{title}</h4>
        <span className="text-xs font-semibold text-[var(--muted)]" data-level-state>{state}</span>
      </div>
      <div className="mt-3 grid gap-3 text-sm leading-7">{children}</div>
    </section>
  );
}

export function EventAnalysisPanel({ event, availability, onOpenWindow }: { event: Event; availability: WindowAvailability[] | null; onOpenWindow?: (outcome: string) => void }) {
  const en = useLocale() === "en";
  const t = (text: Bi) => (en ? text.en : text.zh);
  const record = getEventAnalysis(event.event_id);
  const levels = eventAnalysisLevels(event);
  const { actors, publisher } = eventActors(event);
  const translation = en ? newsTranslations[event.id] : undefined;
  const country = researchCountries.find((item) => item.slug === event.country_slug);
  const countryName = en ? country?.name ?? event.country_slug : event.country_name;
  const available = en ? "Available" : "可用";
  const unavailable = en ? "Not available" : "暂不提供";
  const annualLinks = (record?.indicators ?? []).filter((link) => link.frequency === "annual" && link.basis !== "unsupported");
  const monthlyLinks = (record?.indicators ?? []).filter((link) => link.frequency === "monthly" && link.basis !== "unsupported");
  const unsupported = (record?.indicators ?? []).filter((link) => link.basis === "unsupported");
  const indicatorName = (id: string) => { const indicator = getResearchIndicator(id); return indicator ? (en ? indicator.name : indicator.name_zh) : id; };
  const linkedWindows = (availability ?? []).filter((row) => row.linked);
  const anyFull = (availability ?? []).some((row) => row.gate === "full");
  const maxPost = Math.max(0, ...(availability ?? []).map((row) => row.post));

  return (
    <article className="editorial-panel p-5" data-event-analysis={event.event_id}>
      <p className="editorial-kicker">{event.date} · {countryName}{record?.representative ? (en ? " · Representative event study" : " · 代表性事件研究") : ""}</p>
      {translation ? <h3 className="mt-2 text-xl font-semibold">{translation.title}</h3> : <h3 lang="zh-CN" data-original-language="zh-CN" className="mt-2 text-xl font-semibold">{event.title}</h3>}
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        {en ? "Four levels are shown separately. Background and mechanism are qualitative; only the event-window level is statistical, and it stays descriptive." : "四个层次分开显示。事件背景与传导机制是定性内容；只有事件窗口属于统计描述，且不构成因果结论。"}
      </p>

      <div className="mt-4 grid gap-5">
        <Level n={1} title={en ? "Event background" : "事件背景"} state={levels.background === "available" ? available : unavailable}>
          {levels.background === "available" ? (
            <>
              {record ? <p>{t(record.overview)}</p> : translation ? translation.summary.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>) : (
                <>
                  {en ? <p className="text-xs text-[var(--muted)]">Original event summary (Chinese; untranslated)</p> : null}
                  <div lang="zh-CN" data-original-language="zh-CN">{event.summary.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                </>
              )}
              <dl className="grid gap-3 sm:grid-cols-2">
                <div><dt className="text-xs text-[var(--muted)]">{en ? "When and where" : "时间与地点"}</dt><dd className="font-semibold">{event.date} · {countryName}</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">{en ? "What the source establishes" : "来源所证实的状态"}</dt><dd className="font-semibold">{record ? t(STATUS[record.measure_status]) : (en ? "Not classified for this event" : "该事件尚未分类")}</dd></div>
                <div data-event-actors><dt className="text-xs text-[var(--muted)]">{en ? "Event actors" : "事件主体"}</dt><dd className="font-semibold">{actors ? (record ? actors.map(t).join(en ? "; " : "；") : <span lang="zh-CN" data-original-language="zh-CN">{actors.map((actor) => actor.zh).join("；")}</span>) : (en ? "Not separately coded (the record names only the publisher)" : "未单独编码（记录中只有发布方）")}</dd></div>
                <div data-source-publisher><dt className="text-xs text-[var(--muted)]">{en ? "Source publisher" : "来源发布方"}</dt><dd className="font-semibold">{event.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline"><span lang="zh-CN" data-original-language="zh-CN">{publisher}</span> ↗</a> : <span lang="zh-CN" data-original-language="zh-CN">{publisher}</span>}</dd></div>
              </dl>
              {record ? (
                <>
                  <div><p className="text-xs text-[var(--muted)]">{en ? "Research topics" : "研究主题"}</p><p className="font-semibold">{record.research_topics.map(t).join(en ? " · " : " · ")}</p></div>
                  <div><p className="text-xs text-[var(--muted)]">{en ? "Political-economic context" : "政治经济背景"}</p><ul className="list-disc pl-5">{record.context.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
                  <div><p className="text-xs text-[var(--muted)]">{en ? "Factual uncertainties" : "事实层面的不确定性"}</p><ul className="list-disc pl-5">{record.uncertainties.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
                </>
              ) : null}
            </>
          ) : <p className="text-[var(--muted)]">{en ? "This record is not verified or has no source link, so no background is presented." : "该记录未通过核验或没有来源链接，因此不提供事件背景。"}</p>}
        </Level>

        <Level n={2} title={en ? "Transmission mechanism" : "传导机制"} state={levels.mechanism === "available" ? (en ? "Qualitative framework" : "定性框架") : unavailable}>
          {record ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div><dt className="text-xs text-[var(--muted)]">{en ? "Channel" : "传导渠道"}</dt><dd className="font-semibold">{t(record.mechanism.channel)}</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">{en ? "Economic actors potentially affected" : "可能受影响的经济主体"}</dt><dd>{t(record.mechanism.affected_actors)}</dd></div>
              </dl>
              <ol className="grid gap-2">{record.mechanism.steps.map((step) => (
                <li key={step.text.en} className="border-l-2 border-[var(--line)] pl-3" data-evidence-kind={step.kind}><span className="mr-2 text-xs font-semibold text-[var(--accent)]">{t(KIND[step.kind])}</span>{t(step.text)}</li>
              ))}</ol>
              <div><p className="text-xs text-[var(--muted)]">{en ? "Uncertainties and alternative explanations" : "不确定性与其他解释"}</p><ul className="list-disc pl-5">{record.mechanism.alternatives.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
              <p className="text-xs text-[var(--muted)]">{en ? "This is a qualitative framework. It assigns no numerical impact, and hypotheses are not established effects." : "这是定性分析框架：不给出数值影响，研究假设也不是已证实的效应。"}</p>
            </>
          ) : (
            <p className="text-[var(--muted)]" data-level-reason="mechanism">{en ? "No reviewed mechanism analysis exists for this event. The Atlas does not generate one from the event category or from the news text; a mechanism is written only after the source documents are reviewed." : "该事件尚无经过审阅的传导机制分析。Atlas 不会根据事件类别或新闻文本自动生成机制；只有在审阅来源文件后才会撰写。"}</p>
          )}
        </Level>

        <Level n={3} title={en ? "Economic indicator observation" : "经济指标观察"} state={levels.indicators === "available" ? available : unavailable}>
          {annualLinks.map((link) => {
            const indicator = getResearchIndicator(link.indicator_id);
            const observations = getCountryObservations(event.country_slug, link.indicator_id).slice().sort((a, b) => a.year - b.year);
            const published = observations.filter(isPublished);
            const first = published[0], last = published.at(-1);
            return (
              <div key={link.indicator_id} className="border border-[var(--line)] p-3" data-linked-indicator={link.indicator_id}>
                <p className="font-semibold">{indicatorName(link.indicator_id)} · {countryName} <span className="ml-2 text-xs font-semibold text-[var(--accent)]">{t(BASIS[link.basis])}</span></p>
                <p className="text-xs text-[var(--muted)]">
                  {en ? "Annual" : "年度"} · {first && last ? `${first.year}–${last.year}` : (en ? "no published observations" : "暂无已发布观测")} · {en ? "unit" : "单位"}: {en ? englishText(indicator?.unit ?? "") : indicator?.unit ?? "—"} · {en ? "source" : "来源"}: {last?.source_dataset ?? last?.source_name ?? "—"}
                </p>
                <p className="mt-1">{en ? "Why it is relevant: " : "相关原因："}{t(link.rationale)}</p>
                {observations.length ? (
                  <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Annual observations (horizontally scrollable)" : "年度观测（可横向滚动）"}>
                    <table className="research-data-table text-left text-xs"><thead><tr><th className="px-2 py-1">{en ? "Year" : "年份"}</th>{observations.map((item) => <th key={item.year} className="metric-number px-2 py-1">{item.year}{item.year === Number(event.date.slice(0, 4)) ? (en ? " (event year)" : "（事件年）") : ""}</th>)}</tr></thead>
                      <tbody><tr><td className="px-2 py-1">{en ? "Value" : "数值"}</td>{observations.map((item) => <td key={item.year} className="metric-number px-2 py-1">{isPublished(item) ? (en ? englishText(formatWithUnit(item.value, item.unit ?? "")) : formatWithUnit(item.value, item.unit ?? "")) : (en ? "pending" : "待发布")}</td>)}</tr></tbody></table>
                  </div>
                ) : null}
              </div>
            );
          })}
          {monthlyLinks.map((link) => (
            <div key={link.indicator_id} className="border border-[var(--line)] p-3" data-linked-indicator={link.indicator_id}>
              <p className="font-semibold">{availability?.find((row) => row.outcome === link.indicator_id)?.label ?? link.indicator_id} · {countryName} <span className="ml-2 text-xs font-semibold text-[var(--accent)]">{t(BASIS[link.basis])}</span></p>
              <p className="text-xs text-[var(--muted)]">{en ? "Monthly series; observations are shown in the event-window level below." : "月度序列；观测在下方事件窗口层次中显示。"}</p>
              <p className="mt-1">{en ? "Why it is relevant: " : "相关原因："}{t(link.rationale)}</p>
            </div>
          ))}
          {unsupported.length ? (
            <div data-unsupported-links><p className="text-xs text-[var(--muted)]">{en ? "Considered but not linked" : "已考虑但未建立关联"}</p><ul className="list-disc pl-5">{unsupported.map((link) => <li key={link.indicator_id}><span className="font-semibold">{indicatorName(link.indicator_id)}</span>{en ? ": " : "："}{t(link.rationale)}</li>)}</ul></div>
          ) : null}
          {!record ? (
            <p className="text-[var(--muted)]" data-level-reason="indicators">
              {en ? "No indicator is linked to this event. Indicators are linked only where a relationship can be explained from the source; the event category alone is not used." : "该事件没有关联指标。只有在能根据来源说明关系时才会建立关联；不会仅凭事件类别推荐指标。"}
              {event.affected_indicator.length ? (en ? ` The event record carries an earlier research coding without an explanation (${event.affected_indicator.map(indicatorName).join(", ")}); it is not treated as a reviewed link.` : `事件记录中有较早的研究编码但没有说明（${event.affected_indicator.map(indicatorName).join("、")}），不视为经过审阅的关联。`) : ""}
            </p>
          ) : levels.indicators === "unavailable" ? <p className="text-[var(--muted)]" data-level-reason="indicators">{en ? "The available evidence does not support linking this event to any Atlas indicator." : "现有证据不足以把该事件与任何 Atlas 指标建立关联。"}</p> : null}
          {annualLinks.length || monthlyLinks.length ? <p className="text-xs text-[var(--muted)]">{en ? "Observations are shown for inspection only. A coincident movement is not an effect of the event." : "观测仅供查看。指标的同期变动不等于事件的影响。"}</p> : null}
        </Level>

        <Level n={4} title={en ? "Descriptive event-window analysis" : "描述性事件窗口分析"} state={availability === null ? (en ? "Checking data…" : "正在检查数据…") : linkedWindows.some((row) => row.gate !== "insufficient_data") ? available : unavailable}>
          <p>{en ? "A full window needs at least 12 monthly observations before the event and 6 after it; the event month is not counted. These requirements are fixed by the existing method." : "完整窗口需要事件前至少 12 个、事件后至少 6 个月度观测；事件月不计入。这些要求由现有方法固定。"}</p>
          {availability === null ? null : availability.length ? (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Monthly data availability around the event (horizontally scrollable)" : "事件前后月度数据可得性（可横向滚动）"}>
              <table className="research-data-table w-full min-w-[480px] text-left text-xs" data-window-availability>
                <thead><tr>{[en ? "Monthly series" : "月度序列", en ? "Observations before" : "事件前观测", en ? "Observations after" : "事件后观测", en ? "Status at ±12 months" : "±12 个月窗口状态", en ? "Link" : "关联"].map((header) => <th key={header} className="px-2 py-1">{header}</th>)}</tr></thead>
                <tbody>{availability.map((row) => (
                  <tr key={row.outcome} data-window-gate={row.gate}>
                    <td className="px-2 py-1 font-semibold">{row.label}</td><td className="metric-number px-2 py-1">{row.pre} / 12</td><td className="metric-number px-2 py-1">{row.post} / 6</td>
                    <td className="px-2 py-1">{t(GATE[row.gate])}</td><td className="px-2 py-1">{row.linked ? (en ? "Explained link" : "有说明的关联") : (en ? "Data coverage only" : "仅说明数据覆盖")}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-[var(--muted)]">{en ? "No monthly series is available for this country." : "该国家没有可用的月度序列。"}</p>}
          {availability !== null && !linkedWindows.length ? (
            <p className="text-[var(--muted)]" data-level-reason="window">
              {en ? "No event-window entry is offered, because no monthly indicator has an explained link to this event." : "不提供事件窗口入口，因为没有任何月度指标与该事件存在经过说明的关联。"}
              {anyFull ? (en ? " Monthly data does cover the window, so a series can still be chosen manually below; such a view only describes the period." : "月度数据覆盖了该窗口，因此仍可在下方手动选择序列；这样的结果只是对该时期的描述。") : (en ? ` The event is also too recent for a full window: at most ${maxPost} of the 6 required post-event months are published.` : `该事件距今也太近，无法形成完整窗口：所需 6 个事件后月份中最多只发布了 ${maxPost} 个。`)}
            </p>
          ) : null}
          {linkedWindows.map((row) => row.gate === "insufficient_data" ? (
            <p key={row.outcome} className="text-[var(--muted)]" data-level-reason="window">{en ? `${row.label}: not enough published months yet (${row.pre} before, ${row.post} after). No numerical result is shown.` : `${row.label}：已发布的月份还不够（事件前 ${row.pre}、事件后 ${row.post}）。不显示任何数值结果。`}</p>
          ) : onOpenWindow ? (
            <button key={row.outcome} type="button" className="w-fit rounded-full cta-dark px-4 py-2 text-xs font-semibold" data-open-window={row.outcome} onClick={() => onOpenWindow(row.outcome)}>{en ? `Event-window analysis: ${row.label}` : `查看事件窗口分析：${row.label}`}</button>
          ) : null)}
        </Level>

        {record ? (
          <details className="advanced-disclosure" data-event-research-details>
            <summary>{en ? "Limitations and sources" : "局限与来源"}</summary>
            <ul className="mt-3 list-disc pl-5 text-sm leading-7">{record.limitations.map((item) => <li key={item.en}>{t(item)}</li>)}</ul>
            <p className="mt-3 text-xs text-[var(--muted)]">{en ? "Sources: " : "来源："}{record.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mr-3 text-[var(--accent)] underline">{source.label} ↗</a>)}{en ? "Event-specific statements restate the Atlas event and project records built from these sources." : "事件相关陈述均转述依据这些来源建立的 Atlas 事件与项目记录。"}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}
