import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { ContextRange } from "@/lib/politicalEconomicContext";
import { workspaceToolLink } from "./workspaceLinks";

type OriginElection = { country: string; id: string; date: string; chamber?: string };

export function PoliticalElectionDataLink({ election, locale, range, frequency = "annual", indicator = "real_gdp_growth" }: {
  election: OriginElection; locale: Locale; range?: ContextRange; frequency?: "annual" | "monthly"; indicator?: string;
}) {
  const year = Number(election.date.slice(0, 4));
  const length = frequency === "annual" ? 4 : 7;
  const from = range ? range.from.slice(0, length) : String(year - 3);
  const to = range ? range.to.slice(0, length) : String(year - 1);
  if (from > to) return null;
  const href = workspaceToolLink("/data/", locale, {
    tab: "compare", compare_countries: election.country, compare_frequency: frequency,
    comparison_indicator: frequency + ":" + indicator, compare_from: from, compare_to: to,
    comparison_mode: "side_by_side", context_election: election.id,
  });
  return <p className="mt-2 text-sm" data-election-data-handoff>
    <Link className="underline" href={href}>{locale === "en" ? "Explore this period in the Data Explorer" : "在数据浏览器查看此期间"}</Link>
    {" · "}{from}–{to}
    {!range && <span className="ml-1">{locale === "en" ? "(three complete years before the election)" : "（选举之前的三个完整年份）"}</span>}
  </p>;
}
