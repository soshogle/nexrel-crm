# Listings Not Showing on Owner Website (e.g. Theodora)

If Apify/Centris listings were pulled but don't appear on the site, check these steps.

## Data Flow

1. **nexrel-crm** fetches listings from Centris.ca via Apify
2. Sync writes to each broker's Neon database
3. Owner site (e.g. Theodora's) reads from its `DATABASE_URL` (same Neon DB)

## Checklist

### 1. Theodora's Website has `neonDatabaseUrl` in CRM

The Centris sync finds databases from:
- `CENTRIS_REALTOR_DATABASE_URLS` (env), OR
- Website records with `templateType=SERVICE`, `status=READY`, and `neonDatabaseUrl` set

**Fix:** Run from nexrel-crm root:
```bash
THEODORA_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npx tsx scripts/set-theodora-neon-database-url.ts
```
Use the **same** URL as `DATABASE_URL` in Theodora's Vercel project.

### 2. Theodora's Vercel has `DATABASE_URL`

The site reads listings from `DATABASE_URL`. It must point to the Neon database that receives the sync.

### 3. nexrel-crm has `APIFY_TOKEN`

The sync cannot run without it. Add to nexrel-crm's Vercel env:
```
APIFY_TOKEN=apify_api_xxxxxxxxxxxx
```
Get from [console.apify.com/account/integrations](https://console.apify.com/account/integrations)

### 4. Run the Centris sync

**Manual trigger** (from nexrel-crm Vercel):
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://nexrel.soshogle.com/api/cron/sync-centris
```

Or wait for the daily cron (12:00 UTC) if configured.

### 5. Verify on the site

Visit Theodora's site → `/api/debug/listings` (if exposed) or check the Properties page.

## Quick Verify Script

```bash
cd nexrel-crm
npx tsx scripts/verify-listings-setup.ts
```
