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
 if (/bond_yield|government_yield/.test(id)) return 'money';
 if (/fdi|external_debt/.test(id)) return 'trade';
 if (/retail_trade_volume|productivity/.test(id)) return 'output';
 if (/producer_prices/.test(id)) return 'prices';
 if(/energy|electric|gas|industrial_production|manufactur|automotive|battery|oil|brent/.test(id))return 'energy';
 if(/inflation|hicp|cpi|price|ppi/.test(id))return 'prices';
 if(/compensation_per_employee|employ|population|earnings|wage|labour|labor/.test(id))return 'people';
 if(/government|fiscal|deficit|interest_expenditure|eu_funds|rd_expenditure/.test(id))return 'government';
 if(/export|import|trade|fdi|current_account|external_debt|investment/.test(id))return 'trade';
 if(/gdp|productivity|output/.test(id))return 'output';
 return 'money';
}

const searchTerms: [RegExp,string][] = [
 [/gdp/, 'gross domestic product 国内生产总值'],
 [/fdi/, 'foreign direct investment 外商直接投资 外国直接投资'],
 [/hicp/, 'harmonised harmonized consumer prices inflation 调和消费者价格 通胀'],
 [/unemployment/, 'joblessness unemployment 失业'],
 [/industrial_production/, 'industrial production 工业产出 工业生产'],
 [/exchange_rate|bilateral_fx/, 'exchange rate forex 汇率'],
];
export function matchesIndicator(metric:{id:string;zh:string;en:string;source:string;frequency:string},query:string) {
 const terms = searchTerms.filter(([pattern])=>pattern.test(metric.id)).map(([,words])=>words);
 const text = [metric.zh,metric.en,metric.id,metric.source,metric.frequency,...terms].join(' ').replaceAll('_',' ').toLowerCase();
 return query.trim().toLowerCase().replaceAll('_',' ').split(/\s+/).every(word=>text.includes(word));
}
