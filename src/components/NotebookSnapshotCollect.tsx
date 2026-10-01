"use client";
import type { SnapshotInput } from "@/lib/researchSnapshot";
import { NotebookCollect } from "./NotebookCollect";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedRoute } from "@/i18n/config";
import { notebookMessages } from "@/content/notebookMessages";
export function NotebookSnapshotCollect({ create, disabled }: { create: () => SnapshotInput; disabled: boolean }) {
  const locale = useLocale();
  return <NotebookCollect disabled={disabled} label={notebookMessages[locale].addView} create={async () => {
    const [{ notebookSnapshotView }, { englishText }] = await Promise.all([import("./notebookEvidence"),import("@/i18n/reviewedText")]); const input = create(); const url = new URL(input.shareable_view_url); url.pathname = localizedRoute(url.pathname,locale); url.hash = window.location.hash; input.shareable_view_url = url.href; const draft = notebookSnapshotView(input); draft.warning_labels = { "zh-CN": draft.warnings, en: draft.warnings.map(englishText) }; return draft;
  }} />;
}
