# Incident response plan

**ATLAS POLICY.** Applies to security vulnerabilities, accidental publication of personal or private data, licence
breaches, defamatory or erroneous content, and account or domain compromise.

1. **Detect / receive.** Inputs: security reports (SECURITY.md), correction requests, validator failures, GitHub alerts.
2. **Contain (first).**
   - Content or data problem: revert the commit, or unpublish the page or dataset and redeploy Pages.
   - Leaked secret: revoke it at the issuer first, then clean history.
   - Account compromise: rotate credentials, review MFA, sessions, deploy keys and Pages settings.
   - Domain hijack: contact the registrar and remove the custom domain from Pages until it is verified again.
3. **Assess.** What was exposed, since when, to whom, and whether personal data is involved.
4. **Personal-data breach (LAW / EXTERNAL, context).** Where the GDPR applies, a breach that is likely to risk individuals'
   rights may require notifying the competent supervisory authority without undue delay and, where feasible, within 72 hours
   (Art. 33). High-risk breaches may also require informing the affected people (Art. 34). Whether these duties apply, and
   which authority is competent, is an **OWNER DECISION**, and the controller identity is still unconfirmed. Nothing is sent
   automatically.
5. **Fix and verify.** Patch the problem, run `legal-security:validate` and the full gate, then redeploy.
6. **Record.** Keep a minimal incident note (date, category, action, no personal content) and update the risk registers.
