# Step 3 Wave 16 Results (Safe, Soshogle Connections Batch)

Date: 2026-03-09

## Scope migrated in Wave 16

- `app/api/soshogle/facebook/oauth/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with DAL-scoped access via `resolveDalContext(state)` + `getCrmDb(ctx)`.
- `app/api/soshogle/stats/route.ts`
  - Replaced direct `prisma.channelConnection` and `prisma.conversationMessage` reads with `getCrmDb(ctx)`.
- `app/api/soshogle/connections/route.ts`
  - Replaced direct `prisma.channelConnection.findMany` with DAL-scoped query.
- `app/api/soshogle/connections/[id]/route.ts`
  - Replaced direct `prisma.channelConnection` read/delete with DAL-scoped operations.
- `app/api/soshogle/connections/[id]/refresh/route.ts`
  - Replaced direct `prisma.channelConnection` read/update with DAL-scoped operations.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 15: 289
  - After Wave 16: 284
  - Wave 16 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=284`

## Next batch recommendation

Proceed with controlled webhook batch using a dedicated cross-tenant lookup strategy (required for webhook routes without session context), then continue domain batches.
