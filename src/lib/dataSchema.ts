export type SchemaTableId = "countries" | "indicatorDictionary" | "observations" | "sources" | "chinaProjects" | "newsEvents";

export type SchemaField = {
  key: string;
  labelZh: string;
  labelEn: string;
  required: boolean;
  note?: string;
};

export type DataTableSchema = {
  id: SchemaTableId;
  title: string;
  purpose: string;
  usedBy: string;
  fields: SchemaField[];
};

export const dataTableSchemas: DataTableSchema[] = [
  {
    id: "countries",
    title: "国家表",
    purpose: "管理十国基础信息，作为国家选择、国家卡片和跨表关联的主表。",
    usedBy: "所有页面国家选择和国家卡片",
    fields: [
      { key: "country_code", labelZh: "国家代码", labelEn: "Country code", required: true, note: "建议使用 ISO2 或内部 slug，必须唯一。" },
      { key: "name_zh", labelZh: "中文名", labelEn: "Chinese name", required: true },
      { key: "name_en", labelZh: "英文名", labelEn: "English name", required: true },
      { key: "eu_member", labelZh: "欧盟成员", labelEn: "EU member", required: true },
      { key: "eurozone_member", labelZh: "欧元区成员", labelEn: "Eurozone member", required: true },
      { key: "regional_group", labelZh: "区域组别", labelEn: "Regional group", required: true, note: "如 V4、Balkan、DACH、Adriatic。" },
      { key: "priority", labelZh: "优先级", labelEn: "Priority", required: true, note: "用于补数和展示顺序。" },
      { key: "notes", labelZh: "备注", labelEn: "Notes", required: false },
    ],
  },
  {
    id: "indicatorDictionary",
    title: "指标字典表",
    purpose: "定义每个指标的口径，保证数据页、方法论页和后续分析说明使用同一套指标解释。",
    usedBy: "数据页、方法论页",
    fields: [
      { key: "indicator_id", labelZh: "指标ID", labelEn: "Indicator ID", required: true, note: "必须唯一，如 gdp_nominal_eur。" },
      { key: "name_zh", labelZh: "中文名", labelEn: "Chinese name", required: true },
      { key: "name_en", labelZh: "英文名", labelEn: "English name", required: true },
      { key: "category", labelZh: "类别", labelEn: "Category", required: true, note: "财政、外部、能源、产业、对华经贸等。" },
      { key: "unit", labelZh: "单位", labelEn: "Unit", required: true },
      { key: "frequency", labelZh: "频率", labelEn: "Frequency", required: true, note: "年度、季度、月度。" },
      { key: "source_priority", labelZh: "来源优先级", labelEn: "Source priority", required: true },
      { key: "model_use", labelZh: "分析用途", labelEn: "Analysis use", required: true, note: "可进入后续分析、仅展示、禁止进入分析计算。" },
      { key: "risk_direction", labelZh: "方向解释", labelEn: "Direction meaning", required: false, note: "数值上升代表压力上升、压力下降或仅作背景解释。" },
      { key: "transform", labelZh: "转换方式", labelEn: "Transform", required: false, note: "同比、标准化、对数、占 GDP 比重等。" },
    ],
  },
  {
    id: "observations",
    title: "观测值表",
    purpose: "存放每个国家、地区、时间点和指标对应的实际数值，是后续分析计算的核心事实表。",
    usedBy: "数据工作台和后续分析计算",
    fields: [
      { key: "country_code", labelZh: "国家", labelEn: "Country", required: true },
      { key: "region_code", labelZh: "地区", labelEn: "Region", required: false, note: "国家级数据可为空；ADM1/ADM2 数据必须填写。" },
      { key: "indicator_id", labelZh: "指标", labelEn: "Indicator", required: true },
      { key: "date", labelZh: "日期", labelEn: "Date", required: true },
      { key: "frequency", labelZh: "频率", labelEn: "Frequency", required: true },
      { key: "value", labelZh: "数值", labelEn: "Value", required: true },
      { key: "unit", labelZh: "单位", labelEn: "Unit", required: true },
      { key: "source_id", labelZh: "来源", labelEn: "Source", required: true },
      { key: "status", labelZh: "状态", labelEn: "Status", required: true, note: "正式数据、待核验、待接入、结构样例。" },
      { key: "updated_at", labelZh: "更新时间", labelEn: "Updated at", required: true },
      { key: "notes", labelZh: "备注", labelEn: "Notes", required: false },
    ],
  },
  {
    id: "sources",
    title: "来源表",
    purpose: "管理所有数据来源，记录来源可靠性、更新频率和使用说明。",
    usedBy: "来源说明、数据可信度、方法论",
    fields: [
      { key: "source_id", labelZh: "来源ID", labelEn: "Source ID", required: true, note: "内部唯一标识。" },
      { key: "source_name", labelZh: "来源名称", labelEn: "Source name", required: true },
      { key: "source_type", labelZh: "类型", labelEn: "Type", required: true, note: "官方统计、政府、选举、新闻、研究机构等。" },
      { key: "reliability_level", labelZh: "可靠性等级", labelEn: "Reliability level", required: true, note: "A/B/C/D 四级；A/B 可作正式数据或事件依据，C 只作补充线索，D 不进入正式数据、事件库和模型计算。" },
      { key: "url", labelZh: "链接", labelEn: "URL", required: true },
      { key: "update_frequency", labelZh: "更新频率", labelEn: "Update frequency", required: false },
      { key: "usage_notes", labelZh: "使用说明", labelEn: "Usage notes", required: false },
    ],
  },
  {
    id: "chinaProjects",
    title: "对华项目表",
    purpose: "把经贸样本变成可查询、可量化、可追踪的项目数据。",
    usedBy: "对华经贸项目库、产业依赖分析预留",
    fields: [
      { key: "project_id", labelZh: "项目ID", labelEn: "Project ID", required: true },
      { key: "project_name", labelZh: "项目名", labelEn: "Project name", required: true },
      { key: "country_code", labelZh: "国家", labelEn: "Country", required: true },
      { key: "region_code", labelZh: "地区", labelEn: "Region", required: false },
      { key: "sector", labelZh: "行业", labelEn: "Sector", required: true },
      { key: "actors", labelZh: "主体", labelEn: "Actors", required: false },
      { key: "amount_eur", labelZh: "金额", labelEn: "Amount", required: false, note: "统一换算为欧元，保留原币种备注。" },
      { key: "project_status", labelZh: "状态", labelEn: "Status", required: true },
      { key: "risk_tags", labelZh: "关注标签", labelEn: "Focus tags", required: false },
      { key: "source_url", labelZh: "来源链接", labelEn: "Source URL", required: true },
    ],
  },
  {
    id: "newsEvents",
    title: "新闻事件表",
    purpose: "把新闻卡片转成事件变量，服务新闻页、事件库和事件解释。",
    usedBy: "新闻页、事件库、事件解释",
    fields: [
      { key: "event_id", labelZh: "事件ID", labelEn: "Event ID", required: true },
      { key: "date", labelZh: "日期", labelEn: "Date", required: true },
      { key: "country_code", labelZh: "国家", labelEn: "Country", required: true },
      { key: "title", labelZh: "标题", labelEn: "Title", required: true },
      { key: "source_id", labelZh: "来源", labelEn: "Source", required: true },
      { key: "topic", labelZh: "主题", labelEn: "Topic", required: true },
      { key: "event_type", labelZh: "事件类型", labelEn: "Event type", required: true },
      { key: "direction", labelZh: "方向", labelEn: "Direction", required: false, note: "正向、负向、中性或待判定。" },
      { key: "intensity", labelZh: "强度", labelEn: "Intensity", required: false, note: "只有完成量化规则后才填写。" },
      { key: "model_impact", labelZh: "分析边界", labelEn: "Analysis boundary", required: true, note: "进入后续分析、当前不进入分析计算、仅作事件解释。" },
      { key: "china_related", labelZh: "是否涉华", labelEn: "China related", required: true },
      { key: "summary", labelZh: "摘要", labelEn: "Summary", required: true },
      { key: "status", labelZh: "状态", labelEn: "Status", required: true },
    ],
  },
];
