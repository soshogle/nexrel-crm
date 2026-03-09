# Step 3 Wave 41 Results (Safe, Payments Providers/Intent/Cash+BNPL Batch)

Date: 2026-03-09

## Scope migrated in Wave 41

- `app/api/payments/providers/route.ts`
- `app/api/payments/providers/[id]/route.ts`
- `app/api/payments/create-intent/route.ts`
- `app/api/payments/cash/transactions/[id]/route.ts`
- `app/api/payments/bnpl/installments/[id]/pay/route.ts`

### Changes made

- Replaced direct `prisma` usage with DAL-scoped access (`getDalContextFromSession` + `getCrmDb(ctx)`) across selected authenticated payments routes.
- Standardized ownership on session user id instead of email lookup in these routes.
- Preserved existing payment-provider behavior, intent creation flow, and transaction/installment semantics.

## Validation

- DAL routing audit summary:
  - After Wave 40: 144
  - After Wave 41: 139
  - Wave 41 delta: -5
- Typecheck: pass

## Safety assessment

- No schema changes
- No data migration
- No routing cutover
- No destructive operations

## Guardrail update recommendation

- Tighten non-regression audit gate to:
  - `--max-violations=139`
