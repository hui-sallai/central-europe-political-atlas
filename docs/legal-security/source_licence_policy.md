# Source licence policy

Tags: **LAW / EXTERNAL LICENCE** = binding external terms · **ATLAS POLICY** = self-imposed rule · **OWNER DECISION** ·
**ENGINEERING CONTROL** = enforced by code.

1. **Registry first (ENGINEERING CONTROL).** Every source the Atlas publishes from has a row in
   `source_rights_registry.json` with all fields in `RIGHTS_FIELDS` (`scripts/legal-security/policy.mjs`).
   `legal-security:validate` fails when a field is missing, a status is outside the vocabulary, or a blocked source is used.
2. **Fail closed (ENGINEERING CONTROL).** `canExport(source, kind)` permits normalised, derived or raw redistribution only
   when the matching rights field is `cleared*`. Missing, `unknown`, `blocked` or `pending_publisher_confirmation` means no
   new export. Sources already published before this register (`legacy_review_due`) remain published with their
   attribution, are not a new use, and must be re-verified at the next refresh; no new series or export kind may be added
   from them until they are.
3. **Verification states (ATLAS POLICY).**
   - `verified`: we read the current licence page and stored the URL and retrieval date.
   - `documented`: reuse terms were located (via the official notice or a secondary/search route), but archiving of the
     operative terms is still pending.
   - `legacy_review_due`: the source was integrated before this layer existed and the licence must be re-read at the next refresh.
   - `blocked`: terms are unclear or prohibitive.
4. **Attribution (LAW / EXTERNAL LICENCE).** Show the attribution the licence requires wherever the data appears.
   - GISCO boundaries: "© EuroGeographics" on every map page.
   - Germany: Die Bundeswahlleiterin, dl-de/by-2-0, with a "derived shares" note.
   - Eurostat: source acknowledgement.
   - BIS: citation, plus a note that a translation is not an official BIS translation; this note is still open for the Chinese UI.
5. **No licence inference (ATLAS POLICY).** If a site is public, that does not grant reuse rights. Missing terms count as unknown, and
   unknown is blocked for any new use.
6. **Publisher clarification (OWNER DECISION).** Only the owner contacts publishers, and only after
   `publisher_contact_release_checklist.md` reads READY.
