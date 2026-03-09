# Step 3 Wave 37 Results (Safe, Debug + Ecommerce + Delivery Session Batch)

Date: 2026-03-09

## Scope migrated in Wave 37

- `app/api/debug/impersonation-status/route.ts`
- `app/api/debug/voice-agents/route.ts`
- `app/api/debug/voice-ai/route.ts`
- `app/api/ecommerce/categories/route.ts`
- `app/api/ecommerce/products/route.ts`
- `app/api/ecommerce/products/[id]/route.ts`
- `app/api/ecommerce/storefront/route.ts`
- `app/api/delivery/orders/[id]/location/route.ts`
- `app/api/delivery/simulate-location/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) on authenticated debug/ecommerce/delivery endpoints.
- Kept admin/meta lookups in debug paths on `getMetaDb()` where appropriate.
- Left public tracking route (`delivery/track/[trackingCode]`) for dedicated non-session routing treatment.

## Validation

- DAL routing audit summary:
  - After Wave 36: 166
  - After Wave 37: 157
  - Wave 37 delta: -9
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=157`
