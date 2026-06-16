import { additionalCountries } from "./additionalCountries";

export type Party = {
  shortName: string;
  nameZh: string;
  familyZh: string;
  color: string;
  role?: "governing" | "opposition" | "support";
};

export type Region = {
  slug: string;
  nameZh: string;
  nameEn: string;
  typeZh: string;
  capitalZh?: string;
};

export type EconomicMetric = {
  label: string;
  value: string;
  note?: string;
};

export type ChinaProject = {
  name: string;
  sector: string;
  status: string;
  note: string;
};

export type SourceRef = {
  label: string;
  url: string;
};

export type Country = {
  slug: string;
  iso2: string;
  nameZh: string;
  nameEn: string;
  capitalZh: string;
  polityZh: string;
  parliamentZh: string;
  currency: string;
  euMember: boolean;
  natoMember: boolean;
  headOfGovernmentZh: string;
  headOfStateZh: string;
  governmentZh: string;
  governmentNoteZh: string;
  summaryZh: string;
  parties: Party[];
  regions: Region[];
  economicMetrics: EconomicMetric[];
  chinaTradeNote: string;
  chinaProjects: ChinaProject[];
  sources: SourceRef[];
};

const v4Countries: Country[] = [
  {
    slug: "poland",
    iso2: "PL",
    nameZh: "波兰",
    nameEn: "Poland",
    capitalZh: "华沙",
    polityZh: "议会共和制",
    parliamentZh: "两院制：众议院与参议院",
    currency: "PLN",
    euMember: true,
    natoMember: true,
    headOfGovernmentZh: "唐纳德·图斯克",
    headOfStateZh: "卡罗尔·纳夫罗茨基",
    governmentZh: "公民联盟、第三道路、新左翼组成的联合政府",
    governmentNoteZh: "政府信息以波兰总理府页面为主要核验来源；总统信息需在正式资料页继续核验。",
    summaryZh: "V4 中体量最大的国家，也是区域安全、欧盟政策、能源转型和对华贸易比较的重要参照。",
    parties: [
      { shortName: "KO", nameZh: "公民联盟", familyZh: "自由保守 / 亲欧中间派", color: "#f28c28", role: "governing" },
      { shortName: "PiS", nameZh: "法律与公正党", familyZh: "民族保守 / 右翼", color: "#123b7a", role: "opposition" },
      { shortName: "TD", nameZh: "第三道路", familyZh: "中间派 / 农民党-自由派联盟", color: "#8fbf3f", role: "governing" },
      { shortName: "NL", nameZh: "新左翼", familyZh: "社会民主 / 左翼", color: "#c7355d", role: "governing" },
      { shortName: "Konf.", nameZh: "联盟党", familyZh: "民族自由主义 / 右翼", color: "#222222", role: "opposition" },
    ],
    regions: [
      ["lower-silesian", "下西里西亚省", "Lower Silesian Voivodeship", "省", "弗罗茨瓦夫"],
      ["kuyavian-pomeranian", "库亚维-滨海省", "Kuyavian-Pomeranian Voivodeship", "省", "比得哥什 / 托伦"],
      ["lublin", "卢布林省", "Lublin Voivodeship", "省", "卢布林"],
      ["lubusz", "卢布usz省", "Lubusz Voivodeship", "省", "戈茹夫 / 绿山城"],
      ["lodz", "罗兹省", "Lodz Voivodeship", "省", "罗兹"],
      ["lesser-poland", "小波兰省", "Lesser Poland Voivodeship", "省", "克拉科夫"],
      ["masovian", "马佐夫舍省", "Masovian Voivodeship", "省", "华沙"],
      ["opole", "奥波莱省", "Opole Voivodeship", "省", "奥波莱"],
      ["subcarpathian", "喀尔巴阡山省", "Subcarpathian Voivodeship", "省", "热舒夫"],
      ["podlaskie", "波德拉谢省", "Podlaskie Voivodeship", "省", "比亚韦斯托克"],
      ["pomeranian", "滨海省", "Pomeranian Voivodeship", "省", "格但斯克"],
      ["silesian", "西里西亚省", "Silesian Voivodeship", "省", "卡托维兹"],
      ["swietokrzyskie", "圣十字省", "Swietokrzyskie Voivodeship", "省", "凯尔采"],
      ["warmian-masurian", "瓦尔米亚-马祖里省", "Warmian-Masurian Voivodeship", "省", "奥尔什丁"],
      ["greater-poland", "大波兰省", "Greater Poland Voivodeship", "省", "波兹南"],
      ["west-pomeranian", "西滨海省", "West Pomeranian Voivodeship", "省", "什切青"],
    ].map(toRegion),
    economicMetrics: [
      { label: "欧盟成员", value: "是" },
      { label: "北约成员", value: "是" },
      { label: "货币", value: "PLN" },
      { label: "第一版经济数据", value: "待接入各国统计部门最新数据" },
    ],
    chinaTradeNote: "第一版优先展示贸易规模、物流通道、制造业、消费品和跨境电商相关数据；具体贸易额待接入 Eurostat/Comext 或各国统计数据。",
    chinaProjects: [
      { name: "中欧班列与波兰物流节点", sector: "物流 / 铁路", status: "运营 / 待量化", note: "用于展示波兰在中欧陆路物流中的位置，第一版先作为经贸合作案例占位。" },
      { name: "制造业与消费品贸易", sector: "贸易 / 制造业", status: "持续", note: "后续按品类拆分进口、出口与贸易差额。" },
    ],
    sources: [
      { label: "波兰总理府", url: "https://www.gov.pl/web/primeminister/prime-minister" },
      { label: "Eurostat", url: "https://ec.europa.eu/eurostat" },
    ],
  },
  {
    slug: "hungary",
    iso2: "HU",
    nameZh: "匈牙利",
    nameEn: "Hungary",
    capitalZh: "布达佩斯",
    polityZh: "议会共和制",
    parliamentZh: "一院制：国民议会",
    currency: "HUF",
    euMember: true,
    natoMember: true,
    headOfGovernmentZh: "彼得·马扎尔",
    headOfStateZh: "舒尤克·陶马什",
    governmentZh: "Tisza 党主导的新政府，具体内阁结构待官方页面补充",
    governmentNoteZh: "2026 年 5 月政府更替信息先以多家新闻报道和后续官方核验为准，页面保留“待复核”提示。",
    summaryZh: "V4 中对华经贸合作最具代表性的案例之一，适合优先展示电池产业、汽车供应链、物流与基础设施项目。",
    parties: [
      { shortName: "TISZA", nameZh: "尊重与自由党", familyZh: "保守 / 中间偏右 / 反腐改革", color: "#1f6f8b", role: "governing" },
      { shortName: "Fidesz", nameZh: "青年民主主义者联盟", familyZh: "民族保守 / 右翼", color: "#f28c28", role: "opposition" },
      { shortName: "KDNP", nameZh: "基督教民主人民党", familyZh: "基督教民主", color: "#1d4f91", role: "opposition" },
      { shortName: "DK", nameZh: "民主联盟", familyZh: "社会自由 / 中左翼", color: "#2852a0", role: "opposition" },
      { shortName: "Mi Hazank", nameZh: "我们的祖国运动", familyZh: "极右翼 / 民族主义", color: "#6b6b6b", role: "opposition" },
    ],
    regions: [
      ["budapest", "布达佩斯", "Budapest", "首都", "布达佩斯"],
      ["bacs-kiskun", "巴奇-基什孔州", "Bacs-Kiskun County", "州", "凯奇凯梅特"],
      ["baranya", "巴兰尼亚州", "Baranya County", "州", "佩奇"],
      ["bekes", "贝凯什州", "Bekes County", "州", "贝凯什乔包"],
      ["borsod-abauj-zemplen", "包尔绍德-奥包乌伊-曾普伦州", "Borsod-Abauj-Zemplen County", "州", "米什科尔茨"],
      ["csongrad-csanad", "琼格拉德-乔纳德州", "Csongrad-Csanad County", "州", "塞格德"],
      ["fejer", "费耶尔州", "Fejer County", "州", "塞克什白堡"],
      ["gyor-moson-sopron", "杰尔-莫雄-肖普朗州", "Gyor-Moson-Sopron County", "州", "杰尔"],
      ["hajdu-bihar", "豪伊杜-比豪尔州", "Hajdu-Bihar County", "州", "德布勒森"],
      ["heves", "赫维什州", "Heves County", "州", "埃格尔"],
      ["jasz-nagykun-szolnok", "亚斯-瑙吉孔-索尔诺克州", "Jasz-Nagykun-Szolnok County", "州", "索尔诺克"],
      ["komarom-esztergom", "科马罗姆-埃斯泰尔戈姆州", "Komarom-Esztergom County", "州", "陶陶巴尼奥"],
      ["nograd", "诺格拉德州", "Nograd County", "州", "绍尔戈陶尔扬"],
      ["pest", "佩斯州", "Pest County", "州", "布达佩斯"],
      ["somogy", "绍莫吉州", "Somogy County", "州", "考波什堡"],
      ["szabolcs-szatmar-bereg", "索abol奇-索特马尔-贝拉格州", "Szabolcs-Szatmar-Bereg County", "州", "尼赖吉哈佐"],
      ["tolna", "托尔瑙州", "Tolna County", "州", "塞克萨德"],
      ["vas", "沃什州", "Vas County", "州", "松博特海伊"],
      ["veszprem", "维斯普雷姆州", "Veszprem County", "州", "维斯普雷姆"],
      ["zala", "佐洛州", "Zala County", "州", "佐洛埃格塞格"],
    ].map(toRegion),
    economicMetrics: [
      { label: "欧盟成员", value: "是" },
      { label: "北约成员", value: "是" },
      { label: "货币", value: "HUF" },
      { label: "第一版重点", value: "中国投资与汽车/电池产业" },
    ],
    chinaTradeNote: "第一版优先展示电池产业、汽车供应链、物流和基础设施项目；后续补充年度贸易额、投资规模与项目状态。",
    chinaProjects: [
      { name: "布达佩斯-贝尔格莱德铁路匈牙利段", sector: "铁路 / 基础设施", status: "建设 / 延期风险待核验", note: "适合作为中国基础设施合作项目状态追踪样例。" },
      { name: "中国电池与新能源汽车供应链投资", sector: "电池 / 汽车", status: "在建 / 运营并存", note: "后续按企业、地区、金额和状态拆分。" },
    ],
    sources: [
      { label: "Euronews: Hungary 2026 government change", url: "https://www.euronews.com/my-europe/2026/05/09/peter-magyar-sworn-in-as-hungarys-new-prime-minister-after-landslide-april-election-victor" },
      { label: "Eurostat", url: "https://ec.europa.eu/eurostat" },
    ],
  },
  {
    slug: "czechia",
    iso2: "CZ",
    nameZh: "捷克",
    nameEn: "Czechia",
    capitalZh: "布拉格",
    polityZh: "议会共和制",
    parliamentZh: "两院制：众议院与参议院",
    currency: "CZK",
    euMember: true,
    natoMember: true,
    headOfGovernmentZh: "安德烈·巴比什",
    headOfStateZh: "彼得·帕维尔",
    governmentZh: "ANO 主导政府，联盟细节待继续补充",
    governmentNoteZh: "捷克政府官网当前列出安德烈·巴比什为总理。",
    summaryZh: "中欧工业国家，对华经贸关系、产业政策和政治变化之间的差异适合后续专题分析。",
    parties: [
      { shortName: "ANO", nameZh: "不满公民行动", familyZh: "民粹 / 中间派至中右", color: "#263f8c", role: "governing" },
      { shortName: "ODS", nameZh: "公民民主党", familyZh: "保守 / 中右", color: "#034ea2", role: "opposition" },
      { shortName: "STAN", nameZh: "市长和独立人士", familyZh: "自由 / 地方主义", color: "#7dbb42", role: "opposition" },
      { shortName: "Pirates", nameZh: "海盗党", familyZh: "自由 / 进步主义", color: "#111111", role: "opposition" },
      { shortName: "SPD", nameZh: "自由和直接民主", familyZh: "民族民粹 / 右翼", color: "#1f4d9a", role: "opposition" },
    ],
    regions: [
      ["prague", "布拉格", "Prague", "首都", "布拉格"],
      ["central-bohemian", "中波希米亚州", "Central Bohemian Region", "州", "布拉格"],
      ["south-bohemian", "南波希米亚州", "South Bohemian Region", "州", "捷克布杰约维采"],
      ["plzen", "比尔森州", "Plzen Region", "州", "比尔森"],
      ["karlovy-vary", "卡罗维发利州", "Karlovy Vary Region", "州", "卡罗维发利"],
      ["usti", "乌斯季州", "Usti nad Labem Region", "州", "乌斯季"],
      ["liberec", "利贝雷茨州", "Liberec Region", "州", "利贝雷茨"],
      ["hradec-kralove", "赫拉德茨-克拉洛韦州", "Hradec Kralove Region", "州", "赫拉德茨-克拉洛韦"],
      ["pardubice", "帕尔杜比采州", "Pardubice Region", "州", "帕尔杜比采"],
      ["vysocina", "维索基纳州", "Vysocina Region", "州", "伊赫拉瓦"],
      ["south-moravian", "南摩拉维亚州", "South Moravian Region", "州", "布尔诺"],
      ["olomouc", "奥洛穆茨州", "Olomouc Region", "州", "奥洛穆茨"],
      ["zlin", "兹林州", "Zlin Region", "州", "兹林"],
      ["moravian-silesian", "摩拉维亚-西里西亚州", "Moravian-Silesian Region", "州", "俄斯特拉发"],
    ].map(toRegion),
    economicMetrics: [
      { label: "欧盟成员", value: "是" },
      { label: "北约成员", value: "是" },
      { label: "货币", value: "CZK" },
      { label: "第一版重点", value: "工业、能源和贸易结构" },
    ],
    chinaTradeNote: "第一版先展示贸易关系、产业合作和投资变化的基础数据；后续可与政治态度变化分开分析。",
    chinaProjects: [
      { name: "机械、电气与工业品贸易", sector: "贸易 / 工业", status: "持续", note: "后续以贸易品类和年度数据拆分。" },
      { name: "产业合作与投资变化", sector: "投资 / 制造业", status: "待核验", note: "先保留项目槽位，避免过早做政治判断。" },
    ],
    sources: [
      { label: "捷克政府：Prime Minister", url: "https://vlada.gov.cz/en/clenove-vlady/premier/" },
      { label: "捷克政府：Government", url: "https://vlada.gov.cz/cz/vlada/" },
    ],
  },
  {
    slug: "slovakia",
    iso2: "SK",
    nameZh: "斯洛伐克",
    nameEn: "Slovakia",
    capitalZh: "布拉迪斯拉发",
    polityZh: "议会共和制",
    parliamentZh: "一院制：国民议会",
    currency: "EUR",
    euMember: true,
    natoMember: true,
    headOfGovernmentZh: "罗伯特·菲佐",
    headOfStateZh: "彼得·佩列格里尼",
    governmentZh: "方向-社会民主党、声音-社会民主党、斯洛伐克民族党组成的联合政府",
    governmentNoteZh: "政府成员信息以斯洛伐克政府官网为主要核验来源。",
    summaryZh: "位于 V4 中部，汽车产业链、欧元区身份和区域比较价值突出。",
    parties: [
      { shortName: "SMER-SD", nameZh: "方向-社会民主党", familyZh: "社会民主 / 民族民粹", color: "#b0182c", role: "governing" },
      { shortName: "HLAS-SD", nameZh: "声音-社会民主党", familyZh: "社会民主", color: "#e27d22", role: "governing" },
      { shortName: "SNS", nameZh: "斯洛伐克民族党", familyZh: "民族主义 / 右翼", color: "#1d5aa6", role: "governing" },
      { shortName: "PS", nameZh: "进步斯洛伐克", familyZh: "自由 / 进步主义", color: "#00a3a3", role: "opposition" },
      { shortName: "KDH", nameZh: "基督教民主运动", familyZh: "基督教民主", color: "#244c9a", role: "opposition" },
    ],
    regions: [
      ["bratislava", "布拉迪斯拉发州", "Bratislava Region", "自治州", "布拉迪斯拉发"],
      ["trnava", "特尔纳瓦州", "Trnava Region", "自治州", "特尔纳瓦"],
      ["trencin", "特伦钦州", "Trencin Region", "自治州", "特伦钦"],
      ["nitra", "尼特拉州", "Nitra Region", "自治州", "尼特拉"],
      ["zilina", "日利纳州", "Zilina Region", "自治州", "日利纳"],
      ["banska-bystrica", "班斯卡-比斯特里察州", "Banska Bystrica Region", "自治州", "班斯卡-比斯特里察"],
      ["presov", "普雷绍夫州", "Presov Region", "自治州", "普雷绍夫"],
      ["kosice", "科希策州", "Kosice Region", "自治州", "科希策"],
    ].map(toRegion),
    economicMetrics: [
      { label: "欧盟成员", value: "是" },
      { label: "北约成员", value: "是" },
      { label: "货币", value: "EUR" },
      { label: "第一版重点", value: "汽车产业链与区域发展" },
    ],
    chinaTradeNote: "第一版先展示汽车产业链、贸易结构和较小规模合作案例；后续补充年度贸易额和项目分布。",
    chinaProjects: [
      { name: "汽车产业链相关贸易", sector: "汽车 / 零部件", status: "持续", note: "适合作为斯洛伐克对华经贸比较的基础维度。" },
      { name: "工业品与电子产品贸易", sector: "贸易 / 工业", status: "待量化", note: "后续接入品类和年度贸易额。" },
    ],
    sources: [
      { label: "斯洛伐克政府：成员", url: "https://www.vlada.gov.sk/vlada-sr/clenovia-vlady/" },
      { label: "Eurostat", url: "https://ec.europa.eu/eurostat" },
    ],
  },
];

