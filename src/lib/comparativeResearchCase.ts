// One reproducible comparative research case built on the D3 research contracts. It fixes the question, countries,
// indicators, views and outcomes in a protocol, runs the existing research functions under that protocol, and adds only
// the sensitivity checks and context the protocol names: the election-year view against the last complete year, direction
// counts without each country in turn, released figures against current ones, and the transparent pressure models as
// descriptive context. Nothing here estimates an effect, predicts a result, ranks parties or pools turnout across countries.
import { runComparativeResearch, MIN_PAIRS_FOR_COEFFICIENT, type ResearchView, type SuccessiveChange, type TurnoutChange } from "./comparativeElectionResearch";
import { ELECTION_MACRO_INDICATORS, electionPeriods, type ElectionMacroIndicator } from "./electionMacroLinkage";
import type { ContextPoint } from "./politicalEconomicContext";
import { seatMeasureScope, turnoutForDisplay, type PoliticalElectionView } from "./politicalExplorer";
import type { PoliticalIdentityLink } from "./politicalIdentity";
import type { CaseModelId, CaseModelObservation } from "./researchCaseModels";

type Text = { en: string; zh: string };
const r1 = (v: number) => Number(v.toFixed(1));
const r6 = (v: number) => Number(v.toFixed(6));
const countryOf = (e: PoliticalElectionView) => e.country ?? "germany";
const MODEL_IDS: readonly CaseModelId[] = ["household_economic_pressure", "fiscal_pressure"];

export const RESEARCH_CASE = {
  id: "d4-turnout-and-pre-election-conditions",
  methodVersion: "atlas-comparative-research-case-v1",
  question: {
    en: "Between successive national parliamentary elections in Czechia, Germany, Hungary and Poland, how did turnout change, and how did the economic conditions of each election's last complete pre-election year change over the same interval? Where list identity is verified, how far did the verified lists' vote shares move?",
    zh: "在捷克、德国、匈牙利和波兰相邻的两届全国议会选举之间，投票率如何变化？各届选举前最后一个完整年度的经济状况在同一间隔内如何变化？在名单身份已核实的情况下，已核实名单的得票率变动了多少？",
  },
  countries: ["czechia", "germany", "hungary", "poland"] as string[],
  contextCountries: ["slovakia"] as string[],
  indicators: [...ELECTION_MACRO_INDICATORS] as ElectionMacroIndicator[],
  primaryView: "last_complete_year" as ResearchView,
  sensitivityView: "election_calendar_year" as ResearchView,
  outcomes: ["turnout_change", "verified_share_movement"] as const,
  models: MODEL_IDS,
} as const;

export const RESEARCH_CASE_PROTOCOL: Text[] = [
  { en: "Unit: two neighbouring admitted elections in one country. An election outside the protocol is never bridged, and Slovakia, with one admitted election, is context only.", zh: "单位：同一国家两届相邻的已准入选举。不跨越协议之外的选举；斯洛伐克只有一届已准入选举，仅作背景。" },
  { en: "Outcome 1: turnout change in percentage points, on one turnout basis within one country. Hungary's turnout is computed from official counts; elsewhere it is published.", zh: "结果一：同一国家内、同一投票率口径下的投票率变化（百分点）。匈牙利投票率由官方人数计算，其他国家为官方公布值。" },
  { en: "Outcome 2: verified list movement, half the sum of absolute share changes among lists with a verified identity. Hungary has no verified link, so it has no figure.", zh: "结果二：已核实名单变动，即身份已核实名单得票率绝对变化之和的一半。匈牙利没有已核实关联，因此没有数字。" },
  { en: "Primary view: the last complete calendar year before polling day, from current published Eurostat annual data. Sensitivity view: the election's own calendar year, which includes months after polling day.", zh: "主视图：投票日前最后一个完整日历年度，使用当前公布的欧盟统计局年度数据。敏感性视图：选举本身所在日历年度，包含投票日后的月份。" },
  { en: "Vintage check: figures a dated Eurostat release showed before polling day, read so far only for the latest election in Germany, Czechia, Poland and Slovakia. A revision is computed only for one indicator, period, frequency, unit and definition.", zh: "数据版本核查：投票日前注明日期的欧盟统计局发布所显示的数字，目前只查阅了德国、捷克、波兰和斯洛伐克最近一届选举。只有指标、期间、频率、单位和定义都相同时才计算修订。" },
  { en: `Description only: direction counts per country and in total, and a coefficient only within one country with at least ${MIN_PAIRS_FOR_COEFFICIENT} pairs. Countries are never pooled into a coefficient.`, zh: `仅作描述：按国家和合计统计方向次数；只有同一国家至少 ${MIN_PAIRS_FOR_COEFFICIENT} 组时才计算系数，绝不跨国合并计算系数。` },
  { en: "Model context: the household and fiscal pressure indices as computed by the models for the last complete year, and the fiscal formula applied to released annual inputs. Neither index measures voting intention.", zh: "模型背景：模型为最后完整年度计算的居民经济压力指数和财政压力指数，以及把财政公式用于已发布年度输入的结果。两个指数都不衡量投票意向。" },
];

