import Link from "next/link";
import {localizedRoute, type Locale} from "@/i18n/config";
import type {DirectoryElection, ElectionDirectoryCountry} from "@/lib/politicalElectionDirectory.server";

export function electionHref(slug: string, locale: Locale, electionId?: string) {
  const route = localizedRoute('/politics/' + slug + '/', locale);
  return electionId ? route + '?' + new URLSearchParams({election:electionId}) : route;
}

export function RegistryDate({date, awaitingConfirmation, en}: {date:string; awaitingConfirmation?:boolean; en:boolean}) {
  return <><time dateTime={date}>{date}</time>{awaitingConfirmation && <small> · {en ? "Registry date awaiting confirmation" : "登记日期待核实"}</small>}</>;
}

export function ElectionDirectoryDetails({country, locale}: {country: ElectionDirectoryCountry; locale: Locale}) {
  const en = locale === "en";
  const resultLabels = {
    votes: en ? "votes" : "票数", seats: en ? "seats" : "席位",
    turnout: en ? "turnout" : "投票率", points: en ? "ranking points" : "排序积分",
  };
  return <details className="mt-2 text-sm">
    <summary className="cursor-pointer font-semibold">{en ? "Electoral rules and source coverage" : "选举规则与来源覆盖"}</summary>
    <p className="mt-2">{en ? "Recorded in this archive" : "历届收录指标"} · {country.availableResults.map(key => resultLabels[key]).join(en ? ", " : "、")}</p>
    <p>{en ? "Elections linked to their rules" : "已关联当届选举规则"} · {country.ruleRecords}/{country.history.length}
      {" · "}{en ? "Linked to a dated institutional period" : "已关联有日期的制度时期"} · {country.datedPeriods}/{country.history.length}</p>
    <Link className="underline" href={localizedRoute("/countries/"+country.slug+"/",locale)+"#history-"+country.slug}>{en ? "Open the institutional timeline" : "查看制度沿革"}</Link>
    {country.latest.map(election => <div key={election.id} className="space-y-2 py-2">
      <p><strong>{election.chamber}</strong> · {election.rules[locale]}</p>
      {election.composition.length > 0 && <ul className="list-disc pl-5">
        {election.composition.map(row => <li key={row.label.en}>{row.label[locale]} · {row.seats} {en ? "seats" : "席"}</li>)}
      </ul>}
      <ul className="space-y-1">{election.sources.map(source =>
        <li key={source.id}><a className="underline break-words" href={source.url}>{source.title}</a></li>)}</ul>
    </div>)}
  </details>;
}

export function LatestChamber({election, slug, locale}: {election:DirectoryElection; slug:string; locale:Locale}) {
  const en = locale === "en";
  const seatCount = election.slots !== null && election.seats !== election.slots
    ? (en ? `${election.seats} of ${election.slots} seats filled` : `共 ${election.slots} 席，已分配 ${election.seats} 席`)
    : (en ? `${election.seats ?? "—"} seats` : `${election.seats ?? "—"} 席`);
  const turnoutLabel = {
    national: en ? "Turnout" : "投票率", constituencies: en ? "Turnout" : "投票率",
    general: en ? "General-list turnout" : "普通名单投票率",
    territorial: en ? "Turnout in territorial constituencies I–X" : "境内第一至第十选区投票率",
  }[election.turnoutScope];
  return <div data-directory-election={election.id}>
    <Link className="underline text-[var(--accent)]" href={electionHref(slug, locale, election.id)}>{election.chamber} · <RegistryDate date={election.date} awaitingConfirmation={election.dateNeedsCheck} en={en}/></Link>
    <p className="mt-1 text-sm">{seatCount} · {turnoutLabel}{en ? ": " : "："}{election.turnoutScope === "constituencies"
      ? (en ? "see individual constituencies" : "见各选区")
      : election.turnout === null ? (en ? "unavailable" : "暂无可用数值")
      : election.turnout.toLocaleString(locale,{maximumFractionDigits:2})+"% "+(election.turnoutPublished
        ? (en ? "(published)" : "（来源公布）") : (en ? "(from official counts)" : "（按官方人数计算）"))}</p>
  </div>;
}
