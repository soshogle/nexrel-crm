# Phase 2 + Phase 3 Production Checklist

Program: `nexrel-ai-brain`
Scope: Backend-only integration with guarded writes + HITL approvals

## Phase 2 - Low-Risk Writes

- [x] Runtime gate: phase >= 2 + explicit low-risk write flag
- [x] Policy tiers implemented (`LOW`, `HIGH`)
- [x] Low-risk action executor implemented:
  - [x] `CREATE_TASK`
  - [x] `UPDATE_LEAD_STATUS`
  - [x] `ADD_LEAD_TAG`
  - [x] `DRAFT_CAMPAIGN_ARTIFACT`
- [x] Audit logs persisted per run (`NEXREL_AI_BRAIN_OPERATOR_RUN`)
- [x] Assistant integration triggers operator runtime in guarded mode

## Phase 3 - High-Risk with Approvals

- [x] High-risk action classification (`MASS_OUTREACH`)
- [x] Approval queue via `AIJob` pending records
- [x] HITL notification emission for each approval-gated action
- [x] Approve route implemented (`/operator/jobs/:jobId/approve`)
- [x] Reject route implemented (`/operator/jobs/:jobId/reject`)
- [x] Auto-execution hard blocked by default (`NEXREL_AI_BRAIN_ENABLE_HIGH_RISK_AUTO_EXECUTE=false`)

## Production-Grade Operator Workflow Across CRM Surfaces

- [x] Surface-aware operator entrypoint (`assistant`, `leads`, `deals`, `tasks`, `campaigns`, `appointments`, `dental`, `real_estate`, `websites`, `reviews`, `billing`, `cron`)
- [x] Unified run endpoint (`POST /api/nexrel-ai-brain/operator/run`)
- [x] Job visibility endpoint (`GET /api/nexrel-ai-brain/operator/jobs`)
- [x] Health endpoint (`GET /api/nexrel-ai-brain/health`)
- [x] Scheduled operator sweep (`/api/cron/nexrel-ai-brain-operator`)

## Phase 4 - Shared Controls Hardening (In Progress)

- [x] Idempotency coverage for operator mutation endpoints
  - [x] `POST /api/nexrel-ai-brain/operator/run`
  - [x] `POST /api/nexrel-ai-brain/operator/jobs/:jobId/approve`
  - [x] `POST /api/nexrel-ai-brain/operator/jobs/:jobId/reject`
- [x] Kill switch controls (global + tenant-level)
  - [x] Global kill switch env flag (`NEXREL_AI_BRAIN_KILL_SWITCH`)
  - [x] Tenant kill switch env list (`NEXREL_AI_BRAIN_TENANT_KILL_SWITCH`)
  - [x] Enforced in shadow + operator runtimes
  - [x] Exposed in health status payload
- [x] Capability matrix by AI employee role
- [x] PIPEDA evidence artifact linking extensions
- [x] Distributed tracing propagation across surfaces

## Verification Commands

- `npx eslint "lib/nexrel-ai-brain/**/*.ts" "app/api/nexrel-ai-brain/**/*.ts" "app/api/cron/nexrel-ai-brain-operator/route.ts" "app/api/ai-assistant/chat/route.ts"`
- `npx tsc --noEmit --pretty false --incremental false`
