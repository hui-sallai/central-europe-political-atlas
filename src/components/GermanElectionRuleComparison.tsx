import Link from "next/link";
import { localeNumber, localizedRoute, type Locale } from "@/i18n/config";
import { countrySources, institutionalTimeline } from "@/lib/institutionalRegistry";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";

export function GermanElectionRuleComparison({ a, b, locale }: {
  a: PoliticalElectionView; b: PoliticalElectionView; locale: Locale;
}) {
  const pair = [a, b];
  const earlier = pair.find(e => e.national?.systemId === "es-de-bt-1998");
  const later = pair.find(e => e.national?.systemId === "es-de-bt-2002");
  if (!earlier || !later) return null;

  const en = locale === "en";
  const language = en ? "en" : "zh";
  const format = (v: number | null | undefined) => localeNumber(v, locale);
  const reform = institutionalTimeline("germany").find(c => c.change_id === "de-1996-bwg-thirteenth-amendment");
  const laterOverhang = later.totalSeats !== null && later.system.baseSeats !== null
    ? later.totalSeats - later.system.baseSeats : null;
  const rows = [
    { label: en ? "Statutory seats" : "法定基础席位", value: (e: PoliticalElectionView) => format(e.system.baseSeats) },
    { label: en ? "Overhang seats included in the total" : "已计入总数的超额席位", value: (e: PoliticalElectionView) =>
      e === earlier ? format(e.national?.germanAllocation?.overhangSeats) : format(laterOverhang) + (laterOverhang === null ? "" : en ? " (derived)" : "（推算）") },
    { label: en ? "Final Bundestag seats" : "联邦议院最终席位", value: (e: PoliticalElectionView) => format(e.totalSeats) },
    { label: en ? "Proportional allocation method" : "比例席位分配法", value: (e: PoliticalElectionView) => e.system.allocationMethod },
  ];

  return <section className="my-4 min-w-0 space-y-2" data-german-rule-comparison>
    <table className="w-full text-left text-sm">
      <caption className="mb-2 text-left font-semibold">{en ? "Bundestag size and allocation rules" : "联邦议院规模与分配规则"}</caption>
      <thead><tr><th scope="col">{en ? "Measure" : "指标"}</th>
        {pair.map(e => <th key={e.electionId} scope="col" className="px-1 text-right"><time dateTime={e.date}>{e.date}</time></th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.label} className="border-t border-[var(--line)]">
        <th scope="row" className="py-1 font-normal">{row.label}</th>
        {pair.map(e => <td key={e.electionId} className="px-1 text-right tabular-nums">{row.value(e)}</td>)}
      </tr>)}</tbody>
    </table>
    <p className="text-sm">{en
      ? "Read each party’s seats against the size of that Bundestag. Changes in absolute seat counts alone cannot measure changes in voter support."
      : "解读各党席位时须参照当届联邦议院规模。仅凭席位数的变化无法衡量选民支持的变化。"}</p>
    {reform && <div className="space-y-1 text-sm" data-german-constituency-reform>
      <h4 className="font-semibold">{en ? "Constituency boundaries and chamber size" : "选区划分与议院规模"}</h4>
      {reform.previous && <p>{reform.previous[language]}</p>}
      <p>{reform.new[language]}</p>
    </div>}
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold">{en ? "Thresholds, legal basis and sources" : "席位门槛、法律依据及来源"}</summary>
      {reform && <div className="my-2 space-y-1">
        <p>{reform.title[language]} · <span lang="de">{reform.legal_basis}</span></p>
        <p>{en ? "Adopted" : "通过日期"} · {reform.adopted ?? "—"} · {en ? "Promulgated" : "公布日期"} · {reform.promulgated ?? "—"}</p>
        {reform.effective_note && <p>{reform.effective_note[language]}</p>}
        <Link className="underline" href={localizedRoute("/countries/germany/", locale) + "#" + reform.change_id}>
          {en ? "Institutional change record" : "制度变更记录"}</Link>
        {countrySources("germany", reform.source_ids).map(s => <a key={s.source_id} className="block break-words underline" href={s.url}>{s.title}</a>)}
      </div>}
      {laterOverhang !== null && <p>{en
        ? `For ${later.year}, the overhang count is the final chamber minus the statutory base: ${format(later.totalSeats)} − ${format(later.system.baseSeats)} = ${format(laterOverhang)}.`
        : `${later.year} 年的超额席位数由最终席位减去法定基础席位得出：${format(later.totalSeats)} − ${format(later.system.baseSeats)} ＝ ${format(laterOverhang)}。`}</p>}
      <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">{pair.map(e => <div key={e.electionId} className="min-w-0" data-german-rule-election={e.electionId}>
        <h5 className="font-semibold">{e.year} · {en ? "Electoral thresholds" : "选举门槛"}</h5>
        {e.national?.rules.thresholds?.length ? <ul className="list-disc pl-4">
          {e.national.rules.thresholds.map(t => <li key={t.appliesTo}>{t.description[locale]}</li>)}
        </ul> : <p>{en ? "The admitted rule record gives no threshold for this election." : "本届已收录的选举规则记录未列出门槛。"}</p>}
        {e.sources.filter(s => e.national?.rules.sourceIds.includes(s.id) || s.id === "src-de-bwl-election-" + e.year).map(s =>
          <a key={s.id} className="block break-words underline" href={s.url} data-german-rule-source={s.id}>{s.title}</a>)}
      </div>)}</div>
    </details>
  </section>;
}
