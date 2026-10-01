"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localizedRoute } from "./config";
import { useLocale } from "./LocaleProvider";
export function LanguageSwitcher() {
  const locale = useLocale(); const pathname = usePathname();
  const [suffix, setSuffix] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setSuffix(window.location.search + window.location.hash), 0); return () => window.clearTimeout(timer); }, [pathname]);
  const target = locale === "en" ? "zh-CN" : "en";
  return <a className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold" href={localizedRoute(pathname ?? "/", target) + suffix} hrefLang={target} onClick={(event) => { event.preventDefault(); window.location.assign(localizedRoute(window.location.pathname, target) + window.location.search + window.location.hash); }} title={locale === "en" ? "Switch to Chinese" : "切换到英文"}>{locale === "en" ? "中文" : "English"}</a>;
}
