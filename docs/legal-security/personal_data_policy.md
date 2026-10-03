# Personal data policy

**ATLAS POLICY.** The Atlas is designed to process as little personal data as possible.

- **What the site itself does:** no accounts, comments, uploads, subscriptions, forms, analytics, advertising, tracking
  pixels or non-essential cookies. Browser storage is limited to the allowlisted keys (see privacy_data_inventory.md).
- **Research data:** P0 by default. P1 public-role facts only when necessary for institutional or election research and
  supported by an authoritative public source. P2 never enters analytical person profiles; P3 is blocked from structured
  datasets; P4 and P5 are prohibited (political_person_data_policy.md).
- **Parliament and EU person records** expose birth dates, birthplaces, e-mail addresses and photos; none of these are
  stored. Party-level composition must never depend on personal data.
- **Correspondence** (e-mail to the public contact) is handled outside Git, only for the request, and retained per
  retention_policy.md.
- **Accuracy and correction:** every P1 record carries a source; corrections follow correction_takedown_policy.md.

**LAW / EXTERNAL LICENCE (context):** where the GDPR applies, principles such as data minimisation, purpose limitation and
storage limitation (Art. 5) and data-subject rights (Art. 12–22) are relevant. The legal basis for any processing is an
**OWNER DECISION** that has not yet been confirmed (owner_confirmations.json); the public privacy notice does not assert one.

**ENGINEERING CONTROL:** `political-person-safety:validate` (person-like records must use allowlisted public-role fields);
`legal-security:validate` (storage allowlist, no trackers, no cookies/IndexedDB/sessionStorage).
