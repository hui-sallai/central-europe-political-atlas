import type { EvidenceDraft } from "./researchNotebook";
import { toCsv } from "./researchSnapshot";

export const monthlyIndicators = {
  hicp_annual_rate: { en: "HICP annual inflation rate", zh: "HICP 同比通胀率", unit: "RCH_A", label: "% · year-on-year / 同比", dataset: "prc_hicp_minr", semantics: "yoy_rate", adjustment: "NSA", classification: "ECOICOP-2", base: null, parameters: { coicop18: "TOTAL", unit: "RCH_A" } },
  hicp_monthly_index: { en: "HICP monthly index", zh: "HICP 月度指数", unit: "I15", label: "2015 = 100", dataset: "prc_hicp_minr", semantics: "index_level", adjustment: "NSA", classification: "ECOICOP-2", base: "2015=100", parameters: { coicop18: "TOTAL", unit: "I15" } },
  industrial_production_index: { en: "Industrial production index", zh: "工业生产指数", unit: "I21", label: "2021 = 100 · SCA", dataset: "sts_inpr_m", semantics: "index_level", adjustment: "SCA", classification: "NACE-Rev2:B-D", base: "2021=100", parameters: { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I21" } },
  unemployment_rate_monthly: { en: "Monthly unemployment rate", zh: "月度失业率", unit: "PC_ACT", label: "% · active population / 劳动力人口 · SA", dataset: "une_rt_m", semantics: "rate_percent", adjustment: "SA", classification: "age:TOTAL", base: null, parameters: { s_adj: "SA", age: "TOTAL", sex: "T", unit: "PC_ACT" } },
} as const;
export type MonthlySource = { unit: string; dataset: string; url: string; institution: string; definition: string; semantics: string; adjustment: string; classification: string; base: string | null; vintage: string; updated: string; breakStatus: string; eligible: boolean; warning: string };
export type MonthlyRow = [id: string, country: string, indicator: string, period: string, value: number | null, status: string, source: number];
export type MonthlyPayload = { schema: string; sources: MonthlySource[]; rows: MonthlyRow[] };
export type MonthlySession = { countries: string[]; indicator: string; from: string; to: string; mode: string; month: string; issues: string[] };
export function monthNumber(period: string): number { return /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && Number(period.slice(0, 4)) >= 1000 ? Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1 : NaN; }
export function monthPeriod(index: number): string { return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`; }
export function monthlyDefinitionMatches(indicator: string, s: MonthlySource): boolean {
  const expected = monthlyIndicators[indicator as keyof typeof monthlyIndicators];
  if (!expected || s.unit !== expected.unit || s.semantics !== expected.semantics || s.adjustment !== expected.adjustment || s.classification !== expected.classification || s.base !== expected.base || s.dataset !== `Eurostat ${expected.dataset}` || s.institution !== "Eurostat" || !s.eligible) return false;
  if (!["none_recorded", "known_methodological_transition_nonblocking", "known_methodological_transition_back_revised"].includes(s.breakStatus)) return false;
  try { const definition = s.definition.replaceAll('\\"', '"'); if (!definition.startsWith(`${expected.dataset}:`)) return false; const params = JSON.parse(definition.slice(definition.indexOf(":") + 1)); return Object.keys(params).length === Object.keys(expected.parameters).length && Object.entries(expected.parameters).every(([key, value]) => params[key] === value); } catch { return false; }
}
export function monthlyEligible(row: MonthlyRow, payload: MonthlyPayload): boolean { return row[5] === "official" && typeof row[4] === "number" && Number.isFinite(row[4]) && Number.isFinite(monthNumber(row[3])) && monthlyDefinitionMatches(row[2], payload.sources[row[6]]); }
export function restoreMonthlySession(query: URLSearchParams, countries: string[], payload: MonthlyPayload): MonthlySession {
  const periods = payload.rows.filter(r => monthlyEligible(r, payload)).map(r => r[3]).sort();
  const requested = query.get("monthly_countries")?.split(","), selected = requested ? [...new Set(requested)].filter(c => countries.includes(c)).slice(0, 5) : countries.slice(0, 2);
  return { countries: selected, indicator: query.get("monthly_indicator") ?? "hicp_annual_rate", from: query.get("monthly_from") ?? periods[0] ?? "", to: query.get("monthly_to") ?? periods.at(-1) ?? "", mode: query.get("monthly_mode") ?? "common", month: query.get("monthly_month") ?? "", issues: requested && (selected.length !== requested.length || selected.length < 2) ? ["countries"] : [] };
}
export function monthlyValid(s: MonthlySession): boolean { const distance = monthNumber(s.to) - monthNumber(s.from); return !s.issues.length && s.countries.length >= 2 && s.countries.length <= 5 && s.indicator in monthlyIndicators && Number.isFinite(distance) && distance >= 0 && distance < 1200 && ["common", "explicit", "partial"].includes(s.mode); }
export function monthlyRows(s: MonthlySession, payload: MonthlyPayload): MonthlyRow[] { return monthlyValid(s) ? payload.rows.filter(r => s.countries.includes(r[1]) && r[2] === s.indicator && r[3] >= s.from && r[3] <= s.to && monthlyEligible(r, payload)) : []; }
export function monthlyReference(s: MonthlySession, rows: MonthlyRow[]): string | null {
  if (!monthlyValid(s)) return null;
  if (s.mode === "explicit") return Number.isFinite(monthNumber(s.month)) ? s.month : null;
  return [...new Set(rows.map(r => r[3]))].sort().reverse().find(period => s.mode === "partial" || s.countries.every(country => rows.some(r => r[1] === country && r[3] === period))) ?? null;
}
export function monthlyUrl(s: MonthlySession, en: boolean): string {
  const u = new URL(en ? "/en/models/" : "/models/", "https://hy-central-europe-analysis.org");
  u.searchParams.set("tab", "compare"); u.searchParams.set("compare_frequency", "monthly");
  for (const key of ["countries", "indicator", "from", "to", "mode", "month"] as const) { const value = s[key]; u.searchParams.set(`monthly_${key}`, Array.isArray(value) ? value.join(",") : value); }
  return u.href;
}
export function monthlyCsv(rows: MonthlyRow[], payload: MonthlyPayload): string {
  return toCsv(["observation_id", "country", "indicator", "period", "value", "unit", "status", "source", "source_url", "dataset", "vintage", "updated_at", "definition", "adjustment", "schema"], rows.filter(r => monthlyEligible(r, payload)).map(r => { const s = payload.sources[r[6]]; return { observation_id: r[0], country: r[1], indicator: r[2], period: r[3], value: r[4], unit: s.unit, status: r[5], source: s.institution, source_url: s.url, dataset: s.dataset, vintage: s.vintage, updated_at: s.updated, definition: s.definition, adjustment: s.adjustment, schema: payload.schema }; }));
}
export function monthlyEvidence(s: MonthlySession, rows: MonthlyRow[], payload: MonthlyPayload, en: boolean): EvidenceDraft {
  if (!monthlyValid(s) || !rows.length || rows.some(r => !monthlyEligible(r, payload) || !s.countries.includes(r[1]) || r[2] !== s.indicator || r[3] < s.from || r[3] > s.to)) throw new Error("Invalid monthly comparison evidence");
  const sources = [...new Set(rows.map(r => r[6]))].map(i => payload.sources[i]);
  const warnings = { en: ["Configuration, not a frozen data snapshot or a research conclusion. Reopening uses current published revisions.", "Only the first 100 observation references are stored. CSV contains the eligible published observations in the selected period.", "Descriptive monthly comparison only; no causal interpretation or formal model inputs."], "zh-CN": ["保存的是配置，不是冻结数据或研究结论；重开使用当前已发布修订。", "仅保存前100条观测引用；CSV包含所选期间的合格已发布观测。", "仅为描述性月度比较，不作因果解释，不进入正式模型。"] };
  for (const warning of new Set(sources.map(source => source.warning).filter(Boolean))) { warnings.en.push(warning); warnings["zh-CN"].push(warning.includes("2021") ? "波兰工业生产：2021年LEU近似转为KAU，不声称严格单位不变。" : "匈牙利失业率：2023年方法变化，2011–2022年回溯修订，仅限当前修订版。"); }
  return { type: "country_comparison", title: `${en ? "Monthly comparison" : "月度比较"} · ${s.indicator} · ${s.from}–${s.to}`, url: monthlyUrl(s, en), canonical_ids: rows.slice(0, 100).map(r => r[0]), countries: s.countries, periods: [s.from, s.to], unit: sources[0]?.unit, sources: sources.map(source => ({ institution: source.institution, dataset: source.dataset, url: source.url, layer: "published_monthly_descriptive", original_unit: source.unit, normalized_unit: source.unit, updated_at: source.updated })), layer: "published_monthly_descriptive", comparability: "same_indicator_definition_unit_calendar_month", warnings: warnings.en, warning_labels: warnings, metadata: { filters: { ...s }, row_count: rows.length, status: "configuration_not_conclusion; first_100_observation_references", entersModel: false } };
}
