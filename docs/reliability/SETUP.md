# Reliability Gate Setup

Configure these once in GitHub for automated KPI gating:

## Required Secret

- `RELIABILITY_DATABASE_URL`
  - Database URL that contains live-run production records.
  - Used by `scripts/reliability/live-run-kpis.ts` in CI.

## Workflows

- `.github/workflows/reliability-gate.yml`
  - Runs:
    - `npm run reliability:gate` (typecheck + nightly benchmark + acceptance matrix)
    - `npm run reliability:kpis -- --days=7 --target=0.95 --min-samples=10 --strict=true` (when secret exists)
    - `npm run reliability:summary`
  - Uploads artifacts:
    - `artifacts/reliability-acceptance-matrix.json`
    - `artifacts/reliability-live-run-kpis.json`
    - `artifacts/reliability-summary.md`

## Local verification

```bash
npm run reliability:gate
RELIABILITY_DATABASE_URL="<db-url>" npm run reliability:kpis -- --days=7 --target=0.95 --min-samples=10 --strict=true
npm run reliability:summary
```
