import { localeNumber, type Locale } from "@/i18n/config";
import type { continuityEntities, ContinuityRow } from "@/lib/politicalContinuity";

// Static presentation of politicalContinuity. No value here is computed from a label, and a member of a coalition never
// shows a vote or seat figure of its own.
export function PoliticalContinuityPanel({ data, locale, country = "czechia" }: { data: ReturnType<typeof continuityEntities>; locale: Locale; country?: "czechia" | "poland" }) {
  const poland = country === "poland";
  const en = locale === "en";
  const n = (v: number | null, digits = 0) => (v === null ? "—" : localeNumber(v, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const delta = (v: number | null, digits = 0) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v), digits)}`);
  const kinds: Record<string, string> = en ? { party: "Registered party", movement: "Registered movement", coalition: "Coalition (list-level unit, not a legal party)" } : { party: "注册政党", movement: "注册政治运动", coalition: "联盟（名单层面的单位，并非法律意义上的政党）" };
  const status = (row: ContinuityRow) => {
    if (row.status === "own_list") return en ? "Own list" : "独立名单";
    if (row.status === "coalition_list") return en ? "Coalition list" : "联盟名单";
    if (row.status === "coalition_member") return en ? `Coalition member: ${row.coalition!.label}. List total ${n(row.coalition!.share, 2)}%, ${n(row.coalition!.seats)} seats, not attributed to members` : `联盟成员：${row.coalition!.label}。名单合计 ${n(row.coalition!.share, 2)}%、${n(row.coalition!.seats)} 席，不归属于各成员`;
    return en ? "No list" : "无名单";
  };
  const note = (row: ContinuityRow) => {
    if (row.status === "coalition_member") return en ? "Not comparable: no party figure exists for this election" : "不可比：该届没有政党单独数字";
    if (row.status === "no_list") return poland ? (en ? "No list of its own. Missing, not zero; it may have stood in a coalition, whose members are not stated" : "没有自己的名单。缺失不等于零；可能参加了联盟，但来源未载明联盟成员") : (en ? "Missing, not zero" : "缺失，不等于零");
    if (!row.change) return en ? "First list in this series" : "该序列的首个名单";
    const parts = [en ? `Change since ${row.change.fromYear}` : `相对 ${row.change.fromYear} 年的变化`];
    if (row.change.acrossMissingList) parts.push(en ? "no list of its own in between" : "其间没有自己的名单");
    if (row.change.acrossCoalitionPeriod) parts.push(en ? "the party ran in a coalition in between" : "其间该党参加了联盟");
    if (row.change.rulesChanged) parts.push(en ? "seat rules changed, so seats do not show voter support alone" : "席位规则已变，席位变化不能单独说明选民支持");
    return parts.join(en ? "; " : "；");
  };
  return <section className="mt-10" data-czech-continuity>
    <h2 className="text-2xl font-semibold">{en ? "List identity and continuity" : "名单身份与连续性"}</h2>
    <p className="mt-2 text-sm">{poland ? (en ? "Each list belongs to an election committee, which exists for one election. A party committee's name contains the party's registered name (Electoral Code Art. 92), and a series needs the same party register number (EwP) printed in PKW communiqués, which are financial notices rather than the court register. The sources do not state a coalition's members, so a party in a coalition has no figure for that election, and a coalition committee's votes and seats stay with the coalition." : "每个名单属于只存在于一届选举的选举委员会。政党委员会的名称包含该党登记的名称（《选举法典》第 92 条），政党序列须有国家选举委员会公告（财务公告，并非法院登记册）所列的相同政党登记号（EwP）。来源未载明联盟的成员，因此参加联盟的政党在该届没有数字，联盟委员会的票数和席位只归联盟。") : en ? "Each list belongs to one election. A party series exists only where ČSÚ's proposer code is the same and the Interior Ministry's register was reviewed; names link nothing. Coalition votes and seats stay with the coalition." : "每个名单只属于一届选举。只有当捷克统计局的提名方代码相同且已核查内政部登记册时，才建立政党序列；名称不作为关联依据。联盟的票数和席位只归联盟。"}</p>
    <div className="mt-4 space-y-5">{data.entities.map((entity) => <div key={entity.id} data-continuity-entity={entity.label}>
      <h3 className="font-semibold">{entity.label} <span className="text-sm font-normal">· {kinds[entity.kind] ?? entity.kind}</span>{entity.registerUrl && <> · <a className="text-sm font-normal underline" href={entity.registerUrl}>{en ? "Register entry" : "登记条目"}</a></>}</h3>
      {entity.evidenceLinks?.length ? <p className="mt-1 text-sm" data-identity-evidence>{en ? "Register number (EwP) as printed by PKW, not a register extract:" : "国家选举委员会公布的政党登记号（EwP），并非登记册摘录："} {entity.evidenceLinks.map((e, i) => <span key={e.url}>{i ? " · " : ""}<a className="underline" href={e.url} title={e.citation}>{en ? `report for ${e.reportYear}` : `${e.reportYear} 年报告`}</a></span>)}</p> : null}
      <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col">{en ? "Election" : "选举"}</th><th scope="col">{en ? "Participation" : "参选形式"}</th><th scope="col">{en ? "Vote share" : "得票率"}</th><th scope="col">{en ? "Seats" : "席位"}</th><th scope="col">{en ? "Share change (points)" : "得票率变化（百分点）"}</th><th scope="col">{en ? "Seat change" : "席位变化"}</th><th scope="col">{en ? "Note" : "说明"}</th></tr></thead>
        <tbody>{entity.rows.map((row) => <tr key={row.electionId} className="border-t border-[var(--line)]" data-continuity-status={row.status}><td className="py-1 pr-3">{row.year}</td><td className="py-1 pr-3">{status(row)}</td><td className="py-1 pr-3">{row.share === null ? "—" : `${n(row.share, 2)}%`}</td><td className="py-1 pr-3">{n(row.seats)}</td><td className="py-1 pr-3">{delta(row.change?.shareChange ?? null, 2)}</td><td className="py-1 pr-3">{delta(row.change?.seatsChange ?? null)}</td><td className="py-1">{note(row)}</td></tr>)}</tbody></table></div>
    </div>)}</div>
    <details className="mt-5 text-sm" data-continuity-unresolved><summary>{en ? `Unresolved relationships (${data.unresolved.length})` : `未确定的关系（${data.unresolved.length}）`}</summary>
      <p className="mt-2">{poland ? (en ? "These committees carry the same printed name in two elections, but no party register number was reviewed for them. A shared name is not evidence of one legal party, and voters' committees are not parties." : "这些委员会在两届选举中使用相同的名称，但未核查其政党登记号。名称相同并不证明是同一法律主体，选民委员会也不是政党。") : en ? "These pairs share a ČSÚ code, but no legal register was reviewed for them. They are not treated as one party, and where the name changed a rename and a reused code cannot be told apart." : "这些名单共用捷克统计局代码，但尚未核查其法定登记册，因此不视为同一政党；名称发生变化时，无法区分是更名还是代码被重新使用。"}</p>
      <ul className="mt-2 list-disc pl-5">{data.unresolved.map((u) => <li key={`${u.fromYear}-${u.fromLabel}-${u.toYear}`} lang={poland ? "pl" : "cs"}>{u.fromYear} {u.fromLabel} → {u.toYear} {u.toLabel}{u.nameChanged ? (en ? " (name differs)" : "（名称不同）") : ""}</li>)}</ul>
    </details>
  </section>;
}
