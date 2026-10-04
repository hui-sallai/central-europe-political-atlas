# Publisher contact release checklist

The gate decides whether the **owner** may personally send the prepared clarification requests (Production 1B: CZ, PL,
SK, AT). The Atlas never sends anything automatically.

It is computed by `legal-security:validate` from `owner_confirmations.json` and the engineering gates. Possible outputs are
**READY_FOR_OWNER_TO_CONTACT_PUBLISHERS** and **NOT_READY_FOR_OWNER_TO_CONTACT_PUBLISHERS**.

Current status: READY_FOR_OWNER_TO_CONTACT_PUBLISHERS

## Required for READY
- [x] `controller_identity_confirmed`: the requester can say truthfully who is asking.
- [x] `public_contact_email_confirmed`
- [x] `noncommercial_status_confirmed`: the requests describe non-commercial research.
- [x] `no_institutional_affiliation_claimed`: no implied university or employer endorsement.
- [x] `legal_notice_reviewed`
- [x] `privacy_notice_reviewed`
- [x] Engineering gates pass: `legal-security:validate`, `political-person-safety:validate`, and the source-closure
  checkpoint.
- [x] Requests ask about reuse terms only. They do not claim a licence exists and do not request personal data.

When all items are true, the validator expects this file to read `Current status: READY_FOR_OWNER_TO_CONTACT_PUBLISHERS`.
Even then, sending is a manual owner act, and each reply is recorded only as a gate outcome, without personal content.

## Status record (2026-10-05)

All six owner items were confirmed by the owner on 2026-10-05 (evidence in `owner_confirmations.json`), and the
engineering gates pass.

**READY means only one thing:** the owner may personally send the four already-prepared clarification requests
(`docs/political-data/source-closure/contact-packets/`).

It does **not** mean:
- that any licence is approved;
- that Production 1B is approved;
- that any of CZ, SK, PL or AT is READY;
- that publisher correspondence may be committed to the public repository (see `publisher_correspondence_policy.md`).

Controller establishment remains unresolved by design (operational connections to China and Hungary, with no single
legal establishment determined). The gate does not depend on it.
