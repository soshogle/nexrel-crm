# Soshogle IT Security & Data Protection Statement

Last updated: 2026-03-06

This statement summarizes Soshogle controls for protecting clinic/member data, with Canadian privacy requirements in mind.

## 1) Privacy Framework

- Soshogle aligns healthcare and clinic data handling to **PIPEDA**, and supports **HIPAA-aligned controls** for U.S. healthcare use cases, in addition to applicable provincial privacy laws.
- AI systems are configured to avoid clinical diagnosis/advice and escalate sensitive matters to qualified staff.
- Access to personal data is role-scoped and limited to operational need.

## 2) Data Residency (Canada)

- Clinical document and imaging storage is configured for Canadian data residency using AWS Canada region (`ca-central-1`) where available.
- Storage metadata marks Canadian residency context (`data-residency: CA-QC`) for residency verification workflows.
- If a Canadian AWS bucket is unavailable, system fallback storage can be used temporarily with encryption controls maintained.

## 3) Encryption & Access Controls

- Data in storage is encrypted at rest (server-side encryption + application-level encryption for sensitive document payloads).
- Data in transit uses HTTPS/TLS.
- Access is authenticated and role/tenant scoped.

## 4) Backups & Recovery

- Production databases and storage must run scheduled backups/snapshots with documented retention windows.
- Backup restore drills should be performed regularly and logged.
- Recovery runbooks must include RTO/RPO targets and emergency contacts.

## 5) Redundancy Measures

### Model Redundancy (AI Brain)

- Key failover is in place for voice AI provider capacity events (automatic switch to backup API keys when threshold is reached).
- Recommendation: maintain at least one alternate model/provider fallback path for critical call flows.

### Telecom Redundancy (Phone Line)

- If AI voice connection or agent configuration fails, inbound calls can fail over to a designated backup number using environment-configured routing (`TWILIO_FAILOVER_NUMBER` / `CLINIC_FAILOVER_NUMBER`).
- If no failover number is configured, callers receive a graceful spoken failure message instead of dead air.

### Server/Hosting Redundancy

- Services are deployed on managed cloud infrastructure with multi-zone availability capabilities.
- Health checks, observability, and incident response are required for production voice endpoints.

## 6) Operational Commitment

- Soshogle will not allow patient calls to drop silently.
- Failover behavior must be validated in staging before production releases.
- Security and privacy changes are tracked in code and reviewed before deployment.
