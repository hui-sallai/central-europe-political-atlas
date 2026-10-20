"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { MonthlyComparisonWorkbench } from "./MonthlyComparisonWorkbench";
import type { MonthlyPayload } from "@/lib/monthlyComparison";

export function ResearchComparisonWorkbench({ annual, countries, payload }: { annual: ReactNode; countries: { slug: string; name: string; name_zh: string }[]; payload: MonthlyPayload }) {
  const en = useLocale() === "en", [frequency, setFrequency] = useState<string | null>(null);
  const saved = useRef<Record<string, string>>({});
  useEffect(() => { const read = () => setFrequency(new URLSearchParams(window.location.search).get("compare_frequency") === "monthly" ? "monthly" : "annual"); const timer = window.setTimeout(read, 0); window.addEventListener("popstate", read); return () => { window.clearTimeout(timer); window.removeEventListener("popstate", read); }; }, []);
  function select(value: string) {
    if (!frequency || value === frequency) return;
    saved.current[frequency] = window.location.pathname + window.location.search + window.location.hash;
    window.history.replaceState(null, "", saved.current[value] ?? `${window.location.pathname}?tab=compare${value === "monthly" ? "&compare_frequency=monthly" : ""}`);
    setFrequency(value);
  }
  return <><fieldset className="mt-5 flex flex-wrap gap-4"><legend className="mb-2 font-semibold">{en ? "Observation frequency" : "观测频率"}</legend>{["annual", "monthly"].map(value => <label key={value}><input type="radio" name="comparison-frequency" checked={frequency === value} onChange={() => select(value)} /> {value === "annual" ? en ? "Annual observations" : "年度观测" : en ? "Monthly observations" : "月度观测"}</label>)}</fieldset>{frequency === "monthly" ? <MonthlyComparisonWorkbench countries={countries} payload={payload} /> : frequency === "annual" ? annual : <p role="status">{en ? "Loading comparison…" : "正在读取比较配置…"}</p>}</>;
}
