# Nexrel AI Master Conductor Phases

## Phase 0 - Blueprint + Safety

- Lock architecture: Nexrel AI orchestrates, existing handlers execute as tools.
- Define guardrails: trust modes, owner controls, approvals, caps, kill switches.
- Add rollout flags:
  - `NEXREL_AI_BRAIN_ENFORCE_ORCHESTRATION`
  - `NEXREL_AI_BRAIN_SHADOW_ORCHESTRATION`

## Phase 1 - Unified Action Gateway

- Intercept assistant action routes before handler execution.
- Route write actions through Nexrel AI operator preflight.
- Keep current UI and action handlers unchanged.

## Phase 2 - Workflow + Campaign Preflight

- Add Nexrel AI preflight to workflow triggers and campaign execution paths.
- Require policy approval for high-risk outbound operations.

## Phase 3 - Persistent Business Brain Profile

- Build tenant profile for offers, ICP, constraints, economics, goals.
- Feed from onboarding, KB, CRM, and owner updates.

## Phase 4 - Persistent Event + Memory Layer

- Replace ephemeral in-memory event history with durable event log.
- Add long-term memory retrieval for strategy and action planning.

## Phase 5 - Autonomous Gap Scanner

- Run scheduled checks for missing/stale critical loops.
- Auto-run mandates (sentiment pulse, diagnostics, follow-up loops) when due.
- Cron endpoint implemented: `/api/cron/nexrel-ai-brain-mandates`.

## Phase 6 - Learning + Optimization

- Store predicted outcome vs actual outcome for each orchestrated action.
- Update channel/hook/timing priors weekly.
- Learning report endpoint implemented: `/api/agent-command-center/learning-report?days=14`.

## Phase 7 - Explainability + Governance UX

- Show why each action was chosen and expected impact.
- Expand owner control and audit views across all orchestrated surfaces.

## Phase 8 - Production Hardening

- Queue reliability, retries, idempotency, rate-limits, anomaly alerts.
- Tenant-by-tenant rollout: shadow -> crawl -> walk -> run.

## Learning Snapshots

- Weekly/periodic learning snapshot cron: `/api/cron/nexrel-ai-brain-learning-snapshot`.
- Stores trend snapshots in audit logs under `NEXREL_AI_BRAIN_LEARNING_SNAPSHOT`.
