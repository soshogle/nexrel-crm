#!/bin/bash
# Commit changes in sections to avoid Vercel build hangs.
# Run from repo root: bash scripts/commit-in-sections.sh
# Use --yes to skip prompts and commit all sections.
# Push after each section to trigger smaller Vercel builds.

set -e
AUTO_YES=false
[[ "$1" == "--yes" || "$1" == "-y" ]] && AUTO_YES=true

confirm() {
  if $AUTO_YES; then return 0; fi
  read -p "Commit this section? (y/n) " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

echo "=== Section 1: Core infrastructure (Redis, cache, rate limit) ==="
git add lib/redis.ts lib/cache.ts lib/rate-limit.ts middleware.ts .env.example
git status
if confirm; then
  git commit -m "feat(infra): Upstash Redis rate limiting + cache layer

- Add lib/redis.ts shared client
- Add lib/cache.ts cache-aside utility (cached, invalidate, invalidatePattern)
- Upgrade lib/rate-limit.ts to use Upstash Redis (distributed)
- Update middleware.ts for async checkRateLimit
- Document UPSTASH_REDIS_* in .env.example"
fi

echo ""
echo "=== Section 2: DAL services + API utilities ==="
git add lib/api-utils.ts lib/dal/
git status
if confirm; then
  git commit -m "feat(dal): Expand DAL services + pagination utilities

- Add 8 new DAL services: bookingAppointment, voiceAgent, callLog, pipeline,
  review, channelConnection, smsCampaign, payment
- Add Redis caching to pipeline, workflowTemplate, website, voiceAgent, lead
- lib/api-utils.ts: parsePagination, paginatedResponse (existing, now used)"
fi

echo ""
echo "=== Section 3: API routes A (admin -> conversations) ==="
git add \
  app/api/admin/ \
  app/api/ai-assistant/ \
  app/api/ai-brain/ \
  app/api/ai-employees/ \
  app/api/ai/ \
  app/api/analytics/ \
  app/api/api-keys/ \
  app/api/appointments/ \
  app/api/audit-logs/ \
  app/api/auth/ \
  app/api/auto-reply-settings/ \
  app/api/billing/ \
  app/api/blog/ \
  app/api/booking/ \
  app/api/business-ai/ \
  app/api/calendar-connections/ \
  app/api/calendar-sync/ \
  app/api/calendar/ \
  app/api/calls/ \
  app/api/campaigns/ \
  app/api/clinics/ \
  app/api/clubos/ \
  app/api/contacts/ \
  app/api/conversations/
git status --short | head -20
if confirm; then
  git commit -m "feat(api): apiErrors + pagination adoption (admin -> conversations)"
fi

echo ""
echo "=== Section 4: API routes B (credit-scoring -> inventory) ==="
git add \
  app/api/credit-scoring/ \
  app/api/crm-voice-agent/ \
  app/api/cron/ \
  app/api/data-monetization/ \
  app/api/deals/ \
  app/api/debug-session/ \
  app/api/debug/ \
  app/api/delivery/ \
  app/api/demo/ \
  app/api/dental/ \
  app/api/docpen/ \
  app/api/ecommerce/ \
  app/api/ehr-bridge/ \
  app/api/elevenlabs/ \
  app/api/elevenlabs-keys/ \
  app/api/email-templates/ \
  app/api/external-calendar-webhook/ \
  app/api/feedback/ \
  app/api/facebook/ \
  app/api/general-inventory/ \
  app/api/gmail/ \
  app/api/instagram/ \
  app/api/integrations/ \
  app/api/inventory/
git status --short | head -20
if confirm; then
  git commit -m "feat(api): apiErrors + pagination adoption (credit-scoring -> inventory)"
fi

echo ""
echo "=== Section 5: API routes C (kitchen -> workflows) ==="
git add \
  app/api/kitchen/ \
  app/api/knowledge-base/ \
  app/api/landing-admin/ \
  app/api/landing/ \
  app/api/lead-generation/ \
  app/api/leads/ \
  app/api/linkedin-scraper/ \
  app/api/messaging/ \
  app/api/meta/ \
  app/api/messages/ \
  app/api/nexrel/ \
  app/api/onboarding/ \
  app/api/orders/ \
  app/api/outbound-calls/ \
  app/api/places/ \
  app/api/platform-admin/ \
  app/api/pos/ \
  app/api/products/ \
  app/api/professional-ai-employees/ \
  app/api/payments/ \
  app/api/pipelines/ \
  app/api/pricing-gate/ \
  app/api/referrals/ \
  app/api/reports/ \
  app/api/reservations/ \
  app/api/reviews/ \
  app/api/relationships/ \
  app/api/roi/ \
  app/api/scheduled-emails/ \
  app/api/scheduled-sms/ \
  app/api/smart-replies/ \
  app/api/sms-campaigns/ \
  app/api/sms-templates/ \
  app/api/social-media/ \
  app/api/soshogle/ \
  app/api/subdomain/ \
  app/api/tasks/ \
  app/api/team/ \
  app/api/tools/ \
  app/api/twilio/ \
  app/api/user/ \
  app/api/voice-agents/ \
  app/api/voice-assistant/ \
  app/api/voice-ai/ \
  app/api/website-builder/ \
  app/api/webhooks/ \
  app/api/websites/ \
  app/api/widget/ \
  app/api/widgets/ \
  app/api/workflows/
git status --short | head -20
if confirm; then
  git commit -m "feat(api): apiErrors + pagination adoption (kitchen -> workflows)"
fi

echo ""
echo "=== Section 6: App, components, lib (non-API) ==="
git add app/dashboard/ app/layout.tsx components/ lib/
git status --short | head -30
if confirm; then
  git commit -m "feat: DAL adoption in lib, components, app dashboard"
fi

echo ""
echo "=== Section 7: Config, package, tests ==="
git add package.json package-lock.json eslint.config.mjs tests/
git status --short
if confirm; then
  git commit -m "chore: package, eslint, tests"
fi

echo ""
echo "=== Section 8: Scripts (optional - internal tooling) ==="
git add scripts/codemod-api-errors.ts scripts/codemod-dal-migration.ts \
  scripts/fix-api-error-details.ts scripts/fix-broken-imports.ts scripts/fix-missing-db.ts \
  scripts/migrate-to-meta-db-v2.sh scripts/migrate-to-meta-db-v2.ts 2>/dev/null || true
git status --short
if confirm; then
  git commit -m "chore: add migration and codemod scripts"
fi

echo ""
echo "=== Remaining uncommitted files ==="
git status
echo ""
echo "Done. Push with: git push origin <branch>"
echo "Or push after each section to trigger smaller Vercel builds."
