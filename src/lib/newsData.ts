export type NewsTopic = "政治" | "经济" | "欧盟" | "能源" | "区域" | "对华经贸";

export type WeeklyNewsItem = {
  id: string;
  countrySlug: string;
  countryZh: string;
  title: string;
  topic: NewsTopic;
  summary: string;
  sourceLabel: string;
  sourceUrl?: string;
  language: string;
  weekOf: string;
  dataStatus: "sample" | "verified";
};

export type EventRecord = {
  event_id: string;
  date: string;
  country_code: string;
  region_code: string | null;
  actor: string;
  event_type: string;
  direction: string;
  intensity: number | null;
  affected_model: string;
  duration: string;
  confidence: string;
  source_status: string;
  enters_model: boolean;
  coding_status: "pending";
  model_note: string;
};

const countryCodeBySlug: Record<string, string> = {
  poland: "PL",
  hungary: "HU",
  czechia: "CZ",
  slovakia: "SK",
  germany: "DE",
  romania: "RO",
  slovenia: "SI",
  serbia: "RS",
  austria: "AT",
  croatia: "HR",
};

export function toEventRecord(item: WeeklyNewsItem): EventRecord {
  const isVerified = item.dataStatus === "verified";

  return {
    event_id: item.id,
    date: item.weekOf,
    country_code: countryCodeBySlug[item.countrySlug] ?? item.countrySlug,
    region_code: null,
    actor: "待编码",
    event_type: "待编码",
    direction: "待编码",
    intensity: null,
    affected_model: "模型层未启用",
    duration: "待编码",
    confidence: isVerified ? "来源已核验；事件编码待完成" : "结构样例",
    source_status: isVerified ? "官方来源 / 人工摘要" : "结构样例来源",
    enters_model: false,
    coding_status: "pending",
    model_note: isVerified ? "人工摘要，暂不进入模型" : "结构样例，不进入模型",
  };
}

