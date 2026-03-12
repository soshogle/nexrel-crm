# Agent Command Center Autonomy

## Oversight Components

- Approvals Inbox UI: `/dashboard/agent-command-center/approvals`
- Audit Timeline UI: `/dashboard/agent-command-center/audit`
- Owner Control API: `GET/POST /api/agent-command-center/control`
- Manual Scheduler Run API: `POST /api/agent-command-center/scheduler`
- Cron Worker Endpoint: `GET/POST /api/cron/agent-command-center-cycle`

## Cron Worker Authorization

Set `CRON_SECRET` and call:

`Authorization: Bearer <CRON_SECRET>`

## Cron Worker Query Params

- `limit` (default `50`, max `200`)
- `external=1` to enable external adapters
- `paid=1` to allow paid campaign launch attempts
- `userId=<id>` to run for one owner only

Example:

`/api/cron/agent-command-center-cycle?limit=25&external=1&paid=0`

## Owner Safety Behavior

- If owner policy is `paused` or `stopped`, scheduler runs are blocked.
- Module/channel toggles are enforced at runtime.
- Daily caps are enforced for tasks/email/SMS.
- High-risk actions remain approval-gated in the inbox.
