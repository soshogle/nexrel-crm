# Safe Execution Plan - 6 Steps + PIPEDA Evidence Additions

Date: 2026-03-09

This plan is execution-ordered and gate-based. Each step must pass before advancing.

## Step 1 - Tenancy contract (completed)

- Output: `STEP1_TENANT_LOCATION_CONTRACT.md`
- Test gate:
  - Architecture review sign-off (engineering + privacy owner)
  - No runtime behavior changes

## Step 2 - Tenant registry and routing authority

- Build canonical registry for `tenant_id -> Neon DB URL key + state + schema version`.
- Keep current industry routing as fallback during transition.
- Test gate:
  - 100% tenant lookup success in staging
  - fail-closed behavior when tenant mapping missing
  - no increase in live error rate in shadow mode

## Step 3 - Query discipline hardening

- Remove direct-prisma tenant data access paths in prioritized waves.
- Require tenant/location-scoped DAL methods for data-plane operations.
- Test gate:
  - guardrail audit violations reduced from baseline (342) to target threshold
  - integration tests for scoped read/write behavior
  - no cross-tenant/cross-location leakage in test fixtures

## Step 4 - Pilot with new tenants only

- New accounts onboarded to tenant-specific DB path.
- Existing accounts unchanged.
- Test gate:
  - pilot uptime and error budgets met
  - onboarding/provisioning success rates stable
  - support incident rate unchanged

## Step 5 - Existing tenant migration waves

- Migrate tenant-by-tenant with copy-verify-cutover pattern.
- No destructive deletion during wave migration.
- Test gate per tenant:
  - pre/post row count checks
  - referential integrity checks
  - read-compare checks pass
  - rollback validated

## Step 6 - Continuous verification and controls

- Ongoing monitors for routing anomalies, empty-result spikes, and latency.
- Scheduled integrity checks and audit sampling.
- Test gate:
  - alerting verified
  - monthly integrity report generated

---

## Additional PIPEDA requirements (must run in parallel)

### A) Data residency decision per Neon region

- Decide: Canada-only vs cross-border allowed.
- If cross-border allowed, update privacy notice and legal rationale.
- Gate:
  - legal approval recorded

### B) Processor controls aligned to tenant DB model

- Update DPA/vendor controls to include tenant DB routing and subprocessor paths.
- Gate:
  - legal + procurement approval

### C) Per-tenant migration evidence packets

- Generate packet per migrated tenant with:
  - pre/post counts
  - integrity checks
  - routing verification
  - rollback log
- Gate:
  - packet complete before wave closure

### D) Operational proof program

- Keep evidence logs for:
  - access request SLA
  - incident drill outcomes
  - privacy training completion
  - annual audit reports
- Gate:
  - quarterly compliance evidence review complete

---

## Safety rules (global)

- Backups before every migration wave.
- Revert tag before every production cutover.
- No schema-destructive operations without explicit rollback path.
- Freeze unrelated high-risk changes during migration windows.
