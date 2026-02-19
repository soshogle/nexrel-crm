# Theodora's Live Site — Why Listings & Menu Changes Don't Show

## The Problem

- **CRM website builder** shows listings and menu edits (saved in CRM database)
- **Theodora's live site** (her actual URL) does NOT show them

## Root Cause

Theodora's live site is a **separate Vercel deployment** (theodora-stavropoulos-remax). It does not read from the CRM directly. It needs env vars to:

1. **Listings** — Connect to her Neon DB (`DATABASE_URL`)
2. **Menu / agency config** — Fetch from the CRM at runtime (`NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, `WEBSITE_VOICE_CONFIG_SECRET`)

If any of these are missing or wrong, the live site uses defaults and never shows your changes.

---

## Double-Check: Run the Debug Endpoint

**Replace `THEODORA_LIVE_URL` with her actual URL** (e.g. `https://theodora-stavropoulos-remax.vercel.app`):

```bash
curl "THEODORA_LIVE_URL/api/debug/listings"
```

### What to look for

| Field | Good | Bad | Fix |
|-------|------|-----|-----|
| `databaseConfigured` | `true` | `false` | Add `DATABASE_URL` in Vercel |
| `totalListings` | > 0 (e.g. 50+) | 0 | Wrong DB or empty — use her Neon URL |
| `firstMlsNumber` | Real MLS (e.g. `C1234567`) | `SAMPLE-001` | DB has sample data — wrong DB |
| `isSampleData` | `false` | `true` | `DATABASE_URL` points to wrong DB |
| `env.agencyConfigFetched` | `true` | `false` | Check CRM env vars |
| `env.hasNexrelCrmUrl` | `true` | `false` | Add `NEXREL_CRM_URL` |
| `env.hasNexrelWebsiteId` | `true` | `false` | Add `NEXREL_WEBSITE_ID` |
| `env.hasWebsiteVoiceConfigSecret` | `true` | `false` | Add `WEBSITE_VOICE_CONFIG_SECRET` |

**"Mockup" listings** (SAMPLE-001, "1234 Boul. Laurentien", Ville Saint-Laurent) = `DATABASE_URL` points to a DB seeded with sample data, or the wrong Neon project. Use Theodora's Neon URL from the CRM Website record.

---

## Checklist: Theodora's Vercel Project

Go to **Vercel** → **theodora-stavropoulos-remax** (or whatever project deploys her site) → **Settings** → **Environment Variables**.

| Variable | Required for | Value |
|----------|--------------|-------|
| `DATABASE_URL` | Listings | Her Neon connection string: `postgresql://neondb_owner:npg_xxx@ep-delicate-bar-aiwr4hlz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `NEXREL_CRM_URL` | Menu, logo, agency config | `https://nexrel.soshogle.com` (no trailing slash) |
| `NEXREL_WEBSITE_ID` | Menu, logo, agency config | `cmlpuuy8a0001pu4gz4y97hrm` |
| `WEBSITE_VOICE_CONFIG_SECRET` | Auth to fetch from CRM | Same value as in **nexrel-crm** Vercel env |

---

## How to Verify

### 1. Test agency config (menu, logo) from CRM

```bash
curl -H "x-website-secret: YOUR_WEBSITE_VOICE_CONFIG_SECRET" \
  "https://nexrel.soshogle.com/api/websites/cmlpuuy8a0001pu4gz4y97hrm/agency-config"
```

Replace `YOUR_WEBSITE_VOICE_CONFIG_SECRET` with the value from nexrel-crm Vercel. You should get JSON with `navConfig`, `pageLabels`, etc. If you get 401, the secret is wrong.

### 2. Check Theodora's Vercel env

- `DATABASE_URL` must be her Neon URL (ep-delicate-bar-aiwr4hlz), **not** the CRM's DB
- `NEXREL_CRM_URL` must match where your CRM is hosted (no trailing slash)
- `NEXREL_WEBSITE_ID` = `cmlpuuy8a0001pu4gz4y97hrm`
- `WEBSITE_VOICE_CONFIG_SECRET` must match nexrel-crm's value
- Env vars must be set for **Production** (or all environments)

### 3. Redeploy after changes

After adding or changing env vars, trigger a **Redeploy** in Vercel so the new values are used.

---

## Quick Fix Scripts

### CRM env (menu, logo, agency config)

If you have `VERCEL_TOKEN` in `.env`:

```bash
npx tsx scripts/fix-theodora-voice-ai-vercel.ts
```

This sets `NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, `WEBSITE_VOICE_CONFIG_SECRET` on Theodora's project.

### Listings (DATABASE_URL)

```bash
# 1. Ensure Theodora's Website has neonDatabaseUrl in CRM
THEODORA_DATABASE_URL="postgresql://..." npx tsx scripts/set-theodora-neon-database-url.ts

# 2. Set DATABASE_URL on Theodora's Vercel project (uses neonDatabaseUrl or THEODORA_DATABASE_URL)
npx tsx scripts/set-theodora-vercel-database.ts
```

### Check current status

```bash
# Uses vercelDeploymentUrl from CRM, or THEODORA_LIVE_URL env
npm run check-theodora-listings
# Or: THEODORA_LIVE_URL=https://her-actual-url.vercel.app npm run check-theodora-listings
```

---

## Summary

| Symptom | Likely cause |
|---------|--------------|
| No listings on live site | `DATABASE_URL` missing or wrong in Theodora's Vercel |
| "Mockup" listings (SAMPLE-001, etc.) | `DATABASE_URL` points to wrong DB or DB seeded with sample data |
| Menu changes don't appear | `NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, or `WEBSITE_VOICE_CONFIG_SECRET` missing/wrong |
| Both | Check all four env vars and redeploy |
