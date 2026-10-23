import type { Locale } from "@/i18n/config";
import { newsTranslations } from "./newsTranslations";

type EventText = { id: string; title: string; summary: string };
export type PresentedEventField = { text: string; lang: string; originalLabel?: string };
function field(original: string, approved: string | undefined, locale: Locale, name: string): PresentedEventField {
  if (locale === "en" && typeof approved === "string" && approved.trim()) return { text: approved, lang: "en" };
  // The event's source language is not the language of its Atlas editorial text.
  const lang = /[\u3400-\u9fff]/.test(original) ? "zh-CN" : "und";
  return { text: original, lang, ...(locale === "en" ? { originalLabel: `Original ${name} (${lang === "zh-CN" ? "Chinese" : "language not specified"}; approved English unavailable)` } : {}) };
}
export function eventPresentation(event: EventText, locale: Locale) {
  const approved = Object.hasOwn(newsTranslations, event.id) ? newsTranslations[event.id] : undefined;
  return { title: field(event.title, approved?.title, locale, "title"), summary: field(event.summary, approved?.summary, locale, "summary") };
}
