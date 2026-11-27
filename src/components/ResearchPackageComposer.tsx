"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { localizedRoute, type Locale } from "@/i18n/config";
import type { BriefTemplate } from "@/lib/notebookBrief";
import type { ResearchNotebook } from "@/lib/researchNotebook";
import type {
  SnapshotAttachment,
  buildResearchPackage,
  verifyResearchPackageIntegrity,
} from "@/lib/researchPackage";
import {
  PACKAGE_LIMITS,
  classifyComposerError,
  evidenceFingerprint,
  formatByteLength,
  normalizeExpectedDigest,
  packageComposerMessages,
} from "@/lib/researchPackageComposerMessages";
import { EXTERNAL_SOURCE_REL, externalSourceLink } from "@/lib/safeNavigation";

type BuiltPackage = Awaited<ReturnType<typeof buildResearchPackage>>;
type VerifiedPackage = Awaited<ReturnType<typeof verifyResearchPackageIntegrity>>;

type PreparedAttachment = {
  id: string;
  evidenceId: string;
  filename: string;
  handle: SnapshotAttachment;
  evidenceSig: string;
  deselectGen: number;
  expectedSha256?: string;
};

type Props = {
  projectId: string;
  notebook: ResearchNotebook;
  selectedIds: string[];
  deselectGen: Record<string, number>;
  locale: Locale;
  template: BriefTemplate;
  reportTime: string;
  ensureTimestamp: () => string;
  disabled: boolean;
};

export function ResearchPackageComposer(props: Props) {
  // Remounting on project or Notebook identity change guarantees complete transient state isolation.
  const projectKey = `${props.projectId}:${props.notebook.notebook_id}`;
  return <ResearchPackageComposerInner key={projectKey} {...props} />;
}

