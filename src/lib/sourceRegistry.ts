export type SourceCategory = "official" | "statistics" | "elections" | "macro" | "news" | "chinaEcon";

export type SourceRegistryItem = {
  label: string;
  url: string;
  category: SourceCategory;
  language: string;
  note: string;
};

export const sourceCategoryLabels: Record<SourceCategory, string> = {
  official: "政府与制度",
  statistics: "统计数据",
  elections: "选举数据",
  macro: "宏观经济",
  news: "当地语新闻",
  chinaEcon: "对华经贸",
};

export const countrySourceRegistry: Record<string, SourceRegistryItem[]> = {
  poland: [
    { label: "Gov.pl", url: "https://www.gov.pl/", category: "official", language: "PL / EN", note: "政府部门、总理府与政策文件入口。" },
    { label: "Statistics Poland", url: "https://stat.gov.pl/en/", category: "statistics", language: "PL / EN", note: "人口、经济、区域统计与专题数据。" },
    { label: "PKW / wybory.gov.pl", url: "https://wybory.gov.pl/index/", category: "elections", language: "PL / EN", note: "全国选举与公投结果入口。" },
    { label: "Narodowy Bank Polski", url: "https://nbp.pl/en/", category: "macro", language: "PL / EN", note: "货币、通胀、金融与宏观背景。" },
    { label: "Polish Press Agency", url: "https://www.pap.pl/", category: "news", language: "PL", note: "波兰语国家级新闻线索入口。" },
  ],
  hungary: [
    { label: "Kormany.hu", url: "https://kormany.hu/en", category: "official", language: "HU / EN", note: "政府新闻、部长会议与政策材料。" },
    { label: "Hungarian Central Statistical Office", url: "https://www.ksh.hu/?lang=en", category: "statistics", language: "HU / EN", note: "人口、产业、贸易与区域统计。" },
    { label: "National Election Office", url: "https://vtr.valasztas.hu/", category: "elections", language: "HU", note: "选举结果与投票数据入口。" },
    { label: "Magyar Nemzeti Bank", url: "https://www.mnb.hu/en", category: "macro", language: "HU / EN", note: "央行、金融、通胀和宏观报告。" },
    { label: "MTI", url: "https://mti.hu/", category: "news", language: "HU", note: "匈牙利语新闻线索入口。" },
  ],
  czechia: [
    { label: "Government of Czechia", url: "https://vlada.gov.cz/en/", category: "official", language: "CS / EN", note: "政府、总理和政策文件入口。" },
    { label: "Czech Statistical Office", url: "https://csu.gov.cz/home", category: "statistics", language: "CS / EN", note: "统计数据、人口普查与区域数据。" },
    { label: "Volby.cz", url: "https://www.volby.cz/index_en.htm", category: "elections", language: "CS / EN", note: "捷克统计局维护的选举结果入口。" },
    { label: "Czech National Bank", url: "https://www.cnb.cz/en/", category: "macro", language: "CS / EN", note: "货币、金融稳定与宏观经济材料。" },
    { label: "CTK", url: "https://www.ctk.eu/", category: "news", language: "CS / EN", note: "捷克语新闻线索入口。" },
  ],
  slovakia: [
    { label: "Government Office of Slovakia", url: "https://www.vlada.gov.sk//", category: "official", language: "SK / EN", note: "政府成员、政策与公告入口。" },
    { label: "Statistical Office of the Slovak Republic", url: "https://slovak.statistics.sk/", category: "statistics", language: "SK / EN", note: "经济、人口、区域与选举统计。" },
    { label: "volby.statistics.sk", url: "https://volby.statistics.sk/", category: "elections", language: "SK", note: "斯洛伐克选举结果入口。" },
    { label: "National Bank of Slovakia", url: "https://nbs.sk/en/", category: "macro", language: "SK / EN", note: "央行、金融、宏观与欧元区材料。" },
    { label: "TASR", url: "https://www.tasr.sk/", category: "news", language: "SK", note: "斯洛伐克语新闻线索入口。" },
  ],
  germany: [
    { label: "Federal Government", url: "https://www.bundesregierung.de/", category: "official", language: "DE / EN", note: "联邦政府、政策与新闻入口。" },
    { label: "Federal Statistical Office", url: "https://www.destatis.de/EN/Home/_node.html", category: "statistics", language: "DE / EN", note: "人口、经济、价格、劳动力与联邦州统计。" },
    { label: "Federal Returning Officer", url: "https://www.bundeswahlleiterin.de/en.html", category: "elections", language: "DE / EN", note: "联邦选举结果与选举数据入口。" },
    { label: "Deutsche Bundesbank", url: "https://www.bundesbank.de/en", category: "macro", language: "DE / EN", note: "央行、金融、宏观与统计材料。" },
    { label: "Tagesschau", url: "https://www.tagesschau.de/", category: "news", language: "DE", note: "德语国家级新闻线索入口。" },
  ],
  romania: [
    { label: "Government of Romania", url: "https://gov.ro/en", category: "official", language: "RO / EN", note: "政府、政策与公告入口。" },
    { label: "National Institute of Statistics", url: "https://insse.ro/cms/en", category: "statistics", language: "RO / EN", note: "人口、经济、县级与专题统计。" },
    { label: "Permanent Electoral Authority", url: "https://www.roaep.ro/", category: "elections", language: "RO", note: "选举管理与结果资料入口。" },
    { label: "National Bank of Romania", url: "https://www.bnr.ro/Home.aspx", category: "macro", language: "RO / EN", note: "央行、金融、通胀与宏观材料。" },
    { label: "Agerpres", url: "https://www.agerpres.ro/", category: "news", language: "RO", note: "罗马尼亚语国家级新闻线索入口。" },
  ],
  slovenia: [
    { label: "Government of Slovenia", url: "https://www.gov.si/en/", category: "official", language: "SL / EN", note: "政府、政策与公告入口。" },
    { label: "Statistical Office of Slovenia", url: "https://www.stat.si/StatWeb/en", category: "statistics", language: "SL / EN", note: "人口、经济、地区与专题统计。" },
    { label: "State Election Commission", url: "https://www.dvk-rs.si/", category: "elections", language: "SL", note: "选举结果与选举管理入口。" },
    { label: "Bank of Slovenia", url: "https://www.bsi.si/en", category: "macro", language: "SL / EN", note: "央行、金融与宏观材料。" },
    { label: "STA", url: "https://www.sta.si/", category: "news", language: "SL", note: "斯洛文尼亚语新闻线索入口。" },
  ],
  serbia: [
    { label: "Government of Serbia", url: "https://www.srbija.gov.rs/", category: "official", language: "SR / EN", note: "政府、政策与公告入口。" },
    { label: "Statistical Office of Serbia", url: "https://www.stat.gov.rs/en-US/", category: "statistics", language: "SR / EN", note: "人口、经济、地区与专题统计。" },
    { label: "Republic Electoral Commission", url: "https://www.rik.parlament.gov.rs/", category: "elections", language: "SR", note: "选举结果与选举管理入口。" },
    { label: "National Bank of Serbia", url: "https://www.nbs.rs/en/", category: "macro", language: "SR / EN", note: "央行、金融、通胀与宏观材料。" },
    { label: "Tanjug", url: "https://www.tanjug.rs/", category: "news", language: "SR", note: "塞尔维亚语新闻线索入口。" },
  ],
  austria: [
    { label: "Federal Chancellery", url: "https://www.bundeskanzleramt.gv.at/en.html", category: "official", language: "DE / EN", note: "政府、政策与联邦材料入口。" },
    { label: "Statistics Austria", url: "https://www.statistik.at/en", category: "statistics", language: "DE / EN", note: "人口、经济、州级与专题统计。" },
    { label: "Federal Ministry of the Interior Elections", url: "https://www.bmi.gv.at/412_english/", category: "elections", language: "DE / EN", note: "选举结果与内政部选举资料入口。" },
    { label: "Oesterreichische Nationalbank", url: "https://www.oenb.at/en/", category: "macro", language: "DE / EN", note: "央行、金融与宏观材料。" },
    { label: "ORF", url: "https://orf.at/", category: "news", language: "DE", note: "奥地利德语新闻线索入口。" },
  ],
  croatia: [
    { label: "Government of Croatia", url: "https://vlada.gov.hr/", category: "official", language: "HR / EN", note: "政府、政策与公告入口。" },
    { label: "Croatian Bureau of Statistics", url: "https://dzs.gov.hr/", category: "statistics", language: "HR / EN", note: "人口、经济、县级与专题统计。" },
    { label: "State Electoral Commission", url: "https://www.izbori.hr/", category: "elections", language: "HR", note: "选举结果与选举管理入口。" },
    { label: "Croatian National Bank", url: "https://www.hnb.hr/en", category: "macro", language: "HR / EN", note: "央行、金融与宏观材料。" },
    { label: "HINA", url: "https://www.hina.hr/", category: "news", language: "HR", note: "克罗地亚语新闻线索入口。" },
  ],
};

export const globalSourceRegistry: SourceRegistryItem[] = [
  { label: "World Bank Data API", url: "https://api.worldbank.org/v2/", category: "macro", language: "EN", note: "仅作过渡基准、历史序列补充和跨国交叉核验，不作为正式主源。" },
  { label: "Eurostat", url: "https://ec.europa.eu/eurostat", category: "statistics", language: "EN", note: "用于欧盟口径交叉核验和区域统计补充；正式国别口径优先采用各国统计部门。" },
  { label: "UN Comtrade", url: "https://comtradeplus.un.org/", category: "chinaEcon", language: "EN", note: "后续对华双边贸易数据候选来源。" },
  { label: "ITC Trade Map", url: "https://www.trademap.org/", category: "chinaEcon", language: "EN", note: "商品贸易结构与双边贸易交叉核验。" },
  { label: "geoBoundaries", url: "https://www.geoboundaries.org/api.html", category: "statistics", language: "EN", note: "当前 ADM1 边界数据来源。" },
];

export function getCountrySources(countrySlug: string) {
  return countrySourceRegistry[countrySlug] ?? [];
}
