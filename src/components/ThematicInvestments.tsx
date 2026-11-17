"use client";

import Link from "next/link";
import { localizedRoute, type Locale } from "@/i18n/config";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import type { InvestmentRecord } from "@/lib/thematicResearch";
import { NotebookCollect } from "./NotebookCollect";

export type ProjectCitation = { id: string; publisher: string; url: string };
export function ThematicInvestments({ records, citations, countryNames, terms, locale, themeId }: {
  records: InvestmentRecord[]; citations: ProjectCitation[]; countryNames: Record<string, string>;
  terms: Record<string, string>; locale: Locale; themeId: string;
}) {
  const en = locale === "en", lang = en ? "en" : "zh";
  const t = (english: string, chinese: string) => en ? english : chinese;
  return <details className="editorial-panel p-4">
    <summary>{t("Investment projects and policy measures", "投资项目与政策措施")} · {records.length}</summary>
    {records.map(record => {
      const sourceIds = new Set([record.project_id, ...record.event_ids,
        ...record.stages.flatMap(stage => stage.evidence.implementation_milestones ?? [])]);
      const sources = citations.filter(source => sourceIds.has(source.id));
      const projectHref = localizedRoute('/workspaces/' + themeId + '/', locale) + '?' +
        new URLSearchParams({country: record.country}) + '#' + record.record_id;
      return <details key={record.record_id} id={record.record_id} className="my-3 border-b pb-2">
        <summary>{countryNames[record.country]} · {record.title[lang]}</summary>
        <p>{record.sector[lang]} · {record.responsible_institutions.map(v => v[lang]).join(" · ")}</p>
        <ol className="my-3 space-y-2 pl-4">{record.stages.map((stage, index) => {
          const evidence = [stage.evidence.project_id, ...stage.evidence.event_ids ?? [], ...stage.evidence.implementation_milestones ?? []];
          return <li key={index}>
            <strong>{stage.date ?? t("Date not documented", "日期未记录")} · {terms[stage.stage]} · {terms[stage.status]}</strong>
            <p>{stage.summary[lang]}</p>
            {stage.amounts?.map((a, i) => <p key={i}>{a.label[lang]} · {a.value.toLocaleString(locale)} {a.currency}</p>)}
            {stage.quantities?.map((q, i) => <p key={i}>{q.label[lang]} · {q.value.toLocaleString(locale)} {q.unit}</p>)}
            {sources.filter(s => evidence.includes(s.id)).map(s => <a key={s.id} className="mr-3 underline" href={s.url}>{s.publisher}</a>)}
          </li>;
        })}</ol>
        {record.limitations.map(l => <p key={l.en}>{l[lang]}</p>)}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {record.location && <Link className="underline" href={localizedRoute('/map/',locale) + '?' + new URLSearchParams({
            country:record.country, regions:record.location.region_id, layer:'regional_population'
          })}>{t("Project location", "项目位置")} · {record.location.locality} ({record.location.admin_code})</Link>}
          <NotebookCollect label={t("Save project evidence", "保存项目证据")} create={() => ({
            type:"workspace", title:record.title[lang], labels:{en:record.title.en, "zh-CN":record.title.zh},
            url:new URL(projectHref, PLATFORM_BASE_URL).href, countries:[record.country],
            canonical_ids:[record.record_id, ...sources.map(s => s.id)], layer:"investment_documentation",
            periods:[...new Set(record.stages.flatMap(s => s.date ? [s.date] : []))],
            sources:sources.map(s => ({institution:s.publisher, dataset:s.id, url:s.url, code:s.id, layer:"project_documentation"})),
            warnings:record.limitations.map(l => l[lang]), metadata:{topic:themeId, entersModel:false}
          })}/>
        </div>
      </details>;
    })}
  </details>;
}
