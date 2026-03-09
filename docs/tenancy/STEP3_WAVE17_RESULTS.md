# Step 3 Wave 17 Results (Safe, Auth + Public Meta Batch)

Date: 2026-03-09

## Scope migrated in Wave 17

- `app/api/auth/forgot-password/route.ts`
  - Replaced direct `prisma.user` lookups/updates with `getMetaDb().user`.
- `app/api/auth/reset-password/route.ts`
  - Replaced direct `prisma.user` lookups/updates with `getMetaDb().user`.
- `app/api/auth/verify-reset-token/route.ts`
  - Replaced direct `prisma.user` lookup with `getMetaDb().user`.
- `app/api/subdomain/resolve/[subdomain]/route.ts`
  - Replaced direct `prisma.user` lookup with `getMetaDb().user`.
- `app/api/auth/parent/signup/route.ts`
  - Replaced direct `prisma.user` and `prisma.clubOSHousehold` operations with `getMetaDb()` operations.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 16: 284
  - After Wave 17: 279
  - Wave 17 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=279`

## Next batch recommendation

Proceed with a narrowly scoped webhook-read routing helper strategy for `webhooks/*` routes (non-session context) before converting those handlers, then continue domain batched DAL conversions.
