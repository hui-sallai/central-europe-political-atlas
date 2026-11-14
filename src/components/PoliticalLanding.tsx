"use client";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedRoute } from "@/i18n/config";
import type { PoliticalCountryView } from "@/lib/politicalExplorer";

/** Retain the original German route and all legacy research query parameters. */
export function PoliticalLanding({ countries }: { countries: PoliticalCountryView[]; children?: ReactNode }) {
  const locale = useLocale(), en = locale === "en";
  useEffect(()=>{const p=new URLSearchParams(location.search);if(p.get('country')==='germany'||['election','measure','compare','comparison_mode','series','series_measure','context','research_q','research_study'].some(k=>p.has(k))){const u=new URL(location.href);u.pathname=localizedRoute('/politics/germany/',locale);u.searchParams.delete('country');location.replace(u.href);}},[locale]);
  return <>
    <section aria-label={en ? "Choose a political research country" : "选择政治研究国家"} data-political-landing>
      <p className="mb-4 text-sm text-[var(--muted)]">{en ? "Choose from six countries with admitted parliamentary election records. The summaries describe the recorded election chamber, not a complete institutional dataset." : "选择已有议会选举资料的六个国家。下列摘要说明选举记录所涵盖的议院，不代表完整的政治制度数据库。"}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{countries.map(c => {
        const latest = c.elections.at(-1);
        return <article key={c.slug} className="editorial-panel p-4 space-y-2" data-political-country={c.slug}>
          <h2 className="text-xl font-semibold"><Link className="underline text-[var(--accent)]" href={localizedRoute(`/politics/${c.slug}/`,locale)}>{c.name[locale]}</Link></h2>
          <p>{latest?.chamber ?? (en ? "Chamber not recorded" : "未记录议院名称")}</p>
          <p>{en ? "Available election years" : "可用选举年份"}: {c.elections.map(e => e.year).join(", ")}</p>
          <p>{en ? "Election seats" : "选举席位"}: {latest?.totalSeats ?? "—"} · {latest?.year}</p>
          <details><summary className="cursor-pointer text-sm font-semibold">{en ? "Electoral rules and source coverage" : "选举规则与来源覆盖"}</summary><p className="mt-2 text-sm">{latest?.system.family.replaceAll("_", " ")} · {latest?.system.allocationMethod.replaceAll("_", " ")}</p><p className="mt-2 text-xs">{en ? "Rules, chamber size and result vintages are election-specific. Upper-chamber or other institutional coverage is not inferred." : "规则、议院规模及结果版本均对应具体选举，不据此推断上院或其他制度资料的覆盖。"}</p>{latest?.sources.map(s => <a key={s.id} className="block mt-2 text-xs underline text-[var(--accent)]" href={s.url}>{s.institution ?? s.title}</a>)}</details>
        </article>;
      })}</div>
    </section>
    <p className="mt-5 text-sm text-[var(--muted)]">{en?'Countries outside these six have no admitted parliamentary election workflow here. This is a source-admission limit, not a claim that institutions or elections are absent.':'其他国家的议会选举流程尚未准入；这是来源准入限制，不代表不存在政治制度或选举。'}</p>
  </>;
}
