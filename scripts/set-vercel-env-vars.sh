#!/bin/bash
# Set all 15 DATABASE_URL_* env vars in Vercel (production + preview)
# Usage: ./scripts/set-vercel-env-vars.sh

cd "$(dirname "$0")/.."
set -a
source .env 2>/dev/null || true
set +a

VARS=(
  DATABASE_URL_META
  DATABASE_URL_ACCOUNTING
  DATABASE_URL_RESTAURANT
  DATABASE_URL_SPORTS_CLUB
  DATABASE_URL_CONSTRUCTION
  DATABASE_URL_LAW
  DATABASE_URL_MEDICAL
  DATABASE_URL_DENTIST
  DATABASE_URL_MEDICAL_SPA
  DATABASE_URL_OPTOMETRIST
  DATABASE_URL_HEALTH_CLINIC
  DATABASE_URL_REAL_ESTATE
  DATABASE_URL_HOSPITAL
  DATABASE_URL_TECHNOLOGY
  DATABASE_URL_ORTHODONTIST
)

for VAR in "${VARS[@]}"; do
  VAL="${!VAR}"
  if [ -z "$VAL" ]; then
    echo "⏭️  $VAR not set, skipping"
    continue
  fi
  echo -n "▶ $VAR (production)... "
  echo "$VAL" | npx vercel env add "$VAR" production --force 2>&1 | tail -1
  echo -n "▶ $VAR (preview)... "
  echo "$VAL" | npx vercel env add "$VAR" preview --force 2>&1 | tail -1
done

echo ""
echo "✅ Done. Redeploy to pick up new env vars."
