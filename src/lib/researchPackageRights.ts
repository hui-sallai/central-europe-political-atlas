import registry from "../../docs/legal-security/source_rights_registry.json";
import { readStoredArchive, sha256Hex } from "./researchPackageArchive";
import type { InspectedSnapshot } from "./researchPackageSnapshot";

export type SnapshotRights = {
  status: "verified_permitted_use" | "restricted_redistribution" | "unknown_pending_verification";
  scope: "original_archive" | "normalized_members" | "reference_only";
  attribution: string[];
  terms_url: string | null;
  registry_sources: { id: string; terms_url: string; licence: string; attribution: string }[];
  modification_notice: string | null;
  basis: string;
};

// Pins for finite, reviewed Atlas extracts. The tests reconstruct these bytes with buildSnapshot
// from admitted rows, including the same archived query dimension codes used by useSerbiaSors.
// Export time is excluded from the two CSVs. Each whole-archive pin is a figure-free build at the
// documented fixture time; it permits those exact ancillary bytes only. None is a capture receipt.
const sorsExtracts = [
  {
    data: "32dc6d5c95e16c585c7567bb6a9b220f899b3cb82cd196091fe4b8a5e62e1454",
    sources: "0fea6dc6b324e6ba35bec790b0aeab70323c15e0e00105c8c7ca5e05a0661761",
    archive: "a54adf0dc4af00c342104a863fd46e42577c6a55da3abdb7fb66c917cc15d12b",
    dataset: "03010601IND01", subset: "Serbian national CPI, total (2006=100), 2007-01 to 2025-12",
    count: 228, upstreamCount: 29880, upstreamDigest: "b428aa42ff64e1338f503a54406f4bf2f2a4d4e0712a567fbced301a7d7f1c60",
  }, {
    data: "970a79c0a6f7693561dd05f8cba9c3a4a14eaca551983355b4f9dab8dd5bc204",
    sources: "df7b9c82eefb75487a90e23b5d32fe6beff570f3eba43e9d80444c490d7267c9",
    archive: "172532245edb5b508bdde930695c50461642b82b00542839ec6edb64351ba0cd",
    dataset: "240003010102IND03", subset: "Serbian national unemployment rate, ages 15–74, 2011-Q1 to 2026-Q2",
    count: 62, upstreamCount: 1302, upstreamDigest: "65ec122c69fd125ee930fa3a3a5bdd8d2d7fce353e0e886cbec6289c0f5c8a25",
  }, {
    data: "760bed4e9e0b894627ea0997792b3296864af8895d105a2795887e218db873d1",
    sources: "ce4cb36c5597a1ae84f0c2fa6be42c02057347e1e372e72888aaa205151d91b0",
    archive: "b2acc019dd340413c90af17b905256cc4ae4f7c2606e883a8d886449bc4ea302",
    dataset: "03010601IND03", subset: "Serbian national CPI, total (same month of the previous year = 100), 2007-01 to 2025-12",
    count: 228, upstreamCount: 29978, upstreamDigest: "a0fb04c3037df9f4fdcda34836db48bee22c69e3eb78c4db0e32f767887c5f93",
    retrievedAt: "2026-11-13T19:31:01.945Z",
  }, {
    data: "812bc785be91e07cb20f18d308e11dcbded3d0261586bffab975c850eaf72fe3",
    sources: "ab130e992879869a0ad9b27262e668d19e8a554bae9d740452e61be186f89dba",
    archive: "b25b710f03e53b907b7098560183a99f2fe3deadf3245f26ee7f9749e6d5bae6",
    dataset: "210105IND02", subset: "Serbian retail trade turnover volume, constant prices, seasonally adjusted (2021=100), 2000-01 to 2026-09",
    count: 321, upstreamCount: 4815, upstreamDigest: "5495f234b4850f640f09c4719076a89af7b4118ae66d62f6735f3b4cd4b0ba1d",
    retrievedAt: "2026-11-13T19:31:21.167Z",
    statusNotice: " Three observations are provisional and may be revised by SORS.",
  },
] as const;

type RegistryRow = (typeof registry.sources)[number];

function registryReferences(rows: RegistryRow[]) {
  return rows.map(r => ({id: r.source_id, terms_url: r.terms_url, licence: r.licence_name, attribution: r.required_attribution_text}));
}