export const countries: Country[] = [...v4Countries, ...additionalCountries];

function toRegion([slug, nameZh, nameEn, typeZh, capitalZh]: string[]): Region {
  return { slug, nameZh, nameEn, typeZh, capitalZh };
}

export function getCountry(slug: string) {
  return countries.find((country) => country.slug === slug);
}

export function getRegion(regionSlug: string) {
  for (const country of countries) {
    const region = country.regions.find((item) => item.slug === regionSlug);
    if (region) {
      return { country, region };
    }
  }
  return null;
}

export const weeklyNews = [
  {
    country: "匈牙利",
    title: "新政府与产业投资政策成为本周观察重点",
    topic: "政治 / 经济",
    summary: "此处用于展示周报格式。后续将替换为经人工审核的国家级新闻摘要。",
  },
  {
    country: "波兰",
    title: "政府继续强调安全、基础设施和欧盟资金议题",
    topic: "政治 / 欧盟",
    summary: "第一版新闻只保存标题、来源链接、主题标签和中文摘要，不保存全文。",
  },
  {
    country: "捷克",
    title: "产业竞争力、能源供应与政府经济政策受到关注",
    topic: "经济 / 能源",
    summary: "后续可按国家、主题、是否涉中国经贸进行筛选。",
  },
  {
    country: "斯洛伐克",
    title: "政府政策、汽车产业链和区域发展是本周重点",
    topic: "政治 / 区域",
    summary: "此处用于验证新闻周报版式。",
  },
];
