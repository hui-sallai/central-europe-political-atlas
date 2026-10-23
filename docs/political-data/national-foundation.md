# National parliamentary foundation — Phase C

Implementation date: 2026-10-24. Platform v2.0. Germany remains the only imported production country.
This is an implementation contract, not source closure, polling permission or approval of another country.

## Adding the next authorised country

1. Reuse the existing country candidate builder and validator. Keep candidates in the existing gitignored staging
   directory. Do not fetch again merely to demonstrate the adapter. Czechia's missing files and reuse-scope issue,
   and Romania's unresolved definitions/vintage/seat total, remain as documented in their candidate-status files.
2. Resolve official source evidence, reuse rights and result vintage through the existing source registries and owner
   decision process. Passing a fixture, a candidate validator or the source-closure checkpoint is not publication approval.
3. Supply `PoliticalStores` to `electionViewsFromStores`. For each system, explicitly supply `vote_definitions`:
   independent vote ID, kind, bilingual label, share denominator, seat scope and registered sources. Use separate
   turnout/result rows per vote type; never copy list votes into a constituency tier. Provide `turnout_basis` and
   `national_rules` with official references. Unknown thresholds, minority rules and chamber totals remain null.
   The legacy aliases `secondVotes` / `validSecondVotes` are retained for compatibility, but represent the active
   ballot; `measureValue` uses its actual denominator and refuses whole-chamber shares from tier-only seats.
4. Confirm election-specific `members` separately from continuity. `contestantIdentity` admits reviewed same-election
   membership only. `continuousPartyLink`, `partyLinkDifference` and `verifiedPartyTrajectory` consume explicit reviewed
   edges; same labels never create edges. Alliances retain their own results; merger/split/membership edges cannot
   continue a party series. Authority statistical series do not establish legal continuity. Existing German official
   series and historical evidence are unchanged.
5. After explicit owner approval, register/import the country in `politicalData.ts` and update the authorised-country
   scope in its production gate. That file is the production admission point; candidate stores must never be imported
   into it. Generate the existing per-country exports through the approved publication workflow, not through a new
   ingestion pipeline. Pass admitted views to the existing Explorer and country comparison, with country-specific
   economic context and independently reviewed history links via the existing Explorer's `identityLinks` prop.
   The shared party-history component derives options only from those reviewed edges; it never matches names.
   No fixture belongs in `src/` or a public export.
6. Run the country validators, `political-foundation.test.mjs`, existing political regression tests, UI/governance
   checks and exact UI hashes. Review any deliberately changed screenshots. Push only on separate owner instruction.

## Polling admission — still closed

`politicalPolling.ts` implements a separate versioned, bounded, all-or-nothing measurement validator. It consumes the
existing rights registry and `canExport`, plus a separately recorded owner/publisher admission decision. No source
registry, account, persistence service, acquisition job or poll observations were added. Current production supplies
no polling collection and shows a precise unavailable state, without a chart.

The future input is `{schema: POLLING_SCHEMA, records: ParliamentaryPoll[]}`. Every record preserves the original
publisher URL, organisation, fieldwork/publication/retrieval dates, sample and respondent base, population, method,
wording, undecided handling, party/alliance label, published estimate, reported uncertainty, rights and correction
status. Null optional metadata is allowed but prevents a comparable trend where the definition is unknown. Unknown
fields, unsafe URLs, wrong dates, unsupported schemas, duplicate active revisions and unapproved sources fail closed.
Source rights are checked for each exact source URL. The admission `verifyIdentity` callback must resolve the entity
against independently reviewed political evidence, not accept a record's self-declared identity flag.
Normalised republication does not itself permit a derived change.

`pollingTrend` compares individual admitted records only: no averaging, smoothing, interpolation or probabilities.
Matching organisation, country, chamber, question, population, method, respondent base, undecided treatment and reviewed
entity identity are mandatory, as are non-overlapping ordered fieldwork periods and cleared derived-use rights.
Superseded revisions remain identifiable but do not enter a trend. The polling panel can render an admitted collection
without changes to the election stores; a real collection still requires a separate policy amendment and source clearance.

## Validation evidence

Tests use Germany's unchanged published data, the existing read-only Romania candidate validator when its local package
is present, the existing Czech builder's isolated parser fixtures, and clearly marked PR/minority and mixed dual-vote
fixtures under `tests/fixtures/`. None of the synthetic values is a real political observation or a second published country.