function ResearchPackageComposerInner({
  projectId,
  notebook,
  selectedIds,
  deselectGen,
  locale,
  template,
  reportTime,
  ensureTimestamp,
  disabled,
}: Props) {
  const m = packageComposerMessages[locale];
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([]);
  const [targetEvidenceId, setTargetEvidenceId] = useState<string>(selectedIds[0] ?? "");
  const [expectedAttachSha, setExpectedAttachSha] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builtState, setBuiltState] = useState<{ result: BuiltPackage; stateKey: string } | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [copyShaStatus, setCopyShaStatus] = useState<string>("");

  const [verifyExpectedSha, setVerifyExpectedSha] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifiedPackage | null>(null);
  const [verifyFilename, setVerifyFilename] = useState<string>("");

  const inspectRevRef = useRef(0);
  const buildRevRef = useRef(0);
  const verifyRevRef = useRef(0);
  const downloadUrlRef = useRef<string | null>(null);
  const latestStateRef = useRef({ projectId, notebook, selectedIds, deselectGen });

  const revokeDownloadUrl = () => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
  };

  useEffect(() => {
    latestStateRef.current = { projectId, notebook, selectedIds, deselectGen };
  }, [projectId, notebook, selectedIds, deselectGen]);

  useEffect(() => () => {
    inspectRevRef.current += 1;
    buildRevRef.current += 1;
    verifyRevRef.current += 1;
    revokeDownloadUrl();
  }, []);

  const effectiveTargetId = selectedIds.includes(targetEvidenceId) ? targetEvidenceId : (selectedIds[0] ?? "");

  // Purely derive currently valid handles: deselected, reselected-after-drop, or modified evidence/sources drop immediately.
  const activeAttachments = useMemo(
    () =>
      attachments.filter(
        entry =>
          selectedIds.includes(entry.evidenceId) &&
          (deselectGen[entry.evidenceId] ?? 0) === entry.deselectGen &&
          evidenceFingerprint(projectId, notebook, entry.evidenceId) === entry.evidenceSig,
      ),
    [attachments, selectedIds, deselectGen, projectId, notebook],
  );

  const reportStateKey = useMemo(
    () =>
      JSON.stringify([
        projectId,
        notebook.notebook_id,
        selectedIds.map(id => [id, deselectGen[id] ?? 0, evidenceFingerprint(projectId, notebook, id)]),
        activeAttachments.map(a => `${a.evidenceId}:${a.handle.sha256}`),
        locale,
        template,
        reportTime,
        notebook.title,
        notebook.research_question,
        notebook.user_notes,
        notebook.methodology_warnings,
      ]),
    [
      projectId,
      notebook,
      selectedIds,
      deselectGen,
      activeAttachments,
      locale,
      template,
      reportTime,
    ],
  );

  // Side-effect-only invalidation of in-flight builds and old blob URLs whenever reportStateKey changes.
  useEffect(() => {
    buildRevRef.current += 1;
    revokeDownloadUrl();
  }, [reportStateKey]);

  const builtPackage = builtState && builtState.stateKey === reportStateKey ? builtState.result : null;
  const staleNotice = builtState !== null && builtState.stateKey !== reportStateKey;

  const humanizeError = (err: unknown, prefix: string): string => {
    const { code, detail } = classifyComposerError(err);
    const mapped = m.errorCodes[code];
    return mapped ? `${prefix} (${code}): ${mapped}` : `${prefix}: ${detail}`;
  };

  const handleAttachFile = async (file?: File) => {
    if (!file || !effectiveTargetId) return;
    setInspectError(null);
    const digestCheck = normalizeExpectedDigest(expectedAttachSha);
    if (!digestCheck.ok) {
      setInspectError(m.invalidDigestFormat);
      return;
    }
    if (file.size > PACKAGE_LIMITS.maxSnapshotBytes) {
      setInspectError(m.fileTooLarge);
      return;
    }
    if (activeAttachments.length >= PACKAGE_LIMITS.maxBindings) {
      setInspectError(m.bindingLimitReached);
      return;
    }
    const combinedBytes = activeAttachments.reduce((sum, a) => sum + a.handle.byte_length, 0) + file.size;
    if (combinedBytes > PACKAGE_LIMITS.maxCombinedInputBytes) {
      setInspectError(m.combinedTooLarge);
      return;
    }

    const opRev = ++inspectRevRef.current;
    const boundEvidenceId = effectiveTargetId;
    const boundSig = evidenceFingerprint(projectId, notebook, boundEvidenceId);
    const boundDeselectGen = deselectGen[boundEvidenceId] ?? 0;
    if (!boundSig) return;
    const projectSnapshot = { id: projectId, notebook };

    const isStillCurrent = () => {
      const latest = latestStateRef.current;
      return (
        inspectRevRef.current === opRev &&
        latest.selectedIds.includes(boundEvidenceId) &&
        (latest.deselectGen[boundEvidenceId] ?? 0) === boundDeselectGen &&
        evidenceFingerprint(latest.projectId, latest.notebook, boundEvidenceId) === boundSig
      );
    };

    setInspecting(true);
    try {
      const [buffer, core] = await Promise.all([
        file.arrayBuffer(),
        import("@/lib/researchPackage"),
      ]);
      if (!isStillCurrent()) return;
      const handle = await core.prepareSnapshotAttachment(
        projectSnapshot,
        boundEvidenceId,
        new Uint8Array(buffer),
        digestCheck.value,
      );
      if (!isStillCurrent()) return;
      setAttachments(prev => {
        const latest = latestStateRef.current;
        const pruned = prev.filter(
          entry =>
            latest.selectedIds.includes(entry.evidenceId) &&
            (latest.deselectGen[entry.evidenceId] ?? 0) === entry.deselectGen &&
            evidenceFingerprint(latest.projectId, latest.notebook, entry.evidenceId) === entry.evidenceSig,
        );
        if (pruned.some(a => a.evidenceId === boundEvidenceId && a.handle.sha256 === handle.sha256)) {
          setInspectError(m.duplicateAttachment);
          return pruned;
        }
        return [
          ...pruned,
          {
            id: `${boundEvidenceId}:${handle.sha256}:${boundDeselectGen}`,
            evidenceId: boundEvidenceId,
            filename: file.name,
            handle,
            evidenceSig: boundSig,
            deselectGen: boundDeselectGen,
            expectedSha256: digestCheck.value,
          },
        ];
      });
      setExpectedAttachSha("");
    } catch (err) {
      if (!isStillCurrent()) return;
      setInspectError(humanizeError(err, m.inspectErrorPrefix));
    } finally {
      if (inspectRevRef.current === opRev) setInspecting(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    setInspectError(null);
  };

  const handleBuildPackage = async () => {
    if (disabled || !selectedIds.length) return;
    const activeTime = ensureTimestamp();
    const buildStateKey = JSON.stringify([
      projectId,
      notebook.notebook_id,
      selectedIds.map(id => [id, deselectGen[id] ?? 0, evidenceFingerprint(projectId, notebook, id)]),
      activeAttachments.map(a => `${a.evidenceId}:${a.handle.sha256}`),
      locale,
      template,
      activeTime,
      notebook.title,
      notebook.research_question,
      notebook.user_notes,
      notebook.methodology_warnings,
    ]);
    const opRev = ++buildRevRef.current;
    setBuilding(true);
    setBuildError(null);
    setDownloadStatus("");
    setCopyShaStatus("");
    revokeDownloadUrl();

    const activeHandles = activeAttachments.map(a => a.handle);
    try {
      const { buildResearchPackage: buildPkg } = await import("@/lib/researchPackage");
      const result = await buildPkg({
        project: { id: projectId, notebook },
        selectedIds: [...selectedIds],
        locale,
        template,
        reportTime: activeTime,
        attachments: activeHandles,
      });
      if (buildRevRef.current !== opRev) return;
      setBuiltState({ result, stateKey: buildStateKey });
    } catch (err) {
      if (buildRevRef.current !== opRev) return;
      setBuiltState(null);
      setBuildError(humanizeError(err, m.buildErrorPrefix));
    } finally {
      if (buildRevRef.current === opRev) setBuilding(false);
    }
  };

  const handleDownloadPackage = () => {
    if (!builtPackage) return;
    revokeDownloadUrl();
    const url = URL.createObjectURL(
      new Blob([builtPackage.bytes as unknown as BlobPart], { type: "application/zip" }),
    );
    downloadUrlRef.current = url;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atlas-research-package-${locale}-${builtPackage.manifest.generated_at.slice(0, 10)}.zip`;
    anchor.click();
    setDownloadStatus(m.downloadedStatus);
  };

  const handleCopyPackageSha = async () => {
    if (!builtPackage) return;
    try {
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(builtPackage.sha256);
      setCopyShaStatus(m.copiedPackageSha);
    } catch {
      setCopyShaStatus(m.copyFailed);
    }
  };

  const handleVerifyPackage = async (file?: File) => {
    if (!file) return;
    setVerifyError(null);
    setVerifyResult(null);
    setVerifyFilename(file.name);
    const digestCheck = normalizeExpectedDigest(verifyExpectedSha);
    if (!digestCheck.ok) {
      setVerifyError(m.invalidDigestFormat);
      return;
    }
    if (file.size > PACKAGE_LIMITS.maxPackageBytes) {
      setVerifyError(m.verifyTooLarge);
      return;
    }
    const opRev = ++verifyRevRef.current;
    setVerifying(true);
    try {
      const [buffer, core] = await Promise.all([
        file.arrayBuffer(),
        import("@/lib/researchPackage"),
      ]);
      if (verifyRevRef.current !== opRev) return;
      const result = await core.verifyResearchPackageIntegrity(new Uint8Array(buffer), digestCheck.value);
      if (verifyRevRef.current !== opRev) return;
      setVerifyResult(result);
    } catch (err) {
      if (verifyRevRef.current !== opRev) return;
      setVerifyError(humanizeError(err, m.verifyFailed));
    } finally {
      if (verifyRevRef.current === opRev) setVerifying(false);
    }
  };

  const itemTitle = (id: string) => {
    const item = notebook.items.find(entry => entry.id === id);
    return item ? (item.labels?.[locale] || item.title) : id;
  };

  const manifest = builtPackage?.manifest ?? null;
  const includedEvidenceCount = manifest ? manifest.evidence.filter(e => e.disposition === "bytes_included").length : 0;
  const referenceOnlyCount = manifest ? manifest.evidence.filter(e => e.disposition === "reference_only").length : 0;
  const unboundCount = manifest ? manifest.evidence.filter(e => e.disposition === "unbound").length : 0;

  return (
    <details className="mt-6 rounded-xl border border-[var(--line)] p-4" data-research-package-composer>
      <summary className="cursor-pointer text-sm font-semibold">{m.openComposer}</summary>
      <p className="mt-3 text-sm leading-7">{m.composerIntro}</p>
      <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-xs leading-6">
        <p className="font-semibold">{m.whereToGetTitle}</p>
        <p className="mt-1 text-[var(--muted)]">{m.whereToGetBody}</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <a href={localizedRoute("/data/", locale)} className="text-[var(--accent)] underline">{m.dataLink}</a>
          <a href={localizedRoute("/map/", locale)} className="text-[var(--accent)] underline">{m.mapLink}</a>
        </div>
        <p className="mt-2 text-[var(--muted)]">{m.limitsNote}</p>
      </div>

      {/* 1. Snapshot Attachment & Inspection */}
      <section className="mt-5 border-t border-[var(--line)] pt-4" data-package-attachments aria-labelledby="package-attach-heading">
        <h3 id="package-attach-heading" className="text-base font-semibold">{m.attachHeading}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {m.selectEvidenceLabel}
            <select
              aria-label={m.selectEvidenceLabel}
              data-attachment-evidence-select
              className="field-control mt-2"
              disabled={disabled || !selectedIds.length || inspecting}
              value={effectiveTargetId}
              onChange={e => setTargetEvidenceId(e.target.value)}
            >
              {selectedIds.map((id, idx) => (
                <option key={id} value={id}>
                  {idx + 1}. {itemTitle(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {m.expectedDigestLabel}
            <input
              type="text"
              aria-label={m.expectedDigestLabel}
              data-attachment-expected-sha
              className="field-control mt-2 font-mono text-xs"
              disabled={disabled || !selectedIds.length || inspecting}
              placeholder={m.expectedDigestPlaceholder}
              value={expectedAttachSha}
              onChange={e => setExpectedAttachSha(e.target.value)}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          {m.chooseSnapshotLabel}
          <input
            type="file"
            accept=".zip,application/zip"
            aria-label={m.chooseSnapshotLabel}
            data-attachment-file-input
            disabled={disabled || !selectedIds.length || inspecting}
            className="mt-2 block max-w-full text-xs"
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void handleAttachFile(file);
            }}
          />
        </label>
        {inspecting ? <p className="mt-2 text-xs text-[var(--muted)]" role="status">{m.inspecting}</p> : null}
        {inspectError ? <p className="mt-2 rounded border border-[var(--accent)] p-2 text-xs text-[var(--accent)]" role="alert" data-attachment-error>{inspectError}</p> : null}

        <div className="mt-4" data-prepared-attachments>
          <h4 className="text-sm font-semibold">{m.preparedHeading} ({activeAttachments.length} / {PACKAGE_LIMITS.maxBindings})</h4>
          {activeAttachments.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{m.noAttachments}</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {activeAttachments.map(entry => {
                const { handle } = entry;
                const corr = handle.correspondence;
                const rights = handle.rights;
                const hist = corr.historical_provenance;
                const builtArtifact = manifest?.artifacts.find(a => a.sha256 === handle.sha256);
                const termsLink = rights.terms_url ? externalSourceLink(rights.terms_url) : null;
                return (
                  <li key={entry.id} className="rounded-lg border border-[var(--line)] p-3 text-xs" data-prepared-attachment={entry.evidenceId}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold break-words">{m.evidenceLabel}: {itemTitle(entry.evidenceId)}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)] break-all">{entry.evidenceId}</p>
                      </div>
                      <button
                        type="button"
                        data-remove-attachment={entry.evidenceId}
                        className="rounded border border-[var(--line)] px-2.5 py-1 text-xs hover:border-[var(--accent)]"
                        disabled={disabled}
                        onClick={() => removeAttachment(entry.id)}
                      >
                        {m.removeAttachment}
                      </button>
                    </div>

                    {/* Stage A: Structural inspection */}
                    <div className="mt-3 rounded border border-[var(--line)] bg-[var(--surface-muted)] p-2.5" data-stage-a>
                      <p className="font-semibold">{m.stageA}: {m.stageAPassed}</p>
                      <p className="mt-1 break-all">{m.fileLabel}: {entry.filename} · {m.sizeLabel}: {formatByteLength(handle.byte_length)} ({handle.byte_length} B)</p>
                      <p className="mt-1 font-mono text-[11px] break-all">{m.sha256Label}: {handle.sha256}</p>
                      <p className="mt-1" data-figure-status>
                        <span className="font-semibold">{m.figureLabel}:</span>{" "}
                        {handle.figure
                          ? `${handle.figure.name} (${formatByteLength(handle.figure.byteLength)}, SHA-256: ${handle.figure.sha256}) — ${m.figureQuarantinedNote}`
                          : m.figureNone}
                      </p>
                    </div>

                    {/* Stage B: Evidence correspondence + separate Historical provenance */}
                    <div className="mt-2 rounded border border-[var(--line)] p-2.5" data-stage-b={corr.status}>
                      <p className="font-semibold">{m.stageB}: {m.correspondenceLabels[corr.status]} <span className="font-mono font-normal text-[11px] text-[var(--muted)]">({corr.status})</span></p>
                      <p className="mt-1 text-[var(--muted)]">{m.correspondenceDescriptions[corr.status]}</p>
                      <div className="mt-2 rounded bg-[var(--surface-muted)] p-2" data-historical-provenance>
                        <p className="font-semibold">{m.historicalHeading}</p>
                        <p className="mt-0.5 text-[var(--muted)]">{m.historicalUnverified}</p>
                        <p className="mt-1">{m.collectedAtLabel}: <span className="font-mono">{hist.notebook_collected_at}</span> · {m.declaredGeneratedLabel}: <span className="font-mono">{hist.declared_generated_at}</span></p>
                        <p className="mt-0.5">{m.temporalRelationLabel}: {m.temporalRelations[hist.temporal_relation as keyof typeof m.temporalRelations] ?? hist.temporal_relation}</p>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold">{m.technicalDetails}</summary>
                        <dl className="mt-2 space-y-1.5">
                          <div><dt className="font-semibold">{m.matchEvidenceLabel}</dt><dd className="break-words">{corr.match_evidence.length ? corr.match_evidence.join(", ") : m.noneRecorded}</dd></div>
                          <div><dt className="font-semibold">{m.differencesLabel}</dt><dd className="break-words">{corr.differences.length ? corr.differences.join(", ") : m.noneRecorded}</dd></div>
                          <div><dt className="font-semibold">{m.matchedRowIdsLabel}</dt><dd className="font-mono break-all">{corr.matched_row_ids.length ? `${corr.matched_row_ids.length} (${corr.matched_row_ids.slice(0, 10).join(", ")}${corr.matched_row_ids.length > 10 ? "…" : ""})` : m.noneRecorded}</dd></div>
                          <div><dt className="font-semibold">{m.sourceRelationshipsLabel}</dt><dd className="break-words">{corr.source_relationships.length ? corr.source_relationships.map(r => `${r.snapshot_source_id}: ${r.status}${r.differences.length ? ` [${r.differences.join(", ")}]` : ""}`).join(" · ") : m.noneRecorded}</dd></div>
                        </dl>
                      </details>
                    </div>

                    {/* Stage C: Redistribution permission */}
                    <div className="mt-2 rounded border border-[var(--line)] p-2.5" data-stage-c={rights.status}>
                      <p className="font-semibold">{m.stageC}: {m.rightsLabels[rights.status]} <span className="font-mono font-normal text-[11px] text-[var(--muted)]">({rights.status})</span></p>
                      <p className="mt-1">{m.scopeLabels[rights.scope]} <span className="font-mono text-[11px] text-[var(--muted)]">({rights.scope})</span></p>
                      <p className="mt-1 text-[var(--muted)]">{m.basisLabel}: {rights.basis}</p>
                      {rights.attribution.length ? <p className="mt-1 break-words"><span className="font-semibold">{m.attributionLabel}:</span> {rights.attribution.join(" · ")}</p> : null}
                      {rights.modification_notice ? <p className="mt-1 break-words"><span className="font-semibold">{m.modificationLabel}:</span> {rights.modification_notice}</p> : null}
                      {termsLink ? (
                        <p className="mt-1 break-all">
                          <span className="font-semibold">{m.termsLinkLabel}:</span>{" "}
                          <a href={termsLink.href} rel={EXTERNAL_SOURCE_REL} className="text-[var(--accent)] underline">{termsLink.href}</a>
                        </p>
                      ) : null}
                      <p className="mt-1 text-[var(--muted)]">{m.rightsPolicyNote}</p>
                    </div>

                    {/* Stage D: Actual byte inclusion (only confirmed from built manifest) */}
                    <div className="mt-2 rounded border border-[var(--line)] bg-[var(--surface-muted)] p-2.5" data-stage-d={builtArtifact ? builtArtifact.disposition : "pending"}>
                      <p className="font-semibold">{m.stageD}</p>
                      {builtArtifact ? (
                        <>
                          <p className="mt-1">{m.scopeLabels[builtArtifact.disposition as keyof typeof m.scopeLabels] ?? builtArtifact.disposition} <span className="font-mono text-[11px] text-[var(--muted)]">({builtArtifact.disposition} · {builtArtifact.inclusion_reason})</span></p>
                          <p className="mt-1 font-mono text-[11px] break-all">
                            {builtArtifact.members.length ? builtArtifact.members.join(", ") : m.noneRecorded}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-[var(--muted)]">{m.stageDPending}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* 2. Build, Preview & Download */}
      <section className="mt-5 border-t border-[var(--line)] pt-4" data-package-builder aria-labelledby="package-build-heading">
        <h3 id="package-build-heading" className="text-base font-semibold">{m.buildHeading}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-build-package
            className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
            disabled={disabled || !selectedIds.length || building || inspecting}
            onClick={() => void handleBuildPackage()}
          >
            {building ? m.building : m.buildButton}
          </button>
        </div>
        {staleNotice ? <p className="mt-2 rounded border border-[var(--line)] bg-[var(--surface-muted)] p-2 text-xs" role="status" data-package-stale-notice>{m.staleInvalidated}</p> : null}
        {buildError ? <p className="mt-2 rounded border border-[var(--accent)] p-2 text-xs text-[var(--accent)]" role="alert" data-package-build-error>{buildError}</p> : null}

        {builtPackage && manifest ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] p-4 text-xs" data-package-preview>
            <h4 className="text-sm font-semibold">{m.previewHeading}</h4>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><dt className="text-[var(--muted)]">{m.coverageSelected}</dt><dd className="mt-0.5 font-semibold">{manifest.evidence.length}</dd></div>
              <div><dt className="text-[var(--muted)]">{m.coverageIncluded}</dt><dd className="mt-0.5 font-semibold" data-count-included>{includedEvidenceCount}</dd></div>
              <div><dt className="text-[var(--muted)]">{m.coverageReferenceOnly}</dt><dd className="mt-0.5 font-semibold" data-count-reference-only>{referenceOnlyCount}</dd></div>
              <div><dt className="text-[var(--muted)]">{m.coverageUnbound}</dt><dd className="mt-0.5 font-semibold" data-count-unbound>{unboundCount}</dd></div>
            </dl>
            <p className="mt-2" data-byte-coverage={manifest.byte_coverage}>
              <span className="font-semibold">{m.coverageStatusLabel}:</span>{" "}
              {manifest.byte_coverage === "bytes_for_each_selected_item"
                ? m.coverageStatusComplete
                : manifest.byte_coverage === "empty_selection"
                  ? m.coverageStatusEmpty
                  : m.coverageStatusIncomplete}
            </p>
            {includedEvidenceCount === 0 ? <p className="mt-1 text-[var(--muted)]" data-report-only-package-note>{m.reportOnlyNote}</p> : null}

            <div className="mt-3 rounded border border-[var(--line)] bg-[var(--surface-muted)] p-2.5">
              <p className="font-semibold">{m.wholePackageShaLabel}</p>
              <p className="mt-1 font-mono text-[11px] break-all" data-package-sha256>{builtPackage.sha256}</p>
              <p className="mt-1 text-[var(--muted)]">{m.sizeLabel}: {formatByteLength(builtPackage.bytes.byteLength)} ({builtPackage.bytes.byteLength} B)</p>
              <button
                type="button"
                data-copy-package-sha256
                className="mt-2 rounded border border-[var(--line)] px-2.5 py-1 text-xs"
                onClick={() => void handleCopyPackageSha()}
              >
                {m.copyPackageSha}
              </button>
              {copyShaStatus ? <span className="ml-2" role="status">{copyShaStatus}</span> : null}
            </div>

            <div className="mt-3">
              <p className="font-semibold">{m.evidenceDispositionsHeading}</p>
              <ul className="mt-1.5 space-y-1">
                {manifest.evidence.map(ev => (
                  <li key={ev.evidence_id} className="break-words" data-manifest-evidence={ev.evidence_id} data-disposition={ev.disposition}>
                    <span className="font-semibold">{itemTitle(ev.evidence_id)}</span>:{" "}
                    {m.dispositionLabels[ev.disposition as keyof typeof m.dispositionLabels] ?? ev.disposition}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={m.includedFilesHeading}>
              <p className="font-semibold">{m.includedFilesHeading} ({manifest.files.length} + package_manifest.json)</p>
              <table className="mt-1.5 w-full min-w-[540px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="py-1 pr-2">{m.filePathCol}</th>
                    <th className="py-1 pr-2">{m.fileSizeCol}</th>
                    <th className="py-1">{m.fileHashCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.files.map(f => (
                    <tr key={f.path} className="border-b border-[var(--line)]">
                      <td className="py-1 pr-2 font-mono break-all">{f.path}</td>
                      <td className="py-1 pr-2 font-mono whitespace-nowrap">{f.byte_length}</td>
                      <td className="py-1 font-mono break-all">{f.sha256}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 rounded border border-[var(--line)] bg-[var(--surface-muted)] p-2.5 leading-6" data-package-sharing-disclosure>
              {m.sharingDisclosure}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-download-package
                className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
                onClick={handleDownloadPackage}
              >
                {m.downloadPackage}
              </button>
              {downloadStatus ? <span role="status" data-package-download-status>{downloadStatus}</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* 3. Independent Local Verification */}
      <section className="mt-5 border-t border-[var(--line)] pt-4" data-package-verifier aria-labelledby="package-verify-heading">
        <h3 id="package-verify-heading" className="text-base font-semibold">{m.verifyHeading}</h3>
        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{m.verifyIntro}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {m.verifyExpectedLabel}
            <input
              type="text"
              aria-label={m.verifyExpectedLabel}
              data-verify-expected-sha
              className="field-control mt-2 font-mono text-xs"
              disabled={verifying}
              placeholder={m.expectedDigestPlaceholder}
              value={verifyExpectedSha}
              onChange={e => setVerifyExpectedSha(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {m.verifyFileLabel}
            <input
              type="file"
              accept=".zip,application/zip"
              aria-label={m.verifyFileLabel}
              data-verify-package-input
              disabled={verifying}
              className="mt-2 block max-w-full text-xs"
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void handleVerifyPackage(file);
              }}
            />
          </label>
        </div>
        {verifying ? <p className="mt-2 text-xs text-[var(--muted)]" role="status">{m.verifying}</p> : null}
        {verifyError ? <p className="mt-2 rounded border border-[var(--accent)] p-2 text-xs text-[var(--accent)]" role="alert" data-verify-error>{verifyError}</p> : null}
        {verifyResult ? (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-xs" role="status" data-verify-result={verifyResult.expected_digest}>
            <p className="font-semibold">{m.verifyInternalOk}</p>
            <p className="mt-1">
              {verifyResult.expected_digest === "matched" ? m.verifyDigestMatched : m.verifyDigestNotSupplied}
            </p>
            <p className="mt-1 break-all">{m.fileLabel}: {verifyFilename} · {m.sizeLabel}: {formatByteLength(verifyResult.byte_length)} ({verifyResult.byte_length} B)</p>
            <p className="mt-1">{m.verifiedMembersLabel}: {verifyResult.verified_members}</p>
            <p className="mt-1 font-mono text-[11px] break-all">{m.verifiedShaLabel}: {verifyResult.sha256}</p>
          </div>
        ) : null}
      </section>
    </details>
  );
}
