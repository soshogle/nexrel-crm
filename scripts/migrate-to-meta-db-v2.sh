#!/bin/bash
# Robust Meta DB migration - sources .env properly
cd "$(dirname "$0")/.."
set -a
source .env 2>/dev/null || true
set +a
npx tsx scripts/migrate-to-meta-db-v2.ts "$@"
