# Step 3 Wave 25 Results (Safe, Business + Calendar + Clinics Batch)

Date: 2026-03-09

## Scope migrated in Wave 25

- `app/api/business-ai/query/route.ts`
- `app/api/calendar/google-oauth/callback/route.ts`
- `app/api/clinics/[id]/route.ts`
- `app/api/clinics/switch/route.ts`

### Changes made

- Replaced direct `prisma` imports with DAL routing.
- For session-based routes, used `getDalContextFromSession` + `getCrmDb(ctx)`.
- For Google OAuth callback (state carries `userId`), used `resolveDalContext(userId)` + `getCrmDb(ctx)` before persisting calendar connection.

## Validation

- DAL routing audit summary:
  - After Wave 24: 230
  - After Wave 25: 226
  - Wave 25 delta: -4
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=226`
