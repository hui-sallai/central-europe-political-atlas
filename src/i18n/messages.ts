import type { Locale } from "./config";

// Reviewed presentation text only. This module contains no estimates or readiness decisions.
export const zh = {
  home: "首页", countries: "国家", data: "数据", map: "地图", models: "模型", scenarios: "情景", news: "事件", methodology: "方法论",
  openProfile: "打开档案", missing: "待接入", source: "来源", year: "年份", value: "观测值", status: "状态", unit: "单位",
  descriptive: "描述性研究", download: "下载", originalEvent: "原始事件摘要（中文，未翻译）",
  gdpGrowth: "GDP 增长", inflation: "通胀", unemployment: "失业率", gdpPerCapita: "人均 GDP",
} as const;
export type MessageKey = keyof typeof zh;
export const en: Record<MessageKey, string> = {
  home: "Home", countries: "Countries", data: "Data", map: "Map", models: "Models", scenarios: "Scenarios", news: "Events", methodology: "Methodology",
  openProfile: "Open profile", missing: "Not connected", source: "Source", year: "Year", value: "Observation", status: "Status", unit: "Unit",
  descriptive: "Descriptive research", download: "Download", originalEvent: "Original event summary (Chinese; untranslated)",
  gdpGrowth: "GDP growth", inflation: "Inflation", unemployment: "Unemployment", gdpPerCapita: "GDP per capita",
};
export const dictionaries: Record<Locale, Record<MessageKey, string>> = { "zh-CN": zh, en };
export function t(locale: Locale, key: MessageKey): string { return dictionaries[locale][key]; }
