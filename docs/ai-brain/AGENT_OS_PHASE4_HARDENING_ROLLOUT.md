# Agent OS Phase 4 Hardening + Rollout Controls

Phase 4 adds tenant-scoped rollout controls and reliability enforcement hooks while keeping all behavior backward-compatible.

## Tenant Rollout Controls

Environment variables:

- `NEXREL_AGENT_ROLLOUT_MODE`
  - `off` | `shadow` | `enforce`
- `NEXREL_AGENT_TENANT_ALLOWLIST`
  - Comma-separated tenant IDs allowed to run Agent OS.
- `NEXREL_AGENT_TENANT_CANARY_LIST`
  - Comma-separated tenant IDs treated as canary tenants.
- `NEXREL_AGENT_TENANT_KILL_SWITCH`
  - Comma-separated tenant IDs blocked from Agent OS execution.

Behavior:

- Live run start is blocked if tenant is globally/tenant-killed, not allowlisted (when allowlist set), or rollout mode is `off`.
- Health endpoint exposes rollout decision state for the current tenant.

## Reliability Enforcement Hooks

- `POST /api/ai-employees/live-run/{sessionId}/worker-command`
  - High-risk commands (`riskTier=HIGH`) now require `requiresApproval=true`.
  - Violations return `409 CONFLICT`.
  - Every accepted command records `reliabilityHook` metadata.

## Operational Runbook

1. Start in `shadow` mode with allowlisted canary tenants.
2. Monitor reliability canary/KPI artifacts for blocker distribution.
3. Move canary tenants to `enforce` mode after stable pass window.
4. Expand allowlist incrementally.
5. If regressions appear:
   - set `NEXREL_AGENT_KILL_SWITCH=true` (global)
   - or add affected tenant to `NEXREL_AGENT_TENANT_KILL_SWITCH`
   - investigate blocker artifacts before re-enable.

## Safety Guarantees

- Additive changes only; existing flows remain functional without new headers/flags.
- No schema migration required.
- Kill switches provide immediate rollback path.
