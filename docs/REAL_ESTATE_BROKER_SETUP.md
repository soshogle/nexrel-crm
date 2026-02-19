# Real Estate Broker Setup

This document describes the end-to-end setup for every new real estate broker website, so each broker gets the same configuration as Theodora (our reference implementation).

**All features apply to every broker:** Voice AI, listings sync, home page featured carousel, and property search work the same way for each broker. Each broker has their own URL, Neon database, and Vercel deployment. The `nexrel-service-template` is the canonical template; owner sites (e.g. `Theodora-Stavropoulos-Remax`) are deployed instances. When adding features, update the template so new brokers get them automatically.

## Overview

A broker's live site needs:

1. **CRM Website record** — User, Website, `neonDatabaseUrl`, `agencyConfig`
2. **Neon database** — Receives listings from Centris.ca and Realtor.ca sync
3. **Vercel deployment** — Env vars: `DATABASE_URL`, `NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, `WEBSITE_VOICE_CONFIG_SECRET`
4. **Listings sync** — Centris broker URL, Realtor.ca agent URL (optional)

---

## 1. Create the Broker Website

### Option A: Website Builder (recommended)

When a broker signs up via the website builder:

- A **User** and **Website** record are created
- Provisioning creates a **Neon database** and sets `neonDatabaseUrl` on the Website
- A **Vercel project** is created with `DATABASE_URL` and CRM env vars
- `templateType=SERVICE`, `status=READY` are set

No manual steps needed for database or Vercel if provisioning succeeds.

### Option B: Manual creation

If creating manually (e.g. via script):

```bash
npx tsx scripts/create-theodora-website.ts
```

Adapt the script for the new broker (user email, website name). Ensure:

- `templateType: "SERVICE"`
- `status: "READY"`
- `voiceAIEnabled` and `elevenLabsAgentId` if using Voice AI

---

## 2. Database Setup

### neonDatabaseUrl in CRM

The Centris/Realtor sync finds broker databases from:

- `CENTRIS_REALTOR_DATABASE_URLS` (env), OR
- Website records with `templateType=SERVICE`, `status=READY`, and `neonDatabaseUrl` set

**If provisioning created the DB:** `neonDatabaseUrl` is already set.

**If manual:** Set it on the Website record:

```bash
BROKER_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npx tsx scripts/set-theodora-neon-database-url.ts
```

Use the **exact same** connection string as `DATABASE_URL` in the broker's Vercel project.

### Vercel DATABASE_URL

The broker's live site reads listings from `DATABASE_URL`. It must point to the Neon database that receives the sync.

- **If provisioning created the project:** `DATABASE_URL` is usually set automatically
- **If manual:** Add in Vercel → Project → Settings → Environment Variables

```bash
npx tsx scripts/set-theodora-vercel-database.ts
```

(Adapt for the broker's Vercel project name.)

---

## 3. CRM Env Vars on Broker's Vercel

The broker site fetches menu, logo, and agency config from the CRM at runtime. Required env vars:

| Variable | Value |
|----------|-------|
| `NEXREL_CRM_URL` | CRM base URL, e.g. `https://nexrel.soshogle.com` (no trailing slash) |
| `NEXREL_WEBSITE_ID` | Website ID from CRM (e.g. `cmlpuuy8a0001pu4gz4y97hrm`) |
| `WEBSITE_VOICE_CONFIG_SECRET` | Same value as in **nexrel-crm** Vercel env |

**If provisioning created the project:** These may already be set.

**If manual:** Add in Vercel, or run:

```bash
npx tsx scripts/fix-theodora-voice-ai-vercel.ts
```

