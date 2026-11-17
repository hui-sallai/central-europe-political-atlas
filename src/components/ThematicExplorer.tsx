import type {Locale} from "@/i18n/config";
import {researchCountries, researchProjects} from "@/lib/researchData";
import {sourceDictionaryRows} from "@/lib/sourceDictionary";
import {implementationEvidence} from "@/lib/eventImplementationEvidence";
import {
  caseChronology, caseWindows, coverageMatrix, eventMappings, fundingApplicability, fundingProgrammes,
  fundingRecords, indicatorCatalogue, investmentRecords, limitationLibrary, mappingsFor, researchCases,
  researchThemes, thematicMeta, type ThemeId, type FundingRecord,
} from "@/lib/thematicResearch";
import {ThematicWorkspace} from "./ThematicWorkspace";
import type {ThematicCaseData} from "./ThematicCase";

export function ThematicExplorer({themeId,locale}:{themeId:ThemeId;locale:Locale}) {
  const theme=researchThemes.find(t=>t.theme_id===themeId)!;
  const language=locale==="en"?"en":"zh";
  const publisher=(original:string)=>locale==="en" ? sourceDictionaryRows.find(s=>s.nameZh===original)?.nameEn??original : original;
  const cases:ThematicCaseData[]=researchCases.filter(c=>c.theme_ids.includes(themeId)).map(record=>{
    const investments=investmentRecords.filter(i=>record.investment_records.includes(i.record_id));
    const funding=fundingRecords.filter(f=>record.funding_records.includes(f.record_id));
    const eventIds=new Set([...record.event_ids,...investments.flatMap(i=>i.event_ids),...funding.flatMap(f=>f.event_id?[f.event_id]:[])]);
    const windows=caseWindows(record.case_id);
    const series=[...record.series,...windows.flatMap(w=>w.series)];
    return {record,windows,chronology:caseChronology(record.case_id)??{dated:[],undated:[]},investments,funding,
      events:eventMappings.filter(e=>eventIds.has(e.event_id)).map(({event_id,country,date,source_name,source_url,summary})=>({event_id,country,date,source_name,source_url,summary})),
      catalogue:indicatorCatalogue.filter(e=>series.some(s=>e.indicator_id===s.indicator_id&&e.layer===s.layer)),
      milestones:implementationEvidence.filter(m=>m.event_id===record.extends?.event_id || record.implementation_milestones?.includes(m.id) || funding.some(f=>f.implementation_milestone===m.id)),
      projects:researchProjects.filter(p=>investments.some(i=>i.project_id===p.id)).map(({id,source_name,source_url})=>({id,source_name:publisher(source_name),original_source_name:source_name,source_url})),
    };
  });
  const funding=themeId==="eu_funding_development"?fundingRecords.map(record=>{
    const source=record.source as FundingRecord["source"] & {url?:string};
    const milestone=implementationEvidence.find(m=>m.id===record.implementation_milestone);
    const event=eventMappings.find(e=>e.event_id===record.event_id);
    return {...record,sourceUrl:source.url??milestone?.url??event?.source_url,sourceTitle:milestone?.institution[language]??source.ref??(event?publisher(event.source_name):undefined),
      programmeTitle:fundingProgrammes[record.programme]?.label[language]??record.programme};
  }):[];
  const investments=investmentRecords.filter(i=>i.theme_ids.includes(themeId));
  const cited=new Set(investments.flatMap(i=>[i.project_id,...i.event_ids,...i.stages.flatMap(s=>s.evidence.implementation_milestones??[])]));
  const citations=[
    ...researchProjects.filter(p=>cited.has(p.id)&&p.source_url).map(p=>({id:p.id,publisher:publisher(p.source_name),url:p.source_url!})),
    ...eventMappings.filter(e=>cited.has(e.event_id)).map(e=>({id:e.event_id,publisher:publisher(e.source_name),url:e.source_url})),
    ...implementationEvidence.filter(m=>cited.has(m.id)&&m.url).map(m=>({id:m.id,publisher:m.institution[language],url:m.url!})),
  ];
  const mappings=mappingsFor(themeId);
  const catalogue=indicatorCatalogue.filter(c=>theme.indicators.some(i=>i.indicator_id===c.indicator_id&&i.layers.includes(c.layer))||mappings.some(m=>m.indicators.some(i=>i.indicator_id===c.indicator_id)));
  return <ThematicWorkspace locale={locale} theme={theme} cases={cases} countries={researchCountries.map(c=>({id:c.slug,name:locale==="en"?c.name:c.name_zh}))}
    coverage={coverageMatrix.filter(c=>c.theme_id===themeId)} mappings={mappings} catalogue={catalogue} limitations={limitationLibrary}
    investments={investments} citations={citations} funding={funding} applicability={funding.length?fundingApplicability:[]}
    programmes={Object.fromEntries(Object.entries(fundingProgrammes).map(([id,p])=>[id,p.label[language]]))}
    themeNav={researchThemes.map(t=>({id:t.theme_id,title:t.title[language]}))} stages={Object.fromEntries([...thematicMeta.funding_stages,...thematicMeta.investment_stages,...Object.entries({...thematicMeta.stage_status,...thematicMeta.evidence_status}).map(([id,label])=>({id,label}))].map(s=>[s.id,s.label[language]]))}/>;
}