export const weeklyNewsItems: WeeklyNewsItem[] = [
  {
    id: "hu-2026-06-24-v4-summit",
    countrySlug: "hungary",
    countryZh: "匈牙利",
    title: "匈牙利主办格德勒 V4 峰会，四国同意重启定期磋商",
    topic: "区域",
    summary: "匈牙利政府公告称，V4 四国总理在格德勒会晤，同意恢复欧洲理事会和欧盟理事会会议前的定期协调，并推进交通、能源、竞争力与文化合作。该条为官方来源的人工中文摘要。",
    sourceLabel: "匈牙利政府",
    sourceUrl: "https://kormany.hu/en/news/v4-csucs-godollon-orszagainkat-sokkal-tobb-koti-ossze-mint-ami-elvalasztja",
    language: "hu / zh",
    weekOf: "2026-06-24",
    dataStatus: "verified",
  },
  {
    id: "pl-2026-06-24-v4-summit",
    countrySlug: "poland",
    countryZh: "波兰",
    title: "波兰总理参加格德勒 V4 峰会，四国将协调欧盟议程立场",
    topic: "欧盟",
    summary: "V4 峰会公告显示，波兰总理 Donald Tusk 与匈牙利、捷克、斯洛伐克总理共同同意恢复欧盟会议前协调，议题包括欧盟多年期预算、凝聚政策、农业、扩大与绿色转型。该条为官方来源的人工中文摘要。",
    sourceLabel: "匈牙利政府",
    sourceUrl: "https://kormany.hu/en/news/v4-csucs-godollon-orszagainkat-sokkal-tobb-koti-ossze-mint-ami-elvalasztja",
    language: "hu / zh",
    weekOf: "2026-06-24",
    dataStatus: "verified",
  },
  {
    id: "cz-2026-06-24-v4-summit",
    countrySlug: "czechia",
    countryZh: "捷克",
    title: "捷克总理参加格德勒 V4 峰会，合作议题覆盖竞争力与汽车产业",
    topic: "经济",
    summary: "V4 峰会公告将竞争力、排放交易体系、汽车产业和贸易政策列为四国下一阶段协调重点，并提出恢复 V4+ 专家和高层磋商。该条为官方来源的人工中文摘要。",
    sourceLabel: "匈牙利政府",
    sourceUrl: "https://kormany.hu/en/news/v4-csucs-godollon-orszagainkat-sokkal-tobb-koti-ossze-mint-ami-elvalasztja",
    language: "hu / zh",
    weekOf: "2026-06-24",
    dataStatus: "verified",
  },
  {
    id: "sk-2026-06-24-v4-presidency",
    countrySlug: "slovakia",
    countryZh: "斯洛伐克",
    title: "斯洛伐克将接任 V4 轮值主席，四国重启高层合作",
    topic: "区域",
    summary: "格德勒峰会同时是匈牙利 V4 主席期的收官活动。公告称，四国已于 6 月 19 日完成斯洛伐克下一主席期计划的协调，并将继续推动南北交通与能源基础设施合作。该条为官方来源的人工中文摘要。",
    sourceLabel: "匈牙利政府",
    sourceUrl: "https://kormany.hu/en/news/v4-csucs-godollon-orszagainkat-sokkal-tobb-koti-ossze-mint-ami-elvalasztja",
    language: "hu / zh",
    weekOf: "2026-06-24",
    dataStatus: "verified",
  },
  {
    id: "hu-2026-w23-policy-investment",
    countrySlug: "hungary",
    countryZh: "匈牙利",
    title: "新政府与产业投资政策成为本周观察重点",
    topic: "经济",
    summary: "此处用于验证事件库结构。后续将替换为经人工审核并完成编码的事件记录。",
    sourceLabel: "来源未接入",
    language: "hu / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "pl-2026-w23-security-eu",
    countrySlug: "poland",
    countryZh: "波兰",
    title: "政府继续强调安全、基础设施和欧盟资金议题",
    topic: "欧盟",
    summary: "第一版新闻只保存标题、来源链接、主题标签和中文摘要，不保存全文。",
    sourceLabel: "来源未接入",
    language: "pl / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "cz-2026-w23-industry-energy",
    countrySlug: "czechia",
    countryZh: "捷克",
    title: "产业竞争力、能源供应与政府经济政策受到关注",
    topic: "能源",
    summary: "后续可按国家、主题、是否涉及中国经贸进行筛选。",
    sourceLabel: "来源未接入",
    language: "cs / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "sk-2026-w23-auto-regional",
    countrySlug: "slovakia",
    countryZh: "斯洛伐克",
    title: "政府政策、汽车产业链和区域发展是本周重点",
    topic: "区域",
    summary: "此处用于验证事件库版式和编码字段。",
    sourceLabel: "来源未接入",
    language: "sk / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "de-2026-w23-industry-trade",
    countrySlug: "germany",
    countryZh: "德国",
    title: "产业链、能源转型和对华贸易议题是本周观察入口",
    topic: "经济",
    summary: "正式版将接入德语新闻、官方公告和人工审核摘要。",
    sourceLabel: "来源未接入",
    language: "de / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "ro-2026-w23-black-sea-economy",
    countrySlug: "romania",
    countryZh: "罗马尼亚",
    title: "黑海、能源、港口和制造业政策进入周报观察框架",
    topic: "能源",
    summary: "正式版将接入罗马尼亚语新闻、官方公告和中文摘要。",
    sourceLabel: "来源未接入",
    language: "ro / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "si-2026-w23-port-logistics",
    countrySlug: "slovenia",
    countryZh: "斯洛文尼亚",
    title: "港口、物流和欧盟内部产业联系作为本周观察入口",
    topic: "区域",
    summary: "正式版将接入斯洛文尼亚语新闻和官方来源。",
    sourceLabel: "来源未接入",
    language: "sl / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "rs-2026-w23-infrastructure-china",
    countrySlug: "serbia",
    countryZh: "塞尔维亚",
    title: "基础设施、矿业和对华经贸项目成为周报观察入口",
    topic: "对华经贸",
    summary: "正式版需特别标注项目来源、融资状态和政治口径。",
    sourceLabel: "来源未接入",
    language: "sr / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "at-2026-w23-eu-industry",
    countrySlug: "austria",
    countryZh: "奥地利",
    title: "欧盟政策、制造业和区域物流是本周观察入口",
    topic: "欧盟",
    summary: "正式版将接入奥地利德语新闻和官方统计资料。",
    sourceLabel: "来源未接入",
    language: "de / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
  {
    id: "hr-2026-w23-adriatic-infrastructure",
    countrySlug: "croatia",
    countryZh: "克罗地亚",
    title: "亚得里亚港口、旅游和基础设施项目进入周报观察框架",
    topic: "区域",
    summary: "正式版将接入克罗地亚语新闻和官方公告。",
    sourceLabel: "来源未接入",
    language: "hr / en / zh",
    weekOf: "2026-06-01",
    dataStatus: "sample",
  },
];

export function getLatestNewsForCountry(countrySlug: string) {
  return weeklyNewsItems.find((item) => item.countrySlug === countrySlug);
}

export function getNewsByCountry(countrySlug: string) {
  return weeklyNewsItems.filter((item) => item.countrySlug === countrySlug);
}

export function getNewsTopics() {
  return Array.from(new Set(weeklyNewsItems.map((item) => item.topic)));
}

