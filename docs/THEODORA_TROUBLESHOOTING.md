# Theodora's Website — URL & Listings Troubleshooting

## Issue 1: URL still shows nexrel-service-temp

**The Vercel deployment URL is set by the Vercel project name, not GitHub or Neon.**

Changing the repo name in GitHub or the database in Neon does **not** change the live URL. You must update the Vercel project.

### Fix the URL

1. **In Vercel Dashboard:**
   - Open the project that deploys Theodora's site
   - Go to **Settings → General**
   - Change **Project Name** to your desired name (e.g. `theodora-stavropoulos-remax`)
   - Save — the URL becomes `https://your-project-name.vercel.app`

2. **Update the CRM Website record** (so links point to the new URL):
   ```bash
   NEW_VERCEL_URL="https://your-actual-url.vercel.app" npx tsx scripts/update-theodora-vercel-url.ts
   ```
   Or edit `scripts/update-theodora-vercel-url.ts` and set `NEW_VERCEL_URL` to your new URL, then run:
   ```bash
   npx tsx scripts/update-theodora-vercel-url.ts
   ```

3. **If using a custom domain** (e.g. theodorastavropoulos.com):
   - Add it in Vercel: Settings → Domains
   - Update the CRM with: `NEW_VERCEL_URL="https://theodorastavropoulos.com" npx tsx scripts/update-theodora-vercel-url.ts`

---

## Issue 2: Listings not showing

Listings come from **Centris.ca** via Apify. The flow:

1. **nexrel-crm** fetches listings from Centris (Apify)
2. Sync writes them to each broker's **Neon database**
3. Theodora's site reads from its **DATABASE_URL** (must be the same Neon DB)

### Checklist

#### A. Theodora's Website has `neonDatabaseUrl` in the CRM

The sync uses Website records with `templateType=SERVICE`, `status=READY`, and `neonDatabaseUrl` set.

**Set it:**
```bash
THEODORA_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npx tsx scripts/set-theodora-neon-database-url.ts
```

Use the **exact same** connection string as `DATABASE_URL` in Theodora's Vercel project.

#### B. Theodora's Vercel has `DATABASE_URL`

The site reads listings from `DATABASE_URL`. It must point to the Neon database that receives the sync.

- Vercel → Project → Settings → Environment Variables
- `DATABASE_URL` = your Neon connection string

#### C. nexrel-crm has `APIFY_TOKEN`

The sync cannot run without it.

- Add to **nexrel-crm** Vercel env (not Theodora's project)
- Get from [console.apify.com/account/integrations](https://console.apify.com/account/integrations)

#### D. Run the Centris sync

**Manual trigger:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://nexrel.soshogle.com/api/cron/sync-centris
```

Replace `YOUR_CRON_SECRET` with the value of `CRON_SECRET` in nexrel-crm's Vercel env.

Or wait for the daily cron if configured (12:00 UTC).

#### E. Verify

```bash
npx tsx scripts/verify-listings-setup.ts
```

Visit Theodora's site → Properties page or `/for-sale` — listings should appear.

---

## Common mistakes

| Mistake | Fix |
|--------|-----|
| Changed Neon DB but not `neonDatabaseUrl` in CRM | Run `set-theodora-neon-database-url.ts` with the new URL |
| `neonDatabaseUrl` ≠ Vercel `DATABASE_URL` | They must be identical — sync writes to one, site reads from the other |
| Renamed GitHub repo, expect URL to change | URL comes from Vercel project name — change it in Vercel Settings |
| Sync never ran | Trigger manually or wait for cron; check `APIFY_TOKEN` is set in nexrel-crm |
