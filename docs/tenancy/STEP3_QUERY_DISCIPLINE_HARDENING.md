# Step 3 - Query Discipline Hardening (Safe Wave Plan)

Date: 2026-03-09

## Objective

Reduce tenant data leakage risk by eliminating unsafe direct-prisma usage and enforcing DAL-scoped access patterns.

## Current baseline

- Baseline file: `docs/tenancy/STEP3_DAL_ROUTING_BASELINE.json`
- Violation count baseline: 342

## Safety mode for Step 3

- Start with non-regression gate first (no behavior-breaking cutover).
- Convert code paths in small waves, re-test after each wave.
- Prioritize high-risk data-plane routes before low-risk/admin routes.

## Wave order (recommended)

1. High-risk write paths (lead/deal/messages/tasks/workflows)
2. Public and webhook paths that can touch tenant data
3. Background jobs and automation workers
4. Remaining admin/reporting paths

## Validation gates per wave

1. DAL guardrail count decreases or stays non-regressed.
2. Typecheck passes.
3. Targeted API smoke checks pass.
4. No increase in 5xx or empty-result anomalies in monitored endpoints.

## Commands

- Full audit JSON:
  - `npx tsx scripts/guardrails/audit-dal-routing.ts --json`
- Non-regression gate:
  - `npx tsx scripts/guardrails/audit-dal-routing.ts --max-violations=342`

## Exit criteria for Step 3 complete

- Violations reduced to an agreed threshold (target: near zero for tenant data paths).
- No unresolved high-risk direct-prisma violations remain in data-plane routes.
- Step 4 pilot tenant onboarding can run without fallback leakage risk.
