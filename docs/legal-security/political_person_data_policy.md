# Political person-data policy — no person inference

**OWNER DECISION (2026-10-03, permanent):** the Atlas does not perform political inference about identifiable natural
persons, even when the underlying material is public.

**LAW / EXTERNAL LICENCE (context only):** under the GDPR (Regulation (EU) 2016/679), personal data revealing political
opinions is a special category (Art. 9) and profiling has specific safeguards (Art. 4(4), Art. 21–22). These provisions
are cited as context; the Atlas policy below is deliberately stricter and is not a statement of what the law requires.

## Prohibited (ATLAS POLICY)

The Atlas will not infer, score, classify or predict any natural person's ideology, political preferences, motivations or
beliefs — from speech, interviews, campaign material, social media, voting behaviour, party membership or anything else —
and will not create politician profiles, voter profiles, political microtargeting, or psychographic/behavioural political
profiles. It does not label a person as populist, nationalist, extremist, pro-/anti-EU, pro-China, pro-Russia, liberal,
conservative, left or right through Atlas-created interpretation.

## Data classes

| Class | Examples | Default |
|---|---|---|
| **P0** no natural-person data | party / election / parliamentary / cabinet aggregates | allowed under source governance |
| **P1** minimal public-role facts | name, office, term, constituency, official candidacy, official result | allowed only if necessary, authoritatively sourced, minimal, accurate, correctable, retention-reviewed |
| **P2** affiliation / behaviour | party or group affiliation, roll-call vote, endorsement, signed statement, campaign role | **not admitted into analytical person profiles**; only a factual institutional record after separate review |
| **P3** explicit personal opinion | stated policy position, self-identification, interview stance | **blocked** from the analytical dataset; event records keep only a minimal factual description + source link |
| **P4** inferred / scored opinion | left-right, nationalism, Euroscepticism, populism scores; inferred orientation; predicted stance; clustering | **prohibited** — no ordinary review path; only a new owner policy decision plus legal and methodological review could change this |
| **P5** voter / private-person political data | voting intention, inferred vote choice, targeting profile, psychographic segment | **prohibited** |

Election classes map onto these: **E0** aggregate official results (allowed); **E1** partial/provisional official results
(allowed only with status, timestamp, coverage, source, retrieval time — never shown as final); **E2** candidate public
result (P1); **E3** person behaviour (P2); **E4** person opinion (P3); **E5** inferred opinion (P4).

## Natural-language and speech rules (ATLAS POLICY)

- Atlas copy never says “Person X is …” followed by an inferred political characterisation.
- If an external authoritative or academic source uses such a label and it is genuinely necessary: attribute it, name the
  source and its method, do not adopt it as Atlas fact, and never persist it as a personal attribute. Preferred: avoid it.
- No speech sentiment analysis, political-speech classification, stance or ideology extraction, topic-to-person profiling,
  LLM classification of politicians' statements, or speech corpora for individual profiling.
- Allowed only when necessary, accurate, minimal and contextual: “On DATE, PERSON stated X in SOURCE.” Never “therefore
  PERSON is type Y.”

## ENGINEERING CONTROL

`pnpm political-person-safety:validate` scans canonical data, public exports, docs/schemas, TypeScript sources, UI copy,
weekly news and the Event Library. It blocks compound inference/profiling/prediction field names (not only exact names),
requires person-like records to use only the allowlisted public-role fields (`ALLOWED_PERSON_FIELDS` in
`scripts/legal-security/policy.mjs`), rejects prediction status values, and flags person-level political labels in Atlas
copy (reviewed exceptions only via `person_label_review_allowlist.json`, currently empty).
