"use client";

import { useState } from "react";

// Copies a ready-to-paste citation for one observation. Uses the async clipboard API and falls back to a hidden
// textarea when it is unavailable (e.g. non-secure contexts); shows "已复制" briefly as confirmation.
export function CopyCitationButton({ text, label = "复制引用" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement("textarea");
        area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
        document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button type="button" onClick={copy} className="whitespace-nowrap rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] hover:border-[var(--accent)]" aria-live="polite" title={text}>
      {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : label}
    </button>
  );
}
