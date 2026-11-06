// E1 structured event-mechanism research: one evidence chain per reviewed case study, in five parts (A event, B mechanism,
// C observable indicators, D evidence assessment, E comparison across cases), joined to the election and macro research
// of D3/D4 and to the transparent pressure models. It reads the existing dossier (eventCaseStudies.ts), the event's
// reviewed analysis record and published observations; it never changes an event record, never estimates an event effect
// and keeps what is documented, what is merely contemporaneous and what is a hypothesis apart.
import type { Bi, EventAnalysisRecord } from "./eventAnalysisLinks";
import { annualPhase, type CaseChainLink, type EventCaseStudy } from "./eventCaseStudies";
import type { Event } from "@/types/Event";
import type { Observation } from "@/types/Observation";
import type { EventWindowResult } from "@/types/EventWindow";

export const EVENT_MECHANISM_METHOD = "atlas-event-mechanism-research-v1";

/** Built at build time from the admitted elections (D4 protocol) and the models' own outputs. */
export type MechanismPoliticalContext = {
  interval: null | {
    country: string; fromElection: string; fromDate: string; toElection: string; toDate: string; monthsAfterFrom: number; monthsBeforeTo: number;
    turnoutChange: number | null; turnoutBasis: string | null; verifiedListMovement: number | null; identityBasis: string;
    indicators: { indicator: string; fromPeriod: string | null; toPeriod: string | null; change: number | null; status: string; reason: string | null }[];
    models: { modelId: string; fromYear: number; toYear: number; fromScore: number | null; toScore: number | null; change: number | null; status: string; reason: string | null }[];
    electionSources: { electionId: string; id: string; institution: string | null; url: string }[];
    studyPath: string;
  };
  models: { modelId: string; formulaVersion: string; weightVersion: string; years: { year: number; score: number | null; availability: string; inputs: { indicator: string; value: number; observationId: string; sourceUrl: string }[] }[] }[];
};
export type WindowSummary = { outcome: string; gate: EventWindowResult["gate"]; eventPeriod: string; preMean: number | null; eventValue: number | null; postMean: number | null; change: number | null; pre: number; post: number; missing: string[]; definition: string | null; traceIds: string[]; comparison: null | { country: string; preMean: number | null; postMean: number | null; change: number | null }; external: null | { outcome: string; preMean: number | null; postMean: number | null; change: number | null }; sourceUrl: string };

export type MechanismAnnual = {
  indicatorId: string; name: Bi; role: Bi; frequency: "annual"; geography: string;
  observations: { year: number; value: number | null; status: string; observationId: string; phase: "pre" | "event" | "post" }[];
  counts: { pre: number; event: number; post: number }; latestPublishedYear: number | null; yearsAfterEvent: number | null;
  source: { url: string | null; dataset: string | null; name: string | null; updatedAt: string | null }; vintage: "current_published_only";
};
export type EventMechanismRecord = ReturnType<typeof buildEventMechanismRecord>;