export const RESEARCH_CASE_LIMITS: Text[] = [
  { en: "Twelve pairs in four countries are few. Direction counts describe these pairs and do not generalise.", zh: "四个国家共十二组，数量很少。方向计数只描述这些组，不能推广。" },
  { en: "Annual unemployment and annual German GDP start in 2021, so most pairs have no change for them.", zh: "年度失业率和德国年度 GDP 从 2021 年开始，因此多数组没有这两项的变化。" },
  { en: "The pressure models hold inputs from 2021 only. Earlier model scores are unavailable, and history-layer values are not fed into the models.", zh: "压力模型只有 2021 年起的输入。更早的模型分数不可得，也不把历史层数值输入模型。" },
  { en: "Current figures may include revisions made after each election. Released figures exist only for the latest elections, so no change between elections uses them.", zh: "当前数字可能包含选举后的修订。已发布数字只覆盖最近一届选举，因此选举之间的变化都不使用它们。" },
  { en: "Electoral systems differ: proportional list systems in Czechia, Poland and Slovakia, personalised proportional representation in Germany, and a mixed system in Hungary. Turnout and list shares are compared only within a country.", zh: "选举制度不同：捷克、波兰和斯洛伐克为比例名单制，德国为个人化比例代表制，匈牙利为混合制。投票率和名单得票率只在国家内部比较。" },
  { en: "No figure shows that economic conditions caused a turnout or list change, and no party is credited or blamed for any economic figure.", zh: "没有任何数字表明经济状况导致投票率或名单变化，也不把任何经济数字归功或归咎于任何政党。" },
];

export type CaseViewChange = { view: ResearchView; fromPeriod: string | null; toPeriod: string | null; fromValue: number | null; toValue: number | null; change: number | null; unit: string | null; status: SuccessiveChange["status"]; reason: string | null; crossesDataLayer: boolean; pathMean: number | null; pathObserved: number | null; pathExpected: number | null };
export type CaseIndicatorRow = { indicator: ElectionMacroIndicator; primary: CaseViewChange; sensitivity: CaseViewChange; signAgreement: "same" | "differs" | "not_comparable"; directionWithTurnout: "same" | "opposite" | "zero" | null };
export type CaseModelChange = { modelId: CaseModelId; fromYear: number; toYear: number; fromScore: number | null; toScore: number | null; change: number | null; status: "calculated" | "unavailable"; reason: string | null };
export type CasePair = {
  country: string; fromElection: string; toElection: string; fromDate: string; toDate: string; monthsBetween: number;
  turnout: TurnoutChange; lists: { identityBasis: string; units: number; verifiedShareMovement: number | null; coveredShareFrom: number | null; coveredShareTo: number | null; unresolvedLinks: number };
  /** rulesChanged: allocation method, legal thresholds or base seats differ between the two elections. */
  rules: { fromAllocation: string; toAllocation: string; fromBaseSeats: number | null; toBaseSeats: number | null; rulesChanged: boolean; seatScopeFrom: string; seatScopeTo: string };
  indicators: CaseIndicatorRow[]; models: CaseModelChange[];
};
export type CaseCountrySummary = {
  country: string; pairs: number; turnoutRose: number; turnoutFell: number; turnoutMin: number | null; turnoutMax: number | null; verifiedPairs: number;
  indicators: { indicator: ElectionMacroIndicator; n: number; same: number; opposite: number; pearson: number | null; spearman: number | null; leaveOneOut: { min: number; max: number } | null; sensitivityN: number; sensitivitySame: number; sensitivityOpposite: number; status: string }[];
};
export type CaseDirection = { indicator: ElectionMacroIndicator; pairs: number; same: number; opposite: number; withoutCountry: { country: string; pairs: number; same: number; opposite: number }[] };
export type CaseVintageRow = { country: string; electionId: string; electionDate: string; indicator: ElectionMacroIndicator; released: { period: string; frequency: string; value: number; unit: string; publishedOn: string; flashEstimate: boolean | null; sourceUrl: string | null } | null; reason: string | null; lastCompleteYear: { period: string | null; value: number | null }; relation: string; revision: number | null };
export type CaseModelVintage = { electionId: string; country: string; modelId: CaseModelId; currentScore: number | null; currentYear: number; releasedScore: number | null; releasedPeriod: string | null; samePeriod: boolean | null; difference: number | null; status: string; reason: string | null };
export type CaseContextElection = { country: string; electionId: string; date: string; turnout: number | null; turnoutComputed: boolean; observations: { indicator: ElectionMacroIndicator; period: string | null; value: number | null; status: string }[]; models: { modelId: CaseModelId; year: number; score: number | null }[]; reason: Text };
export type CaseComparability = { country: string; elections: number; family: string; allocation: string[]; turnoutBasis: string; seatScope: string[]; note: Text };

