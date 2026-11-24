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
    let rafId = 0;
    let observedChild: Element | null = null;

    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setCanScroll(overflow);
      setAtEnd(overflow && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };

    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;
    const syncChildObservation = () => {
      const nextChild = el.firstElementChild;
      if (nextChild === observedChild) return;
      if (observedChild) resizeObserver?.unobserve(observedChild);
      observedChild = nextChild;
      if (observedChild) resizeObserver?.observe(observedChild);
    };

    update();
    resizeObserver?.observe(el);
    syncChildObservation();

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            syncChildObservation();
            scheduleUpdate();
          })
        : null;
    mutationObserver?.observe(el, { childList: true, subtree: true });

    const parentDetails = el.closest("details");
    parentDetails?.addEventListener("toggle", scheduleUpdate);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", scheduleUpdate);
      parentDetails?.removeEventListener("toggle", scheduleUpdate);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
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
