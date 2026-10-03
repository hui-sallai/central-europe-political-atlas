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
- [ ] Dependency upgrade of `next` (third_party_dependency_licences.md).
- [ ] BIS translation disclaimer for the Chinese UI (source_rights_registry.json, `bis`).
- [ ] Re-check of legacy licences (World Bank, UN Comtrade, OECD, ECB, geoBoundaries) at the next refresh.
