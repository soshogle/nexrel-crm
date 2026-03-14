# Agent OS Phase 2 Command Bus

Phase 2 adds idempotent, correlated command envelopes for owner-initiated remote actions.

## Capabilities Added

- Signed command envelope metadata (`v1`) per queued worker command.
- Correlation IDs for traceability across queue, worker ack, and audit streams.
- Idempotency key support to prevent accidental duplicate command enqueue.
- Policy-blocked command requests now return `409 CONFLICT`.

## API Inputs

- `POST /api/ai-employees/live-run/{sessionId}/worker-command`
  - Headers:
    - `x-idempotency-key` (optional)
    - `x-correlation-id` (optional)
  - Body:
    - `actionType`, `target`, `value`, `meta`
    - `riskTier` (`LOW|MEDIUM|HIGH`, optional)
    - `requiresApproval` (optional)

## Response Additions

- `commandId`
- `deduped` (`true` if matching idempotent command already exists)
- `correlationId`

## Envelope Signing

- Secret priority:
  1. `NEXREL_AGENT_COMMAND_BUS_SECRET`
  2. `NEXREL_AI_LIVE_RUN_WORKER_SECRET`
  3. unsigned mode (development fallback)

## Safety/Compatibility

- Fully additive to existing worker command flow.
- Existing clients without new headers continue to work.
- No database migration required.
