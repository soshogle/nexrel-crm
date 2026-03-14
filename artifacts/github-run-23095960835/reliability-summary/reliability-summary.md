# Reliability Summary

Generated: 2026-03-14T20:44:30.881Z

## Acceptance Matrix
- Total: 11
- Passed: 11
- Failed: 0
- Gate Passed: true
- Overall Pass Rate: 100.00%
- Tier 1 Pass Rate: 100.00%
- Tier 2 Pass Rate: 100.00%
- Tier 3 Pass Rate: 100.00%

## Live-Run KPI Gate
- Window Days: 7
- In-Scope Runs: 0
- Successful Runs: 0
- Success Rate: 0.00%
- Target: 95.00%
- Pass: false
- Notes: RELIABILITY_DATABASE_URL must be a postgres:// or postgresql:// connection string

## Trend Regression
- Window Days: 7
- Current Success Rate: 0.00%
- Previous Success Rate: 0.00%
- Drop: 0.00%
- Max Allowed Drop: 3.00%
- Pass: false
- Notes: RELIABILITY_DATABASE_URL must be a postgres:// or postgresql:// connection string

## Canary (Latest Missions)
- Sample Size: 10
- Runs Passed: 0/0
- Success Rate: 0.00%
- Minimum Target: 95.00%
- Pass: false
- Top Blockers:
  - invalid_database_url: 1
