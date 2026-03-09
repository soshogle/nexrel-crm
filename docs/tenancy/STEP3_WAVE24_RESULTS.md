# Step 3 Wave 24 Results (Safe, Calls Domain Batch)

Date: 2026-03-09

## Scope migrated in Wave 24

- `app/api/calls/[id]/summarize/route.ts`
- `app/api/calls/audio/[conversationId]/route.ts`
- `app/api/calls/fetch-recording/route.ts`
- `app/api/calls/route.ts`
- `app/api/calls/send-notifications/route.ts`

### Changes made

- Replaced direct `prisma` imports with DAL-scoped DB access (`getDalContextFromSession` + `getCrmDb(ctx)`).
- Removed fallback direct-db behavior in `app/api/calls/route.ts`; route now requires DAL context consistently.
- Fixed prior guardrail finding by ensuring `resolveDalContext` usage in notifications path is paired with explicit `getCrmDb(ctx)` usage.

## Validation

- DAL routing audit summary:
  - After Wave 23: 236
  - After Wave 24: 230
  - Wave 24 delta: -6
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=230`
