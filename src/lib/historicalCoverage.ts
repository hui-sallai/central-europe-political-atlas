/** Read-only presentation adapter for the approved recovery inventory. No inferred observations. */
export type CoverageContract = {
  key: string; country: string; indicator: string; frequency: string; region_id?: string;
  unit?: string; definition?: string; source_dataset?: string;
  admitted: { first: string | null; last: string | null; periods: number } | null;
  floors?: { definition_compatible?: number | string | null; territorial?: number | null; break_flags?: string[] };
  recovery_status?: string | null;
  nuts?: {vintage:string};
  missing: { count: number; periods: { from: string; to: string; category: number; reason: string }[] };
};
type Ranges = { ranges: string[] };
export type CoverageInventory = {
  schema_version: string;
  series: CoverageContract[];
  comparability: {
    national_annual: Record<string, { countries: string[]; definition_check: string; pairwise: Record<string, Ranges> }>;
    regional: Record<string, { by_country: Record<string, { common_comparable_years: Ranges }> }>;
  };
};
export function periodIndex(period: string) {
  if (/^\d{4}$/.test(period)) return Number(period);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return Number(period.slice(0,4))*12+Number(period.slice(5))-1;
  return NaN;
}
export function inRanges(period: string, ranges: string[]) {
  const n=periodIndex(period);
  return Number.isFinite(n) && ranges.some(range=>{const [a,b=a]=range.split('–');return n>=periodIndex(a)&&n<=periodIndex(b);});
}
export function contractFor(inventory: CoverageInventory | null, country: string, indicator: string, frequency='annual', region?: string) {
  const prefix=region?'regional':frequency==='monthly'?'monthly':'annual';
  return inventory?.series.find(s=>s.key===`${prefix}|${region??country}|${indicator}`)??null;
}
export function coverageEligible(contract: CoverageContract | null, period: string) {
  if(!contract || !contract.admitted?.first || !contract.admitted?.last) return false;
  const p=periodIndex(period); if(!Number.isFinite(p) || p<periodIndex(contract.admitted.first)||p>periodIndex(contract.admitted.last))return false;
  const floor=contract.floors?.definition_compatible, territory=contract.floors?.territorial;
  if(floor!=null&&p<periodIndex(String(floor)))return false;
  if(territory!=null&&Number(period.slice(0,4))<territory)return false;
  return !contract.missing.periods.some(g=>p>=periodIndex(g.from)&&p<=periodIndex(g.to));
}
export function commonObservationPeriods<T extends {period:string;value:number|null;unit:string;eligible:boolean;frame:string}>(groups: T[][]) {
  if(!groups.length||groups.some(g=>!g.length))return [];
  return [...new Set(groups[0].map(p=>p.period))].filter(period=>{
    const rows=groups.map(g=>g.find(p=>p.period===period&&p.eligible&&p.value!==null&&Number.isFinite(p.value)));
    return rows.every(Boolean)&&new Set(rows.map(p=>p!.unit)).size===1&&new Set(rows.map(p=>p!.frame)).size===1;
  }).sort();
}
export function annualCoverageEligible(inventory: CoverageInventory | null, country: string, indicator:string, year:number) {
  const rule=inventory?.comparability.national_annual[indicator];
  return !!rule?.countries.includes(country)&&rule.definition_check==='same table, selection and unit'&&coverageEligible(contractFor(inventory,country,indicator),String(year));
}
export function annualCommonPeriods(inventory: CoverageInventory | null, countries:string[], indicator:string, rows:{country_slug:string;year:number;value:number|null;unit:string;comparable:boolean}[]) {
  const rule=inventory?.comparability.national_annual[indicator];
  const periods=commonObservationPeriods(countries.map(c=>rows.filter(p=>p.country_slug===c).map(p=>({period:String(p.year),value:p.value,unit:p.unit,eligible:p.comparable&&annualCoverageEligible(inventory,c,indicator,p.year),frame:indicator}))));
  return periods.filter(y=>countries.every((a,i)=>countries.slice(i+1).every(b=>inRanges(y,rule?.pairwise[[a,b].sort().join('|')]?.ranges??[]))));
}
export function compactPeriods(periods:string[]) {
  const sorted=[...new Set(periods)].sort(); const out:string[]=[];
  let start='',last='';
  for(const p of sorted){if(last&&periodIndex(p)!==periodIndex(last)+1){out.push(start===last?start:`${start}–${last}`);start=p;}else if(!start)start=p;last=p;}
  if(start)out.push(start===last?start:`${start}–${last}`);return out.join(', ')||'—';
}
export function exclusionLabel(category:number,reason:string,en:boolean) {
  if(category===8&&/held|vintage|splice/.test(reason))return en?'Vintage held — owner decision retained':'版本拼接暂缓 — 保留所有者决定';
  if(category===6)return /territor|NUTS|boundary|unification/i.test(reason)?(en?'Territory / NUTS incompatibility':'地域／NUTS 不兼容'):(en?'Statistical definition break / floor':'统计定义断点／下限');
  return ({1:en?'Regular source refresh required':'需常规来源刷新',3:en?'Historically nonexistent':'历史上不存在',4:en?'Officially missing period':'官方序列空缺',5:en?'Not published at recorded check':'核查时尚未发布',7:en?'Recorded source-rights restriction':'已登记来源权利限制',8:en?'Unresolved source evidence':'来源证据未解决'})[category]??(en?'Recorded exclusion':'已登记排除');
}