(Adapt for the broker's project and Website ID.)

---

## 4. Listings Sync Configuration

### nexrel-crm env vars

| Variable | Description |
|----------|-------------|
| `APIFY_TOKEN` | From [console.apify.com](https://console.apify.com/account/integrations) |
| `CRON_SECRET` | `openssl rand -hex 32` — secures the cron endpoint |

### Centris broker URL (optional)

To prioritize the broker's **own** listings on the home page:

1. CRM Dashboard → Websites → [Broker's site] → Centris Listings
2. Paste the broker's **Centris.ca broker profile URL** in "Your Centris broker URL"
3. Run **Sync now** (or wait for daily cron)

Listings from that broker URL are imported with `is_featured=true` and appear first in the home page carousel.

**Finding the broker URL:** On Centris.ca, go to the broker's profile page and copy the full URL from the address bar.

### Realtor.ca agent URL (optional)

To import the broker's **own** listings from Realtor.ca (shown first on the home page):

1. CRM Dashboard → Websites → [Broker's site] → Centris Listings
2. Paste the broker's **Realtor.ca agent page URL** in "Your Realtor.ca agent URL"
3. Run **Sync now** (or wait for daily cron)

Example: `https://www.realtor.ca/agent/2237157/theodora-stavropoulos-9280-boul-de-lacadie-montreal-quebec-h4n3c5`

Listings from Realtor.ca are imported with `is_featured=true` and appear **first** on the home page (before Centris/MLS listings).

**⚠️ Paid Apify actor:** The Realtor.ca scraper requires a paid rental on Apify. If sync fails with `actor-is-not-rented`, rent at [Apify Console](https://console.apify.com/actors/zzyqRcLt9r2UxKKda).

**Script (Theodora example):**

```bash
npx tsx scripts/set-theodora-realtor-url.ts
```

---

## 5. Run the Sync

**Manual trigger:**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://nexrel.soshogle.com/api/cron/sync-centris
```

Or wait for the daily cron (12:00 UTC) if configured.

**From Dashboard:** Websites → [Broker's site] → Centris Listings → Sync now

---

## 6. Verification

### Check live site status

```bash
# Uses vercelDeploymentUrl from CRM, or THEODORA_LIVE_URL env
npx tsx scripts/check-theodora-listings.ts
```

Or: `curl "https://broker-site.vercel.app/api/debug/listings"`

| Field | Good | Bad |
|-------|------|-----|
| `databaseConfigured` | `true` | `false` → Add `DATABASE_URL` in Vercel |
| `totalListings` | > 0 | 0 → Wrong DB or sync not run |
| `isSampleData` | `false` | `true` → Wrong DB |
| `env.agencyConfigFetched` | `true` | `false` → Check CRM env vars |

### Verify listings setup

```bash
npx tsx scripts/verify-listings-setup.ts
```

Checks: `APIFY_TOKEN`, sync targets (CENTRIS_REALTOR_DATABASE_URLS or Website.neonDatabaseUrl), broker's DB.

### Verify home page listings

```bash
npx tsx scripts/verify-theodora-home-listings.ts
```

Connects to the broker's DB via `website.neonDatabaseUrl` and prints:

- Property counts (total, `is_featured`, `realtor-%`, `centris-%`)
- What `getFeaturedProperties` would return (first 4)
- Whether `agencyConfig.realtorBrokerUrl` is set

---

## Checklist Summary

| Step | Where | Action |
|------|-------|--------|
| 1 | CRM | Website record with `templateType=SERVICE`, `status=READY` |
| 2 | CRM | `neonDatabaseUrl` set on Website |
| 3 | Vercel (broker) | `DATABASE_URL` = Neon connection string |
| 4 | Vercel (broker) | `NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, `WEBSITE_VOICE_CONFIG_SECRET` |
| 5 | CRM | `agencyConfig.centrisBrokerUrl` (optional) |
| 6 | CRM | `agencyConfig.realtorBrokerUrl` (optional) |
| 7 | nexrel-crm | `APIFY_TOKEN`, `CRON_SECRET` |
| 8 | — | Run sync (manual or cron) |
| 9 | — | Redeploy broker site after env changes |

---

## Related Docs

- [CENTRIS_SYNC.md](./CENTRIS_SYNC.md) — sync mechanics, broker URLs
- [THEODORA_TROUBLESHOOTING.md](./THEODORA_TROUBLESHOOTING.md) — URL and listings troubleshooting
- [THEODORA_LIVE_SITE_CHECKLIST.md](./THEODORA_LIVE_SITE_CHECKLIST.md) — live site env vars
- [LISTINGS_TROUBLESHOOTING.md](./LISTINGS_TROUBLESHOOTING.md) — listings not showing
