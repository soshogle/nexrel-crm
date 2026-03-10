# Nexrel AI Brain Program (Internal)

Status: Active
Owner: Platform + AI Engineering
Scope: Backend-only rollout, zero customer-facing UI label changes

## Naming and Branding Policy (Mandatory)

- Internal runtime/program name: `nexrel-ai-brain`
- Public/customer-facing naming: `Nexrel AI Assistant` or existing Nexrel labels only
- Forbidden in customer-facing strings, URLs, dashboards, docs, API payload labels: `openclaw`, `OpenClaw`
- Third-party upstream usage is allowed only in internal architecture documentation and dependency metadata.

## Program Goal

Embed a high-autonomy orchestration layer into Nexrel so AI employees can execute business tasks safely, with strict tenant controls, approval gates, and PIPEDA-aligned auditing.

## Non-Negotiable Constraints

1. No direct AI-to-database writes.
2. All execution through Nexrel action APIs and DAL.
3. Tenant context required for every read/write/action.
4. Policy engine default-deny.
5. Immutable run/audit logs.
6. Human approval required for high-risk actions.
7. Zero customer-facing use of upstream vendor branding.

## Rollout Phases

### Phase 1: Adapter Mode (Read + Suggest, No Writes)

Objective:

- Add orchestration adapter that can read business context and generate recommended actions without mutating data.

Deliverables:

- Run coordinator service (read-only mode hard-enforced)
- Business context assembler (goals, KPIs, SOP/doc retrieval)
- Suggestion output schema
- Audit trail for every suggestion run
- Feature flags for per-tenant activation

Exit Criteria:

- Suggestions generated with tenant-safe context
- Zero write attempts from adapter mode
- Suggestion quality baseline report

### Phase 2: Low-Risk Writes

Objective:

- Enable narrowly-scoped low-risk writes with strict policy checks.

Allowed early actions:

- Create internal tasks
- Update lead tags/status
- Draft campaign artifacts (not launch)

Exit Criteria:

- Idempotency coverage complete
- Error/rollback paths verified
- No policy violations in staged rollout window

### Phase 3: Broader Autonomy with Approvals

Objective:

- Expand to high-impact automation while enforcing approval gates for risky operations.

High-risk examples requiring approval:

- Mass outbound sends
- Pricing or billing-impacting actions
- Legal/compliance-sensitive communications

Exit Criteria:

- Approval SLA and audit evidence operational
- Stable business KPI lift under guardrails

## Implementation Status (2026-03)

- Phase 1: Implemented (`shadow-runner`, shadow cron, assistant hook, audit logs)
- Phase 2: Implemented with guarded low-risk writes (`CREATE_TASK`, `UPDATE_LEAD_STATUS`, `ADD_LEAD_TAG`, `DRAFT_CAMPAIGN_ARTIFACT`)
- Phase 3: Implemented with approval-gated high-risk operator jobs (`MASS_OUTREACH` requires HITL approval, no auto-send)
- Shared controls (partial): kill switch (global + tenant), idempotency for operator mutation endpoints, role capability matrix
- Shared controls (extended): distributed trace propagation (`x-nexrel-trace-id`) and PIPEDA evidence artifacts attached to operator/shadow audit metadata

## Operator Runtime Endpoints

- `POST /api/nexrel-ai-brain/operator/run`
  - Executes/simulates operator actions by surface (`assistant`, `leads`, `dental`, `real_estate`, `campaigns`, etc.)
- `GET /api/nexrel-ai-brain/operator/jobs`
  - Lists pending and historical operator jobs
- `POST /api/nexrel-ai-brain/operator/jobs/:jobId/approve`
- `POST /api/nexrel-ai-brain/operator/jobs/:jobId/reject`
- `GET /api/nexrel-ai-brain/health`
  - Runtime status and phase flags
- `GET /api/nexrel-ai-brain/metrics?days=7`
  - Operator run volume, denied action trend, and approval SLA visibility
- `POST /api/nexrel-ai-brain/metrics/baseline`
  - Writes tenant baseline snapshot model to immutable audit log (`NEXREL_AI_BRAIN_KPI_BASELINE`)
- `GET /api/nexrel-ai-brain/metrics/correlation?days=30`
  - Correlates AI Brain activity with CRM outcome KPIs against latest baseline snapshot
- `GET|POST /api/cron/nexrel-ai-brain-operator`
  - Daily production-grade operator sweep for business owners
- `GET|POST /api/cron/nexrel-ai-brain-digest`
  - Scheduled business impact digest + governance alert evaluation

## Phase/Policy Environment Flags

- `NEXREL_AI_BRAIN_ENABLED=true`
- `NEXREL_AI_BRAIN_PHASE=1|2|3`
- `NEXREL_AI_BRAIN_READ_ONLY=true|false`
- `NEXREL_AI_BRAIN_ENABLE_LOW_RISK_WRITES=true|false`
- `NEXREL_AI_BRAIN_ENABLE_HIGH_RISK_APPROVALS=true|false`
- `NEXREL_AI_BRAIN_ENABLE_HIGH_RISK_AUTO_EXECUTE=true|false` (recommended `false`)
- `NEXREL_AI_BRAIN_KILL_SWITCH=true|false`
- `NEXREL_AI_BRAIN_TENANT_KILL_SWITCH=<tenantId1,tenantId2,...>`
- `NEXREL_AI_BRAIN_ALERT_MAX_APPROVAL_SLA_HOURS=<number>` (default `24`)
- `NEXREL_AI_BRAIN_ALERT_MAX_PENDING_APPROVALS=<number>` (default `10`)
- `NEXREL_AI_BRAIN_ALERT_MAX_DENIED_ACTIONS=<number>` (default `25`)
- `NEXREL_AI_BRAIN_ALERT_MAX_CONVERSION_DROP_PCT=<number>` (default `5`)

## Required Shared Controls Across All Phases

- Capability matrix by AI employee role
- Risk-tier policy evaluation per action
- Idempotency keys for all execution paths
- Distributed tracing and run IDs
- Kill switch (tenant-level and global)
- PIPEDA evidence artifacts linked to run logs

## Architecture Snapshot (Target)

```text
Nexrel APIs/Workflows/Tools (System of Record)
        ^
        | enforced by policy + tenant DAL
        |
Nexrel AI Brain Coordinator (internal)
        |
Business Context + Retrieval + Planning
        |
Suggestion/Execution Runs + Audit + Approvals
```
