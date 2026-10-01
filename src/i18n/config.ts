export const locales = ["zh-CN", "en"] as const;
export type Locale = typeof locales[number];
export const bilingualRoutes = ["/", "/countries/", "/data/", "/map/", "/models/", "/scenarios/", "/methodology/", "/legal/", "/privacy/", "/news/"] as const;
export function unlocalizedPath(path: string): string { return path.replace(/^\/en(?=\/|$)/, "") || "/"; }
export function localizedRoute(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || /^\/(research-data|geo|og|_next)\//.test(href)) return href;
  const path = unlocalizedPath(href);
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  const isPage = bilingualRoutes.some(route => (route.replace(/\/$/, "") || "/") === pathname) || /^\/countries\/[a-z]+$/.test(pathname);
  if (!isPage) return path;
  return locale === "en" ? `/en${path === "/" ? "/" : path}` : path;
}
export function localeNumber(value: number | null | undefined, locale: Locale, options: Intl.NumberFormatOptions = { maximumFractionDigits: 3 }): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const text = new Intl.NumberFormat(locale, options).format(Math.abs(value));
  return value < 0 && Number(text.replaceAll(",", "")) !== 0 ? `−${text}` : text;
}
export function localeDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
