# Step 3 Wave 32 Results (Safe, Remaining Docpen API Batch)

Date: 2026-03-09

## Scope migrated in Wave 32

- `app/api/docpen/agents/[agentId]/conversation/[conversationId]/route.ts`
- `app/api/docpen/diagnose-agent-creation/route.ts`
- `app/api/docpen/knowledge-base/route.ts`
- `app/api/docpen/knowledge-base/link/route.ts`
- `app/api/docpen/knowledge-base/upload/route.ts`
- `app/api/docpen/soap/route.ts`
- `app/api/docpen/test-agent-creation/route.ts`
- `app/api/docpen/transcribe/route.ts`
- `app/api/docpen/voice-agent/functions/route.ts`
- `app/api/docpen/voice-agent/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) across remaining Docpen API routes.
- Kept user-profile/meta lookups on `getMetaDb()` where appropriate.
- Fixed the `resolveDalContext` guardrail pattern in `docpen/voice-agent/functions` by explicitly pairing it with `getCrmDb(ctx)`.

## Validation

- DAL routing audit summary:
  - After Wave 31: 206
  - After Wave 32: 195
  - Wave 32 delta: -11
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=195`
