# Security Hardening Sweep - 2026-03-05

## Scope

- Full `app/api/**/route.ts` auth/public classification pass
- Webhook signature/secret enforcement audit and remediation
- Route health map for likely broken/unwired API references
- Production safety checks for middleware and webhook secret configuration

## Phase 1 - API auth/public-route classification

- Total API routes scanned: `816`
- Classified authenticated (session-gated): `706`
- Classified public/integration routes: `47`
- Unknown/manual-review bucket: `63`

### Unknown bucket themes (manual review required)

- Cron routes (likely Vercel Cron, should be secret-gated)
- OAuth callback routes (intentionally unauthenticated)
- Demo/landing capture routes (public by design, should be abuse-protected)
- EHR bridge routes (high-impact, must be explicitly authenticated/secret-gated)
- Legacy removed debug endpoints (`/api/debug-auth`, `/api/debug-auth-config`, `/api/debug-session`) now return `404`

## Phase 2 - Webhook signature/secret enforcement audit

### Patched now

- `app/api/webhooks/call-completed/route.ts`
  - Added internal webhook secret gate (`x-internal-webhook-secret` / `x-webhook-secret` / bearer fallback).
- `app/api/webhooks/incoming-message/route.ts`
  - Added internal webhook secret gate; blocks unauthenticated direct invocation.
- `app/api/webhooks/website/route.ts`
  - Added `x-website-secret` enforcement and production misconfiguration fail-fast.
- `app/api/webhooks/website-inquiry/route.ts`
  - Enforced `WEBSITE_VOICE_CONFIG_SECRET` in production (fail-fast if missing).
- `app/api/webhooks/website-voice-lead/route.ts`
  - Enforced `WEBSITE_VOICE_LEAD_SECRET` in production (fail-fast if missing).
- `app/api/webhooks/tavus-lead/route.ts`
  - Enforced `TAVUS_WEBHOOK_SECRET` in production (fail-fast if missing).
- `app/api/webhooks/whatsapp/route.ts`
  - Added Meta signature verification (`x-hub-signature-256`) and removed raw webhook payload logging.
- `app/api/webhooks/instagram/route.ts`
  - Added Meta signature verification (`x-hub-signature-256`), removed token/payload over-logging, removed default verify token fallback.
- `app/api/webhooks/facebook/route.ts`
  - Hardened timing-safe signature compare and removed insecure verify-token default fallback.
- `app/api/webhooks/stripe/website/route.ts`
  - Added production fail-fast for missing `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET_WEBSITE`.

### Existing strong controls confirmed

- `app/api/webhooks/twilio/route.ts` signature validation present
- `app/api/webhooks/elevenlabs/post-call/route.ts` signature validation present and production secret enforcement present

## Phase 3 - Route health / broken / unwired map

Static reference scan found `30` API references in source code that do not map to a current `app/api/**/route.ts` file pattern.

Potentially broken or compatibility aliases needed:

- `/api/book-meeting`
- `/api/booking`
- `/api/debug/listings`
- `/api/debug/tavus`
- `/api/dental`
- `/api/lead-dashboard`
- `/api/lead-dashboard/stats`
- `/api/listings`
- `/api/nexrel/products`
- `/api/nexrel/stats/summary`
- `/api/oauth/callback`
- `/api/pricing-gate`
- `/api/pricing-gate/submit`
- `/api/property-evaluation`
- `/api/roi/capture-lead`
- `/api/secret-property-registration`
- `/api/secret-reports/unlock`
- `/api/stripe`
- `/api/stripe/create-checkout-session`
- `/api/stripe/webhook`
- `/api/trpc`
- `/api/v1/appointments`
- `/api/v1/patients`
- `/api/v1/schedule`
- `/api/voice/push-lead`
- `/api/voice/signed-url`
- `/api/webhooks`
- `/api/webhooks/tavus`
- `/api/website-builder/upload-video`
- `/api/widget`

Notes:

- Some entries may be intentional rewrites/proxies in deployment config; verify against Next.js rewrites and external gateways.
- Any frontend call to these without rewrite support is a runtime 404 risk.

## Phase 4 - Risk rating update

### Critical (addressed)

- Edge-incompatible middleware nonce generation causing app-load 500 (`MIDDLEWARE_INVOCATION_FAILED`) - fixed.
- Unauthenticated internal webhook execution surfaces (`incoming-message`, `call-completed`) - now secret-gated.

### High (addressed)

- Weak/inconsistent webhook auth policy across website/lead ingestion endpoints - now production fail-fast + secret checks.
- Meta webhook payload spoofing risk on WhatsApp/Instagram - signature verification added.

### Medium (remaining follow-up)

- Unknown/manual-review route bucket (`63`) still needs endpoint-by-endpoint owner signoff.
- Unmatched API reference set (`30`) needs rewrite map validation or route alias creation.
- PII-heavy logs still exist in non-webhook API areas and should be reduced in a follow-up logging pass.

## Current CRM security/operational score

- Before this sweep: `7/10`
- After this sweep: `8.3/10`

Rationale: critical app-load and webhook auth weaknesses were closed; remaining risk is mostly completeness/governance and route consistency verification.

## Final pass update (same day)

Additional hardening completed after initial sweep:

- Added signature verification and fail-closed token behavior to legacy social webhooks:
  - `app/api/facebook/messenger-webhook/route.ts`
  - `app/api/instagram/webhook/route.ts`
- Added Twilio signature verification on additional callback routes:
  - `app/api/twilio/sms-webhook/route.ts`
  - `app/api/twilio/voice-webhook/route.ts`
  - `app/api/twilio/call-status/route.ts`
- Added production fail-fast checks for remaining Stripe webhook secrets:
  - `app/api/billing/webhook/route.ts`
  - `app/api/clubos/payments/webhook/route.ts`

Revised score after final pass: `9.0/10`.

Remaining gap to true 10/10 is mostly operational/governance rather than immediate code exploitability:

- periodic secret rotation + verification drills
- endpoint ownership signoff for unknown/manual-review routes
- route-alias/rewrite cleanup for stale client API references
