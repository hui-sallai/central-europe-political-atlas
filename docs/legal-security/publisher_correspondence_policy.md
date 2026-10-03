# Publisher correspondence policy

Applies to replies from CZSO, ŠÚ SR, PKW/KBW, BMI/Bundeswahlbehörde and any other publisher or authority.

**ATLAS POLICY**
- Original e-mails, attachments and letters are **private owner evidence**. Store them outside Git, in `owner-evidence/`
  or `docs/political-data/source-closure/local-evidence/`; both are gitignored.
- The public repository may contain only a record in `publisher_response_records.json` with these fields:
  - `institution`
  - `country`
  - `response_date`
  - `decision_outcome`
  - `permission_wording`: only the necessary licence or permission sentence
  - `evidence_reference`: a private file name, not its content
  - `evidence_sha256`: hash of the private original
  - `redaction_note`
- No names of individual staff, e-mail addresses, signatures, phone numbers or message headers.
- Publishing more requires a separate, documented justification.

**ENGINEERING CONTROL** (`legal-security:validate`)
- No tracked `.eml`, `.msg` or `.mbox` files, and no `correspondence/`, `private/` or `inbox/` paths.
- No tracked text that looks like a mail message (`From:` … `Subject:`).
- `publisher_response_records.json` may hold allowed fields only, with no e-mail addresses and a bounded permission wording.
- `.gitignore` blocks mail files, `correspondence/`, `inbox/` and `owner-evidence/`.
