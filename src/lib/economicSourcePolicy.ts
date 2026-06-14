export type EconomicSourcePolicy = {
  countrySlug: string;
  primaryAgency: string;
  primaryUrl: string;
  releaseType: string;
  indicators: string[];
  fallbackSources: string[];
};

export const economicSourcePolicies: EconomicSourcePolicy[] = [
  {
    countrySlug: "poland",
    primaryAgency: "Statistics Poland / GUS",
    primaryUrl: "https://stat.gov.pl/en/",
    releaseType: "国家账户、区域统计、劳动力与价格统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Narodowy Bank Polski", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "hungary",
    primaryAgency: "Hungarian Central Statistical Office / KSH",
    primaryUrl: "https://www.ksh.hu/?lang=en",
    releaseType: "人口、国民经济、产业、价格与地区统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Magyar Nemzeti Bank", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "czechia",
    primaryAgency: "Czech Statistical Office / CSU",
    primaryUrl: "https://csu.gov.cz/home",
    releaseType: "国家账户、人口、劳动力、价格与区域统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Czech National Bank", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "slovakia",
    primaryAgency: "Statistical Office of the Slovak Republic",
    primaryUrl: "https://slovak.statistics.sk/",
    releaseType: "人口、宏观经济、劳动力、价格与区域统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["National Bank of Slovakia", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "germany",
    primaryAgency: "Federal Statistical Office / Destatis",
    primaryUrl: "https://www.destatis.de/EN/Home/_node.html",
    releaseType: "国民账户、人口、价格、劳动力与联邦州统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Deutsche Bundesbank", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "romania",
    primaryAgency: "National Institute of Statistics / INS",
    primaryUrl: "https://insse.ro/cms/en",
    releaseType: "人口、国民账户、价格、劳动力与县级统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["National Bank of Romania", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "slovenia",
    primaryAgency: "Statistical Office of Slovenia / SURS",
    primaryUrl: "https://www.stat.si/StatWeb/en",
    releaseType: "人口、宏观经济、地区、价格与劳动力统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Bank of Slovenia", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "serbia",
    primaryAgency: "Statistical Office of the Republic of Serbia",
    primaryUrl: "https://www.stat.gov.rs/en-US/",
    releaseType: "人口、国民账户、地区、价格与劳动力统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["National Bank of Serbia", "World Bank", "IMF"],
  },
  {
    countrySlug: "austria",
    primaryAgency: "Statistics Austria",
    primaryUrl: "https://www.statistik.at/en",
    releaseType: "国民账户、人口、价格、劳动力与州级统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Oesterreichische Nationalbank", "Eurostat", "World Bank"],
  },
  {
    countrySlug: "croatia",
    primaryAgency: "Croatian Bureau of Statistics",
    primaryUrl: "https://dzs.gov.hr/",
    releaseType: "人口、国民账户、价格、劳动力与县级统计",
    indicators: ["人口", "GDP", "GDP 增长", "通胀", "失业", "区域经济"],
    fallbackSources: ["Croatian National Bank", "Eurostat", "World Bank"],
  },
];

export function getEconomicSourcePolicy(countrySlug: string) {
  return economicSourcePolicies.find((policy) => policy.countrySlug === countrySlug);
}
