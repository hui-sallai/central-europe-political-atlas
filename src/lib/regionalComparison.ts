export type RegionalComparisonPoint = { value: number; year: string; unit: string; definition: string; classification: string; level: string; eligible: boolean };
/** Differences are descriptive and require the same admitted statistical frame. */
export function regionalDifference(reference: RegionalComparisonPoint | null, candidate: RegionalComparisonPoint | null) {
  if (!reference || !candidate || !reference.eligible || !candidate.eligible || ![reference.value,candidate.value].every(Number.isFinite)) return null;
  if (["year","unit","definition","classification","level"].some(k => !reference[k as keyof RegionalComparisonPoint] || reference[k as keyof RegionalComparisonPoint] !== candidate[k as keyof RegionalComparisonPoint])) return null;
  const absolute = candidate.value - reference.value;
  const percentagePoints = /%|percent|百分|百分点|\bpp\b/i.test(reference.unit);
  const relative = reference.value > 0 && candidate.value >= 0 && !percentagePoints && /EUR|PPS|person|人|欧元/i.test(reference.unit) ? 100 * absolute / reference.value : null;
  return { absolute, unit: percentagePoints ? "pp" : reference.unit, relative };
}

export type RegionalHistoryRuntime = {
 country_id:string; status_codes:string[];
 indicators:Record<string,{unit:string;definition:string;source_refs:number[]}>;
 sources:{dataset:string;url:string}[];
 regions:Record<string,{geo_codes:string[];level:string}>;
 records:[string,string,number,number,number,string,number|null,number][];
};
export function regionalHistoricalPoints(data:RegionalHistoryRuntime){
 return data.records.flatMap(row=>{
  const meta=data.indicators[row[1]],region=data.regions[row[0]];
  if(!meta||!region||!Number.isFinite(row[3]))return [];
  const sources=meta.source_refs.map(i=>data.sources[i]).filter(Boolean);
  return [{region_id:row[0],country_id:data.country_id,indicator:row[1],year:String(row[2]),value:row[3],unit:meta.unit,definition:meta.definition,level:region.level,classification:'NUTS 2024',status:data.status_codes[row[4]],sources,sourceYear:row[7],nuts:row[5]}];
 });
}
