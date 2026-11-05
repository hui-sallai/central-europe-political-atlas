# Hungary — National Assembly elections of 2022 and 2026

Two elections: party lists and nationality lists with their numbers, votes, national list seats, single-member constituency seats and whole-chamber seats; voters on all registers, voters who took part, and ballot counts. Sources: minutes of the National Election Commission on the national list result, transcribed from scanned PDFs identified by checksum; the election office's composition page of each election for constituency seats, read by hand once. Rules: Act CCIII of 2011.

Seat scopes: `seats` are national list seats (`seat_scope` = `national_list_tier`, 93 seats in all). `constituency_seats` are single-member district seats (106 in all). `whole_chamber_seats` = `seats` + `constituency_seats` (199 in all). Divide `seats` by 93 for a list-tier share and `whole_chamber_seats` by 199 for whole-chamber representation; `seats` ÷ 199 describes neither. Every one of the 199 seats is attributed: each composition row is matched to the list of the minutes nominated by the same organisations, its list seats must equal the minutes, and the build fails otherwise. A nationality list holds no constituency seat.

Denominators: party-list and nationality-list votes are separate ballots, each with its own total. `derived_vote_share` is computed within one ballot. The election office's application prints shares over both ballots together, so its figures differ. `surplus_votes` and `votes_for_list_seat_allocation` are the seat-allocation inputs in the minutes and are never added to `votes`. Constituency votes are not held. Turnout is computed from the counts in the minutes, because they print no percentage.

Rights basis: Copyright Act (Act LXXVI of 1999) § 1(4), official notices and case documents, for minutes whose content the National Election Office must publish under Act XXXVI of 2013 § 76(2)(e), extended by the owner on 2026-11-06 to the office's official composition pages for aggregate seat counts only. This is a reading of the statute accepted by the owner, not a statement by the office, and no licence exists. The office's Impresszum is on a host that disallows robots and was not read. National figures only.

A joint list's votes and seats, including the constituency seats of candidates nominated by the same organisations, belong to the joint list and are never divided among its organisations. The list kind comes from the printed name and the official application; for 2022 no official joint-list label was read.

continuous_party_series is 0: the minutes give each nominating organisation an identifier specific to one election, joint lists are election-specific, and no party register was reviewed, so no link is made between the two elections, even where a name repeats.

Not included: 2018 and earlier, constituency votes and per-district results, county results, candidates, elected deputies, and the application's CSV.
