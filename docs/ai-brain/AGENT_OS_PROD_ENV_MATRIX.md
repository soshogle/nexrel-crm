# Agent OS Production Env Rollout Matrix

This matrix defines the exact environment values for production rollout progression: `shadow -> canary -> enforce`.

## Required Variables

- `NEXREL_AGENT_ROLLOUT_MODE`
- `NEXREL_AGENT_KILL_SWITCH`
- `NEXREL_AGENT_TENANT_ALLOWLIST`
- `NEXREL_AGENT_TENANT_CANARY_LIST`
- `NEXREL_AGENT_TENANT_KILL_SWITCH`
- `NEXREL_AGENT_WIDGET_ENABLED`
- `NEXREL_AGENT_COMMAND_BUS_ENABLED`
- `NEXREL_AGENT_VISION_FALLBACK_ENABLED`
- `NEXREL_AGENT_VOICE_DUPLEX_ENABLED`
- `NEXREL_AGENT_COMMAND_BUS_SECRET`

## Stage 1: Shadow

Use this to observe behavior with no autonomous write mode.

```env
NEXREL_AGENT_ROLLOUT_MODE=shadow
NEXREL_AGENT_KILL_SWITCH=false
NEXREL_AGENT_TENANT_ALLOWLIST=tenant-alpha,tenant-beta
NEXREL_AGENT_TENANT_CANARY_LIST=tenant-alpha
NEXREL_AGENT_TENANT_KILL_SWITCH=
NEXREL_AGENT_WIDGET_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_ENABLED=true
NEXREL_AGENT_VISION_FALLBACK_ENABLED=false
NEXREL_AGENT_VOICE_DUPLEX_ENABLED=false
NEXREL_AGENT_COMMAND_BUS_SECRET=<64+_char_random_secret>
```

## Stage 2: Canary

Enable advanced surfaces only for listed canary tenants.

```env
NEXREL_AGENT_ROLLOUT_MODE=shadow
NEXREL_AGENT_KILL_SWITCH=false
NEXREL_AGENT_TENANT_ALLOWLIST=tenant-alpha,tenant-beta
NEXREL_AGENT_TENANT_CANARY_LIST=tenant-alpha
NEXREL_AGENT_TENANT_KILL_SWITCH=
NEXREL_AGENT_WIDGET_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_ENABLED=true
NEXREL_AGENT_VISION_FALLBACK_ENABLED=true
NEXREL_AGENT_VOICE_DUPLEX_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_SECRET=<64+_char_random_secret>
```

## Stage 3: Enforce (Canary Tenants)

Switch to enforced writes while still limited to allowlist/canary tenants.

```env
NEXREL_AGENT_ROLLOUT_MODE=enforce
NEXREL_AGENT_KILL_SWITCH=false
NEXREL_AGENT_TENANT_ALLOWLIST=tenant-alpha,tenant-beta
NEXREL_AGENT_TENANT_CANARY_LIST=tenant-alpha
NEXREL_AGENT_TENANT_KILL_SWITCH=
NEXREL_AGENT_WIDGET_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_ENABLED=true
NEXREL_AGENT_VISION_FALLBACK_ENABLED=true
NEXREL_AGENT_VOICE_DUPLEX_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_SECRET=<64+_char_random_secret>
```

## Stage 4: Enforce (Expanded)

Increase `NEXREL_AGENT_TENANT_ALLOWLIST` gradually after each stable reliability window.

```env
NEXREL_AGENT_ROLLOUT_MODE=enforce
NEXREL_AGENT_KILL_SWITCH=false
NEXREL_AGENT_TENANT_ALLOWLIST=tenant-alpha,tenant-beta,tenant-gamma,tenant-delta
NEXREL_AGENT_TENANT_CANARY_LIST=tenant-alpha,tenant-beta
NEXREL_AGENT_TENANT_KILL_SWITCH=
NEXREL_AGENT_WIDGET_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_ENABLED=true
NEXREL_AGENT_VISION_FALLBACK_ENABLED=true
NEXREL_AGENT_VOICE_DUPLEX_ENABLED=true
NEXREL_AGENT_COMMAND_BUS_SECRET=<64+_char_random_secret>
```

## Emergency Rollback

Global stop:

```env
NEXREL_AGENT_KILL_SWITCH=true
```

Tenant stop only:

```env
NEXREL_AGENT_TENANT_KILL_SWITCH=tenant-alpha
```

## Promotion Gate Checklist

- Reliability KPIs at target for in-scope missions.
- Canary blocker distribution stable or improving.
- No silent completion regressions.
- No high-risk command without `requiresApproval=true`.
- Rollback drill validated before expanding allowlist.
