"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { primaryNavItems } from "@/lib/siteStructure";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedRoute, unlocalizedPath } from "@/i18n/config";
const englishLabels: Record<string, string> = { "/": "Home", "/countries": "Countries", "/data": "Data", "/politics": "Politics", "/models": "Models", "/scenarios": "Scenarios", "/news": "Events", "/map": "Map", "/methodology": "Methodology" };

// Primary navigation: inline links from `sm` up; below that a "菜单" button that expands a vertical list.
// The list closes on navigation and on Escape. Links are rendered in both states, so crawlers see them.
export function SiteNav({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const pathname = unlocalizedPath(usePathname() ?? "/");
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = (className: string) => primaryNavItems.map((item) => (
    <Link key={item.href} href={localizedRoute(item.href, locale)} onClick={() => setOpen(false)} aria-current={isCurrent(item.href) ? "page" : undefined}
      className={`${className} ${isCurrent(item.href) ? "text-[var(--accent)]" : "hover:text-[var(--accent)]"}`}>
      {locale === "en" ? englishLabels[item.href.replace(/\/$/, "") || "/"] : item.label}
    </Link>
  ));

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden gap-x-3 py-1 text-sm font-semibold text-[var(--muted)] xl:flex">{links("whitespace-nowrap")}</div>
        <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] xl:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((value) => !value)}>
          {locale === "en" ? (open ? "Close menu" : "Menu") : (open ? "关闭菜单" : "菜单")}
        </button>
        {children}
      </div>
      <div id="mobile-nav" hidden={!open} className="basis-full border-t border-[var(--line)] pt-2 xl:hidden">
        <div className="grid grid-cols-2 gap-1 text-sm font-semibold text-[var(--muted)]">{links("rounded-lg px-2 py-2")}</div>
      </div>
    </>
  );
}
