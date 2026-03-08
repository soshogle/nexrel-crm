# Outage Redundancy Runbooks

Last updated: 2026-03-06

Use these playbooks for incident response.

## 1) If OpenAI is down

### Immediate actions (0-5 min)

1. Confirm outage via OpenAI status page + app logs.
2. Pause AI-dependent non-critical jobs (summaries, optional analytics).
3. Keep voice inbound running with fallback messaging/routing.

### Containment (5-15 min)

1. Switch critical assistant paths to non-OpenAI fallback behavior:
   - deterministic scripts/FAQs,
   - route-to-human for high-risk intents.
2. For clinical contexts, show "AI temporarily unavailable" and continue manual workflow.

### Recovery (15-60 min)

1. Monitor OpenAI status recovery.
2. Re-enable OpenAI features in staged order:
   - voice guidance,
   - messaging AI,
   - analytics batch tasks.
3. Review failed requests and replay safe operations where needed.

## 2) If ElevenLabs is down

### Immediate actions (0-5 min)

1. Confirm via ElevenLabs status + webhook/voice callback errors.
2. Keep Twilio numbers active; do not disable phone lines.

### Containment (5-15 min)

1. Calls hit `/api/twilio/voice-callback` and should fail over to:
   - per-agent `backupPhoneNumber`/`transferPhone`, or
   - global fallback numbers.
2. If needed, force all agents to transfer mode by setting per-agent fallback numbers.

### Recovery (15-60 min)

1. Validate ElevenLabs session creation.
2. Run test calls per major clinic.
3. Return agents to normal AI handling.

## 3) If Twilio is down

### Immediate actions (0-5 min)

1. Confirm Twilio outage via status page.
2. Publish incident banner: "phone provider disruption; alternate numbers available".

### Containment (5-20 min)

1. Activate secondary telephony path (carrier/provider backup).
2. Update clinic-facing channels with temporary numbers.
3. Redirect web booking/chat to capture urgent callbacks.

### Recovery (20+ min)

1. Validate Twilio service restoration.
2. Revert temporary routing and notify clinics.
3. Post-incident review and update failover drills.

## 4) If primary database/cloud stack is down

### Current-state reality

- Backup tooling exists (`scripts/backup-database.ts`, `scripts/migrate-with-backup.ts`).
- A fully automated guaranteed 30-minute cross-provider failover is not yet a hardcoded SLA.

### Manual recovery target playbook

1. Export latest backup and verify integrity.
2. Provision standby DB target (e.g., Railway/Postgres).
3. Restore data and run migrations.
4. Deploy app from GitHub with production env vars.
5. Run health checks and smoke tests.
6. Perform DNS/traffic cutover.

To guarantee RTO=30m, automate this end-to-end and drill quarterly.
