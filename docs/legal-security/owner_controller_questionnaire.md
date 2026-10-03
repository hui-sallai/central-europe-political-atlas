# Owner questionnaire: controller, privacy and status

**OWNER DECISION.** Answer only what applies. Do **not** put a home address or other private details in the repository.

If a postal address later proves legally necessary (for example for an imprint or a GDPR contact), that is a **separate
legal-review question**. No address is published or guessed.

The agent writes values into `docs/legal-security/owner_confirmations.json` **only** after you supply them explicitly, and
records your statement as evidence.

| # | Question | Answer format |
|---|---|---|
| Q1 | Is the operator/controller a natural person or an organisation? | `natural_person` / `organisation` |
| Q2 | What public controller/operator name should be displayed? | text, or "none" if no name is to be shown |
| Q3 | Which country of establishment is relevant to this project? | country |
| Q4 | Confirm the public contact email shown on the site. | yes / a different address |
| Q5 | Is the project non-commercial? | yes / no |
| Q6 | Is there any advertising? | yes / no |
| Q7 | Is there any sponsorship? | yes / no |
| Q8 | Is there any paid access? | yes / no |
| Q9 | Is there any paid API? | yes / no |
| Q10 | Is there any analytics or tracking? | yes / no |
| Q11 | Is the Atlas an official ELTE or other institutional project? | yes / no |
| Q12 | Have you reviewed both the Legal and the Privacy pages (zh and en)? | yes / no |

## Exact JSON changes per confirmed answer

`D` is the date of your statement, for example `2026-10-05`, and `S` is your statement, quoted. Every change also adds
`evidence.<key> = { "confirmed_on": D, "owner_statement": S }`. Answers use `evidence["answer:<key>"]`.

| Answer | Edits to `owner_confirmations.json` |
|---|---|
| Q1 + Q2 | `answers.controller_type = "<Q1>"`, `answers.public_controller_name = "<Q2>"`, `items.controller_identity_confirmed = true` |
| Q3 | `answers.establishment_country = "<Q3>"`, `items.controller_establishment_confirmed = true` |
| Q4 = yes | `answers.public_contact_email = "<address>"`, `items.public_contact_email_confirmed = true` |
| Q5 = yes and Q6–Q9 = no | `answers.noncommercial = true`, `answers.advertising = false`, `answers.sponsorship = false`, `answers.paid_access = false`, `answers.paid_api = false`, `items.noncommercial_status_confirmed = true` |
| any of Q6–Q9 = yes | `items.noncommercial_status_confirmed = false`; `site_operating_mode.json` → `COMMERCIAL_MODE_REVIEW_REQUIRED` (the validator then fails until a commercial review is recorded) |
| Q10 = no | `answers.analytics_or_tracking = false` (matches the current code; a "yes" means the privacy notice is wrong and must be fixed first) |
| Q11 = no | `answers.official_institutional_project = false`, `items.no_institutional_affiliation_claimed = true` |
| Q11 = yes | `answers.official_institutional_project = true`. The Legal page's "independent" statement must then be revised with the institution before contacting publishers. |
| Q12 = yes | `items.legal_notice_reviewed = true`, `items.privacy_notice_reviewed = true` |
| Domain/security items (owner_domain_security_verification.md) | the matching `items.*` key = `true` with the reported evidence |

## What happens next

- `legal-security:validate` refuses any `true` item that has no evidence record.
- The publisher-contact gate becomes READY only when all six required items are true **and** every engineering check
  passes:
  - `controller_identity_confirmed`
  - `public_contact_email_confirmed`
  - `noncommercial_status_confirmed`
  - `no_institutional_affiliation_claimed`
  - `legal_notice_reviewed`
  - `privacy_notice_reviewed`
- A public controller name appears on the Privacy/Legal pages only after Q1 and Q2 are confirmed, in a separate page
  update.
