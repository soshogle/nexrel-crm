# PIPEDA Processor Controls Addendum - Tenant DB Model

Organization: Soshogle Inc.  
Product: Nexrel  
Date: ****\_\_****

## Purpose

Update processor controls and contractual requirements to reflect tenant-specific database routing and subprocessor paths.

## Required control clauses

1. Purpose limitation and processing instructions.
2. Confidentiality and least-privilege access.
3. Encryption in transit and at rest.
4. Incident notification obligations and timelines.
5. Subprocessor approval/disclosure requirements.
6. Data return/deletion on termination.
7. Audit/cooperation rights.
8. Cross-border transfer safeguards and transparency.

## Tenant DB specific requirements

- Processor must not commingle data across tenants.
- Routing metadata (`tenant_id`, `location_id`) must be preserved for auditability.
- Any maintenance/export operations must be tenant-scoped and logged.

## Vendor checklist

| Vendor     | Service Type      | Data Categories                    | Cross-Border? | DPA Updated? | Evidence Link |
| ---------- | ----------------- | ---------------------------------- | ------------- | ------------ | ------------- |
| Neon       | Database platform | CRM tenant data                    |               |              |               |
| Vercel     | Hosting/platform  | App and runtime metadata           |               |              |               |
| Twilio     | Messaging/voice   | contact and communication metadata |               |              |               |
| ElevenLabs | Voice AI          | call/voice assistant metadata      |               |              |               |
| Other      |                   |                                    |               |              |               |

## Approval

Privacy Officer: ********\_\_\_\_******** Date: ****\_\_****  
Legal Counsel: ********\_\_\_\_******** Date: ****\_\_****  
Procurement/Finance: ********\_\_\_\_******** Date: ****\_\_****
