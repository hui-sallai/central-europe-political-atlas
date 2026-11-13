/** Presentation taxonomy shared by discovery and comparison; source registries remain authoritative. */
export const indicatorTopics = [
 {id:'output',zh:'经济增长与产出',en:'Growth and output'},
 {id:'prices',zh:'价格与通胀',en:'Prices and inflation'},
 {id:'people',zh:'就业与人口',en:'Employment and population'},
 {id:'government',zh:'政府财政',en:'Government finance'},
 {id:'trade',zh:'贸易与投资',en:'Trade and investment'},
 {id:'energy',zh:'能源与工业',en:'Energy and industry'},
 {id:'money',zh:'货币与金融',en:'Money and finance'},
] as const;
export type TopicId=typeof indicatorTopics[number]['id'];
export function indicatorTopic(id:string):TopicId {
 if(/energy|electric|gas|industrial_production|manufactur|automotive|battery|oil|brent/.test(id))return 'energy';
 if(/inflation|hicp|cpi|price|ppi/.test(id))return 'prices';
 if(/employ|population|earnings|wage|labour|labor/.test(id))return 'people';
 if(/government|fiscal|deficit|interest_expenditure|eu_funds|rd_expenditure/.test(id))return 'government';
 if(/export|import|trade|fdi|current_account|external_debt|investment/.test(id))return 'trade';
 if(/gdp|productivity|output/.test(id))return 'output';
 return 'money';
}