function viewChange(c: SuccessiveChange): CaseViewChange {
  return { view: c.view, fromPeriod: c.fromPeriod, toPeriod: c.toPeriod, fromValue: c.fromValue, toValue: c.toValue, change: c.change, unit: c.unit, status: c.status, reason: c.reason, crossesDataLayer: c.crossesDataLayer, pathMean: c.path?.mean ?? null, pathObserved: c.path?.observed ?? null, pathExpected: c.path?.expected ?? null };
}
const NOTE: Record<string, Text> = {
  czechia: { en: "Proportional list system in 14 regions; party and coalition thresholds differ, and the thresholds changed between elections.", zh: "14 个选区的比例名单制；政党与联盟门槛不同，且门槛在不同选举之间有变化。" },
  germany: { en: "Personalised proportional representation; the 2025 election used the reformed seat rules, so seat counts on either side of 2025 follow different rules.", zh: "个人化比例代表制；2025 年选举采用改革后的席位规则，因此 2025 年前后的席位数遵循不同规则。" },
  hungary: { en: "Mixed system: 106 single-member districts and 93 national list seats. Turnout is computed from official counts; seats are whole-chamber seats attributed from two official sources.", zh: "混合制：106 个单一选区和 93 个全国名单席位。投票率由官方人数计算；席位为根据两类官方来源归属的全议院席位。" },
  poland: { en: "Proportional list system in 41 constituencies with D'Hondt; coalition committees face a higher threshold than party committees.", zh: "41 个选区的比例名单制，采用 D'Hondt 法；联盟委员会的门槛高于政党委员会。" },
  slovakia: { en: "Proportional list system in one national constituency; one admitted election, so no change between elections.", zh: "全国单一选区的比例名单制；只有一届已准入选举，因此没有选举之间的变化。" },
};

