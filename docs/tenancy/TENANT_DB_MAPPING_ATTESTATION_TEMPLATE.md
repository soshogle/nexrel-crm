# Tenant-DB Mapping Attestation Template

Organization: Soshogle Inc.  
Product: Nexrel  
Reporting Period: ********\_\_\_\_********  
Prepared Date: ********\_\_\_\_********

## 1) Executive Attestation

- Total active owners reviewed: ********\_\_\_\_********
- Owners on dedicated tenant DB: ********\_\_\_\_********
- Owners not yet on dedicated tenant DB: ********\_\_\_\_********
- Coverage (% dedicated): ********\_\_\_\_********
- Dedicated-by-default onboarding active for new owners: Yes / No

Attestation statement:

"I attest that the tenant-to-database mapping for the reporting period above was reviewed, evidence was sampled, and exceptions (if any) are documented with remediation timelines."

- Prepared by (name/role): ********\_\_\_\_********
- Reviewed by (name/role): ********\_\_\_\_********
- Approved by (name/role): ********\_\_\_\_********
- Sign-off date: ********\_\_\_\_********

## 2) Data Sources and Verification Method

- Registry/source of truth used (table/service/file): ********\_\_\_\_********
- Query/report version or script reference: ********\_\_\_\_********
- Verification approach:
  - [ ] Full population check
  - [ ] Statistical sample
  - [ ] Full population + sample validation
- Integrity checks run (select all):
  - [ ] Tenant route lookup success
  - [ ] DB target matches registry mapping
  - [ ] Region/residency constraint check
  - [ ] Recent migration wave parity checks

## 3) Exceptions and Remediation Plan

| Tenant ID | Current DB ID | Target DB ID | Exception Type | Risk Level | Mitigation | Owner | ETA |
| --------- | ------------- | ------------ | -------------- | ---------- | ---------- | ----- | --- |
|           |               |              |                |            |            |       |     |

## 4) Summary Metrics

| Metric                                  | Value |
| --------------------------------------- | ----- |
| Active owners                           |       |
| Dedicated DB owners                     |       |
| Shared/legacy owners                    |       |
| New owners this period                  |       |
| New owners dedicated by default         |       |
| Migration wave(s) completed this period |       |
| Failed verifications                    |       |
| Open exceptions                         |       |

## 5) Evidence Attachments Checklist

- [ ] Tenant->DB mapping export attached
- [ ] Migration wave report(s) attached
- [ ] Spot-check query outputs attached
- [ ] Rollback/revert references for in-flight migrations attached
- [ ] Legal/privacy review notes attached (if required)

## 6) Appendix A - Per-Tenant Mapping Table

Use one row per owner/tenant in scope.

| tenantId | ownerEmail | dbId | dbRegion | dedicated | migratedAt | routingVerifiedAt | verifiedBy | notes |
| -------- | ---------- | ---- | -------- | --------- | ---------- | ----------------- | ---------- | ----- |
|          |            |      |          |           |            |                   |            |       |

## 7) Appendix B - Review Cadence

- Weekly operational review: Engineering/Platform
- Monthly integrity review: Engineering + Privacy Officer
- Quarterly compliance evidence review: Privacy + Legal/Compliance
