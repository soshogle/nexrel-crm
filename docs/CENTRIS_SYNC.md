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
