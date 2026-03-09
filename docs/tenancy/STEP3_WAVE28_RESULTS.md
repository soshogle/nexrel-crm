# Step 3 Wave 28 Results (Safe, Demo Call Logging Batch)

Date: 2026-03-09

## Scope migrated in Wave 28

- `app/api/demo/record-conversation/route.ts`
- `app/api/demo/send-lead-report/route.ts`

### Changes made

- Replaced direct `prisma` call-log access with DAL-scoped routing (`resolveDalContext` + `getCrmDb(ctx)`).
- Preserved demo behavior and email/report output shape.

## Validation

- DAL routing audit summary:
  - After Wave 27: 219
  - After Wave 28: 217
  - Wave 28 delta: -2
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=217`
