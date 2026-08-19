"use client";

import { useState } from "react";

type CitationActionsProps = {
  plainText: string;
  apaText?: string;
  bibtexText?: string;
  label?: string;
  compact?: boolean;
};

function withAccessDate(value: string) {
  return value.replaceAll("YYYY-MM-DD", new Date().toISOString().slice(0, 10));
}

export function CitationActions({ plainText, apaText, bibtexText, label = "引用", compact = false }: CitationActionsProps) {
  const [copied, setCopied] = useState("");

  async function copy(kind: string, value: string) {
    await navigator.clipboard.writeText(withAccessDate(value));
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1800);
  }

  const actions = [
    ["plain", "Plain text", plainText],
    ...(apaText ? [["apa", "APA-like", apaText]] : []),
    ...(bibtexText ? [["bibtex", "BibTeX", bibtexText]] : []),
  ];

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "rounded-2xl border border-[var(--line)] bg-white/70 p-4"}>
      {!compact ? <p className="text-xs font-semibold text-[var(--muted)]">{label}</p> : null}
      <div className={`${compact ? "" : "mt-3"} flex flex-wrap gap-2`}>
        {actions.map(([kind, actionLabel, value]) => (
          <button
            key={kind}
            type="button"
            onClick={() => copy(kind, value)}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {copied === kind ? "已复制" : actionLabel}
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">{copied ? `${copied} citation copied` : ""}</span>
    </div>
  );
}
