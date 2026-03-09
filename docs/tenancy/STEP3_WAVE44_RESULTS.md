# Step 3 Wave 44 Results (Larger Safe Batch: Onboarding + Knowledge Base)

Date: 2026-03-09

## Scope migrated in Wave 44

- `app/api/onboarding/apply-config/route.ts`
- `app/api/onboarding/conversation/route.ts`
- `app/api/onboarding/progress/route.ts`
- `app/api/onboarding/update-step/route.ts`
- `app/api/onboarding/upload-document/route.ts`
- `app/api/onboarding/upload-logo/route.ts`
- `app/api/knowledge-base/route.ts`
- `app/api/knowledge-base/[id]/route.ts`
- `app/api/knowledge-base/scrape-url/route.ts`
- `app/api/knowledge-base/upload-document/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access in authenticated routes (`getDalContextFromSession` + `getCrmDb(ctx)`).
- Preserved onboarding flow behavior (step progression, profile mapping, completion handling, uploads).
- Preserved knowledge-base behavior (listing, filtering by agent/unassigned, upload/link, delete, scrape).
- Normalized onboarding progress route to session user id-based lookup/update while keeping response semantics intact.

## Validation

- DAL routing audit summary:
  - After Wave 43: 108
  - After Wave 44: 98
  - Wave 44 delta: -10
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=98`
