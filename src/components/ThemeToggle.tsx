"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

// Appearance switch: follow the system, or force light / dark. The resolved theme is written to html[data-theme]
// (the inline script in layout.tsx does the same before first paint, so there is no flash of the wrong theme).
type Preference = "system" | "light" | "dark";
const KEY = "atlas-theme";
const labels: Record<Preference, string> = { system: "跟随系统", light: "浅色", dark: "深色" };
const next: Record<Preference, Preference> = { system: "light", light: "dark", dark: "system" };

function readPreference(): Preference {
  try { const value = window.localStorage.getItem(KEY); return value === "light" || value === "dark" ? value : "system"; } catch { return "system"; }
}

function apply(preference: Preference) {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const locale = useLocale();
  const displayLabels = locale === "en" ? { system: "System", light: "Light", dark: "Dark" } : labels;
  const [preference, setPreference] = useState<Preference>("system");

  useEffect(() => {
    const id = window.setTimeout(() => setPreference(readPreference()), 0);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (readPreference() === "system") apply("system"); };
    media.addEventListener("change", onChange);
    return () => { window.clearTimeout(id); media.removeEventListener("change", onChange); };
  }, []);

  function cycle() {
    const value = next[preference];
    try { if (value === "system") window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, value); } catch { /* storage unavailable: apply for this page only */ }
    apply(value);
    setPreference(value);
  }

  return (
    <button type="button" onClick={cycle} className="theme-toggle whitespace-nowrap rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent)]" aria-label={locale === "en" ? `Appearance: ${displayLabels[preference]} (click to switch)` : `外观：${displayLabels[preference]}（点击切换）`} data-theme-preference={preference}>
      {locale === "en" ? "Appearance: " : "外观："}{displayLabels[preference]}
    </button>
  );
}

// Runs before hydration (inlined in <head>): resolve the stored preference or the system setting.
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
