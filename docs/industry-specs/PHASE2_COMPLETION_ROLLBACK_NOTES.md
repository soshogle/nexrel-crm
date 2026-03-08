# Phase 2 Completion + Rollback Notes

Date: 2026-03-08
Owner: AI implementation session

## Scope Completed

Phase 2 (industry workflow de-inheritance) was completed with additive, non-destructive changes.

### Wave A completed

- ACCOUNTING: custom task types, AI agents, templates
- LAW: custom task types, AI agents, templates
- TECHNOLOGY: custom task types, AI agents, templates

### Wave B completed

- DENTIST: custom task types, AI agents, templates
- SPORTS_CLUB: custom task types, AI agents, templates

### Wave C completed

- MEDICAL_SPA: custom task types, AI agents, templates
- OPTOMETRIST: custom task types, AI agents, templates
- HEALTH_CLINIC: custom task types, AI agents, templates
- HOSPITAL: custom task types, AI agents, templates

### Wave D completed (safe tool-policy hardening)

- Added optional tool-attachment context (industry/professional/real_estate)
- Added explicit allowlist policy entries for all non-RE industries
- Added orthodontist/retail prompt guardrail suffixes
- Updated all provision/autoprovision call sites to pass context

## Confirmed Constraints

- REAL_ESTATE path remains isolated and intact.
- ORTHODONTIST remains unique and keeps compatibility for existing mock-data users.
- No UI layout/look redesign was introduced.
- No DB schema changes or migrations were introduced.
- No destructive data operations were introduced.

## Audit Findings (Quick Final Pass)

### Verification checks run

- `git status --short --branch`
- `git diff --stat`
- inheritance scan: `...MEDICAL_CONFIG` / `...RESTAURANT_CONFIG`
- tool-call scan: `attachToolsToElevenLabsAgent(...)`
- compile safety: `npm run typecheck`

### Results

- Typecheck passed.
- No remaining full inherited industry configs from MEDICAL/RESTAURANT for target waves.
- Only intentional orthodontist partial reuse remains:
  - `...MEDICAL_CONFIG.taskTypes`
  - `...MEDICAL_CONFIG.aiAgents`
- All tool-attachment call sites now support context passing; fallback remains backward-compatible.

## Files Changed in This Phase

- `lib/workflows/industry-configs.ts`
- `lib/ai-employee-tools.ts`
- `lib/ai-employee-auto-provision.ts`
- `app/api/industry-ai-employees/provision/route.ts`
- `app/api/professional-ai-employees/provision/route.ts`
- `app/api/real-estate/ai-employees/provision/route.ts`
- `docs/industry-specs/README.md`
- `docs/industry-specs/PHASE1_GUARDRAILS.md`
- `docs/industry-specs/INDUSTRY_SPEC_MATRIX.md`
- `docs/industry-specs/PHASE2_COMPLETION_ROLLBACK_NOTES.md`

## Rollback Plan

Because no DB migrations were introduced, rollback is code-only.

### Immediate rollback (safe)

1. Revert the commit containing Phase 2 changes.
2. Redeploy application.
3. Trigger one non-destructive `provisionAIEmployeesForUser` pass to reattach baseline tools/prompts.

### Partial rollback options

- Workflow-only rollback: revert `lib/workflows/industry-configs.ts` only.
- Tool-policy-only rollback: revert `lib/ai-employee-tools.ts` plus caller updates.

### Data safety on rollback

- Existing user records remain valid.
- Existing agent records remain valid.
- Existing orthodontist mock data remains unchanged.
- Existing real-estate records and behavior remain unchanged.

## Post-Commit Monitoring (Recommended)

- Confirm provisioning logs for one user in each updated industry.
- Confirm AI Employees and Workflows tabs load for updated industries.
- Spot-check RE and Orthodontist users for parity with pre-change behavior.

## Post-Phase Verification (Executed)

- Added tests:
  - `tests/unit/industry/phase2-workflow-configs.test.ts`
  - `tests/unit/industry/ai-employee-tools-policy.test.ts`
  - `tests/unit/industry/provisioning-smoke-matrix.test.ts`
- Ran: `npx vitest run tests/unit/industry/*.test.ts`
- Ran: `npm run typecheck`
- Result: pass
