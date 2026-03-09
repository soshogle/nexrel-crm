# Tenant-DB Mapping Attestation - 2026-W11

Organization: Soshogle Inc.  
Product: Nexrel  
Reporting Period: 2026-W11 (2026-03-09 to 2026-03-15)  
Prepared Date: 2026-03-09

## 1) Executive Attestation

- Total active owners reviewed: 5
- Owners on dedicated tenant DB: 5
- Owners not yet on dedicated tenant DB: 0
- Coverage (% dedicated): 100.00%
- Dedicated-by-default onboarding active for new owners: Yes

Attestation statement:

"I attest that the tenant-to-database mapping for the reporting period above was reviewed, evidence was sampled, and exceptions (if any) are documented with remediation timelines."

- Prepared by (name/role): cyclerun / Engineering Automation
- Reviewed by (name/role): TBD
- Approved by (name/role): TBD
- Sign-off date: TBD

## 2) Data Sources and Verification Method

- Registry/source of truth used (table/service/file): `lib/tenancy/tenant-registry.ts` + Meta DB user directory
- Query/report version or script reference: `scripts/tenancy/generate-tenant-db-mapping-attestation.ts`
- Verification approach:
  - [x] Full population check
  - [ ] Statistical sample
  - [ ] Full population + sample validation
- Integrity checks run (select all):
  - [x] Tenant route lookup success
  - [x] DB target matches registry mapping
  - [x] Region/residency constraint check (best-effort from DB host metadata)
  - [x] Recent migration wave parity checks (artifact presence)

## 3) Exceptions and Remediation Plan

| Tenant ID | Current DB ID | Target DB ID | Exception Type | Risk Level | Mitigation | Owner | ETA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Low | N/A | N/A | N/A |

## 4) Summary Metrics

| Metric | Value |
| --- | --- |
| Active owners | 5 |
| Dedicated DB owners | 5 |
| Shared/legacy owners | 0 |
| New owners this period | 0 |
| New owners dedicated by default | 0 |
| Migration wave(s) completed this period | STEP3_WAVE1_RESULTS.md, STEP3_WAVE10_RESULTS.md, STEP3_WAVE11_RESULTS.md, STEP3_WAVE12_RESULTS.md, STEP3_WAVE13_RESULTS.md, STEP3_WAVE14_RESULTS.md, STEP3_WAVE15_RESULTS.md, STEP3_WAVE16_RESULTS.md, STEP3_WAVE17_RESULTS.md, STEP3_WAVE18_RESULTS.md, STEP3_WAVE19_RESULTS.md, STEP3_WAVE2_RESULTS.md, STEP3_WAVE20_RESULTS.md, STEP3_WAVE21_RESULTS.md, STEP3_WAVE22_RESULTS.md, STEP3_WAVE23_RESULTS.md, STEP3_WAVE24_RESULTS.md, STEP3_WAVE25_RESULTS.md, STEP3_WAVE26_RESULTS.md, STEP3_WAVE27_RESULTS.md, STEP3_WAVE28_RESULTS.md, STEP3_WAVE29_RESULTS.md, STEP3_WAVE3_RESULTS.md, STEP3_WAVE30_RESULTS.md, STEP3_WAVE31_RESULTS.md, STEP3_WAVE32_RESULTS.md, STEP3_WAVE33_RESULTS.md, STEP3_WAVE34_RESULTS.md, STEP3_WAVE35_RESULTS.md, STEP3_WAVE36_RESULTS.md, STEP3_WAVE37_RESULTS.md, STEP3_WAVE38_RESULTS.md, STEP3_WAVE39_RESULTS.md, STEP3_WAVE4_RESULTS.md, STEP3_WAVE40_RESULTS.md, STEP3_WAVE41_RESULTS.md, STEP3_WAVE42_RESULTS.md, STEP3_WAVE43_RESULTS.md, STEP3_WAVE44_RESULTS.md, STEP3_WAVE5_RESULTS.md, STEP3_WAVE6_RESULTS.md, STEP3_WAVE7_RESULTS.md, STEP3_WAVE8_RESULTS.md, STEP3_WAVE9_RESULTS.md |
| Failed verifications | 0 |
| Open exceptions | 0 |

## 5) Evidence Attachments Checklist

- [x] Tenant->DB mapping export attached (Appendix A)
- [x] Migration wave report(s) attached
- [ ] Spot-check query outputs attached
- [ ] Rollback/revert references for in-flight migrations attached
- [ ] Legal/privacy review notes attached (if required)

## 6) Appendix A - Per-Tenant Mapping Table

| tenantId | ownerEmail | dbId | dbRegion | dedicated | migratedAt | routingVerifiedAt | verifiedBy | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cmlkk9asy0000puiqfpub7oj0 | eyal@darksword-armory.com | ep-young-salad-aia85usc-pooler | us-east-1 | true | - | 2026-03-09T19:03:49.859Z | cyclerun | TENANT_OVERRIDE via DATABASE_URL_TECHNOLOGY |
| cmle09ew70000pu2c5fer6q0y | theodora.stavropoulos@remax-quebec.com | ep-summer-heart-ainw4d51-pooler | us-east-1 | true | - | 2026-03-09T19:03:49.859Z | cyclerun | TENANT_OVERRIDE via DATABASE_URL_REAL_ESTATE |
| cmlagc8ix0000pudsvthbeckm | orthodontist@nexrel.com | ep-shy-moon-aiqcbqmp-pooler | us-east-1 | true | - | 2026-03-09T19:03:49.859Z | cyclerun | TENANT_OVERRIDE via DATABASE_URL_ORTHODONTIST |
| cminj7jv90000ow08pm5bbza5 | pharmacie4177@gmail.com | ep-flat-salad-aiynezj7-pooler | us-east-1 | true | - | 2026-03-09T19:03:49.859Z | cyclerun | TENANT_OVERRIDE via DATABASE_URL_MEDICAL |
| cmif7bcow0000tkxtz7wh8c5o | samara@soshogleagents.com | ep-flat-salad-aiynezj7-pooler | us-east-1 | true | - | 2026-03-09T19:03:49.859Z | cyclerun | TENANT_OVERRIDE via DATABASE_URL_MEDICAL |

## 7) Appendix B - Review Cadence

- Weekly operational review: Engineering/Platform
- Monthly integrity review: Engineering + Privacy Officer
- Quarterly compliance evidence review: Privacy + Legal/Compliance
