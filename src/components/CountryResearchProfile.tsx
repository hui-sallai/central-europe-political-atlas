"use client";
import {admittedCountrySlugs} from "@/lib/politicalAdmission";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useLocale} from '@/i18n/LocaleProvider';
import {InstitutionalProfile} from "./InstitutionComparison";
import {ResearchTimeSeriesChart} from './ResearchTimeSeriesChart';
import {CountryModelSnapshot} from './CountryModelSnapshot';
import {CountryObservationValue} from './CountryObservationValue';
import {SerbiaPublicFinancePanel} from './SerbiaPublicFinancePanel';
import {researchWorkspaces} from "@/content/researchWorkspaces";
import {caseStudyEventIds} from "@/lib/eventCaseStudies";
import {englishUnit} from "@/i18n/presentation";
import {eventPresentation} from '@/lib/eventPresentation';

import {countries as supportedCountries} from '@/lib/data';
import type {Country as UiCountry} from '@/lib/data';
import type {Event,ModelCard,ModelOutput,Observation,Project} from '@/types/researchData';
const indicators:Record<string,[string,string]>={real_gdp_growth:['实际 GDP 增长','Real GDP growth'],hicp_inflation:['HICP / CPI 通胀','HICP / CPI inflation'],unemployment_rate:['失业率','Unemployment'],gdp_per_capita_eur:['人均 GDP','GDP per capita'],government_debt_gdp:['政府债务 / GDP','Government debt / GDP'],population:['人口','Population']};
export function CountryResearchProfile({country,electionHistory,themeLinks,observations,events,modelOutputs,modelCards,regionalMapAvailable}:{country:UiCountry;electionHistory:React.ReactNode;themeLinks:React.ReactNode;observations:Observation[];events:Event[];projects:Project[];modelOutputs:ModelOutput[];modelCards:ModelCard[];regionalMapAvailable:boolean}){
 const locale=useLocale(),en=locale==='en',prefix=en?'/en':'',t=(zh:string,text:string)=>en?text:zh;
 const [indicator,setIndicator]=useState('real_gdp_growth');
 const [comparisonCountries,setComparisonCountries]=useState([country.slug]),[invalidComparison,setInvalidComparison]=useState(false);
 useEffect(()=>{const restore=()=>{const params=new URLSearchParams(location.search);const metric=params.get('indicator');setIndicator(metric&&Object.hasOwn(indicators,metric)?metric:'real_gdp_growth');const other=params.get('compare');setInvalidComparison(!!other&&!supportedCountries.some(c=>c.slug===other));const known=supportedCountries.find(c=>c.slug===other)?.slug;setComparisonCountries(known&&known!==country.slug?[country.slug,known]:[country.slug]);};restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[country.slug]);
 const comparisonSlugs=comparisonCountries.flatMap(slug=>supportedCountries.filter(c=>c.slug===slug).map(c=>c.slug));
 const political=admittedCountrySlugs.includes(country.slug);
 const series=observations.filter(r=>r.indicator===indicator).sort((a,b)=>a.year-b.year);
 const name=en?country.nameEn:country.nameZh;
 const dataHref = prefix+'/data/?'+new URLSearchParams({compare_countries:comparisonSlugs.join(','),comparison_indicator:'annual:'+indicator});
 const sections=[['overview','概览','Overview'],['economy','经济发展','Economic history'],['institutions','政治制度','Institutions'],['elections','历届选举','Elections'],['regions','区域地理','Geography'],['research','研究与事件','Research and events'],['sources','来源与下载','Sources and downloads']];
 return <section className="mt-7" data-country-profile>
  <nav className="flex flex-wrap gap-x-5 gap-y-3 border-y border-[var(--line)] py-3 text-sm" aria-label={t('档案章节','Profile sections')}>{sections.map(([id,zh,english])=><a key={id} className="underline" href={'#'+id}>{t(zh,english)}</a>)}</nav>

  {invalidComparison?<p role="alert" className="mt-3 text-sm">{t('链接中的比较国家不受支持，请在数据比较界面明确选择。','The linked comparison country is unsupported; explicitly choose countries in Data Explorer.')}</p>:null}
  <p id="overview" className="mt-4 text-sm">{country.euMember?t("欧盟成员国","EU member"):t("非欧盟成员国","Outside the EU")}</p>
  <h2 className="mt-7 text-2xl font-semibold">{t('关键经济指标','Key economic indicators')}</h2>
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(indicators).map(([id,label])=><article key={id} className="editorial-panel p-4"><h3 className="font-semibold">{en?label[1]:label[0]}</h3><CountryObservationValue compact country={country.slug} indicator={id} series={observations.filter(r=>r.indicator===id)} locale={locale}/></article>)}</div>
  <section id="economy" className="mt-7 editorial-panel p-4"><h2 className="text-xl font-semibold">{t('历史趋势','Historical trends')}</h2><label className="mt-3 block max-w-md">{t('指标','Indicator')}<select className="field-control mt-2" value={indicator} onChange={e=>{const known=Object.keys(indicators).find(id=>id===e.target.value);if(known){setIndicator(known);const url=new URL(location.href);url.searchParams.set('indicator',known);history.replaceState(null,'',url);}}}>{Object.entries(indicators).map(([id,label])=><option value={id} key={id}>{en?label[1]:label[0]}</option>)}</select></label><ResearchTimeSeriesChart interactive title={`${name} · ${indicators[indicator][en?1:0]}`} xKind="number" xLabel={t('年份','Year')} yLabel={en?englishUnit(series[0]?.unit??''):series[0]?.unit??''} series={[{id:indicator,label:name,color:'var(--chart-accent)',points:series.map(r=>({x:r.year,y:r.status==='pending'||r.applicability_status==='not_applicable'?null:r.value,unit:en?englishUnit(r.unit):r.unit,source:r.source_name,sourceUrl:r.source_url,status:r.status}))}]}/><Link href={`${prefix}/data/?country=${country.slug}&indicator=${indicator}&history=1`} className="text-sm underline">{t('查看完整已准入历史与比较时期','Inspect full admitted history and comparison periods')}</Link>
   <div className="mt-4 flex flex-wrap gap-3 text-sm">{[
     ['fdi_inflow','外商直接投资','Foreign direct investment'],['energy_import_dependency','能源进口依赖','Energy import dependency'],
     ['industrial_production_index','工业生产','Industrial production'],['policy_rate','货币政策','Monetary policy']
   ].map(([id,zh,english])=>{
     const monthly=id==='industrial_production_index'||id==='policy_rate';
     const query=new URLSearchParams({country:country.slug,compare_frequency:monthly?'monthly':'annual',comparison_indicator:(id==='policy_rate'?'macro:':monthly?'monthly:':'annual:')+id});
     return <Link key={id} className="underline" href={prefix+'/data/?'+query}>{t(zh,english)}</Link>;
   })}</div>
   <div className="mt-4 flex flex-wrap items-end gap-4">
    <label>{t('加入比较的国家','Compare with')}<select aria-label={t('加入比较的国家','Compare with')} className="field-control mt-1" value={comparisonSlugs[1]??''} onChange={e=>{
      const value=e.target.value;
      setComparisonCountries(value?[country.slug,value]:[country.slug]);setInvalidComparison(false);
      const url=new URL(location.href);if(value)url.searchParams.set('compare',value);else url.searchParams.delete('compare');history.replaceState(null,'',url);
    }}><option value="">{t('选择另一个国家','Choose another country')}</option>{supportedCountries.filter(c=>c.slug!==country.slug).map(c=><option key={c.slug} value={c.slug}>{en?c.nameEn:c.nameZh}</option>)}</select></label>
    {comparisonSlugs.length>1 && <Link className="cta-dark rounded px-3 py-2" href={dataHref}>{t('比较所选指标','Compare selected indicator')}</Link>}
   </div>
</section>
  <div className="mt-7 grid gap-5 lg:grid-cols-2"><section id="institutions" className="editorial-panel p-5"><h2 className="text-xl font-semibold">{t('政治制度','Political institutions')}</h2><InstitutionalProfile country={country}/><Link className="mt-3 inline-block underline" href={prefix+'/politics/?'+new URLSearchParams({institution_countries:comparisonSlugs.join(',')})+'#institutions'}>{t('比较各国政治制度','Compare political institutions')}</Link><h2 id="elections" className="my-4 text-xl font-semibold">{t('议会选举与历史','Parliamentary election history')}</h2>{electionHistory}
  <h2 id="regions" className="mt-5 text-xl font-semibold">{t('区域地理','Regional geography')}</h2><p className="mt-3 text-sm">{regionalMapAvailable?t('区域事实地图可用；数据层级与年份须分别核查。','Regional facts map available; check each level and period.'):t('区域边界地图未连接；不能据此判断统计观测不存在。','Regional boundaries are not connected; this is not evidence that statistical observations are absent.')}</p><Link className="mt-3 block underline" href={`${prefix}/map/?country=${country.slug}`}>{t('区域数据与可用性','Regional data and availability')}</Link></section>
  <section id="research" className="editorial-panel p-5"><h2 className="text-xl font-semibold">{t('研究工具','Research tools')}</h2><p className="mt-3 text-sm">{modelOutputs.filter(m=>m.score!==null).length} {t('项已发布规则指标结果；不代表所有计量方法可用。','published rule-based outputs; this does not imply eligibility for every econometric method.')}</p><ul className="mt-3 space-y-2">{researchWorkspaces.filter(w=>w.indicatorIds.some(id=>observations.some(r=>r.indicator===id&&r.value!==null&&r.status!=='pending'))).map(w=><li key={w.id}><Link className="underline" href={`${prefix}/workspaces/${w.id}/?country=${country.slug}`}>{w.title[locale]}</Link></li>)}</ul>{themeLinks}<details className="mt-3" data-profile-model-details><summary className="cursor-pointer text-sm font-semibold">{t('已发布指标结果与解释','Published indicator results and interpretation')}</summary>{modelOutputs.map(output=><CountryModelSnapshot key={output.model_id} output={output} card={modelCards.find(c=>c.model_id===output.model_id)} locale={locale}/>)}</details><Link className="mt-3 block underline" href={`${prefix}/models/?country=${country.slug}`}>{t('按研究问题查看模型与限制','Inspect model questions, availability and limitations')}</Link><Link className="mt-3 block underline" href={`${prefix}/scenarios/?country=${country.slug}`}>{t('条件情景分析','Conditional scenarios')}</Link><Link className="mt-3 block underline" href={`${prefix}/methodology/#citation`}>{t('技术方法与数据来源','Technical methodology and sources')}</Link></section></div>
  {country.slug==='serbia'?<section className="mt-6 editorial-panel p-5" data-serbia-availability><h2 className="text-xl font-semibold">{t('塞尔维亚覆盖说明','Serbia coverage')}</h2><p className="mt-3">{t('SORS 年度、月度、季度及 NSTJ 区域统计已保留。CPI 不等于 HICP，季度 LFS 不能替代月度失业率。','SORS annual, monthly, quarterly and NSTJ regional statistics are retained. CPI is not HICP; quarterly LFS is not monthly unemployment.')}</p><p className="mt-2 text-sm">{t('区域地图已接入 25 个 NSTJ3 区域（GISCO 边界、SORS 人口），仅在塞尔维亚国内比较；公共财政与经常账户来自塞尔维亚财政部公报（国家口径）；已准入的议会选举可在选举研究中查看。正式共同月度样本另有准入条件。','The regional map covers 25 NSTJ3 areas (GISCO boundaries, SORS population), compared within Serbia only; public finance and the current account come from the Ministry of Finance bulletin (national definitions); admitted parliamentary records are accessible in election research. Formal monthly samples have separate eligibility rules.')}</p><a className="mt-3 block underline text-sm" href="/research-data/serbia/serbia_descriptive_history_regional.json">{t('已发布 SORS 区域统计与来源（JSON）','Published SORS regional observations and sources (JSON)')}</a><SerbiaPublicFinancePanel en={en}/></section>:null}
  {events.some(e=>caseStudyEventIds.includes(e.event_id)&&e.data_status==='verified') && <section className="mt-6"><h2 className="text-xl font-semibold">{t('有来源记录的研究案例','Documented research cases')}</h2>
    {events.filter(e=>caseStudyEventIds.includes(e.event_id)&&e.data_status==='verified').map(e=>{
      const title=eventPresentation(e,locale).title;
      return <p className="mt-2" key={e.event_id}>{e.date} · <Link className="underline" lang={title.lang} href={prefix+'/models/?'+new URLSearchParams({tab:'run',skill:'event_window_analysis',country:country.slug,event:e.event_id,section:'case'}) }><span lang={title.lang} data-original-language={title.originalLabel?title.lang:undefined}>{title.text}</span></Link> {title.originalLabel}</p>;
    })}</section>}
  <section className="mt-7"><h2 className="text-2xl font-semibold">{t('相关事件','Related events')}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{events.filter(e=>e.data_status==='verified').toSorted((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(e=>{const {title:text,summary}=eventPresentation(e,locale);return <article className="editorial-panel p-4" key={e.id}><p className="text-xs text-[var(--muted)]">{e.date}</p><h3 className="mt-2 font-semibold" lang={text.lang}><Link href={`${prefix}/news/?country=${country.slug}#${e.id}`}><span lang={text.lang} data-original-language={text.originalLabel?text.lang:undefined}>{text.text}</span></Link></h3>{text.originalLabel&&<p className="text-xs">{text.originalLabel}</p>}<details className="mt-2 text-sm"><summary>{t("事件摘要","Event summary")}</summary><p><span lang={summary.lang} data-original-language={summary.originalLabel?summary.lang:undefined}>{summary.text}</span></p>{summary.originalLabel&&<p className="text-xs">{summary.originalLabel}</p>}</details></article>;})}</div><Link className="mt-4 block text-sm underline" href={`${prefix}/news/?country=${country.slug}`}>{t('浏览完整事件库','Browse the full Event Library')}</Link></section>
  <section id="sources" className="mt-7 border-t border-[var(--line)] pt-5"><h2 className="text-xl font-semibold">{t("来源与下载","Sources and downloads")}</h2>
  <p className="my-3 text-sm">{t("在数据浏览器下载当前选择的观测与来源，或将证据保存到研究笔记。","Download the selected observations and their sources in Data Explorer, or save evidence to your Research Notebook.")}</p>
  <nav className="flex flex-wrap gap-4 text-sm font-semibold" aria-label={t('国家研究导航','Country research navigation')}><Link className="underline" href={`${prefix}/data/?${comparisonSlugs.length>1?new URLSearchParams({compare_countries:comparisonSlugs.join(',')}).toString():`country=${country.slug}`}`}>{t('经济数据与国家比较','Economic data and country comparison')}</Link><Link className="underline" href={`${prefix}/politics/${political?country.slug+'/':''}`}>{t('政治与选举','Politics and elections')}</Link><Link className="underline" href={`${prefix}/map/?country=${country.slug}`}>{t('区域地图','Regional map')}</Link><Link className="underline" href={`${prefix}/workspaces/`}>{t('研究入口','Research workspaces')}</Link></nav>
  <Link className="mt-3 inline-block underline" href={prefix+'/notebook/'}>{t("研究笔记","Research Notebook")}</Link></section>
 </section>;
}
