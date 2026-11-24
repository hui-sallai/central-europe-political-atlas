"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

// Presentation-only wrapper for wide research tables: preserves keyboard-focusable scrolling and surfaces a subtle
// scroll cue when columns overflow horizontally on narrower viewports.
export function ScrollableTableRegion({
  label,
  className = "mt-4",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const en = useLocale() === "en";
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setCanScroll(overflow);
      setAtEnd(overflow && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={className}>
      {canScroll ? (
        <p className="mb-1.5 text-xs text-[var(--muted)]" data-table-scroll-cue>
          {atEnd
            ? en
              ? "Scrolled to the last column — scroll left to review earlier columns."
              : "已滚动至末列，可向左滚动查看前面各列。"
            : en
              ? "Scroll horizontally to inspect all columns →"
              : "左右滚动查看全部列 →"}
        </p>
      ) : null}
      <div ref={ref} className="data-table-viewport" tabIndex={0} role="region" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
