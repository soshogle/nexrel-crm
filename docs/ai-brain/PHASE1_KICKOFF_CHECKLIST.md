# Phase 1 Kickoff Checklist (Adapter Mode)

Mode: Read + Suggest only (no writes)
Program Name: `nexrel-ai-brain`

## A. Governance and Guardrails

- [ ] Add internal feature flag `NEXREL_AI_BRAIN_ENABLED` (default false)
- [ ] Add internal feature flag `NEXREL_AI_BRAIN_READ_ONLY` (default true)
- [ ] Add internal feature flag `NEXREL_AI_BRAIN_TENANT_ALLOWLIST` (optional)
- [ ] Enforce default-deny in policy evaluation for adapter actions
- [ ] Enforce tenant-context-required assertion in adapter entrypoints

## B. Adapter Runtime

- [ ] Create run coordinator service
- [ ] Create context assembler service (CRM profile + KPIs + business goals)
- [ ] Create suggestion planner schema and output contracts
- [ ] Add run log persistence for traceability
- [ ] Add hard block on any write action in phase 1

## C. Data and Knowledge Inputs

- [ ] Define source registry for SOP/docs/URLs/files
- [ ] Implement chunking/index job (read-only retrieval)
- [ ] Add KPI snapshot reader for current period context
- [ ] Add business goal reader (target/threshold mapping)
- [ ] Add retrieval tests for tenant isolation boundaries

## D. Integrations (No UI Changes)

- [ ] Wire adapter into existing assistant route in shadow mode
- [ ] Add background suggestion generation cron (dry-run)
- [ ] Record output into internal logs only
- [ ] Keep existing workflows/campaigns unchanged

## E. Observability and Compliance

- [ ] Add `runId` and `tenantId` to all adapter logs
- [ ] Add policy decision logs for each suggestion step
- [ ] Add evidence export hook for compliance reporting
- [ ] Add anomaly alert for attempted write from adapter mode

## F. Exit Criteria (Must Pass)

- [ ] Zero data mutation incidents from adapter mode
- [ ] Zero cross-tenant retrieval incidents
- [ ] 95%+ successful suggestion run completion
- [ ] Signed review from Security + Compliance before phase 2
