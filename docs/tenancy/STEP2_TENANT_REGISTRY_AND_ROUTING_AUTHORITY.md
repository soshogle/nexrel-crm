# Step 2 - Tenant Registry and Routing Authority (Safe / Shadow Mode)

Date: 2026-03-09

## Objective

Introduce a canonical tenant routing authority without changing live write paths.

## Implemented in this step

- Added tenant registry resolver:
  - `lib/tenancy/tenant-registry.ts`
- Added shadow verification script:
  - `scripts/tenancy/verify-tenant-routing-shadow.ts`

## Routing precedence

1. `TENANT_DB_OVERRIDES_JSON[tenant_id]` -> `DATABASE_URL_*` key (tenant override)
2. User industry -> `DATABASE_URL_<INDUSTRY>` (industry fallback)
3. `DATABASE_URL` (default fallback)

## Safety guarantees

- No production data move.
- No schema changes.
- No cutover from current DAL path.
- This step is read-only and verification-focused.

## Required env for tenant-specific override mode

- `TENANT_DB_OVERRIDES_JSON`
  - Example:
  - `{ "tenant_user_id_1": "DATABASE_URL_REAL_ESTATE", "tenant_user_id_2": "DATABASE_URL_TENANT_ACME" }`

## Validation command

- `npx tsx scripts/tenancy/verify-tenant-routing-shadow.ts .env.local`

## Advance criteria to Step 3

- Routing coverage report reviewed.
- Missing DB URL mappings resolved for target pilot tenants.
- Legal/privacy owner confirms no behavior-change cutover in this step.
