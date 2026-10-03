# Retention policy

**ATLAS POLICY / OWNER DECISION.** No statutory retention periods are asserted here. Periods marked *owner default* are
proposals the owner confirms or changes in `owner_confirmations.json` workflow; they are not legal requirements.

| Record | Rule | Owner default (proposal) |
|---|---|---|
| General e-mail | keep only while needed to answer; delete afterwards | review and delete quarterly |
| Legal / rights / correction requests | keep the request and outcome record while the outcome may be questioned | review annually |
| Publisher correspondence | keep while the licence decision depends on it; record only the gate outcome (no personal content) in Git | keep for the life of the affected dataset |
| Security reports | keep until fixed and reviewed | review 12 months after closure |
| Temporary downloads / staging (`.tmp-*`, scratch) | delete after the run; never committed | delete after each run |
| Private audit evidence (`local-evidence/`) | local only, gitignored; delete when no longer needed for the open audit | review when the related gate closes |
| Source provenance (hashes, URLs, timestamps) | permanent research record | permanent |
| Research Notebook | in the visitor's browser only | visitor-controlled |

Private correspondence remains private and is never committed. Deletion requests are handled per
correction_takedown_policy.md.
