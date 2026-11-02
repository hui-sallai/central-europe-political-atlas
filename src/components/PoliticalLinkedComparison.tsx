"use client";
import { localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import type { PoliticalIdentityLink } from "@/lib/politicalIdentity";
import { linkedUnitComparison } from "@/lib/politicalContinuity";

// Election-to-election comparison for countries identified through reviewed register links, not an authority's series.
export function PoliticalLinkedComparison({ elections, links, a, b, locale }: { elections: PoliticalElectionView[]; links: PoliticalIdentityLink[]; a: PoliticalElectionView; b: PoliticalElectionView; locale: Locale }) {
  const en = locale === "en", c = linkedUnitComparison(elections, links, a, b);
  const n = (v: number | null, digits = 0) => (v === null ? "—" : localeNumber(v, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const delta = (v: number | null, digits = 0) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v), digits)}`);
  return <div className="mt-4 space-y-3" data-linked-comparison>
    <p className="text-sm">{en ? `Later minus earlier (${c.b.year} − ${c.a.year}). Only units joined by a verified link appear: a party's own list in both elections, or a coalition with the same official members. A party in a coalition in either election has no comparable figure here.` : `后一届减前一届（${c.b.year} − ${c.a.year}）。只显示有已核实关联的单位：两届都有自己名单的政党，或官方成员相同的联盟。在任一届参加联盟的政党在此没有可比数字。`}</p>
    {c.rows.length === 0 ? <p className="text-sm" role="status">{en ? "No verified unit stood in both of these elections." : "这两届选举没有共同的已核实单位。"}</p> : <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Verified comparison (scrollable)" : "已核实比较（可横向滚动）"}>
      <table className="w-full text-left text-sm"><thead><tr>{[en ? "Unit" : "单位", `${c.a.year} (%)`, `${c.b.year} (%)`, en ? "Change (points)" : "变化（百分点）", en ? `${c.a.year} seats` : `${c.a.year} 席位`, en ? `${c.b.year} seats` : `${c.b.year} 席位`, en ? "Seat change" : "席位变化"].map((t) => <th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead>
        <tbody>{c.rows.map((r) => <tr key={r.id} className="border-t border-[var(--line)]" data-linked-unit={r.kind}><th scope="row" className="p-2 font-normal"><span lang="cs">{r.label}</span>{r.kind === "coalition" ? <span className="block text-xs">{en ? "Coalition, not a legal party" : "联盟，并非法律意义上的政党"}</span> : null}</th><td className="metric-number p-2">{n(r.a.publishedVoteShare, 2)}</td><td className="metric-number p-2">{n(r.b.publishedVoteShare, 2)}</td><td className="metric-number p-2">{delta(r.shareChange, 2)}</td><td className="metric-number p-2">{n(r.a.seats)}</td><td className="metric-number p-2">{n(r.b.seats)}</td><td className="metric-number p-2">{delta(r.seatsChange)}</td></tr>)}</tbody></table>
    </div>}
    <p className="text-sm" role="note">{c.rulesChanged ? (en ? "Thresholds or the seat allocation method changed between these elections, so seat changes do not show voter support alone." : "两届之间门槛或席位分配方法发生变化，因此席位变化不能单独说明选民支持。") : (en ? "Seat changes reflect the allocation as well as votes; they are not voter support." : "席位变化同时反映席位分配与得票，并不等于选民支持。")}</p>
  </div>;
}
