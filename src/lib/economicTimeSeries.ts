export type EconomicMetricId = "population" | "gdp" | "gdpPerCapita" | "growth" | "inflation" | "unemployment";

export type EconomicYearRow = {
  year: string;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  growth: number | null;
  inflation: number | null;
  unemployment: number | null;
  source: string;
};

export type EconomicMetricOption = {
  id: EconomicMetricId;
  label: string;
  unit: string;
  note: string;
};

export type EconomicSourceLink = {
  label: string;
  url: string;
  note: string;
};

export const economicMetricOptions: EconomicMetricOption[] = [
  { id: "gdp", label: "GDP", unit: "百万欧元", note: "名义 GDP，当年价格。" },
  { id: "gdpPerCapita", label: "人均 GDP", unit: "欧元", note: "按 GDP 与人口换算。" },
  { id: "growth", label: "GDP 实际增长", unit: "%", note: "链式体量，较上年变化率。" },
  { id: "inflation", label: "CPI / HICP 通胀率", unit: "%", note: "年均消费者价格变化率；欧盟国家采用 HICP。" },
  { id: "unemployment", label: "失业率", unit: "%", note: "15-74 岁劳动力口径。" },
  { id: "population", label: "人口", unit: "百万人", note: "年初人口，百万人。" },
];

const eurostatGeoByCountry: Record<string, string> = {
  germany: "DE",
  poland: "PL",
  hungary: "HU",
  romania: "RO",
  czechia: "CZ",
  slovakia: "SK",
  slovenia: "SI",
  serbia: "RS",
  austria: "AT",
  croatia: "HR",
};

const nationalSourceByCountry: Record<string, EconomicSourceLink> = {
  germany: { label: "Destatis GENESIS-Online", url: "https://www-genesis.destatis.de/datenbank/online", note: "德国官方统计数据库。" },
  poland: { label: "Statistics Poland Data Portal", url: "https://bdl.stat.gov.pl/bdl/start", note: "波兰官方统计数据库。" },
  hungary: { label: "HCSO STADAT", url: "https://www.ksh.hu/stadat?lang=en", note: "匈牙利中央统计局官方数据表。" },
  romania: { label: "INSSE TEMPO Online", url: "https://statistici.insse.ro/shop/?lang=en", note: "罗马尼亚官方统计数据库。" },
  czechia: { label: "Czech Statistical Office Public Database", url: "https://vdb.czso.cz/vdbvo2/faces/en/index.jsf", note: "捷克统计局公共数据库。" },
  slovakia: { label: "DATAcube Slovakia", url: "https://datacube.statistics.sk/", note: "斯洛伐克统计局官方数据库。" },
  slovenia: { label: "SURS SiStat", url: "https://pxweb.stat.si/SiStat/en", note: "斯洛文尼亚官方统计数据库。" },
  serbia: { label: "Statistical Office of Serbia Data", url: "https://data.stat.gov.rs/?caller=SDDB", note: "塞尔维亚官方统计数据库。" },
  austria: { label: "Statistics Austria STATcube", url: "https://www.statistik.at/en/services/tools/services/statcube", note: "奥地利官方统计数据库。" },
  croatia: { label: "Croatian Bureau of Statistics Database", url: "https://web.dzs.hr/PXWeb/Menu.aspx?px_language=en&px_type=PX&px_db=Database", note: "克罗地亚官方统计数据库。" },
};

function eurostatApiUrl(metricId: EconomicMetricId, countrySlug: string, year: string) {
  const geo = eurostatGeoByCountry[countrySlug] ?? countrySlug.toUpperCase();
  const base = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

  if (metricId === "population") {
    return `${base}/demo_pjan?time=${year}&geo=${geo}&sex=T&age=TOTAL&unit=NR`;
  }

  if (metricId === "gdp") {
    return `${base}/nama_10_gdp?time=${year}&geo=${geo}&unit=CP_MEUR&na_item=B1GQ`;
  }

  if (metricId === "gdpPerCapita") {
    return `${base}/nama_10_pc?time=${year}&geo=${geo}&unit=CP_EUR_HAB&na_item=B1GQ`;
  }

  if (metricId === "growth") {
    return `${base}/nama_10_gdp?time=${year}&geo=${geo}&unit=CLV_PCH_PRE&na_item=B1GQ`;
  }

  if (metricId === "inflation") {
    return `${base}/prc_hicp_aind?time=${year}&geo=${geo}&coicop=CP00&unit=RCH_A_AVG`;
  }

  return `${base}/une_rt_a?time=${year}&geo=${geo}&sex=T&age=Y15-74&unit=PC_ACT`;
}

