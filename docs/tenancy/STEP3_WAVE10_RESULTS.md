# Step 3 Wave 10 Results (Safe, Larger Controlled Batch)

Date: 2026-03-09

## Scope migrated in Wave 10

- `app/api/meta/credentials/route.ts`
  - Replaced direct `prisma.socialMediaSettings` reads/writes with `getCrmDb(ctx).socialMediaSettings`.
- `app/api/meta/oauth/route.ts`
  - Replaced direct `prisma.socialMediaSettings` read with `getCrmDb(ctx).socialMediaSettings`.
- `app/api/meta/oauth/callback/route.ts`
  - Replaced direct `prisma.socialMediaSettings` and `prisma.channelConnection` reads/writes with DAL-scoped access.

## Validation

- DAL routing audit summary:
  - Baseline: 342 violations
  - After Wave 9: 315
  - After Wave 10: 312
  - Wave 10 delta: -3
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=312`

## Remaining effort estimate (batched strategy)

Current remaining violations: 312

Estimated remaining waves depending on batch size:

- At ~3 per wave (current pace): ~104 waves
- At ~10 per wave (medium batches): ~31 waves
- At ~20 per wave (larger controlled batches): ~16 waves

Recommendation: move to 10-20 violation batches focused by domain (e.g., meta/facebook/instagram group, then calendar group, then inventory group), while preserving the same safety gates.
