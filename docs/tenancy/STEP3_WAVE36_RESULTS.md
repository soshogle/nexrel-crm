# Step 3 Wave 36 Results (Safe, Remaining ClubOS Parent/Payments/Venues Batch)

Date: 2026-03-09

## Scope migrated in Wave 36

- `app/api/clubos/parent/check-role/route.ts`
- `app/api/clubos/parent/dashboard/route.ts`
- `app/api/clubos/parent/family/route.ts`
- `app/api/clubos/parent/family/[id]/route.ts`
- `app/api/clubos/parent/payments/registrations/route.ts`
- `app/api/clubos/parent/schedules/route.ts`
- `app/api/clubos/parent-approvals/route.ts`
- `app/api/clubos/parent-approvals/[id]/route.ts`
- `app/api/clubos/payments/[id]/route.ts`
- `app/api/clubos/payments/[id]/refund/route.ts`
- `app/api/clubos/venues/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) across remaining ClubOS parent/payments/venues routes.
- Kept role checks on meta user data through `getMetaDb()` where needed (`parent/check-role`, `parent/dashboard`).
- Preserved existing ownership checks and response contracts.

## Validation

- DAL routing audit summary:
  - After Wave 35: 177
  - After Wave 36: 166
  - Wave 36 delta: -11
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=166`
