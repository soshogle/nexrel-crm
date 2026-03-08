# Industry Spec Matrix (Phase 1 Baseline)

This matrix defines the target state for industry-specific behavior while preserving existing user data and current UI.

## Global Rules

- Data-safe, additive, idempotent changes only.
- No UI redesign; keep current look and navigation stable.
- `REAL_ESTATE` remains isolated on its existing implementation.
- `ORTHODONTIST` remains unique and keeps mock-data compatibility.

## Industry Coverage Matrix

| Industry      | AI Employees           | Workflows                        | Tools                | UI Page Layer                        | Current State      | Target in Upcoming Phases                                          |
| ------------- | ---------------------- | -------------------------------- | -------------------- | ------------------------------------ | ------------------ | ------------------------------------------------------------------ |
| ACCOUNTING    | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom task types/templates/roles + tool policy              |
| LAW           | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom legal workflows/roles + tool policy                   |
| DENTIST       | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom dental workflows/templates, keep compatibility        |
| MEDICAL_SPA   | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom spa-specific workflows/roles/tools                    |
| OPTOMETRIST   | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom optometry-specific workflows/roles/tools              |
| HEALTH_CLINIC | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom clinic-specific workflows/roles/tools                 |
| HOSPITAL      | Industry module exists | Config inherited from medical    | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom hospital-specific workflows/roles/tools               |
| SPORTS_CLUB   | Industry module exists | Config inherited from restaurant | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom club workflows/roles/tools                            |
| TECHNOLOGY    | Industry module exists | Config inherited from restaurant | Generic shared tools | Wrapper tab                          | Partially specific | Fully custom tech workflows/roles/tools                            |
| RETAIL        | Industry module exists | Custom config exists             | Generic shared tools | Wrapper tab                          | Mostly specific    | Add industry-specific tool policy + verify template depth          |
| ORTHODONTIST  | Industry module exists | Customized config exists         | Generic shared tools | Wrapper tab + unique domain behavior | Mostly specific    | Keep unique path; add unique tool policy; preserve mock-data users |
| REAL_ESTATE   | Separate RE system     | Separate RE workflow system      | RE-specific path     | RE-specific pages                    | Fully separate     | No change in this initiative                                       |

## Phase Execution Order

1. **Wave A:** ACCOUNTING, LAW, TECHNOLOGY
2. **Wave B:** SPORTS_CLUB, DENTIST
3. **Wave C:** MEDICAL_SPA, OPTOMETRIST, HEALTH_CLINIC, HOSPITAL
4. **Wave D:** RETAIL tool-policy hardening, ORTHODONTIST uniqueness/tool hardening

## Definition of Done Per Industry

- Dedicated task types that match real business operations.
- Dedicated AI roles with industry-native naming and prompts.
- Dedicated workflow templates (minimum 2 meaningful templates).
- Industry-appropriate tool policy (allow/deny/extend) without breaking existing agents.
- No regression in existing user data access and existing user UI flows.

## Explicit Non-Goals

- Rebuilding page design system.
- Converging `REAL_ESTATE` into generic systems.
- Removing orthodontist mock data for existing users.