function eurostatDatasetLabel(metricId: EconomicMetricId) {
  const labels: Record<EconomicMetricId, string> = {
    population: "Eurostat demo_pjan",
    gdp: "Eurostat nama_10_gdp",
    gdpPerCapita: "Eurostat nama_10_pc",
    growth: "Eurostat nama_10_gdp",
    inflation: "Eurostat prc_hicp_aind",
    unemployment: "Eurostat une_rt_a",
  };

  return labels[metricId];
}

export function getEconomicMetricSourceLinks(countrySlug: string, metricId: EconomicMetricId, year: string, value: number | null): EconomicSourceLink[] {
  if (value === null) {
    return [];
  }

  const links: EconomicSourceLink[] = [
    {
      label: eurostatDatasetLabel(metricId),
      url: eurostatApiUrl(metricId, countrySlug, year),
      note: `${year} 年、${eurostatGeoByCountry[countrySlug] ?? countrySlug.toUpperCase()}、${economicMetricOptions.find((metric) => metric.id === metricId)?.label ?? metricId}。`,
    },
  ];

  const nationalSource = nationalSourceByCountry[countrySlug];
  if (nationalSource) {
    links.push(nationalSource);
  }

  return links;
}

export function getEconomicRowSourceLinks(countrySlug: string, year: string): EconomicSourceLink[] {
  const nationalSource = nationalSourceByCountry[countrySlug];
  const geo = eurostatGeoByCountry[countrySlug] ?? countrySlug.toUpperCase();
  const links: EconomicSourceLink[] = [
    {
      label: "Eurostat filtered API datasets",
      url: `https://ec.europa.eu/eurostat/databrowser/explore/all/all_themes?lang=en&display=list&sort=category`,
      note: `${year} 年 ${geo}；具体指标链接见各数值单元格。`,
    },
  ];

  if (nationalSource) {
    links.push(nationalSource);
  }

  return links;
}

