# Step 3 Wave 14 Results (Safe, Soshogle Integration Status/Disconnect Batch)

Date: 2026-03-09

## Scope migrated in Wave 14

- `app/api/soshogle/facebook/status/route.ts`
  - Replaced direct `prisma.channelConnection` read with `getCrmDb(ctx).channelConnection`.
- `app/api/soshogle/facebook/disconnect/route.ts`
  - Replaced direct `prisma.channelConnection.deleteMany` with DAL-scoped delete.
- `app/api/soshogle/instagram/status/route.ts`
  - Replaced direct `prisma.channelConnection` read with DAL-scoped read.
- `app/api/soshogle/instagram/disconnect/route.ts`
  - Replaced direct `prisma.channelConnection.deleteMany` with DAL-scoped delete.
- `app/api/soshogle/whatsapp/status/route.ts`
  - Replaced direct `prisma.channelConnection` read with DAL-scoped read.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 13: 299
  - After Wave 14: 294
  - Wave 14 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=294`

## Next batch recommendation

Proceed with remaining `soshogle/*` OAuth/disconnect/status endpoints and then selected `webhooks/*` routes, preserving the same test-and-gate workflow.