const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const COUNTRY: Record<string, Bi> = { czechia: { zh: "捷克", en: "Czechia" }, hungary: { zh: "匈牙利", en: "Hungary" }, slovakia: { zh: "斯洛伐克", en: "Slovakia" }, germany: { zh: "德国", en: "Germany" }, poland: { zh: "波兰", en: "Poland" } };
const INDICATOR: Record<string, Bi> = { hicp_inflation: { zh: "HICP 通胀", en: "HICP inflation" }, real_gdp_growth: { zh: "实际 GDP 增长", en: "real GDP growth" }, unemployment_rate: { zh: "失业率", en: "unemployment" }, fiscal_balance_gdp: { zh: "政府收支差额", en: "government balance" }, government_debt_gdp: { zh: "政府债务", en: "government debt" } };
const sg = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Number(v.toFixed(2)))}`;
const published = (o: Observation) => (o.status === "official" || o.status === "verified" || o.status === "calculated") && o.value !== null;

export function buildEventMechanismRecord(study: EventCaseStudy, event: Event, analysis: EventAnalysisRecord, observationsOf: (indicatorId: string) => Observation[], nameOf: (indicatorId: string) => Bi, political: MechanismPoliticalContext) {
  const eventYear = Number(event.date.slice(0, 4));
  const annual: MechanismAnnual[] = study.annual.map((item) => {
    const rows = observationsOf(item.indicator_id).slice().sort((a, b) => a.year - b.year);
    const obs = rows.map((o) => ({ year: o.year, value: published(o) ? o.value : null, status: o.status, observationId: o.id, phase: annualPhase(o.year, event.date) }));
    const held = obs.filter((o) => o.value !== null);
    const latest = held.at(-1) ?? null, source = rows.filter(published).at(-1) ?? null;
    return {
      indicatorId: item.indicator_id, name: nameOf(item.indicator_id), role: item.role, frequency: "annual", geography: event.country_slug, observations: obs,
      counts: { pre: held.filter((o) => o.phase === "pre").length, event: held.filter((o) => o.phase === "event").length, post: held.filter((o) => o.phase === "post").length },
      latestPublishedYear: latest?.year ?? null, yearsAfterEvent: latest ? latest.year - eventYear : null,
      source: { url: source?.source_url ?? null, dataset: source?.source_dataset ?? null, name: source?.source_name ?? null, updatedAt: source?.updated_at ?? null }, vintage: "current_published_only",
    };
  });
  const by = (basis: CaseChainLink["basis"]) => study.chain.filter((l) => l.basis === basis).map((l) => l.step);
  const contemporaneous: Bi[] = [
    ...annual.map((a): Bi => {
      const ev = a.observations.find((o) => o.phase === "event" && o.value !== null);
      const years = (k: number) => `${k} published ${k === 1 ? "year" : "years"}`;
      return { en: `${a.name.en}: ${years(a.counts.pre)} before ${eventYear}, ${ev ? `${ev.value} in ${eventYear}` : `no published value for ${eventYear}`}, ${years(a.counts.post)} after; the latest published year is ${a.latestPublishedYear ?? "none"}. These are national totals observed around the event, not measurements of it.`, zh: `${a.name.zh}：${eventYear} 年之前已发布 ${a.counts.pre} 年，${ev ? `${eventYear} 年为 ${ev.value}` : `${eventYear} 年无已发布数值`}，之后 ${a.counts.post} 年；最新已发布年份为 ${a.latestPublishedYear ?? "无"}。这些是事件前后观察到的国家总量，不是对事件的测量。` };
    }),
  ];
  const iv = political.interval;
  if (iv) {
    contemporaneous.push({ en: `The event falls ${iv.monthsAfterFrom} months after the ${iv.fromDate.slice(0, 4)} election and ${iv.monthsBeforeTo} months before the ${iv.toDate.slice(0, 4)} election. Between those elections turnout changed by ${iv.turnoutChange === null ? "an amount that is not established" : `${sg(iv.turnoutChange)} points`}.`, zh: `事件发生在 ${iv.fromDate.slice(0, 4)} 年选举之后 ${iv.monthsAfterFrom} 个月、${iv.toDate.slice(0, 4)} 年选举之前 ${iv.monthsBeforeTo} 个月。两届选举之间投票率变化${iv.turnoutChange === null ? "未确定" : ` ${sg(iv.turnoutChange)} 个百分点`}。` });
    const calc = iv.indicators.filter((i) => i.change !== null);
    if (calc.length) contemporaneous.push({ en: `Over the same interval, last-complete-year changes: ${calc.map((i) => `${INDICATOR[i.indicator]?.en ?? i.indicator} ${sg(i.change!)} (${i.fromPeriod}→${i.toPeriod})`).join("; ")}. The event is one of many developments in this interval.`, zh: `同一间隔内，最后完整年度的变化：${calc.map((i) => `${INDICATOR[i.indicator]?.zh ?? i.indicator} ${sg(i.change!)}（${i.fromPeriod}→${i.toPeriod}）`).join("；")}。该事件只是这一间隔内的众多发展之一。` });
  }
  for (const m of political.models) {
    const held = m.years.filter((y) => y.score !== null);
    if (held.length) contemporaneous.push({ en: `${m.modelId === "fiscal_pressure" ? "Fiscal" : "Household"} pressure index (${m.formulaVersion}): ${held.map((y) => `${y.year} ${y.score}`).join(", ")}. Descriptive context; it does not measure the event or voting intention.`, zh: `${m.modelId === "fiscal_pressure" ? "财政" : "居民经济"}压力指数（${m.formulaVersion}）：${held.map((y) => `${y.year} 年 ${y.score}`).join("，")}。仅为描述性背景，不衡量该事件或投票意向。` });
  }
  return {
    method_version: EVENT_MECHANISM_METHOD, case_id: `e1:${event.event_id}`, event_id: event.event_id,
    event: { date: event.date, country: event.country_slug, title: study.title, responsible: study.responsible, stagesDocumented: study.stages_documented, stagesNotDocumented: study.stages_not_documented, dateNote: study.date_note ?? null, milestones: study.milestones, establishes: study.establishes, uncertain: study.uncertain },
    mechanism: { channel: analysis.mechanism.channel, affectedActors: analysis.mechanism.affected_actors, institutions: study.mechanism_institutions, conditions: study.conditions, links: study.chain },
    indicators: { annual, monthly: study.window ? { outcome: study.window.outcome, months: study.window.months, role: study.window.role, comparisonCountry: study.window.comparison?.country ?? null, external: study.window.external?.outcome ?? null, sourceUrl: study.window.source.url } : null, monthlyBlocker: study.window_blocker ?? null, missing: study.missing_indicators },
    political,
    assessment: { documented: [...by("documented_fact"), ...by("documented_mechanism"), ...study.conditions.filter((c) => c.status === "documented").map((c) => c.condition)], contemporaneous, hypotheses: by("research_hypothesis"), unsupported: by("unsupported_connection"), notDocumented: study.conditions.filter((c) => c.status === "not_documented").map((c) => c.condition), causalityRequirements: study.causality_requirements, cannotEstablish: study.cannot_establish },
    alternatives: study.alternatives, sources: study.sources,
  };
}

export type ComparisonRow = { key: string; label: Bi; values: Record<string, string>; note: Bi | null };
/** Side by side on fixed dimensions. Differences are described, never scored or ranked. */
export function compareEventMechanisms(records: EventMechanismRecord[]): { rows: ComparisonRow[]; findings: Bi[] } {
  const ids = records.map((r) => r.event_id);
  const row = (key: string, label: Bi, value: (r: EventMechanismRecord) => string, note: Bi | null = null): ComparisonRow => ({ key, label, values: Object.fromEntries(records.map((r) => [r.event_id, value(r)])), note });
  const count = (r: EventMechanismRecord, basis: CaseChainLink["basis"]) => r.mechanism.links.filter((l) => l.basis === basis).length;
  const rows: ComparisonRow[] = [
    row("decision_maker", { en: "Who decided", zh: "决策方" }, (r) => r.event.responsible.kind),
    row("primary_source", { en: "Primary source", zh: "主要来源" }, (r) => r.event.responsible.primary_source_kind, { en: "A company statement is not an official public record.", zh: "企业声明不是官方公共记录。" }),
    row("stages", { en: "Stages documented", zh: "有记录的阶段" }, (r) => `${r.event.stagesDocumented.length} of ${r.event.stagesDocumented.length + r.event.stagesNotDocumented.length}: ${r.event.stagesDocumented.join(", ")}`),
    row("channel", { en: "Transmission channel", zh: "传导渠道" }, (r) => r.mechanism.channel.en),
    row("links", { en: "Chain links: documented / hypothesis / unsupported", zh: "链条环节：有记录 / 假设 / 不成立" }, (r) => `${count(r, "documented_fact") + count(r, "documented_mechanism")} / ${count(r, "research_hypothesis")} / ${count(r, "unsupported_connection")}`),
    row("conditions", { en: "Mechanism conditions documented as met", zh: "有记录已满足的机制条件" }, (r) => `${r.mechanism.conditions.filter((c) => c.status === "documented").length} of ${r.mechanism.conditions.length}`),
    row("annual", { en: "Annual indicators, latest published year", zh: "年度指标及最新已发布年份" }, (r) => r.indicators.annual.map((a) => `${a.indicatorId} ${a.latestPublishedYear ?? "none"}`).join("; ")),
    row("monthly", { en: "Monthly window", zh: "月度窗口" }, (r) => r.indicators.monthly ? `${r.indicators.monthly.outcome}, ±${r.indicators.monthly.months} months` : "none: no explained monthly link"),
    row("vintages", { en: "Historical data vintages", zh: "历史数据版本" }, () => "not held: current published values only"),
    row("election_interval", { en: "Position between admitted elections", zh: "在已准入选举之间的位置" }, (r) => r.political.interval ? `${r.political.interval.monthsAfterFrom} months after ${r.political.interval.fromDate.slice(0, 4)}, ${r.political.interval.monthsBeforeTo} before ${r.political.interval.toDate.slice(0, 4)}` : "no bracketing pair"),
    row("turnout", { en: "Turnout change across that interval", zh: "该间隔的投票率变化" }, (r) => r.political.interval?.turnoutChange == null ? "not established" : `${sg(r.political.interval.turnoutChange)} points (${r.political.interval.turnoutBasis})`, { en: "Contemporaneous with the event, not attributable to it.", zh: "与事件同期，不能归因于事件。" }),
    row("models", { en: "Fiscal pressure over the interval", zh: "该间隔的财政压力" }, (r) => { const m = r.political.interval?.models.find((x) => x.modelId === "fiscal_pressure"); return !m ? "—" : m.change === null ? `unavailable (${m.reason})` : `${m.fromScore} → ${m.toScore} (${m.fromYear}→${m.toYear})`; }),
    row("alternatives", { en: "Competing explanations listed", zh: "列出的其他解释" }, (r) => r.alternatives.map((a) => a.kind).join(", ")),
    row("identification", { en: "Validated identification strategy", zh: "经验证的识别策略" }, () => "none: no effect is estimated"),
  ];
  const kinds = records.map((r) => new Set(r.alternatives.map((a) => a.kind)));
  const shared = [...kinds[0] ?? []].filter((k) => kinds.every((s) => s.has(k)));
  const findings: Bi[] = [
    { en: `Both cases document an event and a stated mechanism, but neither documents that the mechanism's later conditions were met: ${records.map((r) => `${r.event_id} ${r.mechanism.conditions.filter((c) => c.status === "documented").length} of ${r.mechanism.conditions.length}`).join("; ")}.`, zh: `两个案例都记录了事件和所述机制，但都没有记录机制的后续条件已经满足：${records.map((r) => `${r.event_id} ${r.mechanism.conditions.filter((c) => c.status === "documented").length}/${r.mechanism.conditions.length}`).join("；")}。` },
    { en: `The decision makers differ: ${records.map((r) => `${r.event_id} ${r.event.responsible.kind} (${r.event.responsible.primary_source_kind})`).join("; ")}. An EU decision has a public decision record; a company announcement does not establish construction or investment.`, zh: `决策方不同：${records.map((r) => `${r.event_id} ${r.event.responsible.kind}（${r.event.responsible.primary_source_kind}）`).join("；")}。欧盟决定有公开的决定记录；企业公告不能证实开工或投资。` },
    { en: `${records.filter((r) => r.indicators.monthly).length} of ${records.length} cases has an explained monthly indicator (${records.filter((r) => r.indicators.monthly).map((r) => r.event_id).join(", ") || "none"}). Annual national totals reach ${records.map((r) => `${r.event_id} ${Math.max(...r.indicators.annual.map((a) => a.latestPublishedYear ?? 0))}`).join(" and ")}; ${(() => { const after = records.map((r) => ({ id: r.event_id, n: Math.max(...r.indicators.annual.map((x) => x.yearsAfterEvent ?? 0)) })).sort((x, y) => x.n - y.n)[0]; return `${after.id} has only ${after.n} published ${after.n === 1 ? "year" : "years"} after its event`; })()}.`, zh: `${records.length} 个案例中有 ${records.filter((r) => r.indicators.monthly).length} 个有经说明的月度指标（${records.filter((r) => r.indicators.monthly).map((r) => r.event_id).join("、") || "无"}）。年度国家总量最新到 ${records.map((r) => `${r.event_id} ${Math.max(...r.indicators.annual.map((a) => a.latestPublishedYear ?? 0))} 年`).join(" 和 ")}；${(() => { const after = records.map((r) => ({ id: r.event_id, n: Math.max(...r.indicators.annual.map((x) => x.yearsAfterEvent ?? 0)) })).sort((x, y) => x.n - y.n)[0]; return `${after.id} 在事件之后只有 ${after.n} 个已发布年份`; })()}。` },
    { en: `Each event falls inside a pair of admitted elections, so the election-level turnout and macro changes of that pair are contemporaneous context. They are not evidence about the event.`, zh: `每个事件都落在一对已准入选举之间，因此该组的选举投票率和宏观变化只是同期背景，不是关于事件的证据。` },
    { en: `Competing explanations listed in both cases: ${shared.join(", ") || "none"}. No validated identification strategy exists for either case, so no event effect is estimated.`, zh: `两个案例共同列出的其他解释：${shared.join("、") || "无"}。两个案例都没有经验证的识别策略，因此不估计任何事件效应。` },
  ];
  void ids;
  return { rows, findings };
}

