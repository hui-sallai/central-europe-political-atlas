---
name: weekly-news-update
description: Add one week of verified political-economy news to the Atlas event library. Use when the owner asks for a weekly news update for a given week-ending date (YYYY-MM-DD). Generates src/lib/weeklyNews/<date>.ts plus the audit, source-verification and candidate-screening JSON in src/data/events/, registers the week in src/lib/newsData.ts and runs `pnpm news:validate --week <date>`.
argument-hint: <week-end YYYY-MM-DD>
---

# Weekly news update

Argument: the week-end date `D` (YYYY-MM-DD). The window is the inclusive date range agreed with the owner
(the last update used 2026-08-20 → 2026-09-05). Ask for the start date if it is not given.

This workflow is the **only** permitted writer of `src/lib/weeklyNews/**` and the three `src/data/events/news_*_<D>*.json`
files. Do not touch `events.json`, any other file under `src/data/**`, models, readiness or scenario files.

## Research rules (non-negotiable)
- Ten countries only: hungary, poland, czechia, slovakia, germany, romania, slovenia, serbia, austria, croatia.
- Each record needs a stable HTTPS article page or a dated official bulletin item — never a search, tag or listing URL
  (`?q=`, `?query=`, `?search=`, `?page=`). Dates must be verified from the page (metadata, archive, URL pattern, or bulletin item).
- Title in Chinese; summary in Chinese with **two paragraphs** separated by `\n\n`: fact first, then a boundary sentence.
  No causal or predictive claims ("影响/导致/预测/风险" style) beyond what the source says; events never enter models (`entersModel: false`).
- Topics: 政治 · 经济 · 欧盟 · 能源 · 区域 · 对华经贸. Event types: fiscal · EU_funds · macro · energy · industrial_policy · FDI · China · election · regional.
- Quality before country quotas: record a coverage gap rather than accept a weak item. Never invent evidence; if an item's
  trace cannot be reconstructed, keep it only as an aggregate count (see `legacy_trace_gap_count`).

## Files to create (copy the structure of the 2026-09-05 week exactly)
1. `src/lib/weeklyNews/<D>.ts` — `const rows: Row[] = [[id, countrySlug, countryZh, date, title, topic, summary, sourceLabel, sourceUrl, language, "official"|"manual", eventType], …]`
   and `export const weeklyNews<YYYYMMDD>: WeeklyNewsItem[] = rows.map(...)` with the same mapping as `2026-09-05.ts`
   (dataStatus "verified", direction "neutral", intensity null, empty relations, duration "pending", confidence high for official / medium for manual, codingStatus "partial", entersModel false).
   Ids: `<cc>-<date>-<slug>` (cc = hu, pl, cz, sk, de, ro, si, rs, at, hr).
2. `src/data/events/news_update_<D>_audit.json` — `window {start, end, timezone}`, `method`, `screened_candidate_count`,
   `accepted_count`, `rejected_count` (screened = accepted + rejected), `country_counts.{country}.{screened, accepted, rejected}`,
   `rejection_policy[]`, `coverage.{country}.{coverage_below_target, sources_searched[], remaining_gap}`, `actor_field_audit`, `notes`.
3. `src/data/events/news_source_verification_<D>.json` — `{schema_version, window_end, record_count, records[]}`; one record per
   accepted item: `news_id, source_url, record_date, source_publication_date, source_updated_date, date_evidence,
   verification_method, verification_status (verified_exact | verified_source_archive | verified_url_pattern | verified_bulletin_item),
   source_page_type (individual_article | daily_bulletin | agency_roundup | government_briefing | official_archive_item), retrieved_at`;
   shared pages also need `source_item_title` and `source_item_position` or `source_item_anchor`.
4. `src/data/events/news_candidate_screening_<D>.json` — `{schema_version, record_count, legacy_trace_gap_count, records[]}`; every
   screened candidate: `candidate_id ("accepted:<id>" | "rejected:<country>:<n>"), country, candidate_title, candidate_url,
   candidate_date, decision, rejection_reason, canonical_duplicate_id, verification_note`.

## Steps
1. Confirm the window with the owner; gather candidates per country from primary sources; screen and verify dates.
2. Write the four files above; add `import { weeklyNews<YYYYMMDD> } from "./weeklyNews/<D>";` to `src/lib/newsData.ts`
   and spread it at the top of `eventLibraryItems` (as `weeklyNews20260905` is).
3. Run `pnpm news:validate -- --week <D>` (or `node scripts/validation/validate-news-update.mjs --week <D>`); fix every failure.
4. Run `pnpm ui-language:qa`, `pnpm lint`, `pnpm typecheck`, `pnpm build:site`.
5. Commit with a summary of accepted / rejected counts per country and any coverage gaps. Do not push without owner approval.
