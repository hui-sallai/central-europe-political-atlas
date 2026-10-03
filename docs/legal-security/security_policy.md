# Security policy (internal)

Public reporting route: `SECURITY.md` (repository root) and `/.well-known/security.txt` (RFC 9116).

**ENGINEERING CONTROLS (enforced by `legal-security:validate` / `security:scan`)**

Front end
- Static export only: no server, server actions, forms, accounts or uploads.
- No `eval`/`new Function`/`innerHTML` sinks.
- `dangerouslySetInnerHTML` is allowed only for `jsonLdHtml` (escaped JSON-LD) and the theme boot script.
- No `javascript:`/`data:`/`vbscript:` URLs; `target="_blank"` links need `rel="noopener"`.
- No third-party runtime scripts, iframes, analytics or trackers in source or built output.

Downloads
- CSV cells starting with `= + - @`, tab or CR are prefixed with `'` (formula-injection guard), except for plain numbers.
- Downloads are static files built from canonical stores.

Secrets
- `scripts/security/check-public-secrets.mjs` runs before every build and `legal-security:validate` scans for secrets.
- No secrets are needed at runtime.

Supply chain
- Runtime dependencies are limited to `next`, `react` and `react-dom`.
- `pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`.
- The dependency inventory and audit status are kept in third_party_dependency_licences.md.

Repository
- `local-evidence/` and staging directories are gitignored and checked as untracked.
- No private correspondence in Git.

**OWNER DECISION / owner-held controls**
- GitHub account MFA, registrar account MFA and DNS records.
- Pages custom-domain verification and "Enforce HTTPS".
- Branch protection on `main`.

See owner_compliance_checklist.md.
