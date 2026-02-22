#!/bin/bash
# Run migrate-all-dbs with .env loaded (use this if dotenv-cli doesn't work)
# Usage: ./scripts/run-migrate-all-dbs.sh

cd "$(dirname "$0")/.."
set -a
source .env 2>/dev/null || true
source .env.local 2>/dev/null || true
set +a
npx tsx scripts/migrate-all-dbs.ts "$@"
