# Database right policy

**LAW / EXTERNAL LICENCE (context).** In the EU, the sui generis database right (Directive 96/9/EC) can protect a database
whose maker made a substantial investment, independently of copyright in the individual facts. Extraction or re-utilisation
of a substantial part, or repeated systematic extraction of insubstantial parts, may require permission.

**ATLAS POLICY.**
- Reuse only under an explicit open licence or reuse notice (Eurostat, GISCO, Bundeswahlleiterin dl-de/by-2-0, ParlGov
  CC0; SORS and BIS reuse with the citation conditions recorded in the registry), or after written publisher clarification.
  Legacy sources marked `legacy_review_due` stay as published until re-verified (source_licence_policy.md).
- Do not mirror whole databases. Store only the series used, with provenance hashes.
- For sources whose terms forbid automated collection (statistics.sk) or where robots rules block AI agents (bmi.gv.at),
  the registry status is `blocked` and no automated acquisition happens.
- Election portals without an explicit reuse licence (volby.cz, KBW PL, SK, AT) stay `blocked` or `pending_publisher_confirmation` for
  normalised/derived publication until the owner obtains clarification.

**ENGINEERING CONTROL.** `canExport` and `canAcquire` in `scripts/legal-security/policy.mjs`; only `germany` may exist under
`src/data/political` and `public/research-data/political`.
