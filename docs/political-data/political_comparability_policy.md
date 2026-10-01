# Political data — comparability policy

Status: design for owner review (2026-10-02).

## 1. What may be compared across countries

| Measure | Allowed | Conditions |
|---|---|---|
| Turnout | Yes | Same definition (ballots cast ÷ registered electorate, or the source's own definition shown); compulsory/other rules disclosed |
| Vote share | Yes | Comparable tier only (list/PR or second votes); basis (valid votes vs votes cast) shown |
| Seat share | Yes | Always next to the electoral-system disclosure (formula, thresholds, tiers, district count) |
| Vote share vs seat share | Yes, with disclosure | Electoral-system differences explained; no "fair/unfair" evaluation |
| Raw vote totals | No cross-country "strength" comparison | Only within a country, or with electorate context |
| Effective number of parties, fragmentation | Not yet | Only after a separately approved, documented method |
| Winner/loser rankings, performance, quality, risk | Never | — |

## 2. Within-country time series

- A party's series continues only while the contestant is that party's own list; a joint list or alliance breaks the
  series and is shown as a separate contestant.
- Electoral-system changes (e.g. Romania 2008 and 2016, Hungary 2014, Germany 2025, Czech coalition thresholds 2021)
  are break points shown on charts and tables.
- Seat totals that vary by election (Germany before 2025, Romania) are shown with the total seats of that legislature.

## 3. Tier rules

- Germany: second votes for party vote share; first votes are a separate constituency tier.
- Hungary: national-list votes for vote share; SMD votes are a separate tier; surplus/fragment votes are not party votes.
- Croatia: national totals are sums over districts I–X (+XI) and are marked `derived`; the minority district (XII) is
  a separate tier.
- Slovenia: the two minority seats are a separate tier.
- Romania: Chamber of Deputies only; minority-organisation seats separate.

## 4. Election results vs parliamentary composition

Election-day seats (election_results) and later composition (parliamentary_composition) are different concepts.
Defections, splits, vacancies and replacements change composition, never results. Views label which one is shown.

## 5. European Parliament

- National-party EP results are compared only as vote share/seats in the same EP election.
- EP group affiliation is dated per term; a party's current group never labels a past term.
- Serbia has no EP layer (non-member).

## 6. Measurements

CHES and Manifesto values are compared only within the same source, wave/version and instrument (CHES candidate
surveys are separate instruments), with uncertainty shown, and labelled with the source. They are never presented as
objective positions or combined into an Atlas index.

## 7. Geography

Electoral districts are a separate geography from NUTS/NSTJ statistical regions. They are never joined by name;
joins by official code tables only, and only where the code systems are documented to correspond.

## 8. Wording

UI text describes ("vote share", "seats won", "turnout", "source: …") and never evaluates or predicts. New text must
pass `pnpm ui-language:qa`, and the research-boundary-reviewer must review any political presentation.