export function runResearchCase(elections: PoliticalElectionView[], points: ContextPoint[], links: PoliticalIdentityLink[], models: CaseModelObservation[]) {
  // Fixed order, so every page that holds the same elections exports the same bytes.
  const scoped = elections.filter((e) => RESEARCH_CASE.countries.includes(countryOf(e))).sort((a, b) => countryOf(a).localeCompare(countryOf(b)) || a.date.localeCompare(b.date));
  const run = (view: ResearchView) => runComparativeResearch({ countries: RESEARCH_CASE.countries, indicators: RESEARCH_CASE.indicators, view }, elections, points, links);
  const primary = run(RESEARCH_CASE.primaryView), sensitivity = run(RESEARCH_CASE.sensitivityView);
  const model = (electionId: string, id: CaseModelId) => models.find((m) => m.electionId === electionId && m.modelId === id) ?? null;

  const pairs: CasePair[] = primary.c.pairs.map((p) => {
    const other = sensitivity.c.pairs.find((q) => q.pair.from.electionId === p.pair.from.electionId && q.pair.to.electionId === p.pair.to.electionId)!;
    const indicators = RESEARCH_CASE.indicators.map((indicator): CaseIndicatorRow => {
      const a = p.macro.find((m) => m.indicator === indicator)!, b = other.macro.find((m) => m.indicator === indicator)!;
      const signAgreement = a.change === null || b.change === null ? "not_comparable" : Math.sign(a.change) === Math.sign(b.change) ? "same" : "differs";
      const t = p.turnout.change;
      const directionWithTurnout = a.change === null || t === null ? null : a.change * t > 0 ? "same" : a.change * t < 0 ? "opposite" : "zero";
      return { indicator, primary: viewChange(a), sensitivity: viewChange(b), signAgreement, directionWithTurnout };
    });
    const fromYear = Number(electionPeriods(p.pair.from.date).lastComplete), toYear = Number(electionPeriods(p.pair.to.date).lastComplete);
    const modelChanges = MODEL_IDS.map((id): CaseModelChange => {
      const f = model(p.pair.from.electionId, id), t = model(p.pair.to.electionId, id);
      const fromScore = f?.score ?? null, toScore = t?.score ?? null;
      if (fromScore === null || toScore === null) return { modelId: id, fromYear, toYear, fromScore, toScore, change: null, status: "unavailable", reason: fromScore === null && toScore === null ? "model_inputs_not_held_for_either_year" : "model_inputs_not_held_for_one_year" };
      if (f!.formulaVersion !== t!.formulaVersion || f!.weightVersion !== t!.weightVersion) return { modelId: id, fromYear, toYear, fromScore, toScore, change: null, status: "unavailable", reason: "model_version_differs" };
      return { modelId: id, fromYear, toYear, fromScore, toScore, change: r1(toScore - fromScore), status: "calculated", reason: null };
    });
    return {
      country: p.pair.country, fromElection: p.pair.from.electionId, toElection: p.pair.to.electionId, fromDate: p.pair.from.date, toDate: p.pair.to.date, monthsBetween: p.pair.monthsBetween,
      turnout: p.turnout, lists: { identityBasis: p.lists.identityBasis, units: p.lists.units.length, verifiedShareMovement: p.lists.verifiedShareMovement, coveredShareFrom: p.lists.coveredShareFrom, coveredShareTo: p.lists.coveredShareTo, unresolvedLinks: p.lists.unresolvedLinks },
      rules: { fromAllocation: p.pair.from.system.allocationMethod, toAllocation: p.pair.to.system.allocationMethod, fromBaseSeats: p.pair.from.system.baseSeats, toBaseSeats: p.pair.to.system.baseSeats, rulesChanged: p.lists.rulesChanged || p.pair.from.system.baseSeats !== p.pair.to.system.baseSeats, seatScopeFrom: seatMeasureScope(p.pair.from), seatScopeTo: seatMeasureScope(p.pair.to) },
      indicators, models: modelChanges,
    };
  });

  const assoc = (results: typeof primary, country: string, indicator: ElectionMacroIndicator) => results.c.associations.find((a) => a.country === country && a.indicator === indicator && a.outcome === "turnout_change")!;
  const countries: CaseCountrySummary[] = RESEARCH_CASE.countries.map((country) => {
    const own = pairs.filter((p) => p.country === country), turnout = own.flatMap((p) => p.turnout.change === null ? [] : [p.turnout.change]);
    return {
      country, pairs: own.length, turnoutRose: turnout.filter((v) => v > 0).length, turnoutFell: turnout.filter((v) => v < 0).length,
      turnoutMin: turnout.length ? Math.min(...turnout) : null, turnoutMax: turnout.length ? Math.max(...turnout) : null, verifiedPairs: own.filter((p) => p.lists.verifiedShareMovement !== null).length,
      indicators: RESEARCH_CASE.indicators.map((indicator) => {
        const a = assoc(primary, country, indicator), s = assoc(sensitivity, country, indicator);
        return { indicator, n: a.n, same: a.sameDirection ?? 0, opposite: a.oppositeDirection ?? 0, pearson: a.pearson, spearman: a.spearman, leaveOneOut: a.leaveOneOutPearson, sensitivityN: s.n, sensitivitySame: s.sameDirection ?? 0, sensitivityOpposite: s.oppositeDirection ?? 0, status: a.status };
      }),
    };
  });

  // Direction counts in total and with each country left out in turn: a check on how much one country carries the count.
  const count = (rows: CasePair[], indicator: ElectionMacroIndicator) => { const r = rows.flatMap((p) => p.indicators.filter((i) => i.indicator === indicator && i.directionWithTurnout !== null)); return { pairs: r.length, same: r.filter((i) => i.directionWithTurnout === "same").length, opposite: r.filter((i) => i.directionWithTurnout === "opposite").length }; };
  const direction: CaseDirection[] = RESEARCH_CASE.indicators.map((indicator) => ({ indicator, ...count(pairs, indicator), withoutCountry: RESEARCH_CASE.countries.map((country) => ({ country, ...count(pairs.filter((p) => p.country !== country), indicator) })) }));

  const lastComplete = (electionId: string, indicator: ElectionMacroIndicator) => primary.allViewObservations.find((o) => o.electionId === electionId && o.indicator === indicator && o.view === "last_complete_year");
  const vintage: CaseVintageRow[] = primary.d.released.map((r) => {
    const v = r.versus.find((x) => x.view === "last_complete_year")!;
    return { country: r.country, electionId: r.electionId, electionDate: r.electionDate, indicator: r.indicator, released: r.status === "documented" ? { period: r.period!, frequency: r.frequency!, value: r.value!, unit: r.unit!, publishedOn: r.publishedOn!, flashEstimate: r.flashEstimate, sourceUrl: r.sourceUrl } : null, reason: r.reason, lastCompleteYear: { period: lastComplete(r.electionId, r.indicator)?.period ?? null, value: v.value }, relation: v.relation, revision: r.revisionSinceRelease };
  });
  const releasedElections = new Set(vintage.map((v) => v.electionId));
  const modelVintage: CaseModelVintage[] = models.filter((m) => releasedElections.has(m.electionId) || m.released.status === "calculated").map((m) => {
    const same = m.released.status === "calculated" ? m.released.samePeriodAsModelYear : null;
    return { electionId: m.electionId, country: m.country, modelId: m.modelId, currentScore: m.score, currentYear: m.inputYear, releasedScore: m.released.score, releasedPeriod: m.released.period, samePeriod: same, difference: same && m.score !== null && m.released.score !== null ? r1(m.score - m.released.score) : null, status: m.released.status === "calculated" ? (same ? "same_period_revision" : "different_period") : "not_available", reason: m.released.reason };
  });

  const context: CaseContextElection[] = [...elections].sort((a, b) => countryOf(a).localeCompare(countryOf(b)) || a.date.localeCompare(b.date)).filter((e) => RESEARCH_CASE.contextCountries.includes(countryOf(e))).map((e) => {
    const t = turnoutForDisplay(e);
    const all = runComparativeResearch({ countries: [countryOf(e)], view: "last_complete_year" }, elections, points, links);
    return {
      country: countryOf(e), electionId: e.electionId, date: e.date, turnout: t.value, turnoutComputed: t.computed,
      observations: RESEARCH_CASE.indicators.map((indicator) => { const o = all.allViewObservations.find((x) => x.electionId === e.electionId && x.indicator === indicator && x.view === "last_complete_year"); return { indicator, period: o?.period ?? null, value: o?.value ?? null, status: o?.status ?? "missing" }; }),
      models: MODEL_IDS.map((id) => { const m = model(e.electionId, id); return { modelId: id, year: m?.inputYear ?? Number(electionPeriods(e.date).lastComplete), score: m?.score ?? null }; }),
      reason: { en: "One admitted election, so there is no change between elections. Shown as context only.", zh: "只有一届已准入选举，因此没有选举之间的变化。仅作背景。" },
    };
  });

  const comparability: CaseComparability[] = [...RESEARCH_CASE.countries, ...RESEARCH_CASE.contextCountries].map((country) => {
    const own = elections.filter((e) => countryOf(e) === country).sort((a, b) => a.date.localeCompare(b.date));
    const t = own.map((e) => turnoutForDisplay(e).computed ? "computed from official counts" : "published");
    return { country, elections: own.length, family: [...new Set(own.map((e) => e.system.family))].join(" | "), allocation: [...new Set(own.map((e) => e.system.allocationMethod))], turnoutBasis: [...new Set(t)].join(" | "), seatScope: [...new Set(own.map(seatMeasureScope))], note: NOTE[country] };
  });

  const withheld = pairs.flatMap((p) => p.indicators.flatMap((i) => i.primary.status === "withheld" ? [{ country: p.country, fromElection: p.fromElection, toElection: p.toElection, indicator: i.indicator, reason: i.primary.reason }] : []));
  const modelGaps = pairs.flatMap((p) => p.models.filter((m) => m.status === "unavailable").map((m) => ({ country: p.country, fromElection: p.fromElection, toElection: p.toElection, modelId: m.modelId, reason: m.reason })));
  return { protocol: RESEARCH_CASE, elections: scoped, primary, sensitivity, pairs, countries, direction, vintage, modelVintage, context, comparability, missing: { withheld, modelGaps, noVerifiedIdentity: pairs.filter((p) => p.lists.verifiedShareMovement === null).map((p) => `${p.fromElection} → ${p.toElection}`) } };
}
export type ResearchCaseResult = ReturnType<typeof runResearchCase>;

