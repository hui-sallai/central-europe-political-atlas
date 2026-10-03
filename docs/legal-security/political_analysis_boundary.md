# Political analysis boundary and no-prediction rule

## Scope (ATLAS POLICY)

The political layer covers organisations and institutions only: parties as organisations, electoral contestants/lists,
election results, turnout, vote and seat shares, electoral systems, legislatures, governments/cabinets as institutions,
party participation in cabinets, parliamentary composition, EU institutional representation, official political events,
aggregate regional electoral data, institutional and party-system change, and aggregate political-economic relationships.

Permitted analysis: change over time, differences between elections, turnout/vote/seat-share change, vote–seat difference,
coalition arithmetic, party-system fragmentation under an explicitly documented method, institutional composition,
aggregate geographic patterns, and aggregate relationships between political and economic variables. None of these may be
turned into conclusions about an individual person's beliefs, intent, psychology or ideology.

## No Atlas political prediction (OWNER DECISION — current scope: BLOCKED)

No election forecasts, win/candidate/government-formation probabilities, party-support forecasts, voter-intention models,
leader-approval predictions or individual-behaviour predictions. Opinion polling is not ingested.

## Process status only

Permitted factual statuses, from authoritative sources only: campaign period, voting in progress, polls closed, count in
progress, partial official result, provisional official result, corrected official result, final official result, recount,
repeat election, court-adjusted result.

Result-status enum for stores: `official_final`, `official_corrected_final`, `official_provisional`, `official_partial`,
`recount_in_progress`, `repeat_election_pending`, `court_adjusted`, `unknown`. Prohibited values: `likely_winner`,
`projected_winner`, `forecast_winner`, `expected_result` (and similar). The accepted Germany Slice 1A store uses the legacy
value `final`, recorded as an alias of `official_final` (store is byte-frozen).

“62% counted” is never turned into “Party X is likely to win.” If an external projection must ever be mentioned, it is
quoted and attributed — but the preferred design is to avoid prediction content entirely.

## ENGINEERING CONTROL

`checkResultRecord()` (policy.mjs) requires status, status timestamp, coverage, source and retrieval time for provisional,
partial and recount records and rejects “final” presentation; the person-safety validator rejects forecast/projection
fields and prediction status values everywhere.
