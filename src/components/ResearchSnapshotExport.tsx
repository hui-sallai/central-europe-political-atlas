"use client";

import { useRef, useState } from "react";
import { buildZip } from "@/lib/clientZip";
import { buildSnapshot, type SnapshotInput } from "@/lib/researchSnapshot";
import { currentChartSvg } from "@/lib/researchFigure";

export function ResearchSnapshotExport({ create, disabled = false, chart = false }: { create: () => SnapshotInput; disabled?: boolean; chart?: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"idle" | "preparing" | "generating" | "done" | "error">("idle");
  const labels = { idle: "", preparing: "准备研究快照…", generating: "正在生成…", done: "已下载", error: "导出失败" };
  const busy = status === "preparing" || status === "generating";
  const nextFrame = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  async function download() {
    setStatus("preparing");
    try {
      await nextFrame();
      const input = create();
      const scope = button.current?.closest<HTMLElement>("[data-snapshot-scope]");
      const svg = chart && scope ? currentChartSvg(scope) : undefined;
      if (svg) input.figure = { name: "figure.svg", svg, metadata: { selection: "current_filtered_rows", palette: "neutral_print", title: input.title } };
      setStatus("generating");
      await nextFrame();
      const snapshot = buildSnapshot(input);
      const bytes = buildZip(snapshot.files, snapshot.generatedAt);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = snapshot.filename; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("done");
    } catch { setStatus("error"); }
  }
  return <span className="inline-flex flex-wrap items-center gap-2"><button ref={button} type="button" onClick={() => void download()} disabled={disabled || busy} aria-busy={busy} className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">导出研究快照</button><span role="status" className="text-xs text-[var(--muted)]">{labels[status]}</span></span>;
}
