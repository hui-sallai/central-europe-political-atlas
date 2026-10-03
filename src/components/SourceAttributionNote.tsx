"use client";
import { useLocale } from "@/i18n/LocaleProvider";
import { attributionsFor } from "@/lib/sourceAttribution";

// Compact publisher attribution for a source panel; in Chinese it adds translation notices where required (e.g. BIS).
export function SourceAttributionNote({ sources, className = "" }: { sources: Array<string | null | undefined>; className?: string }) {
  const locale = useLocale() === "en" ? "en" : "zh";
  const entries = attributionsFor(...sources);
  if (!entries.length) return null;
  return (
    <div className={`text-[11px] leading-5 text-[var(--muted)] ${className}`} data-source-attribution={entries.map((entry) => entry.id).join(" ")} data-original-language="true">
      {entries.map((entry) => (
        <p key={entry.id}>
          <a href={entry.licenceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{locale === "en" ? entry.en : entry.zh}</a>
          {locale === "zh" && entry.zhTranslationNotice ? <span className="mt-1 block" data-translation-notice={entry.id}>{entry.zhTranslationNotice}</span> : null}
        </p>
      ))}
    </div>
  );
}