const COUNTRY: Record<string, Text> = { germany: { en: "Germany", zh: "德国" }, czechia: { en: "Czechia", zh: "捷克" }, poland: { en: "Poland", zh: "波兰" }, slovakia: { en: "Slovakia", zh: "斯洛伐克" }, hungary: { en: "Hungary", zh: "匈牙利" } };
export const CASE_INDICATOR: Record<ElectionMacroIndicator, Text> = { hicp_inflation: { en: "HICP inflation", zh: "HICP 通胀" }, real_gdp_growth: { en: "real GDP growth", zh: "实际 GDP 增长" }, unemployment_rate: { en: "unemployment", zh: "失业率" }, fiscal_balance_gdp: { en: "government balance", zh: "政府收支差额" }, government_debt_gdp: { en: "government debt", zh: "政府债务" } };
const s = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`;

/** Sentences computed from the result. Each reports a count or size and never a cause. */
export function researchCaseFindings(r: ResearchCaseResult): Text[] {
  const t = r.pairs.flatMap((p) => p.turnout.change === null ? [] : [{ p, v: p.turnout.change }]);
  const rose = t.filter((x) => x.v > 0).length, fell = t.filter((x) => x.v < 0).length;
  const lo = t.reduce((a, b) => (b.v < a.v ? b : a)), hi = t.reduce((a, b) => (b.v > a.v ? b : a));
  const span = (x: typeof lo, l: keyof Text) => `${COUNTRY[x.p.country][l]} ${x.p.fromDate.slice(0, 4)}–${x.p.toDate.slice(0, 4)}`;
  const out: Text[] = [{ en: `Turnout rose in ${rose} and fell in ${fell} of ${t.length} pairs, from ${s(r6(lo.v))} points (${span(lo, "en")}) to ${s(r6(hi.v))} points (${span(hi, "en")}).`, zh: `${t.length} 组中投票率上升 ${rose} 组、下降 ${fell} 组，范围从 ${s(r6(lo.v))} 个百分点（${span(lo, "zh")}）到 ${s(r6(hi.v))} 个百分点（${span(hi, "zh")}）。` }];
  for (const d of r.direction.filter((x) => x.pairs > 0)) {
    const loo = d.withoutCountry.map((w) => `${w.same}/${w.opposite}`);
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    out.push({ en: `${CASE_INDICATOR[d.indicator].en}, last complete year: in ${n(d.pairs, "pair", "pairs")} the change moved with turnout ${n(d.same, "time", "times")} and against it ${n(d.opposite, "time", "times")}. Leaving out ${RESEARCH_CASE.countries.map((c) => COUNTRY[c].en).join(", ")} in turn gives ${loo.join(", ")}.`, zh: `${CASE_INDICATOR[d.indicator].zh}（最后完整年度）：${d.pairs} 组中与投票率同向 ${d.same} 次、反向 ${d.opposite} 次。依次去掉${RESEARCH_CASE.countries.map((c) => COUNTRY[c].zh).join("、")}后分别为 ${loo.join("、")}。` });
  }
  const signs = r.pairs.flatMap((p) => p.indicators.filter((i) => i.signAgreement !== "not_comparable")), differs = signs.filter((i) => i.signAgreement === "differs");
  out.push({ en: `Switching to the election's own calendar year changes the sign of ${differs.length} of ${signs.length} indicator changes that both views can calculate.`, zh: `改用选举本身所在日历年度后，两个视图都能计算的 ${signs.length} 个指标变化中有 ${differs.length} 个方向改变。` });
  const coef = r.countries.flatMap((c) => c.indicators.filter((i) => i.pearson !== null).map((i) => ({ c, i })));
  for (const { c, i } of coef) out.push({ en: `${COUNTRY[c.country].en}, ${CASE_INDICATOR[i.indicator].en} and turnout change: Pearson ${i.pearson}, Spearman ${i.spearman ?? "not defined"} on ${i.n} pairs${i.leaveOneOut ? `; dropping any one pair gives ${i.leaveOneOut.min} to ${i.leaveOneOut.max}` : ""}.`, zh: `${COUNTRY[c.country].zh}，${CASE_INDICATOR[i.indicator].zh}与投票率变化：Pearson ${i.pearson}，Spearman ${i.spearman ?? "无定义"}，共 ${i.n} 组${i.leaveOneOut ? `；去掉任意一组后为 ${i.leaveOneOut.min} 至 ${i.leaveOneOut.max}` : ""}。` });
  const rev = r.modelVintage.filter((m) => m.status === "same_period_revision");
  if (rev.length) out.push({ en: `Fiscal pressure on released figures against current figures for the same year: ${rev.map((m) => `${COUNTRY[m.country].en} ${m.releasedPeriod} ${m.releasedScore} → ${m.currentScore} (${s(m.difference!)})`).join("; ")}.`, zh: `同一年度的财政压力，已发布数字对比当前数字：${rev.map((m) => `${COUNTRY[m.country].zh} ${m.releasedPeriod} ${m.releasedScore} → ${m.currentScore}（${s(m.difference!)}）`).join("；")}。` });
  const models = r.pairs.flatMap((p) => p.models.filter((m) => m.status === "calculated").map((m) => ({ p, m })));
  out.push(models.length
    ? { en: `Model scores exist at both ends of ${new Set(models.map((x) => x.p.fromElection)).size} pair only: ${models.map(({ p, m }) => `${COUNTRY[p.country].en} ${m.fromYear}→${m.toYear} ${m.modelId === "fiscal_pressure" ? "fiscal" : "household"} ${m.fromScore} → ${m.toScore} (${s(m.change!)})`).join("; ")}.`, zh: `只有 ${new Set(models.map((x) => x.p.fromElection)).size} 组两端都有模型分数：${models.map(({ p, m }) => `${COUNTRY[p.country].zh} ${m.fromYear}→${m.toYear} ${m.modelId === "fiscal_pressure" ? "财政" : "居民"} ${m.fromScore} → ${m.toScore}（${s(m.change!)}）`).join("；")}。` }
    : { en: "No pair has model scores at both ends.", zh: "没有任何一组两端都有模型分数。" });
  return out;
}

