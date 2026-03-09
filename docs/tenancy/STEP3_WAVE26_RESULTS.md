# Step 3 Wave 26 Results (Safe, ResolveDalContext Guardrail Batch)

Date: 2026-03-09

## Scope migrated in Wave 26

- `app/api/demo/create-lead/route.ts`
- `app/api/lead-generation/capture/form/route.ts`
- `app/api/lead-generation/capture/voice/route.ts`
- `app/api/nexrel/leads/route.ts`
- `app/api/pricing-gate/unlock/route.ts`

### Changes made

- Resolved `resolveDalContext used without getCrmDb call` guardrail findings.
- Ensured each `resolveDalContext(...)` flow includes explicit DAL DB resolution via `getCrmDb(ctx)`.
- Preserved existing behavior for lead creation/email notifications.

## Validation

- DAL routing audit summary:
  - After Wave 25: 226
  - After Wave 26: 221
  - Wave 26 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=221`