function usesRegistryEndpoint(source: string, endpoint: string) {
  // A directory prefix is admitted only when the registry records a trailing slash.
  if (source === endpoint) return true;
  return endpoint.endsWith("/") && source.startsWith(endpoint);
}

function sameMembers(reference: ReadonlyMap<string, Uint8Array>, submitted: ReadonlyMap<string, Uint8Array>) {
  if (reference.size !== submitted.size) return false;
  for (const [name, content] of reference) {
    const other = submitted.get(name);
    if (!other || content.length !== other.length || !content.every((x, i) => x === other[i])) return false;
  }
  return true;
}

/** Assess the named bytes after structural inspection. No caller-supplied licence, digest or URL can grant permission. */
export async function assessSnapshotRights(
  snapshot: InspectedSnapshot, members: ReadonlyMap<string, Uint8Array>, originalBytes?: Uint8Array,
): Promise<SnapshotRights> {
  const recorded = snapshot.manifest.source_attributions;
  const candidates = registry.sources.filter(r => snapshot.sources.some(s => usesRegistryEndpoint(s.source_url, r.exact_source_url)));
  const restricted = candidates.some(r => r.noncommercial_only || r.review_status === "rights_conflict_reported" || r.normalized_republication === "not_cleared");
  const references = registryReferences(candidates);
  const fallback: SnapshotRights = {
    status: restricted ? "restricted_redistribution" : "unknown_pending_verification",
    scope: "reference_only", attribution: [...new Set([...recorded, ...references.map(r => r.attribution).filter(Boolean)])],
    terms_url: references.length === 1 ? references[0].terms_url : null, registry_sources: references,
    modification_notice: null, basis: restricted ? "recorded_source_conditions_restrict_redistribution" : "no_admitted_member_pair",
  };
  const sourceRule = candidates.find(r => r.source_id === "src-sors");
  const data = members.get("data.csv"), sources = members.get("sources.csv");
  if (restricted || !data || !sources || !sourceRule || snapshot.manifest.view_type !== "serbia_sors" ||
      snapshot.manifest.comparability_status !== "serbia_only_not_cross_country_comparable" ||
      sourceRule.review_status !== "verified" || sourceRule.normalized_republication !== "cleared_with_conditions" ||
      sourceRule.reuse_right !== "cleared_with_conditions" || sourceRule.derived_values !== "cleared_with_conditions" ||
      sourceRule.publisher_confirmation_required || sourceRule.third_party_rights_possible || !sourceRule.required_attribution_text || !sourceRule.terms_url) return fallback;

  const [dataDigest, sourceDigest] = await Promise.all([sha256Hex(data), sha256Hex(sources)]);
  const entry = sorsExtracts.find(e => e.data === dataDigest && e.sources === sourceDigest);
  if (!entry || snapshot.sources.length !== 1 || snapshot.sources[0].dataset !== entry.dataset) return fallback;

  let scope: SnapshotRights["scope"] = "normalized_members";
  if (!snapshot.figure && originalBytes && originalBytes.length === snapshot.byteLength && sourceRule.raw_redistribution === "cleared_with_conditions") {
    const copy = new Uint8Array(originalBytes);
    const digest = await sha256Hex(copy);
    if (digest === entry.archive && digest === snapshot.sha256 && sameMembers(readStoredArchive(copy), members)) {
      scope = "original_archive";
    }
  }

  const acquisitionNotice = "retrievedAt" in entry
    ? ` Modified by Central Europe Political Atlas. SORS response retrieved at ${entry.retrievedAt}.`
    : "";
  return {status: "verified_permitted_use", scope,
    attribution: [...new Set([sourceRule.required_attribution_text, ...recorded])],
    terms_url: sourceRule.terms_url, registry_sources: registryReferences([sourceRule]),
    modification_notice: `Atlas selected ${entry.count} records for ${entry.subset} from ${entry.upstreamCount} SORS response records. ` +
      `Atlas arranged them in reverse period order and added identifiers, English column names, units and comparability fields. ` +
      `The recorded values are unchanged. Source: ${snapshot.sources[0].source_url}. Recorded upstream response SHA-256: ${entry.upstreamDigest}.` +
      acquisitionNotice + ("statusNotice" in entry ? entry.statusNotice : ""),
    basis: scope === "original_archive" ? "pinned_figure_free_archive_and_sors_terms" : "pinned_csv_pair_and_sors_terms",
  };
}
