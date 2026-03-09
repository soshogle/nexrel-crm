# Step 3 Wave 18 Results (Safe, Webhook Lookup Strategy + Webhook Batch)

Date: 2026-03-09

## Scope migrated in Wave 18

### New helper

- `lib/dal/webhook-channel-lookup.ts`
  - Added a safe non-session lookup strategy for webhook handlers.
  - Resolves channel connections across configured database candidates (default + industry DB URLs), with URL de-duplication to avoid duplicate queries when DB URLs are shared.

### Webhook routes migrated

- `app/api/webhooks/facebook/route.ts`
  - Replaced direct `prisma.channelConnection` lookup with `findConnectedChannelByProviderAccount`.
- `app/api/webhooks/instagram/route.ts`
  - Replaced direct `prisma.channelConnection` lookup with `findConnectedChannelByProviderAccount`.
- `app/api/webhooks/whatsapp/route.ts`
  - Replaced direct `prisma.channelConnection` lookup with `findConnectedChannelByProviderAccount`.
- `app/api/webhooks/twilio/route.ts`
  - Replaced direct `prisma.channelConnection` lookup with `findConnectedChannelByIdentifier`.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 17: 279
  - After Wave 18: 275
  - Wave 18 delta: -4
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=275`

## Next batch recommendation

Continue with API domain batches where session/DAL context is straightforward (e.g., selected reporting/admin-safe reads), while deferring high-complexity mixed-context modules until after focused test expansion.
