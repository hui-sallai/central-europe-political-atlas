# Legal / privacy / security governance (Phase 1)

Platform **v2.0** (unchanged). This folder records how the Atlas handles rights, personal data, political-analysis boundaries
and security. It is operational governance, **not legal advice**. Every statement is tagged:

| Tag | Meaning |
|---|---|
| **LAW / EXTERNAL LICENCE** | A rule that exists outside the Atlas (statute, regulation, publisher licence or terms). Cited, not interpreted as advice. |
| **ATLAS POLICY** | A rule the Atlas sets for itself, often stricter than law. |
| **OWNER DECISION** | A choice only the owner can make or confirm. Recorded in `owner_confirmations.json` / `site_operating_mode.json`. |
| **ENGINEERING CONTROL** | A machine check that enforces a policy (`pnpm legal-security:validate`, `pnpm political-person-safety:validate`). |

## Owner policy decision (2026-10-03, authoritative)

The Atlas does **not** perform political inference about identifiable natural persons and does **not** produce political
forecasts. See [political_person_data_policy.md](political_person_data_policy.md) and
[political_analysis_boundary.md](political_analysis_boundary.md).

## Index

- Risk: [legal_risk_register.md](legal_risk_register.md) (+ `.json`), [residual_risk_register.md](residual_risk_register.md)
- Personal data: [personal_data_policy.md](personal_data_policy.md), [political_person_data_policy.md](political_person_data_policy.md), [privacy_data_inventory.md](privacy_data_inventory.md), [data_processing_register.md](data_processing_register.md), [retention_policy.md](retention_policy.md)
- Political boundary: [political_analysis_boundary.md](political_analysis_boundary.md)
- Sources and rights: [source_licence_policy.md](source_licence_policy.md), [database_right_policy.md](database_right_policy.md), [copyright_content_policy.md](copyright_content_policy.md), `source_rights_registry.json`
- Access: [network_access_policy.md](network_access_policy.md), [robots_and_terms_policy.md](robots_and_terms_policy.md), `network_acquisition_registry.json`
- Security: [security_policy.md](security_policy.md), [incident_response_plan.md](incident_response_plan.md), [../../SECURITY.md](../../SECURITY.md), `public/.well-known/security.txt`
- Public handling: [correction_takedown_policy.md](correction_takedown_policy.md)
- Operating mode: [commercialisation_gate.md](commercialisation_gate.md), `site_operating_mode.json`, [media_registration_watch.md](media_registration_watch.md)
- Supply chain: [third_party_dependency_licences.md](third_party_dependency_licences.md)
- Owner: [owner_compliance_checklist.md](owner_compliance_checklist.md), [publisher_contact_release_checklist.md](publisher_contact_release_checklist.md)

## Validation

```
pnpm political-person-safety:validate   # person-level inference / profiling / prediction structures
pnpm legal-security:validate            # full governance gate (needs a fresh out/; --source-only skips built output)
```

Private correspondence, controller identity details and audit originals are **never** committed.
