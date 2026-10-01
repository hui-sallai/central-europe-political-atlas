import { toCsv } from "./researchSnapshot";
import { PLATFORM_BASE_URL, PLATFORM_NAME, PLATFORM_VERSION } from "./releaseMetadata";
import type { Locale } from "@/i18n/config";
import { localizedRoute } from "@/i18n/config";
import type { WorkspacePayload } from "@/components/workspaceEvidence";
import { periodsInRange, workspaceLinks, type WorkspaceSelection } from "@/components/workspaceLinks";
import type { ZipFile } from "./clientZip";
import { workspaceMessages } from "@/content/workspaceMessages";
export function buildWorkspaceSnapshot(payload: WorkspacePayload, selection: WorkspaceSelection, locale: Locale, generatedAt = new Date().toISOString()) {
  if (!Number.isFinite(new Date(generatedAt).getTime()) || selection.from > selection.to || selection.countries.length < 1 || selection.countries.length > 2 || new Set(selection.countries).size !== selection.countries.length || selection.countries.some(id => !payload.countries.some(country => country.id === id))) throw new Error("Invalid workspace setup");
  const m = workspaceMessages[locale];
  const relativeLinks = workspaceLinks(payload, selection, locale);
  const absolute = (url: string) => new URL(url, PLATFORM_BASE_URL).href;
  const links = { data: relativeLinks.data.map(link => ({ ...link, url: absolute(link.url) })), map: relativeLinks.map.map(link => ({ ...link, url: absolute(link.url) })), models: relativeLinks.models.map(link => ({ ...link, url: absolute(link.url) })), events: relativeLinks.events.map(link => ({ ...link, url: absolute(link.url) })) };
  const visible = payload.cards.filter(card => card.coverage.some(row => selection.countries.includes(row.country) && periodsInRange(row.periods, selection).length));
  const visibleEvents = payload.events.filter(event => selection.countries.includes(event.country) && Number(event.date.slice(0, 4)) >= selection.from && Number(event.date.slice(0, 4)) <= selection.to).slice(0, 8);
  const sources = [...new Map([...visible.flatMap(card => card.coverage.filter(row => selection.countries.includes(row.country) && periodsInRange(row.periods, selection).length).flatMap(row => row.sources.filter(s => periodsInRange(s.periods ?? row.periods, selection).length).map(source => ({ ...source, country: row.country, evidence: card.id })))), ...visibleEvents.map(event => ({ ...event.source, country: event.country, evidence: event.id }))].map(source => [JSON.stringify(source), source])).values()];
  const url = new URL(localizedRoute(`/workspaces/${payload.id}/`, locale), PLATFORM_BASE_URL);
  url.search = new URLSearchParams({ countries: selection.countries.join(","), from: String(selection.from), to: String(selection.to) }).toString();
  const setup = { schema: "atlas-workspace-setup-v1", workspace_id: payload.id, locale, selected_countries: selection.countries, selected_date_range: { from: selection.from, to: selection.to }, selected_indicators: [...new Set(visible.filter(card => card.kind !== "map").map(card => card.targetId))], linked_methods: links.models.map(method => method.skill), active_evidence_panels: [...visible.map(card => card.id), ...visibleEvents.map(event => `event:${event.id}`)], methodological_warnings: payload.warnings, generated_at: generatedAt, platform_version: PLATFORM_VERSION, setup_url: url.href, data_policy: "links_and_source_summary_only_no_observations_or_estimates", formal_model_samples: "unchanged" };
  const citation = `${PLATFORM_NAME}. ${PLATFORM_VERSION}. ${payload.title}. ${generatedAt.slice(0, 10)}. ${url.href}\n`;
  const files: ZipFile[] = [
    { name: "README.md", content: `# ${payload.title}\n\n${m.exportNote}\n\n${payload.coverageNote}\n\n${payload.warnings.map(w => `- ${w}`).join("\n")}\n\n${url.href}\n\nREADME.md / workspace.json / links.json / sources-summary.csv / citation.txt\n` },
    { name: "workspace.json", content: JSON.stringify(setup, null, 2) + "\n" },
    { name: "links.json", content: JSON.stringify(links, null, 2) + "\n" },
    { name: "sources-summary.csv", content: toCsv(["country", "evidence", "name", "url", "layer"], sources) },
    { name: "citation.txt", content: citation },
  ];
  return { files, generatedAt, filename: `atlas-workspace_${payload.id}_${generatedAt.slice(0, 10)}.zip`, setup };
}
