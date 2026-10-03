// Publisher attribution shown on the web, in Research Snapshots and in export READMEs.
// Data lives in src/content/sourceAttributions.json (also read by the research-package build and legal-security:validate).
import data from "@/content/sourceAttributions.json";

export type SourceAttribution = {
  id: string;
  match: RegExp;
  en: string;
  zh: string;
  licenceUrl: string;
  /** Shown only where the Atlas presents the source in Chinese translation. */
  zhTranslationNotice?: string;
};

export const BIS_TRANSLATION_NOTICE_ZH = data.translation_notices.bis.zh;
export const BIS_TRANSLATION_NOTICE_EN = data.translation_notices.bis.en;

const notices: Record<string, { zh: string; en: string }> = data.translation_notices;

export const SOURCE_ATTRIBUTIONS: SourceAttribution[] = data.sources.map((entry) => ({
  id: entry.id,
  match: new RegExp(entry.match, entry.match_flags),
  en: entry.en,
  zh: entry.zh,
  licenceUrl: entry.licence_url,
  zhTranslationNotice: entry.zh_translation_notice ? notices[entry.zh_translation_notice]?.zh : undefined,
}));

export function attributionsFor(...texts: Array<string | null | undefined>): SourceAttribution[] {
  // "Eurostat/GISCO" is the GISCO attribution, not a separate Eurostat statistics source.
  const joined = texts.filter(Boolean).join(" \n ").replace(/Eurostat\s*\/\s*GISCO/gi, "GISCO");
  return SOURCE_ATTRIBUTIONS.filter((entry) => entry.match.test(joined));
}

export function attributionLines(locale: "zh" | "en", ...texts: Array<string | null | undefined>): string[] {
  const entries = attributionsFor(...texts);
  const lines = entries.map((entry) => (locale === "en" ? entry.en : entry.zh));
  if (locale === "zh") for (const entry of entries) if (entry.zhTranslationNotice) lines.push(entry.zhTranslationNotice);
  return lines;
}
