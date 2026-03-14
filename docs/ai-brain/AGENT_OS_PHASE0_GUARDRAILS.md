# Agent OS Phase 0 Guardrails

This phase introduces safe defaults and operational guardrails for the autonomous Agent OS rollout.

## Environment Flags

- `NEXREL_AGENT_ROLLOUT_MODE`
  - `off` (default): Agent OS write mode disabled.
  - `shadow`: Observe and log, no autonomous write mode.
  - `enforce`: Write mode allowed when kill switch is not active.
- `NEXREL_AGENT_KILL_SWITCH`
  - `true` disables new agent-run starts.
- `NEXREL_AGENT_WIDGET_ENABLED`
  - Enables UI widget surface.
- `NEXREL_AGENT_COMMAND_BUS_ENABLED`
  - Enables command bus transport.
- `NEXREL_AGENT_VISION_FALLBACK_ENABLED`
  - Enables vision fallback pathway.
- `NEXREL_AGENT_VOICE_DUPLEX_ENABLED`
  - Enables duplex voice controls.

## Contract Versioning

- Agent runtime contract version is exposed via the health endpoint.
- Current version: `2026-03-14`.

## Health Endpoint

- `GET /api/nexrel-ai/health` now includes:
  - `readiness.agentSystem.contractVersion`
  - `readiness.agentSystem.writeModeEnabled`
  - `readiness.agentSystem.flags`

## Safety Guarantees

- Default state remains safe-off for all new Agent OS surfaces.
- Existing CRM paths remain unchanged unless explicit feature flags are enabled.
- Global kill switch can halt new agent runs immediately.
