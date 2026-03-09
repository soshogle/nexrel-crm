# Step 3 Wave 15 Results (Safe, Soshogle OAuth + WhatsApp Batch)

Date: 2026-03-09

## Scope migrated in Wave 15

- `app/api/soshogle/oauth/facebook/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with DAL-scoped access using `resolveDalContext(state)` + `getCrmDb(ctx)`.
- `app/api/soshogle/oauth/instagram/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with DAL-scoped access using state-derived DAL context.
- `app/api/soshogle/oauth/whatsapp/callback/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with DAL-scoped access using state-derived DAL context.
- `app/api/soshogle/whatsapp/connect/route.ts`
  - Replaced direct `prisma.channelConnection` reads/writes with `getCrmDb(ctx).channelConnection`.
- `app/api/soshogle/whatsapp/disconnect/route.ts`
  - Replaced direct `prisma.channelConnection.deleteMany` with DAL-scoped delete.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 14: 294
  - After Wave 15: 289
  - Wave 15 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=289`

## Next batch recommendation

Proceed with a contained webhook batch (`app/api/webhooks/facebook/route.ts`, `app/api/webhooks/instagram/route.ts`, then `webhooks/whatsapp|twilio`) with the same post-wave guardrails and typecheck gate.
