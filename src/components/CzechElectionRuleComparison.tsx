import Link from "next/link";
import { localizedRoute, type Locale } from "@/i18n/config";
import { czechAllocationLabel } from "@/lib/czechElectionRules";
import { electionInstitutionalContext, institutionalPeriods, institutionalTimeline } from "@/lib/institutionalRegistry";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";

const thresholdNames: Record<string, [string, string]> = {
  "political party or movement": ["Single party or movement", "单一政党或运动"],
  "coalition of two parties or movements": ["Two-member coalition", "两个成员的联盟"],
  "coalition of three parties or movements": ["Three-member coalition", "三个成员的联盟"],
  "coalition of four or more parties or movements": ["Coalition of four or more", "四个及以上成员的联盟"],
  "coalition of three or more parties or movements": ["Coalition of three or more", "三个及以上成员的联盟"],
};

export function CzechElectionRuleComparison({ a, b, locale }: { a: PoliticalElectionView; b: PoliticalElectionView; locale: Locale }) {
  const en = locale === "en";
  const reform = institutionalTimeline("czechia").find(change => change.change_id === "cz-2021-chamber-electoral-rules");
  const periods = institutionalPeriods("czechia");
  return <section className="my-4 space-y-3" data-czech-rule-comparison>
    <h4 className="font-semibold">{en ? "How list votes became seats" : "名单票如何换算为席位"}</h4>
    <p className="text-sm">{en ? "The thresholds are percentages of valid votes nationwide. A coalition enters the allocation as one list." : "门槛以全国有效票为分母。选举联盟以一份名单参加席位分配。"}</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">{[a,b].map(election => {
      const link = electionInstitutionalContext(election.electionId);
      const period = periods.find(item => item.period_id === link?.institutional_period_id);
      const rules = election.national?.rules;
      const sources = election.sources.filter(source => rules?.sourceIds.includes(source.id));
      return <div key={election.electionId} className="min-w-0 space-y-2 border-t border-[var(--line)] pt-2 text-sm" data-rule-election={election.electionId}>
        <h5 className="font-semibold">{election.year} · {en ? "Chamber of Deputies" : "众议院"}</h5>
        <p>{en ? "Polling dates" : "投票日期"} · {election.date}{election.national?.dateEnd && ` – ${election.national.dateEnd}`}</p>
        <p>{czechAllocationLabel(election.system.allocationMethod, locale)}</p>
        <dl aria-label={en ? "National vote thresholds" : "全国得票门槛"}>{rules?.thresholds?.map(threshold => <div key={threshold.appliesTo} className="flex items-baseline justify-between gap-2">
          <dt>{thresholdNames[threshold.appliesTo]?.[en ? 0 : 1] ?? threshold.appliesTo}</dt>
          <dd className="metric-number">{threshold.percent === null ? "—" : `${threshold.percent}%`}</dd>
        </div>)}</dl>
        <details><summary className="cursor-pointer font-semibold">{en ? "Legal provisions, institutional period and sources" : "法律条款、制度时期与来源"}</summary>
          <p className="my-2">{en ? "Institutional period" : "制度时期"} · {period ? period.from + (period.to_exclusive ? (en ? " until (exclusive) " : " 至（不含）") + period.to_exclusive : (en ? " onward" : " 起")) : "—"}</p>
          {rules?.totalSeatsDefinition && <p>{rules.totalSeatsDefinition[locale]}</p>}
          {rules?.nationalAllocation && <p>{en ? rules.nationalAllocation :
            rules.nationalAllocation.includes("14 regions") && rules.nationalAllocation.includes("largest remainders (§ 48)")
              ? "第 48 条按有效票在 14 个选区之间分配议院席位。以全国有效票数除以 200 并取整得到配额，按各区所得整数份配额先分席，再按最大余数分配剩余的选区名额。"
              : rules.nationalAllocation}</p>}
          {rules?.districtAllocation && <p>{en ? rules.districtAllocation :
            <>{czechAllocationLabel(election.system.allocationMethod, locale)}{rules.districtAllocation.includes("(§ 50)") ? "（地区一级见第 50 条）" : ""}{rules.nationalAllocation?.includes("(§ 51)") ? "（全国一级见第 51 条）" : ""}</>}</p>}
          <ul className="my-2 list-disc pl-4">{rules?.thresholds?.map(threshold => <li key={threshold.appliesTo}>{threshold.description[locale]}</li>)}</ul>
          {sources.map(source => <a className="block break-words underline" key={source.id} href={source.url} data-rule-source={source.id}>{source.title}</a>)}
        </details>
      </div>;
    })}</div>
    {reform && a.system.allocationMethod !== b.system.allocationMethod &&
      <p className="text-sm">{reform.effective
        ? (en ? "Reform effective date" : "改革生效日期") + " · " + reform.effective
        : en ? "The cited legal versions establish the rules on each polling date. The amendment’s exact effective date is unverified." : "所引法律版本可确认各届投票日适用的规则。修正法的确切生效日期仍待核实。"}
        {" "}<Link className="underline" href={localizedRoute("/countries/czechia/",locale) + "#" + reform.change_id}>{en ? "Institutional change record" : "制度变更记录"}</Link>
      </p>}
  </section>;
}
