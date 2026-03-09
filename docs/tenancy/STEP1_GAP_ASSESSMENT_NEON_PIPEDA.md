# Step 1 Gap Assessment - Neon + PIPEDA Readiness

Date: 2026-03-09

## What exists now (strengths)

- Industry DB routing framework exists: `lib/db/industry-db.ts`.
- DAL strict mode toggles exist: `lib/dal/db.ts`.
- Session-to-industry context helpers exist: `lib/context/industry-context.ts`.
- Multi-DB logical backup tooling exists: `scripts/backup/full-multidb-logical-backup.ts`.
- PIPEDA docs/SOP pack and accountability endpoint were added.

## Critical gaps before per-user DB isolation

1. Routing key mismatch:
   - Current routing is industry-based, not `tenant_id`-based.
2. DAL adoption incomplete:
   - Routing audit currently reports 342 direct-prisma or scope issues.
3. Location scope is not universal:
   - Some domains support clinic/location scoping, but not consistently across all tenant data.
4. Control-plane tenant registry is not canonical yet:
   - Need a single source of truth for `tenant_id -> Neon DB endpoint/status/schema version`.
5. Evidence and legal-operational alignment for migration model:
   - Need per-tenant migration evidence packets for compliance defensibility.

## Neon-specific decisions still required

### Data residency decision

- Decide and document one policy:
  - Canada-only Neon deployment, or
  - cross-border allowed with explicit legal notice and risk rationale.

### Connection strategy

- Use pooled Neon URLs and bounded Prisma client caching.
- Avoid unbounded per-tenant client instantiation.

## PIPEDA compliance gaps tied to tenancy transition

1. Processor controls need explicit update for tenant DB routing and subprocessors.
2. Cross-border transfer language must match actual Neon region strategy.
3. Migration evidence package must be generated per tenant:
   - pre/post row counts,
   - integrity checks,
   - routing verification,
   - rollback proof.
4. Operational proof cadence must be tracked:
   - access request SLA evidence,
   - incident drills,
   - training completion,
   - annual audit outputs.

## Risk classification for next steps

- Step 2 (tenant registry + routing): medium
- Step 3 (query discipline): medium-high
- Step 4 (pilot): medium
- Step 5 (existing tenant migration): high
- Step 6 (continuous verification): low

## Safe progression gates

- No tenant migration until DAL direct-prisma risk is reduced to agreed threshold.
- No cutover without successful canary read-compare and rollback drill.
- No production region change without legal-approved residency/cross-border language.