// Export -------------------------------------------------------------------------------------------------------------
export type MechanismSource = { id: string; kind: "case_source" | "milestone_source" | "annual_observation" | "monthly_observation" | "election_source" | "model_input"; url: string | null; label: string; detail: string | null };
export function eventMechanismSources(records: EventMechanismRecord[], windows: Record<string, WindowSummary | null> = {}) {
  const index = new Map<string, MechanismSource>();
  const add = (x: MechanismSource) => { if (!index.has(x.id)) index.set(x.id, x); return x.id; };
  const refs = records.map((r) => {
    const sources = r.sources.map((s) => add({ id: `source:${s.url}`, kind: "case_source", url: s.url, label: s.label, detail: s.supports.en }));
    const milestones = r.event.milestones.map((m) => add({ id: `source:${m.source_url}`, kind: "milestone_source", url: m.source_url, label: `${m.date} ${m.stage}`, detail: null }));
    const annual = r.indicators.annual.flatMap((a) => a.observations.filter((o) => o.value !== null).map((o) => add({ id: `observation:${o.observationId}`, kind: "annual_observation", url: a.source.url, label: `${a.indicatorId} ${a.geography} ${o.year}`, detail: a.source.dataset })));
    const w = windows[r.event_id];
    const monthly = w ? w.traceIds.map((id) => add({ id: `monthly:${id}`, kind: "monthly_observation", url: w.sourceUrl, label: `${w.outcome} ${id}`, detail: w.definition })) : [];
    const elections = (r.political.interval?.electionSources ?? []).map((s) => add({ id: `election:${s.id}`, kind: "election_source", url: s.url, label: `${s.electionId} ${s.institution ?? ""}`.trim(), detail: null }));
    const models = r.political.models.flatMap((m) => m.years.flatMap((y) => y.inputs.map((i) => add({ id: `model-input:${i.observationId}`, kind: "model_input", url: i.sourceUrl, label: `${m.modelId} ${y.year} ${i.indicator}`, detail: `${m.formulaVersion} ${m.weightVersion}` }))));
    const uniq = (x: string[]) => [...new Set(x)].sort();
    return { event_id: r.event_id, event: uniq([...sources, ...milestones]), annual: uniq(annual), monthly: uniq(monthly), election: uniq(elections), models: uniq(models) };
  });
  return { index: [...index.values()].sort((a, b) => a.id.localeCompare(b.id)), refs };
}
export function eventMechanismEvidence(records: EventMechanismRecord[], windows: Record<string, WindowSummary | null> = {}) {
  const sorted = [...records].sort((a, b) => a.event_id.localeCompare(b.event_id));
  return { schema_version: EVENT_MECHANISM_METHOD, descriptive_only: true, effect_estimated: false, records: sorted, windows: Object.fromEntries(sorted.map((r) => [r.event_id, windows[r.event_id] ?? null])), comparison: compareEventMechanisms(sorted), source_index: eventMechanismSources(sorted, windows) };
}
export async function eventMechanismDigest(evidence: ReturnType<typeof eventMechanismEvidence>) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(evidence)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const HEADER = ["record_type", "event_id", "part", "item", "period", "value", "status", "basis", "note", "source_refs", "method_version"];
export function eventMechanismCsv(records: EventMechanismRecord[], windows: Record<string, WindowSummary | null> = {}) {
  const ev = eventMechanismEvidence(records, windows);
  const cell = (v: unknown) => { const x = String(v ?? ""); return `"${(typeof v === "string" && /^[=+\-@\t\r]/.test(x) ? `'${x}` : x).replaceAll('"', '""')}"`; };
  const rows: unknown[][] = [];
  for (const r of ev.records) {
    const ref = ev.source_index.refs.find((x) => x.event_id === r.event_id)!, j = (x: string[]) => x.join("; ");
    rows.push(["event", r.event_id, "A", "decision", r.event.date, r.event.responsible.institution.en, r.event.stagesDocumented.join(" | "), r.event.responsible.primary_source_kind, r.event.responsible.decision.en, j(ref.event)]);
    for (const m of r.event.milestones) rows.push(["milestone", r.event_id, "A", m.stage, m.date, m.text.en, "documented", "cited source", "", `source:${m.source_url}`]);
    for (const l of r.mechanism.links) rows.push(["mechanism_link", r.event_id, "B", l.step.en, l.timing.en, "", l.basis, l.basis === "unsupported_connection" ? "shown so it is not assumed" : "", "", ""]);
    for (const c of r.mechanism.conditions) rows.push(["mechanism_condition", r.event_id, "B", c.condition.en, "", "", c.status, "", "", c.status === "documented" ? j(ref.event) : ""]);
    for (const a of r.indicators.annual) for (const o of a.observations) rows.push(["annual_observation", r.event_id, "C", a.indicatorId, String(o.year), o.value, o.value === null ? "not_published" : "published", o.phase, `${a.geography}; current published value only; ${a.source.dataset ?? a.source.name ?? ""}`, o.value === null ? "" : `observation:${o.observationId}`]);
    for (const x of r.indicators.missing) rows.push(["missing_indicator", r.event_id, "C", x.en, "", "", "not_held", "", "", ""]);
    const w = ev.windows[r.event_id];
    if (w) rows.push(["monthly_window", r.event_id, "C", w.outcome, w.eventPeriod, w.change, w.gate, "pre-to-post mean change, event month excluded", `pre ${w.preMean} (${w.pre}), event ${w.eventValue}, post ${w.postMean} (${w.post}); missing ${w.missing.join(" ") || "none"}${w.comparison ? `; ${w.comparison.country} context change ${w.comparison.change}` : ""}${w.external ? `; ${w.external.outcome} change ${w.external.change}` : ""}; descriptive, not an effect`, j(ref.monthly)]);
    else if (r.indicators.monthlyBlocker) rows.push(["monthly_window", r.event_id, "C", "none", "", "", "not_shown", "", r.indicators.monthlyBlocker.en, ""]);
    const iv = r.political.interval;
    if (iv) {
      rows.push(["election_interval", r.event_id, "C", `${iv.fromElection} → ${iv.toElection}`, `${iv.fromDate}..${iv.toDate}`, iv.turnoutChange, "contemporaneous", iv.turnoutBasis ?? "", `event ${iv.monthsAfterFrom} months after and ${iv.monthsBeforeTo} before; verified list movement ${iv.verifiedListMovement ?? "none (" + iv.identityBasis + ")"}; D4 case ${iv.studyPath}`, j(ref.election)]);
      for (const i of iv.indicators) rows.push(["interval_indicator_change", r.event_id, "C", i.indicator, `${i.fromPeriod ?? ""}→${i.toPeriod ?? ""}`, i.change, i.status, "last complete year, D4 protocol", i.reason ?? "contemporaneous, not attributable to the event", ""]);
      for (const m of iv.models) rows.push(["interval_model_change", r.event_id, "C", m.modelId, `${m.fromYear}→${m.toYear}`, m.change, m.status, "model's own output", m.reason ?? "descriptive context; does not measure the event or voting intention", ""]);
    }
    for (const m of r.political.models) for (const y of m.years) rows.push(["model_score", r.event_id, "C", m.modelId, String(y.year), y.score, y.availability, `${m.formulaVersion} ${m.weightVersion}`, "descriptive context", j(y.inputs.map((i) => `model-input:${i.observationId}`))]);
    for (const [kind, list] of [["documented", r.assessment.documented], ["contemporaneous", r.assessment.contemporaneous], ["hypothesis", r.assessment.hypotheses], ["unsupported", r.assessment.unsupported], ["not_documented", r.assessment.notDocumented], ["causality_requirement", r.assessment.causalityRequirements]] as const) for (const x of list) rows.push(["assessment", r.event_id, "D", kind, "", x.en, kind, "", "", ""]);
    for (const a of r.alternatives) rows.push(["alternative", r.event_id, "D", a.kind, "", a.text.en, "listed", "", "", ""]);
  }
  for (const c of ev.comparison.rows) for (const [id, v] of Object.entries(c.values)) rows.push(["comparison", id, "E", c.key, "", v, "", "", c.note?.en ?? "", ""]);
  for (const f of ev.comparison.findings) rows.push(["comparison_finding", "", "E", "", "", f.en, "", "", "", ""]);
  for (const x of ev.source_index.index) rows.push(["source", "", "", x.id, "", x.url ?? "", x.kind, "", [x.label, x.detail].filter(Boolean).join(" | "), x.id]);
  return `﻿${[HEADER.join(","), ...rows.map((row) => [...row, ...Array(Math.max(0, 10 - row.length)).fill(""), EVENT_MECHANISM_METHOD].map(cell).join(","))].join("\n")}`;
}
export const monthsFrom = monthsBetween;
export { COUNTRY as MECHANISM_COUNTRY };
