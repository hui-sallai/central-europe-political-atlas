# Parliamentary election frontend · 20 November 2026

Starting release `9f3f27638cc77bb8548f3199a4e29a977321b71c` already contained the admitted returns. Six countries had election pages. The new pages read the four additional countries through the existing publication checks. The public index now derives its countries from that registry. There are 55 chamber-election records in ten countries, including the following 34 newly connected records.

| Country | Admitted election years | Recorded scope |
|---|---|---|
| Austria | 2002, 2006, 2008, 2013, 2017, 2019, 2024 | Nationalrat, 183 seats at each election. The source tables supply seat tiers and districts where available. |
| Croatia | 1992, 1993, 1995, 2000, 2003, 2007, 2011, 2015, 2016, 2020, 2024 | Separate elected houses and ballot populations. The 1993 Chamber of Counties elected 63 members. The 2024 Sabor has 140 territorial, three overseas and eight minority seats. |
| Romania | 2012, 2016, 2020, 2024 | Camera Deputaților and Senat have separate results, definitions and links for every election year. The 2024 Senate assigned 134 of 136 seats. |
| Slovenia | 2000, 2004, 2008, 2011, 2014, 2018, 2022, 2026 | Državni zbor has 88 general seats plus one Italian and one Hungarian community seat. Earlier community ballots record ranking points. |

The pages retain 3,756 recorded result rows and their approved contestant labels. Country profiles, the Politics index and the institutional timeline now link to the selected election. Each election has a source-linked table, seat composition, historical rules, a Notebook entry and CSV/JSON export. Election and ballot selections can be reopened in either language. Cross-country comparisons retain the chamber, share denominator and selected ballot on both sides. The existing D4 study retains its original research cohort.

The [data handoff](v20-four-country-completion-2026-11-19.md#17-codex-handoff--ten-country-parliamentary-election-frontend-completion) lists the canonical election, legislature, rule and source references. Each included election is admitted. The remaining requests concern fields within those records.

## Outstanding data requests for Claude Code

| Records and source field | Missing evidence and next action |
|---|---|
| Romania · both 2012 chambers · `electoral_systems.json`, `legislatures.json` | Seats are published AEP counts. Retrieve the applicable version of Law 35/2008 and reconcile its college and additional-seat rules before publishing an independent allocation reconstruction. |
| Romania · both 2016 chambers · `election_turnout.json` | AEP centralisation columns lack a verified turnout definition. Obtain the BEC final acts or an authoritative field dictionary establishing numerator and electorate. Both rates remain unreported. |
| Austria · Nationalrat, 2002, 2006 and 2008 · `electoral_systems.json`, institutional periods | The existing timeline begins on 28 October 2008. Obtain historical legal text for earlier electoral periods. Check the pre-reform district-count wording against BMI's per-election sheets, including the 43 regional constituencies in 2006 and 2008. |
| Slovenia · Državni zbor, 2004 and 2008 · `political_source_registry.json` | DVK official result pages support publication. Obtain the minutes or polling-station files for an independent second reconciliation. Preserve the dated source discrepancies in the 2000 record. |
| Croatia · Županijski dom, 1993 · institutional chamber registry | Add the documented historical chamber identity and effective period, then reconcile its institutional link with `lg-hr-zupanijski-dom-1993`. The public election page already identifies this house by its printed name. |
| Romania and Austria · 2024 polling dates · `elections.json` | Match the registry dates to the corresponding official election notices and update the date evidence. Austria 2002 and 2013 also retain their documented harmonised-date basis. |

No historical party series or coalition allocations are implied by these new pages. Jurisdiction-wide Croatian vote shares cannot be obtained by adding votes from separate ballot populations. A subsequent product iteration can add verified historical party-series navigation once the relevant identities are admitted.
