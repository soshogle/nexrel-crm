# Step 3 Wave 11 Results (Safe, Larger Controlled Batch)

Date: 2026-03-09

## Scope migrated in Wave 11

- `app/api/facebook/oauth/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with `getCrmDb(ctx).channelConnection`.
- `app/api/instagram/status/route.ts`
  - Replaced direct `prisma.channelConnection` reads with `getCrmDb(ctx).channelConnection`.
- `app/api/instagram/disconnect/route.ts`
  - Replaced direct `prisma.channelConnection` delete with `getCrmDb(ctx).channelConnection.deleteMany`.
- `app/api/instagram/oauth/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with `getCrmDb(ctx).channelConnection`.
- `app/api/gmail/oauth/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with `getCrmDb(ctx).channelConnection`.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 10: 312
  - After Wave 11: 307
  - Wave 11 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=307`

## Remaining effort estimate (updated)

Current remaining violations: 307

- At ~10 per wave: ~31 waves remaining
- At ~20 per wave: ~16 waves remaining

Recommendation: continue domain-batched waves (calendar, then selected inventory, then webhook group) with unchanged safety gates.
