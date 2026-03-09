# Step 3 Wave 33 Results (Safe, ClubOS Divisions/Teams/Code Batch)

Date: 2026-03-09

## Scope migrated in Wave 33

- `app/api/clubos/club-code/route.ts`
- `app/api/clubos/divisions/route.ts`
- `app/api/clubos/divisions/[id]/route.ts`
- `app/api/clubos/teams/route.ts`
- `app/api/clubos/teams/[id]/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) for ClubOS tenant data.
- Kept user/account lookups for club-code generation on `getMetaDb()`.
- Preserved existing ownership checks and response contracts.

## Validation

- DAL routing audit summary:
  - After Wave 32: 195
  - After Wave 33: 190
  - Wave 33 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=190`
