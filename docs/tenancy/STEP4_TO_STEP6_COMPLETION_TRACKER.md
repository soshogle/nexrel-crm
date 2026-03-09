# Step 4-6 Completion Tracker (Tenant DB + PIPEDA Technical Finish)

Date: 2026-03-09

This tracker is the execution checklist for the remaining safe-completion work after Step 3 routing hardening.

## Status Table

| Step                                          | Current State | Exit Criteria                                                                                        | Evidence Artifact                                                                                                                                     | Owner                         |
| --------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Step 4 - Pilot with new tenants only          | In progress   | All new owners provisioned to dedicated tenant DB, no shared-db onboarding path remains              | Provisioning validation report (weekly) in `docs/tenancy/`                                                                                            | Platform/Infrastructure       |
| Step 5 - Existing tenant migration waves      | In progress   | All existing owners migrated with copy-verify-cutover and rollback proof per wave                    | Wave result docs + per-tenant evidence packets (`docs/tenancy/STEP3_WAVE*_RESULTS.md`, `docs/legal/PIPEDA_PER_TENANT_MIGRATION_EVIDENCE_TEMPLATE.md`) | Migration Owner               |
| Step 6 - Continuous verification and controls | In progress   | Alerting active for routing anomalies/fallback mode; monthly integrity report generated and reviewed | Operational proof log + integrity report in `docs/legal/` and `docs/tenancy/`                                                                         | Engineering + Privacy Officer |

## Immediate Tasks

| Task                                                                     | Status  | Output                                                                           | Owner                         |
| ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------- | ----------------------------- |
| Enforce dedicated DB at owner creation                                   | Pending | Deployment note + policy update confirming no shared fallback for new owners     | Platform/Infrastructure       |
| Publish tenant->DB mapping attestation weekly                            | Pending | Versioned report in `docs/tenancy/`                                              | Migration Owner               |
| Automate compliance evidence exports (DSAR, retention, training, drills) | Pending | Quarterly attachments referenced in `docs/legal/PIPEDA_OPERATIONAL_PROOF_LOG.md` | Privacy Officer + Engineering |
| Configure alerts for fallback fan-out mode and elevated failures         | Pending | Ops alert definitions + runbook references                                       | SRE/Operations                |

## Technical Verification Baseline (already achieved)

- `npm run audit:dal:strict` passes with no direct-prisma violations in audited scope.
- `npm run typecheck` passes after tenant routing and logging standardization changes.
- Standardized job logs are active for scheduled email/SMS and tenancy-wide reminder/recall jobs.
