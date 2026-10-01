"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localizedRoute } from "./config";
import { useLocale } from "./LocaleProvider";
import { useResearchNotebook } from "@/components/ResearchNotebookProvider";
import { notebookMessages } from "@/content/notebookMessages";
export function LanguageSwitcher() {
  const locale = useLocale(); const pathname = usePathname();
  const { state, notebook } = useResearchNotebook();
  const [suffix, setSuffix] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setSuffix(window.location.search + window.location.hash), 0); return () => window.clearTimeout(timer); }, [pathname]);
  const target = locale === "en" ? "zh-CN" : "en";
  return <a className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold" href={localizedRoute(pathname ?? "/", target) + suffix} hrefLang={target} onClick={(event) => { event.preventDefault(); if (state === "memory" && notebook && (notebook.items.length || notebook.title || notebook.research_question || notebook.user_notes) && !window.confirm(notebookMessages[locale].confirmMemoryLeave)) return; window.location.assign(localizedRoute(window.location.pathname, target) + window.location.search + window.location.hash); }} title={locale === "en" ? "Switch to Chinese" : "切换到英文"}>{locale === "en" ? "中文" : "English"}</a>;
}
