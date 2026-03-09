# Step 3 Wave 29 Results (Safe, CRM Voice Agent Batch)

Date: 2026-03-09

## Scope migrated in Wave 29

- `app/api/crm-voice-agent/route.ts`
- `app/api/crm-voice-agent/functions/route.ts`

### Changes made

- Replaced direct `prisma` usage with `getMetaDb()` for user profile lookups.
- Replaced direct `prisma` usage with DAL-scoped DB access (`createDalContext` + `getCrmDb(ctx)`) for voice-agent data.
- Preserved existing endpoint behavior and function-call contracts.

## Validation

- DAL routing audit summary:
  - After Wave 28: 217
  - After Wave 29: 215
  - Wave 29 delta: -2
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=215`
