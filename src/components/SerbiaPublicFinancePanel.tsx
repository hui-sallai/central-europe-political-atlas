"use client";
import {useEffect,useState} from 'react';

// Serbian public finance and current account (Ministry of Finance bulletin, owner decision D 2026-11-15). National
// definitions, descriptive only: shown on Serbia's profile, never merged into the EU-comparable indicators above.
type Rec={series:string;period:string;value:number;value_status:'official'|'calculated'};
type Store={records:Rec[];attribution:string;source:{publication:string;page_url:string}};
const SERIES:Array<[string,string,string]>=[
 ['consolidated_balance_pct_gdp','合并财政余额（GFS-1986）','Consolidated balance (GFS-1986)'],
 ['consolidated_revenue_pct_gdp','合并公共收入','Consolidated public revenue'],
 ['consolidated_expenditure_pct_gdp','合并公共支出','Consolidated public expenditure'],
 ['public_debt_central_pct_gdp','公共债务（中央政府层级，期末）','Public debt (central government, end of year)'],
 ['current_account_pct_gdp','经常账户余额（BPM6，塞尔维亚国家银行数据）','Current account balance (BPM6, NBS data)'],
];
const YEARS=['2020','2021','2022','2023','2024','2025'];
const URL_PATH='/research-data/serbia/serbia_public_finance_mfin.json';

export function SerbiaPublicFinancePanel({en}:{en:boolean}){
 const t=(zh:string,text:string)=>en?text:zh;
 const [store,setStore]=useState<Store|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch(URL_PATH,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(setStore).catch(e=>{if(!c.signal.aborted)setFailed(Boolean(e))});return()=>c.abort();},[]);
 const cell=(series:string,year:string)=>store?.records.find(r=>r.series===series&&r.period===year);
 const fmt=(v:number)=>v.toLocaleString(en?'en-GB':'zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1});
 return <section className="mt-5" data-serbia-public-finance>
  <h3 className="text-lg font-semibold">{t('公共财政与经常账户（塞尔维亚财政部）','Public finance and current account (Ministry of Finance)')}</h3>
  <p className="mt-2 text-sm">{t('占 GDP 百分比。国家口径（GFS-1986 合并余额；按塞尔维亚法律界定的中央政府层级公共债务），不与欧盟 EDP/ESA 财政数据比较，也不进入国家比较或模型。收入与支出占比为据同一表计算（标 *）。','% of GDP. National definitions (GFS-1986 consolidated balance; public debt of the central level of government under Serbian law): not compared with EU EDP/ESA government finance data, and not used in country comparisons or models. Revenue and expenditure shares are calculated from the same table (marked *).')}</p>
  {failed?<p className="mt-3 text-sm">{t('数据暂不可用。','Data are temporarily unavailable.')}</p>:!store?<p className="mt-3 text-sm">{t('正在加载…','Loading…')}</p>:
  <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead><tr><th scope="col" className="text-left font-semibold">{t('指标','Indicator')}</th>{YEARS.map(y=><th key={y} scope="col" className="text-right font-semibold">{y}</th>)}</tr></thead>
  <tbody>{SERIES.map(([id,zh,label])=><tr key={id} className="border-t border-[var(--line)]"><th scope="row" className="py-1 pr-3 text-left font-normal">{en?label:zh}</th>{YEARS.map(y=>{const r=cell(id,y);return <td key={y} className="py-1 text-right tabular-nums">{r?`${fmt(r.value)}${r.value_status==='calculated'?'*':''}`:'—'}</td>})}</tr>)}</tbody></table></div>}
  <p className="mt-2 text-xs">{t('来源：塞尔维亚财政部《公共财政公报》2026 年 8 月，表 1；国际收支数据：塞尔维亚国家银行。2026 年为不完整年度，未收录。','Source: Ministry of Finance of the Republic of Serbia, Public finance bulletin, August 2026, Table 1; balance-of-payments data: National Bank of Serbia. 2026 is a partial year and is not included.')}</p>
  <a className="mt-2 block underline text-sm" href={URL_PATH}>{t('已发布财政序列与来源（JSON）','Published public finance series and sources (JSON)')}</a>
 </section>;
}
