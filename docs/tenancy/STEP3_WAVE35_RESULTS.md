# Step 3 Wave 35 Results (Safe, ClubOS Communications/Households/Members Batch)

Date: 2026-03-09

## Scope migrated in Wave 35

- `app/api/clubos/communications/send-bulk/route.ts`
- `app/api/clubos/communications/settings/route.ts`
- `app/api/clubos/communications/settings/[id]/route.ts`
- `app/api/clubos/households/route.ts`
- `app/api/clubos/households/[id]/route.ts`
- `app/api/clubos/members/route.ts`
- `app/api/clubos/members/[id]/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`).
- Preserved endpoint behavior and improved ownership checks in household/member detail routes.
- Kept notification-settings defaults logic intact while routing persistence through DAL.

## Validation

- DAL routing audit summary:
  - After Wave 34: 184
  - After Wave 35: 177
  - Wave 35 delta: -7
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=177`
