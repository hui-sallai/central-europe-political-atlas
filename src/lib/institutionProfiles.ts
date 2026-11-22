// Presentation contract for the institution comparison (Codex, 2026-11-16), now derived from the canonical registry in
// src/lib/institutionalRegistry.ts so that every country has sourced rules and one correction reaches every view.
// Election-specific counts and electoral rules stay in politicalData and the stored election rule records.
import { countrySources, headOf, institutionCountrySlugs, institutionalCountry, chamberNames, type Bilingual } from "@/lib/institutionalRegistry";

type Text = readonly [string, string];
type Rule = {
  source: string; basis: string; selection: Text; term: Text; formation: Text; confidence: Text;
};
const pair = (b: Bilingual | null | undefined): Text => [b?.en ?? "", b?.zh ?? ""];
const shortName = (s: string) => s.replace(/\s*[（(][^）)]*[）)]\s*$/, "");

export const chambers: Record<string, Text> = Object.fromEntries(institutionCountrySlugs.map((slug) => [slug, [chamberNames(slug, true) ?? "", chamberNames(slug, false) ?? ""] as Text]));
export const parliamentaryDirectory = "https://www.europarl.europa.eu/relnatparl/en/home/national-parliaments";

export const constitutionalRules: Partial<Record<string, Rule>> = Object.fromEntries(institutionCountrySlugs.flatMap((slug) => {
  const c = institutionalCountry(slug);
  if (!c) return [];
  const f = c.fields, formation = f.head_of_government_appointment, steps = formation.steps ?? [];
  if (formation.status !== "verified" || !steps.length) return [];
  const articles = [f.head_of_state_selection.articles, formation.articles, f.no_confidence.articles].filter(Boolean).join("; ");
  const source = countrySources(slug, c.constitution.source_ids)[0]?.url ?? "";
  return [[slug, {
    source, basis: `${c.constitution.official_name} · ${articles}`,
    selection: pair(f.head_of_state_selection.label), term: pair(f.legislative_term.label),
    formation: [steps.map((s) => s.en).join(" → "), steps.map((s) => s.zh).join(" → ")],
    confidence: pair(f.no_confidence.label),
  } satisfies Rule]];
}));

// Official source links with their titles (replaces the former EU overview links).
export function institutionalSourceLinks(slug: string) {
  return countrySources(slug).map((s) => ({ url: s.url, label: [`${s.title} — ${s.publisher}`, `${s.title} — ${s.publisher}`] as Text }));
}
export function institutionalSources(slug: string) { return institutionalSourceLinks(slug).map((s) => s.url); }
export function governmentSystem(slug: string): Text { return pair(institutionalCountry(slug)?.fields.government_system.label); }
export function executiveOffices(slug: string): Text {
  const hs = headOf(slug, "head_of_state"), hg = headOf(slug, "head_of_government");
  return [`${shortName(hs?.name.en ?? "")} · ${shortName(hg?.name.en ?? "")}`, `${shortName(hs?.name.zh ?? "")} · ${shortName(hg?.name.zh ?? "")}`];
}
// Fields this record still marks as pending, as short bilingual reasons.
export function pendingInstitutionalFields(slug: string): Text[] {
  const country = institutionalCountry(slug);
  const formerAct = country?.changes.find(change => change.change_id === "hu-1989-electoral-act");
  return (country?.pending ?? []).map(p => {
    if (p.field === "changes_before_2012" && formerAct?.amendments?.length) {
      return [
        "The institutional timeline identifies the documented amendments to the 1989 electoral act. Other revisions to the electoral act, its calculation annexes and the earlier Constitution still have gaps in coverage.",
        "制度时间线列出了已核实的 1989 年选举法修正记录。该法其他修订、计算附件以及原宪法的修订仍有资料缺口。",
      ];
    }
    return pair(p.reason);
  });
}
export function institutionalCheckedOn(slug: string) { return institutionalCountry(slug)?.verified_on ?? null; }
