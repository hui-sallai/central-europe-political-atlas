# EA-EMPD reuse authorisation request (DRAFT, not sent)

**Status:** drafted 2026-10-05. **The owner sends it personally; the Atlas sends nothing.**

**Why:** the Working Paper 3157 imprint reads "All rights reserved. Any reproduction, publication and reprint in the form
of a different publication… in whole or in part, is permitted only with the explicit written authorisation of the ECB or
the authors". No separate dataset licence was found. EA-MPD is not affected: it is CC BY-SA 4.0 (SAFE Data Center record).

**To:** the corresponding author listed on the WP 3157 title page, or the ECB's publications contact listed on
www.ecb.europa.eu. Take the addresses from those pages when sending; they are not stored here.

**Before sending (owner):**
- Use your own name and affiliation status as confirmed in `owner_controller_questionnaire.md`.
- Do not claim institutional backing.

---

**Subject:** Request for permission to republish EA-EMPD event-study data (ECB Working Paper 3157) in a non-commercial research atlas

Dear Dr Altavilla, Professor Gürkaynak, Dr Kind and Dr Laeven,

I maintain the Central Europe Political Atlas (https://hy-central-europe-analysis.org/), an independent, non-commercial
public research website on Central European political economy.

The Atlas uses the Euro Area Extended Monetary Policy Event-Study Database (EA-EMPD) from your paper "Monetary
transmission with frequent policy events" (ECB Working Paper 3157). We use it to document ECB policy events and speeches
and to build monthly descriptive series.

**How the data are currently used**
- Event-level OIS window changes (1M, 3M, 6M, 1Y) for policy meetings and Executive Board speeches are shown as
  structured records, with the event identifiers, timestamps and windows from the workbook.
- Monthly aggregates derived from those records are used for descriptive research. They are not presented as forecasts
  or policy advice.
- Every record cites your paper and the ECB annex file. Changes made by the Atlas (time-zone normalisation, aggregation)
  are stated.
- The original Excel workbook is not redistributed.

The paper's imprint permits reproduction only with written authorisation of the ECB or the authors. **I would therefore
like to ask whether you permit this non-commercial reuse and republication of EA-EMPD values, with full citation**, and
whether you prefer any specific citation or licence wording.

If you would prefer that the event-level values are not republished, I will withdraw them and keep only a citation and a
link to your data.

Thank you for making the database available to researchers.

Kind regards,
[owner name as confirmed]
Central Europe Political Atlas

---

**After a reply (owner):**
- Record the outcome in `publisher_response_records.json`. Use the allowed fields only, and keep the original e-mail in
  private owner evidence.
- **Permission granted:** set `src-ecb-ea-empd` to `verified` with the permitted wording, and update the attribution
  text in `src/content/sourceAttributions.json`.
- **Permission refused:** withdraw EA-EMPD values in a separate reviewed change, following the registry's
  `open_rights_issue.action`.
