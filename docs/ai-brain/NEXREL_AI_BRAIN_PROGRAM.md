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
