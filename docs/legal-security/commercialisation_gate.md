# Commercialisation gate

**OWNER DECISION.** `site_operating_mode.json` currently sets `site_operating_mode: noncommercial_research`.

**Kill switch (ENGINEERING CONTROL).** Only two mode values are allowed: `noncommercial_research` and
`COMMERCIAL_MODE_REVIEW_REQUIRED`. `legal-security:validate` fails when:
- the mode is anything else; or
- the mode is commercial without a completed `commercial_review` record (reviewer, date, licence re-check of every source,
  privacy and advertising review).

**Commercial use would require, before any change:**
- every source licence re-checked. GISCO boundaries are licensed for non-commercial use, and other sources' terms differ.
- separate legal advice on advertising, sponsorship, paid services and media regulation (media_registration_watch.md);
- a privacy notice revision and consent mechanism review if any analytics or ads are considered;
- an owner sign-off recorded in `site_operating_mode.json`.

Ads, sponsorship, paywalls, data sales, affiliate links and paid consulting through the site are prohibited while the mode
is non-commercial.
