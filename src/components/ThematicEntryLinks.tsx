import Link from "next/link";
import { localizedRoute, type Locale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { coverageFor, researchThemes, type ThemeId } from "@/lib/thematicResearch";

export function thematicPageMetadata(themeId: ThemeId, locale: Locale) {
  const theme = researchThemes.find(item => item.theme_id === themeId);
  if (!theme) throw new Error("Unknown thematic workspace " + themeId);
  const language = locale === "en" ? "en" : "zh";
  return pageMetadata({
    title: theme.title[language], description: theme.description[language],
    path: localizedRoute(`/workspaces/${themeId}/`, locale), locale,
  });
}

export function ThematicEntryLinks({ locale, country }: { locale: Locale; country?: string }) {
  const language = locale === "en" ? "en" : "zh";
  const available = researchThemes.filter(theme => !country || coverageFor(country, theme.theme_id)?.theme_applicable);
  return <section aria-labelledby="thematic-research-heading" className="mt-6">
    <h2 id="thematic-research-heading" className="text-xl font-semibold">{locale === "en" ? "Thematic research" : "专题研究"}</h2>
    <ul className={country ? "mt-2 space-y-2" : "mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2"}>
      {available.map(theme => <li key={theme.theme_id}>
        <Link className="font-semibold text-[var(--accent)] underline" href={localizedRoute(`/workspaces/${theme.theme_id}/${country ? "?" + new URLSearchParams({country}) : ""}`, locale)}>{theme.title[language]}</Link>
        {!country && <p className="mt-1 text-sm text-[var(--muted)]">{theme.research_questions[0][language]}</p>}
      </li>)}
    </ul>
  </section>;
}
