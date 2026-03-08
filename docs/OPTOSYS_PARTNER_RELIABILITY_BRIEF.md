# Optosys Reliability Brief (Plain English)

Last updated: 2026-03-06

## Short answer

If one AI component fails, calls should not drop into silence. The system can forward calls to a real clinic line/backup number. We also maintain backup/export capabilities for database recovery.

## What happens if AI has an outage?

1. **AI model/provider issues**

   - Voice key failover exists for provider capacity/limits.
   - If AI session setup fails during a call, we return TwiML that forwards the call to backup routing when configured.

2. **Phone line issues**

   - If AI agent config/connection fails, calls can route to a fallback number.
   - This avoids dead air and gives the caller a graceful spoken handoff message.

3. **Cloud/platform issues**
   - If the underlying cloud provider has a regional or broad outage, many systems may be impacted industry-wide.
   - We rely on backups, recovery scripts, and redeployment automation to restore service quickly.

## Compliance posture

- For healthcare workflows, we support **HIPAA/PIPEDA-aligned** controls depending on client jurisdiction.
- Canadian data residency is supported for clinical storage using AWS Canada region (`ca-central-1`) where configured.

## Current architecture: what is true today

- Call failover is implemented in `app/api/twilio/voice-callback/route.ts`.
- Recovery/backup scripts exist (`scripts/backup-database.ts`, `scripts/migrate-with-backup.ts`).
- This repository does **not** currently provide a fully automated, one-click "Neon -> Railway in 30 minutes" disaster failover orchestration.

## Is "restore in 30 minutes" possible now?

- **Manually possible in many scenarios**, but not guaranteed by current code as a strict SLO.
- To guarantee a 30-minute RTO, we need an explicit DR runbook + tested automation:
  1. Continuous DB backups with retention and restore validation
  2. Pre-provisioned Railway target environment and secrets
  3. Automated restore + migration pipeline
  4. DNS/traffic cutover steps
  5. Quarterly DR drills with measured RTO/RPO

## Recommended next step for Optosys-facing commitment

- Publish an approved **Business Continuity & Disaster Recovery** document with:
  - target RTO/RPO
  - scope (voice, CRM, documents, analytics)
  - failover responsibilities
  - communication plan during incidents
  - evidence from DR drills
