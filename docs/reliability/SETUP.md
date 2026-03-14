# Reliability Gate Setup

Configure these once in GitHub for automated KPI gating:

## Required Secret

- `RELIABILITY_DATABASE_URL`
  - Database URL that contains live-run production records.
  - Used by `scripts/reliability/live-run-kpis.ts` in CI.
  - Accepted forms:
    - `postgres://...` or `postgresql://...`
    - `DATABASE_URL=postgres://...` or `RELIABILITY_DATABASE_URL=postgres://...`
    - `jdbc:postgresql://...` (auto-normalized to `postgresql://...`)

## Workflows

- `.github/workflows/reliability-gate.yml`
  - Runs:
    - `npm run reliability:gate` (typecheck + nightly benchmark + acceptance matrix)
    - `npm run reliability:kpis -- --days=7 --target=0.95 --min-samples=10 --strict=true` (when secret exists)
    - `npm run reliability:trend -- --window-days=7 --max-drop=0.03 --min-samples=10 --strict=true` (when secret exists)
    - `npm run reliability:canary -- --sample-size=10 --min-success=0.95 --strict=true` (when secret exists)
    - `npm run reliability:summary`
  - Uploads artifacts:
    - `artifacts/reliability-acceptance-matrix.json`
    - `artifacts/reliability-live-run-kpis.json`
    - `artifacts/reliability-trend-regression.json`
    - `artifacts/reliability-canary-report.json`
    - `artifacts/reliability-canary-report.md`
    - `artifacts/reliability-summary.md`

## Local verification

```bash
npm run reliability:gate
RELIABILITY_DATABASE_URL="<db-url>" npm run reliability:kpis -- --days=7 --target=0.95 --min-samples=10 --strict=true
RELIABILITY_DATABASE_URL="<db-url>" npm run reliability:trend -- --window-days=7 --max-drop=0.03 --min-samples=10 --strict=true
RELIABILITY_DATABASE_URL="<db-url>" npm run reliability:canary -- --sample-size=10 --min-success=0.95 --strict=true
npm run reliability:summary
```
