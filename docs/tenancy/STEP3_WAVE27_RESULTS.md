# Step 3 Wave 27 Results (Safe, Credit Scoring Batch)

Date: 2026-03-09

## Scope migrated in Wave 27

- `app/api/credit-scoring/applications/route.ts`
- `app/api/credit-scoring/score/route.ts`

### Changes made

- Replaced direct `prisma` imports with DAL-scoped routing (`getDalContextFromSession` + `getCrmDb(ctx)`).
- Preserved existing decision/scoring behavior and API payload contracts.

## Validation

- DAL routing audit summary:
  - After Wave 26: 221
  - After Wave 27: 219
  - Wave 27 delta: -2
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=219`
