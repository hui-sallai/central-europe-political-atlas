# Publisher contact release checklist

The gate decides whether the **owner** may personally send the prepared clarification requests (Production 1B: CZ, PL,
SK, AT). The Atlas never sends anything automatically.

It is computed by `legal-security:validate` from `owner_confirmations.json` and the engineering gates. Possible outputs are
**READY_FOR_OWNER_TO_CONTACT_PUBLISHERS** and **NOT_READY_FOR_OWNER_TO_CONTACT_PUBLISHERS**.

Current status: NOT_READY_FOR_OWNER_TO_CONTACT_PUBLISHERS

## Required for READY
- [ ] `controller_identity_confirmed`: the requester can say truthfully who is asking.
- [ ] `public_contact_email_confirmed`
- [ ] `noncommercial_status_confirmed`: the requests describe non-commercial research.
- [ ] `no_institutional_affiliation_claimed`: no implied university or employer endorsement.
- [ ] `legal_notice_reviewed`
- [ ] `privacy_notice_reviewed`
- [x] Engineering gates pass: `legal-security:validate`, `political-person-safety:validate`, and the source-closure
  checkpoint.
- [x] Requests ask about reuse terms only. They do not claim a licence exists and do not request personal data.

When all items are true, the validator expects this file to read `Current status: READY_FOR_OWNER_TO_CONTACT_PUBLISHERS`.
Even then, sending is a manual owner act, and each reply is recorded only as a gate outcome, without personal content.
