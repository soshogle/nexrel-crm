# Step 1 - Tenant and Location Contract (Canonical)

Status: active design contract (non-breaking, no cutover yet)

## Goal

Define immutable scoping rules so per-customer DB isolation and multi-location data safety are enforceable without ambiguity.

## Canonical IDs

- `tenant_id`: unique customer/account boundary.
- `location_id`: physical/business unit under a tenant (clinic/store/office/etc.).
- `user_id`: actor identity; may have access to one or more locations under one tenant.

## Data boundary rules

1. Cross-tenant reads/writes are prohibited by default.
2. Location-scoped entities must require `location_id` in all write paths.
3. Cross-location reads are only allowed for explicitly privileged roles and still constrained to `tenant_id`.
4. Global tenant entities (e.g., some settings) are allowed without `location_id`.

## Request context contract (DAL v2 target)

Every data-plane request context must include:

- `tenant_id` (required)
- `user_id` (required)
- `allowed_location_ids` (required, can be empty only for global-only operations)
- `active_location_id` (required for location-scoped endpoints)

## Entity classification contract

- `control-plane` (shared/meta DB): auth/session/account/billing/tenant-registry
- `tenant-global` (tenant DB): workflows/templates/settings that are tenant-wide
- `tenant-location` (tenant DB): leads/deals/appointments/messages/tasks/inventory/etc.

## Query invariants

All repository/DAL methods must satisfy one of:

- **global method**: filters by `tenant_id` only
- **location method**: filters by `tenant_id` + `location_id`
- **multi-location method**: filters by `tenant_id` + `location_id IN allowed_location_ids`

No direct raw/shared-prisma access for tenant data is allowed in target state.

## Index and integrity invariants

- Add indexes on `tenant_id` and `location_id` for scoped tables.
- Use composite uniqueness with `location_id` where natural keys can collide between locations.
- Enforce FK consistency so child rows cannot reference another location scope.

## Security and compliance invariants (PIPEDA-aligned)

- Audit records include `tenant_id`, `location_id`, actor, action, and timestamp.
- Access/correction/deletion requests map to a single tenant scope.
- Incident/breach triage includes impacted tenant and impacted locations.

## Non-goals in Step 1

- No migration execution.
- No cutover routing changes.
- No destructive data operations.
