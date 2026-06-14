export type BasicIndicator = {
  id: string;
  label: string;
  value: string;
  year: string;
  source: string;
  status: "transitional" | "official";
  note?: string;
};

const eurostat2025Note = "2025 年最新可用官方统计口径；GDP 统一显示为欧元。";

export const basicIndicatorsByCountry: Record<string, BasicIndicator[]> = {
  germany: [
    { id: "population", label: "人口", value: "约 8360 万", year: "2025", source: "Destatis", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "4.47 万亿欧元", year: "2025", source: "Eurostat / Destatis", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "53,520 欧元", year: "2025", source: "Eurostat / Destatis", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "0.2%", year: "2025", source: "Eurostat / Destatis", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "2.3%", year: "2025", source: "Eurostat / Destatis", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "3.8%", year: "2025", source: "Eurostat / Destatis", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  poland: [
    { id: "population", label: "人口", value: "约 3749 万", year: "2025", source: "Statistics Poland", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "9228.7 亿欧元", year: "2025", source: "Eurostat / Statistics Poland", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "24,680 欧元", year: "2025", source: "Eurostat / Statistics Poland", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "3.6%", year: "2025", source: "Eurostat / Statistics Poland", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "3.3%", year: "2025", source: "Eurostat / Statistics Poland", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "3.1%", year: "2025", source: "Eurostat / Statistics Poland", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  hungary: [
    { id: "population", label: "人口", value: "约 958 万", year: "2025", source: "Hungarian Central Statistical Office", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "2188.3 亿欧元", year: "2025", source: "Eurostat / HCSO", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "23,000 欧元", year: "2025", source: "Eurostat / HCSO", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "0.5%", year: "2025", source: "Eurostat / HCSO", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "4.4%", year: "2025", source: "Eurostat / HCSO", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "4.4%", year: "2025", source: "Eurostat / HCSO", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  romania: [
    { id: "population", label: "人口", value: "约 1905 万", year: "2025", source: "INSSE", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "3800.6 亿欧元", year: "2025", source: "Eurostat / INSSE", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "19,960 欧元", year: "2025", source: "Eurostat / INSSE", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "0.7%", year: "2025", source: "Eurostat / INSSE", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "6.8%", year: "2025", source: "Eurostat / INSSE", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "6.1%", year: "2025", source: "Eurostat / INSSE", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  czechia: [
    { id: "population", label: "人口", value: "约 1089 万", year: "2025", source: "Czech Statistical Office", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "3465.8 亿欧元", year: "2025", source: "Eurostat / Czech Statistical Office", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "31,810 欧元", year: "2025", source: "Eurostat / Czech Statistical Office", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "2.6%", year: "2025", source: "Eurostat / Czech Statistical Office", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "2.3%", year: "2025", source: "Eurostat / Czech Statistical Office", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "2.8%", year: "2025", source: "Eurostat / Czech Statistical Office", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  slovakia: [
    { id: "population", label: "人口", value: "约 542 万", year: "2025", source: "Statistical Office of the Slovak Republic", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "1367.5 亿欧元", year: "2025", source: "Eurostat / Slovak Statistical Office", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "25,060 欧元", year: "2025", source: "Eurostat / Slovak Statistical Office", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "0.8%", year: "2025", source: "Eurostat / Slovak Statistical Office", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "4.2%", year: "2025", source: "Eurostat / Slovak Statistical Office", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "5.4%", year: "2025", source: "Eurostat / Slovak Statistical Office", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  slovenia: [
    { id: "population", label: "人口", value: "约 213 万", year: "2025", source: "SURS", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "704.9 亿欧元", year: "2025", source: "Eurostat / SURS", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "33,060 欧元", year: "2025", source: "Eurostat / SURS", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "1.1%", year: "2025", source: "Eurostat / SURS", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "2.5%", year: "2025", source: "Eurostat / SURS", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "3.9%", year: "2025", source: "Eurostat / SURS", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  serbia: [
    { id: "population", label: "人口", value: "约 659 万", year: "2025", source: "Statistical Office of Serbia", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "886.7 亿欧元", year: "2025", source: "Eurostat / Statistical Office of Serbia", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "13,540 欧元", year: "2025", source: "Eurostat / Statistical Office of Serbia", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "2.0%", year: "2025", source: "Eurostat / Statistical Office of Serbia", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "4.1%", year: "2025", source: "Eurostat / Statistical Office of Serbia", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "8.7%", year: "2025", source: "Eurostat / Statistical Office of Serbia", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  austria: [
    { id: "population", label: "人口", value: "约 918 万", year: "2025", source: "Statistics Austria", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "5143.3 亿欧元", year: "2025", source: "Eurostat / Statistics Austria", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "55,870 欧元", year: "2025", source: "Eurostat / Statistics Austria", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "0.8%", year: "2025", source: "Eurostat / Statistics Austria", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "3.6%", year: "2025", source: "Eurostat / Statistics Austria", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "5.7%", year: "2025", source: "Eurostat / Statistics Austria", status: "official", note: "15-74 岁劳动力口径。" },
  ],
  croatia: [
    { id: "population", label: "人口", value: "约 387 万", year: "2025", source: "Croatian Bureau of Statistics", status: "official", note: "首页不默认展示人口；国家详情页保留。" },
    { id: "gdp", label: "GDP", value: "929.8 亿欧元", year: "2025", source: "Eurostat / Croatian Bureau of Statistics", status: "official", note: eurostat2025Note },
    { id: "gdpPerCapita", label: "人均 GDP", value: "23,950 欧元", year: "2025", source: "Eurostat / Croatian Bureau of Statistics", status: "official", note: eurostat2025Note },
    { id: "growth", label: "GDP 增长", value: "3.4%", year: "2025", source: "Eurostat / Croatian Bureau of Statistics", status: "official", note: eurostat2025Note },
    { id: "inflation", label: "通胀率", value: "4.4%", year: "2025", source: "Eurostat / Croatian Bureau of Statistics", status: "official", note: "HICP 年均变化率。" },
    { id: "unemployment", label: "失业率", value: "4.9%", year: "2025", source: "Eurostat / Croatian Bureau of Statistics", status: "official", note: "15-74 岁劳动力口径。" },
  ],
};

export function getBasicIndicators(countrySlug: string) {
  return basicIndicatorsByCountry[countrySlug] ?? [];
}