/** Everything the result rests on, in a fixed order, so the same data always give the same bytes and digest. */
export function researchCaseEvidence(r: ResearchCaseResult) {
  return {
    schema_version: RESEARCH_CASE.methodVersion, case_id: RESEARCH_CASE.id, descriptive_only: true,
    protocol: { question: RESEARCH_CASE.question, countries: RESEARCH_CASE.countries, context_countries: RESEARCH_CASE.contextCountries, indicators: RESEARCH_CASE.indicators, primary_view: RESEARCH_CASE.primaryView, sensitivity_view: RESEARCH_CASE.sensitivityView, outcomes: RESEARCH_CASE.outcomes, models: RESEARCH_CASE.models, rules: RESEARCH_CASE_PROTOCOL.map((x) => x.en), limits: RESEARCH_CASE_LIMITS.map((x) => x.en), min_pairs_for_coefficient: MIN_PAIRS_FOR_COEFFICIENT },
    elections: r.elections.map((e) => ({ election_id: e.electionId, country: countryOf(e), date: e.date, published_turnout: e.publishedTurnout, turnout_computed: turnoutForDisplay(e).computed, seat_scope: seatMeasureScope(e), allocation_method: e.system.allocationMethod, result_vintage: e.resultVintage, sources: e.sources.map((x) => ({ id: x.id, institution: x.institution ?? null, url: x.url, sha256: x.sha256 ?? null, retrieved_at: x.retrievedAt ?? null })) })),
    observations: r.primary.allViewObservations,
    pairs: r.pairs, countries: r.countries, direction: r.direction, vintage: r.vintage, model_vintage: r.modelVintage, context: r.context, comparability: r.comparability, missing: r.missing,
    findings: researchCaseFindings(r),
  };
}
export async function researchCaseDigest(evidence: ReturnType<typeof researchCaseEvidence>) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(evidence)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const HEADER = ["record_type", "country", "election_id", "comparison_election_id", "indicator_or_model", "view", "period", "comparison_period", "value", "comparison_value", "difference", "unit", "status", "reason", "note"];
/** One flat table of the case. value is the later or released figure and comparison_value the earlier or current one, as each note says. */
export function researchCaseCsv(r: ResearchCaseResult): string {
  const cell = (v: unknown) => { const x = String(v ?? ""); return `"${(typeof v === "string" && /^[=+\-@\t\r]/.test(x) ? `'${x}` : x).replaceAll('"', '""')}"`; };
  const rows: unknown[][] = [];
  for (const p of r.pairs) {
    rows.push(["turnout_change", p.country, p.toElection, p.fromElection, "turnout", "", p.toDate, p.fromDate, p.turnout.toTurnout, p.turnout.fromTurnout, p.turnout.change, "percentage points", p.turnout.status, p.turnout.reason, p.turnout.basis]);
    rows.push(["verified_list_movement", p.country, p.toElection, p.fromElection, "verified lists", "", "", "", p.lists.verifiedShareMovement, "", "", "percentage points", p.lists.verifiedShareMovement === null ? "withheld" : "calculated", p.lists.verifiedShareMovement === null ? "no_verified_unit_in_both_elections" : "", `${p.lists.identityBasis}; units ${p.lists.units}; covered share ${p.lists.coveredShareFrom} to ${p.lists.coveredShareTo}`]);
    rows.push(["seat_rules", p.country, p.toElection, p.fromElection, "seat allocation", "", "", "", p.rules.toAllocation, p.rules.fromAllocation, "", "", p.rules.rulesChanged ? "rules_changed" : "rules_unchanged", "", `base seats ${p.rules.fromBaseSeats} to ${p.rules.toBaseSeats}; seat scope ${p.rules.seatScopeFrom} to ${p.rules.seatScopeTo}`]);
    for (const i of p.indicators) for (const v of [i.primary, i.sensitivity]) rows.push(["indicator_change", p.country, p.toElection, p.fromElection, i.indicator, v.view, v.toPeriod, v.fromPeriod, v.toValue, v.fromValue, v.change, v.unit, v.status, v.reason, `${v.view === "election_calendar_year" ? "includes months after polling day; " : ""}sign agreement ${i.signAgreement}; direction with turnout ${v === i.primary ? i.directionWithTurnout ?? "n/a" : "see sensitivity counts"}${v.crossesDataLayer ? "; crosses data layers" : ""}${v.pathObserved !== null ? `; inter-election mean ${v.pathMean} (${v.pathObserved} of ${v.pathExpected} periods)` : ""}`]);
    for (const m of p.models) rows.push(["model_change", p.country, p.toElection, p.fromElection, m.modelId, "last_complete_year", String(m.toYear), String(m.fromYear), m.toScore, m.fromScore, m.change, "index 0-100", m.status, m.reason, "descriptive context; does not measure voting intention"]);
  }
  for (const c of r.countries) for (const i of c.indicators) rows.push(["country_direction", c.country, "", "", i.indicator, "last_complete_year", "", "", i.same, i.opposite, "", "pairs", i.status, "", `n=${i.n}; value counts pairs moving with turnout and comparison_value against it; Pearson ${i.pearson ?? "none"}; Spearman ${i.spearman ?? "none"}; election-year view ${i.sensitivitySame}/${i.sensitivityOpposite} of ${i.sensitivityN}`]);
  for (const d of r.direction) for (const w of d.withoutCountry) rows.push(["direction_without_country", w.country, "", "", d.indicator, "last_complete_year", "", "", w.same, w.opposite, "", "pairs", "count", "", `all countries ${d.same}/${d.opposite} of ${d.pairs}; without ${w.country} ${w.same}/${w.opposite} of ${w.pairs}`]);
  for (const v of r.vintage) rows.push(["released_versus_current", v.country, v.electionId, "", v.indicator, "released_before_election", v.released?.period ?? "", v.lastCompleteYear.period, v.released?.value ?? "", v.lastCompleteYear.value, v.revision, v.released?.unit ?? "", v.released ? "documented" : "not_established", v.reason, `released ${v.released?.publishedOn ?? "not located"}; relation to last complete year ${v.relation}`]);
  for (const m of r.modelVintage) rows.push(["model_released_versus_current", m.country, m.electionId, "", m.modelId, "released_before_election", m.releasedPeriod ?? "", String(m.currentYear), m.releasedScore, m.currentScore, m.difference, "index 0-100", m.status, m.reason, "difference is current minus released, only for the same year"]);
  for (const c of r.context) for (const o of c.observations) rows.push(["context_election", c.country, c.electionId, "", o.indicator, "last_complete_year", o.period, "", o.value, "", "", "", o.status, "single_admitted_election", c.reason.en]);
  return `﻿${[HEADER.join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n")}`;
}
