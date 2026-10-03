# Privacy data inventory (actual processing, 2026-10-04)

| Item | Where | Data | Who controls it | Notes |
|---|---|---|---|---|
| Static hosting | GitHub Pages (GitHub, Inc.) | IP address, request time, user agent, access logs | GitHub (its own privacy statement) | The Atlas cannot read or configure these logs. **LAW / EXTERNAL**: GitHub's terms and privacy statement; transfers to the US may occur under GitHub's arrangements. |
| Custom domain / DNS | registrar and DNS provider (owner account) | DNS queries handled by the provider | provider | No Atlas logging. |
| Research Notebook | visitor's browser `localStorage` key `central-europe-atlas:research-notebook:v1` | notes and evidence the visitor chooses to collect | the visitor | Never uploaded or synchronised; cleared by the visitor; no cryptographic protection claimed. |
| Appearance preference | visitor's browser `localStorage` key `atlas-theme` | `light`, `dark` or absent | the visitor | Functional preference only. |
| Contact e-mail | owner's mailbox (public address in `src/data/release.json`) | sender address, message, attachments | owner | Kept outside Git; retention per retention_policy.md. |
| Publisher / rights correspondence | owner's mailbox | correspondence with institutions | owner | Never committed; only gate outcomes (no personal content) may be recorded. |
| Security reports | owner's mailbox | reporter address, report content | owner | Handled per SECURITY.md. |
| Source provenance | repository | institution names, URLs, retrieval times, hashes | owner | No personal data. |
| Public-role data | none in current canonical data | — | — | Germany Slice 1A has contestants/parties only (P0). |

**Not present:** analytics, advertising, tracking pixels, marketing tools, social widgets, third-party runtime scripts,
cookies, sessionStorage, IndexedDB, server-side forms, accounts, profiling, automated political decision-making.

**ENGINEERING CONTROL:** `CLIENT_STORAGE_ALLOWLIST` in `scripts/legal-security/policy.mjs`; any new persistent client
storage requires review and an allowlist entry; `legal-security:validate` scans source and built output.
