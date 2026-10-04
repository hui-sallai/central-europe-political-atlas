# Owner compliance checklist

Items the engineering layer cannot verify. Record answers in `owner_confirmations.json` (true/false plus date). Until an
item is confirmed it stays `OWNER_CONFIRMATION_REQUIRED` internally; public pages never show placeholders.

## Identity and status
- [ ] `controller_identity_confirmed`: who the operator/controller is (natural person or organisation) and their
  establishment (country). The public notice does not name a controller until confirmed.
- [ ] `public_contact_email_confirmed`: the public address in `src/data/release.json` is monitored.
- [ ] `noncommercial_status_confirmed`: no ads, sponsorship, paid services or income from the site.
- [ ] `no_institutional_affiliation_claimed`: the site does not present itself as speaking for a university or employer.
- [ ] `legal_notice_reviewed` and `privacy_notice_reviewed`: the owner has read the zh/en Legal and Privacy pages.

## Accounts and infrastructure
- [ ] GitHub account MFA enabled (`github_mfa_enabled`).
- [ ] GitHub Pages custom domain verified and **Enforce HTTPS** enabled (`github_pages_domain_verified`, `https_enforced`).
- [ ] Registrar account MFA and registrar lock enabled (`registrar_mfa_enabled`).
- [ ] DNS records reviewed; no stale records pointing elsewhere (`dns_reviewed`).
- [ ] Branch protection on `main` (recommended).

## Gates the owner controls
- [ ] Publisher contact: send nothing until `publisher_contact_release_checklist.md` reads READY.
- [ ] Hungarian media-registration question (media_registration_watch.md): decide whether to seek advice.
- [x] Dependency upgrade of `next` (done: 16.3.6).
- [x] BIS translation disclaimer for the Chinese UI (done).
- [x] Re-check of legacy licences (done 2026-10-04).
- [x] geoBoundaries attribution conflict resolved (2026-10-05).
- [ ] Send the EA-EMPD authorisation request (`ea_empd_permission_request.md`) and record the reply in `publisher_response_records.json`.
- [ ] Answer owner_controller_questionnaire.md and work through owner_domain_security_verification.md.