export const economicTimeSeriesByCountry: Record<string, EconomicYearRow[]> = {
  germany: [
    { year: "2021", population: 83.16, gdp: 3682340, gdpPerCapita: 44283, growth: 3.9, inflation: 3.2, unemployment: 3.6, source: "Eurostat / Destatis" },
    { year: "2022", population: 83.24, gdp: 3989390, gdpPerCapita: 47928, growth: 1.8, inflation: 8.7, unemployment: 3.1, source: "Eurostat / Destatis" },
    { year: "2023", population: 83.12, gdp: 4219310, gdpPerCapita: 50763, growth: -0.9, inflation: 6.0, unemployment: 3.1, source: "Eurostat / Destatis" },
    { year: "2024", population: 83.46, gdp: 4328970, gdpPerCapita: 51871, growth: -0.5, inflation: 2.5, unemployment: 3.5, source: "Eurostat / Destatis" },
    { year: "2025", population: 83.58, gdp: 4469810, gdpPerCapita: 53481, growth: 0.2, inflation: 2.3, unemployment: 3.8, source: "Eurostat / Destatis" },
  ],
  poland: [
    { year: "2021", population: 37.07, gdp: 583001.4, gdpPerCapita: 15726, growth: 6.9, inflation: 5.2, unemployment: 3.4, source: "Eurostat / Statistics Poland" },
    { year: "2022", population: 36.89, gdp: 661712.3, gdpPerCapita: 17938, growth: 5.3, inflation: 13.2, unemployment: 2.9, source: "Eurostat / Statistics Poland" },
    { year: "2023", population: 36.75, gdp: 751931.7, gdpPerCapita: 20459, growth: 0.2, inflation: 10.9, unemployment: 2.8, source: "Eurostat / Statistics Poland" },
    { year: "2024", population: 36.62, gdp: 852229.8, gdpPerCapita: 23272, growth: 3.2, inflation: 3.7, unemployment: 2.9, source: "Eurostat / Statistics Poland" },
    { year: "2025", population: 36.5, gdp: 922865.5, gdpPerCapita: 25286, growth: 3.6, inflation: 3.3, unemployment: 3.1, source: "Eurostat / Statistics Poland" },
  ],
  hungary: [
    { year: "2021", population: 9.65, gdp: 154971.7, gdpPerCapita: 16057, growth: 7.2, inflation: 5.2, unemployment: 4.0, source: "Eurostat / Hungarian Central Statistical Office" },
    { year: "2022", population: 9.61, gdp: 168546.2, gdpPerCapita: 17538, growth: 4.2, inflation: 15.3, unemployment: 3.6, source: "Eurostat / Hungarian Central Statistical Office" },
    { year: "2023", population: 9.6, gdp: 196983.7, gdpPerCapita: 20520, growth: -0.8, inflation: 17.0, unemployment: 4.1, source: "Eurostat / Hungarian Central Statistical Office" },
    { year: "2024", population: 9.58, gdp: 206156.2, gdpPerCapita: 21509, growth: 0.7, inflation: 3.7, unemployment: 4.5, source: "Eurostat / Hungarian Central Statistical Office" },
    { year: "2025", population: 9.54, gdp: 218833.9, gdpPerCapita: 22940, growth: 0.5, inflation: 4.4, unemployment: 4.4, source: "Eurostat / Hungarian Central Statistical Office" },
  ],
  romania: [
    { year: "2021", population: 19.2, gdp: 240986.6, gdpPerCapita: 12550, growth: 5.6, inflation: 4.1, unemployment: 5.6, source: "Eurostat / INSSE" },
    { year: "2022", population: 19.04, gdp: 280777.4, gdpPerCapita: 14744, growth: 4.2, inflation: 12.0, unemployment: 5.6, source: "Eurostat / INSSE" },
    { year: "2023", population: 19.06, gdp: 321577.9, gdpPerCapita: 16876, growth: 2.3, inflation: 9.7, unemployment: 5.6, source: "Eurostat / INSSE" },
    { year: "2024", population: 19.07, gdp: 353633.1, gdpPerCapita: 18546, growth: 0.9, inflation: 5.8, unemployment: 5.4, source: "Eurostat / INSSE" },
    { year: "2025", population: 19.04, gdp: 380058.1, gdpPerCapita: 19958, growth: 0.7, inflation: 6.8, unemployment: 6.1, source: "Eurostat / INSSE" },
  ],
  czechia: [
    { year: "2021", population: 10.49, gdp: 246012.3, gdpPerCapita: 23441, growth: 4.0, inflation: 3.3, unemployment: 2.8, source: "Eurostat / Czech Statistical Office" },
    { year: "2022", population: 10.52, gdp: 286976.8, gdpPerCapita: 27288, growth: 2.8, inflation: 14.8, unemployment: 2.2, source: "Eurostat / Czech Statistical Office" },
    { year: "2023", population: 10.83, gdp: 319099.1, gdpPerCapita: 29471, growth: 0.0, inflation: 12.0, unemployment: 2.6, source: "Eurostat / Czech Statistical Office" },
    { year: "2024", population: 10.9, gdp: 320786.5, gdpPerCapita: 29428, growth: 1.3, inflation: 2.7, unemployment: 2.6, source: "Eurostat / Czech Statistical Office" },
    { year: "2025", population: 10.91, gdp: 346583.4, gdpPerCapita: 31769, growth: 2.6, inflation: 2.3, unemployment: 2.8, source: "Eurostat / Czech Statistical Office" },
  ],
  slovakia: [
    { year: "2021", population: 5.46, gdp: 101891.6, gdpPerCapita: 18662, growth: 5.7, inflation: 2.8, unemployment: 6.8, source: "Eurostat / Statistical Office of the Slovak Republic" },
    { year: "2022", population: 5.43, gdp: 109959.8, gdpPerCapita: 20233, growth: 0.5, inflation: 12.1, unemployment: 6.1, source: "Eurostat / Statistical Office of the Slovak Republic" },
    { year: "2023", population: 5.43, gdp: 123538.7, gdpPerCapita: 22756, growth: 2.1, inflation: 11.0, unemployment: 5.8, source: "Eurostat / Statistical Office of the Slovak Republic" },
    { year: "2024", population: 5.42, gdp: 130207.5, gdpPerCapita: 24003, growth: 1.9, inflation: 3.2, unemployment: 5.3, source: "Eurostat / Statistical Office of the Slovak Republic" },
    { year: "2025", population: 5.42, gdp: 136754.3, gdpPerCapita: 25234, growth: 0.8, inflation: 4.2, unemployment: 5.4, source: "Eurostat / Statistical Office of the Slovak Republic" },
  ],
  slovenia: [
    { year: "2021", population: 2.11, gdp: 52032.4, gdpPerCapita: 24672, growth: 8.4, inflation: 2.0, unemployment: 4.8, source: "Eurostat / SURS" },
    { year: "2022", population: 2.11, gdp: 56881.6, gdpPerCapita: 26994, growth: 2.7, inflation: 9.3, unemployment: 4.0, source: "Eurostat / SURS" },
    { year: "2023", population: 2.12, gdp: 64050, gdpPerCapita: 30255, growth: 2.4, inflation: 7.2, unemployment: 3.7, source: "Eurostat / SURS" },
    { year: "2024", population: 2.12, gdp: 67418.1, gdpPerCapita: 31742, growth: 1.7, inflation: 2.0, unemployment: 3.7, source: "Eurostat / SURS" },
    { year: "2025", population: 2.13, gdp: 70486.2, gdpPerCapita: 33079, growth: 1.1, inflation: 2.5, unemployment: 3.9, source: "Eurostat / SURS" },
  ],
  serbia: [
    { year: "2021", population: 6.87, gdp: 55931.3, gdpPerCapita: 8140, growth: 7.9, inflation: null, unemployment: 11.2, source: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import" },
    { year: "2022", population: 6.8, gdp: 63512.8, gdpPerCapita: 9344, growth: 2.7, inflation: null, unemployment: 9.6, source: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import" },
    { year: "2023", population: 6.64, gdp: 75205.2, gdpPerCapita: 11324, growth: 3.7, inflation: null, unemployment: 9.5, source: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import" },
    { year: "2024", population: 6.61, gdp: 83257.9, gdpPerCapita: 12605, growth: 3.9, inflation: null, unemployment: 8.6, source: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import" },
    { year: "2025", population: 6.57, gdp: 88672.8, gdpPerCapita: 13501, growth: 2.0, inflation: null, unemployment: 8.7, source: "Eurostat / Statistical Office of Serbia; CPI pending RZS/NBS import" },
  ],
  austria: [
    { year: "2021", population: 8.93, gdp: 406231.5, gdpPerCapita: 45477, growth: 4.9, inflation: 2.8, unemployment: 6.2, source: "Eurostat / Statistics Austria" },
    { year: "2022", population: 8.98, gdp: 449382.2, gdpPerCapita: 50049, growth: 5.3, inflation: 8.6, unemployment: 4.8, source: "Eurostat / Statistics Austria" },
    { year: "2023", population: 9.1, gdp: 477837.3, gdpPerCapita: 52482, growth: -0.8, inflation: 7.7, unemployment: 5.1, source: "Eurostat / Statistics Austria" },
    { year: "2024", population: 9.16, gdp: 494087.6, gdpPerCapita: 53947, growth: -0.7, inflation: 2.9, unemployment: 5.2, source: "Eurostat / Statistics Austria" },
    { year: "2025", population: 9.2, gdp: 514328.1, gdpPerCapita: 55922, growth: 0.8, inflation: 3.6, unemployment: 5.7, source: "Eurostat / Statistics Austria" },
  ],
  croatia: [
    { year: "2021", population: 3.89, gdp: 58390.4, gdpPerCapita: 14999, growth: 12.6, inflation: 2.7, unemployment: 7.5, source: "Eurostat / Croatian Bureau of Statistics" },
    { year: "2022", population: 3.86, gdp: 67609.4, gdpPerCapita: 17505, growth: 7.3, inflation: 10.7, unemployment: 6.8, source: "Eurostat / Croatian Bureau of Statistics" },
    { year: "2023", population: 3.85, gdp: 79186.3, gdpPerCapita: 20563, growth: 3.8, inflation: 8.4, unemployment: 6.1, source: "Eurostat / Croatian Bureau of Statistics" },
    { year: "2024", population: 3.86, gdp: 85905.2, gdpPerCapita: 22244, growth: 3.8, inflation: 4.0, unemployment: 5.0, source: "Eurostat / Croatian Bureau of Statistics" },
    { year: "2025", population: 3.87, gdp: 92975.1, gdpPerCapita: 23998, growth: 3.4, inflation: 4.4, unemployment: 4.9, source: "Eurostat / Croatian Bureau of Statistics" },
  ],
};

export function getEconomicFiveYearRows(countrySlug: string): EconomicYearRow[] {
  return economicTimeSeriesByCountry[countrySlug] ?? [];
}

export function getLatestEconomicRow(countrySlug: string) {
  return getEconomicFiveYearRows(countrySlug).at(-1);
}
