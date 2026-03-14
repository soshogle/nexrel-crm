# Agent OS Phase 3 Vision + Duplex Scaffolding

Phase 3 introduces gated scaffolding for vision fallback queueing and duplex interrupt control.

## Vision Fallback (Flag-Gated)

- New endpoint:
  - `POST /api/ai-employees/live-run/{sessionId}/vision-fallback`
- Gate:
  - Requires `NEXREL_AGENT_VISION_FALLBACK_ENABLED=true`
- Behavior:
  - Queues coordinate-based `click`/`type` commands through existing worker command queue.
  - Adds `meta.visionFallback` payload (`targetHint`, `confidence`, `source`).
  - Uses correlation and idempotency headers when provided.

## Duplex Interrupt (Flag-Gated)

- Existing control endpoint now accepts `interrupt` action.
- Gate:
  - Requires `NEXREL_AGENT_VOICE_DUPLEX_ENABLED=true`
- Behavior:
  - Interrupt sets live run into owner takeover state (`paused + takeover`) without terminal failure.
  - Emits `interrupted` event in session timeline.

## UI Additions (Additive)

- Live Console reads feature flags from `/api/nexrel-ai/health` and conditionally shows:
  - Vision fallback badge + hint input.
  - Duplex interrupt badge + interrupt control button.
- Clicking worker frame in vision mode uses the vision-fallback endpoint.

## Safety / Compatibility

- All Phase 3 behavior is disabled by default.
- Existing controls and routes remain backward-compatible.
- No database migration required.
