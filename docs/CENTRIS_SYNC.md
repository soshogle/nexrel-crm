# Central Centris Sync

Listings are fetched from Centris.ca **once** via Apify, then written to **all** real estate broker databases. Each broker keeps their own DB; we write the same Montreal listings to each.

## How It Works

1. **nexrel-crm** runs a daily cron at 12:00 UTC (`/api/cron/sync-centris`)
2. Fetches ~100 Montreal listings from Apify (one API call)
3. Writes the same listings to every broker database in the list

## Setup

### 1. nexrel-crm env vars (Vercel)

| Variable | Description |
|----------|-------------|
| `APIFY_TOKEN` | From [console.apify.com](https://console.apify.com/account/integrations) |
| `CRON_SECRET` | `openssl rand -hex 32` — used to secure the cron endpoint |
| `CENTRIS_REALTOR_DATABASE_URLS` | JSON array of broker PostgreSQL URLs |

### 2. Add broker databases

When a broker deploys their site (e.g. Theodora), add their `DATABASE_URL` to the list:

```json
["postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require", "postgresql://user2:pass@ep-yyy.neon.tech/neondb?sslmode=require"]
```

In Vercel: Settings → Environment Variables → `CENTRIS_REALTOR_DATABASE_URLS` = the JSON string above.

### 3. Broker sites (nexrel-service-template)

- **No cron** — each broker site does NOT run its own sync
- **No APIFY_TOKEN** — broker sites don't need it
- **DATABASE_URL only** — each broker has their own Neon DB; the central sync writes to it

## Manual Trigger

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://nexrel-crm.vercel.app/api/cron/sync-centris
```

## Fallback: Website table

If `CENTRIS_REALTOR_DATABASE_URLS` is empty, the cron queries the `Website` table for `templateType=SERVICE` and `status=READY` sites that have `neonDatabaseUrl` set. Use this if brokers are created via the website builder.

## Prioritize broker's own listings (featured)

To show a broker's **own** listings first on the home page:

1. In the CRM dashboard → Website → Settings → **Centris Listings** section
2. Paste the broker's **Centris.ca broker profile URL** in "Your Centris broker URL"
3. Run **Sync now** (or wait for the daily cron)

When syncing, listings from that broker URL are imported with `is_featured=true`. The home page featured carousel orders by `is_featured` first, then newest.

**Finding the broker URL:** On Centris.ca, go to the broker's profile page (e.g. search for the broker name) and copy the full URL from the address bar. Example format: `https://www.centris.ca/en/broker/name/12345` or a search URL filtered by that broker.

## Sold listings (for property evaluation comparables)

To add **sold** listings as comparables for property evaluation:

1. In the CRM dashboard → Website → Settings → **Centris Listings** section
2. Paste the broker's **Centris sold listings URL** in "Centris sold listings URL"

**Note:** Centris.ca does not publicly expose sold listings. If your broker profile has a sold/vendu tab or URL that shows sold properties, paste it here. The sync will import them with `status=sold` and use them as comparables. If no sold URL is available, the evaluation falls back to Centris regional median prices.

## Realtor.ca listings (agent page)

Brokers who list on Realtor.ca can sync their agent page listings:

1. In the CRM dashboard → Website → Settings → **Centris Listings** section
2. Paste the broker's **Realtor.ca agent page URL** in "Your Realtor.ca agent URL"
3. Run **Sync now** (or wait for the daily cron)

Example: `https://www.realtor.ca/agent/2237157/theodora-stavropoulos-9280-boul-de-lacadie-montreal-quebec-h4n3c5`

Listings from Realtor.ca are imported with `is_featured=true` and appear **first** on the home page (before Centris/MLS listings). The sync uses Apify's [Realtor.ca Scraper](https://apify.com/scrapemind/realtor-ca-scraper).

**⚠️ Paid actor required:** Realtor.ca sync uses Apify actors that require a paid rental after the free trial. The script tries two actors in order:
1. **memo23/realtor-canada-search-cheerio** — accepts agent profile URLs
2. **scrapemind/realtor-ca-scraper** — fallback

Rent either actor at [Apify Console](https://console.apify.com) (~$25/mo + usage).

**Quick set for Theodora:**
```bash
npx tsx scripts/set-theodora-realtor-url.ts
```

**Debug Realtor sync:**
```bash
npx tsx scripts/run-theodora-realtor-sync.ts
```
