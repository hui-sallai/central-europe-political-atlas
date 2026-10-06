# Owner verification: domain, GitHub and registrar security

**OWNER ACTION.** The agent cannot see or change account security state and does not mark any item true. Each item lists
the steps, the evidence to report back, and the `owner_confirmations.json` key it closes.

The "Agent observation" lines come from **read-only** public DNS lookups and repository API reads on 2026-10-04. They are
hints, not confirmations.

| # | Item | Key |
|---|---|---|
| 1 | GitHub custom-domain verification | `github_custom_domain_verified` |
| 2 | Enforce HTTPS | `github_enforce_https_verified` |
| 3 | GitHub MFA | `github_mfa_verified` |
| 4 | GitHub recovery settings | `github_recovery_reviewed` |
| 5 | Registrar MFA | `registrar_mfa_verified` |
| 6 | Registrar lock | `registrar_lock_verified` |
| 7 | DNS records | `dns_reviewed` |
| 8 | Dangling CNAME / abandoned subdomains | `dangling_dns_reviewed` |
| 9 | GitHub Actions permissions | `github_actions_permissions_reviewed` |
| 10 | Repository admin permissions | `repository_admins_reviewed` |
| 11 | Branch protection | `branch_protection_verified` |

## 1. GitHub custom-domain verification

Verification protects against domain takeover if Pages is ever unpublished.

**Steps**
1. Open GitHub, then your profile picture → **Settings** → **Pages** (account level, not repository level).
2. Choose **Add a domain** and enter `hy-central-europe-analysis.org`.
3. Add the TXT record GitHub shows at your DNS provider. It has the form `_github-pages-challenge-hui-sallai.hy-central-europe-analysis.org`.
4. Wait for DNS to propagate, then press **Verify**.

**Report back:** the domain row shows "Verified", and the date you verified it.

**Agent observation:** no `_github-pages-challenge-hui-sallai` TXT record was found in public DNS, so the domain is
probably **not verified** yet.

## 2. Enforce HTTPS

**Steps:** repository **Settings** → **Pages** → **Custom domain** must read `hy-central-europe-analysis.org` with a green
DNS check, and **Enforce HTTPS** must be ticked.

**Report back:**
- the checkbox state;
- that a certificate is shown as issued;
- the date you checked.

**Agent observation:** the Pages API reports `https_enforced: true`, and `http://` answers with HTTP 301.

## 3. GitHub MFA

**Steps:** **Settings** → **Password and authentication** → **Two-factor authentication** must be enabled. Prefer a passkey,
a security key or a TOTP app over SMS.

**Report back:**
- that 2FA is enabled;
- which method types are configured (not the codes);
- the date you checked.

## 4. GitHub recovery settings

**Steps:**
1. In the same page, confirm the recovery codes were downloaded and are stored offline.
2. Confirm at least two second factors exist, for example a passkey plus a TOTP app.
3. Under **Emails**, confirm a verified backup email.

**Report back:**
- "recovery codes stored offline: yes/no";
- the number of second factors;
- whether a backup email is verified.

## 5. Registrar MFA

**Steps:** at the registrar where the domain is registered, open the account security page and enable 2FA.

**Report back:**
- the registrar's name, if you are willing to record it internally;
- that 2FA is enabled;
- the date you checked.

## 6. Registrar lock

**Steps:**
1. In the registrar's domain settings, enable **Transfer lock** (clientTransferProhibited).
2. Enable auto-renew, and confirm the expiry date.

**Report back:**
- lock on or off;
- auto-renew on or off;
- the domain expiry date.

## 7. DNS records

**Steps:** list every record in the DNS zone.

**Expected for GitHub Pages:**
- apex A records 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153;
- the matching AAAA records 2606:50c0:8000::153 to 8003::153;
- `www` as a CNAME to `hui-sallai.github.io`.

Optionally add a CAA record allowing `letsencrypt.org`, which GitHub Pages uses.

**Report back:** the full record list, plus any record you do not recognise.

**Agent observation:**
- the apex A and AAAA records match GitHub Pages;
- `www` is a CNAME to `hui-sallai.github.io`;
- no CAA record exists.

## 8. Dangling CNAME and abandoned subdomain review

**Steps:**
- For every CNAME and subdomain in the zone, confirm the target still exists and is yours.
- Delete records that point to retired services, such as old Pages repositories or SaaS hosts.

**Report back:** the subdomains reviewed and any record removed.

## 9. GitHub Actions permissions

**Steps:** repository **Settings** → **Actions** → **General**.
- Recommended: allow only actions from GitHub and verified creators, or a pinned allow-list.
- **Workflow permissions:** keep "Read repository contents".
- Leave "Allow GitHub Actions to create and approve pull requests" unticked.

**Report back:** the three settings as shown.

**Done (2026-10-06, owner-verified; API cross-check matches):** Actions are restricted to GitHub-created actions plus
`pnpm/action-setup@v6`; the verified-creator allowance is off; default workflow permissions are read-only; Actions
cannot create or approve pull requests.

## 10. Repository admin permissions

**Steps:**
1. Repository **Settings** → **Collaborators and teams**.
2. Confirm that only you hold admin.
3. Remove stale deploy keys under **Deploy keys**, unused tokens under **Settings → Developer settings → Personal access tokens**, and unused GitHub Apps or OAuth apps.

**Report back:**
- the admin list;
- the number of deploy keys, tokens and apps left, with a reason for each.

**Done (2026-10-06, owner-verified):** no other collaborators or administrators; no deploy keys, Actions secrets or
variables; no authorised GitHub Apps or OAuth apps; no personal access tokens; no SSH keys. The API cross-check matches for
collaborators, deploy keys, secrets and variables.

## 11. Branch protection

**Steps:** repository **Settings** → **Rules** → **Rulesets** (or **Branches**), and add a rule for `main`:
- block force pushes;
- block deletion;
- optionally, require the "Deploy GitHub Pages" status check.

**Report back:** a screenshot or the text of the rule.

**Done (2026-10-05, owner instruction):** repository ruleset "Protect main" (id 24468095) blocks deletion and force pushes on `main`, with no bypass actors. Pull requests and required status checks were not enabled, because deploys push directly to `main` and CI runs after the push.
