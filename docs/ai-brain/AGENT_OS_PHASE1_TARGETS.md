# Agent OS Phase 1 Target Map

Phase 1 introduces deterministic `data-ai-target` markers on high-value live-run surfaces.

## Scope Included

- Live Run dialog controls
- Employee launch points for Live Run
- Live Console operator controls

## Target IDs

- `live_run.goal_input`
- `live_run.target_apps_input`
- `live_run.trust_mode.crawl`
- `live_run.trust_mode.walk`
- `live_run.trust_mode.run`
- `live_run.autonomy_level.observe`
- `live_run.autonomy_level.assist`
- `live_run.autonomy_level.autonomous_low_risk`
- `live_run.autonomy_level.autonomous_full`
- `live_run.execution_target.cloud_browser`
- `live_run.execution_target.owner_desktop`
- `live_run.device.{deviceId}`
- `live_run.cancel`
- `live_run.start`
- `employee_card.start_live_run`
- `employee_detail.start_live_run`
- `live_console.back`
- `live_console.refresh`
- `live_console.worker.generate_token`
- `live_console.worker.copy_token`
- `live_console.worker.copy_connection_code`
- `live_console.worker.open_desktop_bridge`
- `live_console.remote.url_input`
- `live_console.remote.navigate`
- `live_console.remote.selector_input`
- `live_console.remote.text_input`
- `live_console.remote.click`
- `live_console.remote.type`
- `live_console.control.pause`
- `live_console.control.resume`
- `live_console.control.approve`
- `live_console.control.reject`
- `live_console.control.takeover`
- `live_console.control.stop`

## Guardrails

- Marker attributes are additive and do not alter current UX behavior.
- IDs are stable, lowercase, and dot-scoped.
- New markers should use `buildAiTarget()` from `lib/ai-employees/ai-targets.ts`.
