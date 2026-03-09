# Step 3 Wave 34 Results (Safe, ClubOS Programs/Schedules/Registrations Batch)

Date: 2026-03-09

## Scope migrated in Wave 34

- `app/api/clubos/programs/route.ts`
- `app/api/clubos/programs/[id]/route.ts`
- `app/api/clubos/schedules/route.ts`
- `app/api/clubos/schedules/[id]/route.ts`
- `app/api/clubos/registrations/route.ts`
- `app/api/clubos/registrations/[id]/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) across ClubOS programs/schedules/registrations routes.
- Preserved existing ownership/status-transition logic and response contracts.
- Kept route behavior unchanged while enforcing tenant-scoped DB routing.

## Validation

- DAL routing audit summary:
  - After Wave 33: 190
  - After Wave 34: 184
  - Wave 34 delta: -6
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=184`
