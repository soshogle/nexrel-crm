# Theodora's Site — Voice AI, Logo & Listings Fix

## Root cause

The **CRM's** `DATABASE_URL` in Vercel was corrupted (contains `psql '...'` prefix). Theodora's site fetches voice config and agency config from the CRM. When the CRM can't connect to its DB, those APIs fail → no voice agent, no logo, and possibly broken listings if the template's DB was also overwritten.

---

## Fix checklist

### 1. Fix CRM's DATABASE_URL (Vercel)

**Project:** nexrel-crm (www.nexrel.soshogle.com)

1. Vercel → nexrel-crm → Settings → Environment Variables
2. Edit `DATABASE_URL`
3. Set to **only** the connection string (no `psql`, no quotes):

```
postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

4. Save → Redeploy the CRM

### 2. Verify Theodora's site Vercel env (separate project)

**Project:** Theodora's site (e.g. theodora-stavropoulos-remax)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Theodora's Neon DB (ep-delicate-bar-aiwr4hlz) — **different from CRM** |
| `NEXREL_CRM_URL` | https://www.nexrel.soshogle.com |
| `NEXREL_WEBSITE_ID` | cmlpuuy8a0001pu4gz4y97hrm |
| `WEBSITE_VOICE_CONFIG_SECRET` | Same as CRM |

**Important:** Theodora's `DATABASE_URL` must point to her listings DB (ep-delicate-bar-aiwr4hlz), NOT the CRM's DB. If you accidentally set the CRM's broken URL here, listings will fail.

### 3. Redeploy both

- CRM: Redeploy after fixing DATABASE_URL
- Theodora's site: Redeploy if you changed any env vars

### 4. Verify

```bash
# CRM auth/DB
curl "https://www.nexrel.soshogle.com/api/debug-auth?email=realestate@nexrel.com"
# Should show "Database Connection": "success"

# Voice config (from Theodora's site or with secret)
curl -H "x-website-secret: YOUR_SECRET" "https://www.nexrel.soshogle.com/api/websites/cmlpuuy8a0001pu4gz4y97hrm/voice-config"
# Should return enableVoiceAI, agentId

# Agency config
curl -H "x-website-secret: YOUR_SECRET" "https://www.nexrel.soshogle.com/api/websites/cmlpuuy8a0001pu4gz4y97hrm/agency-config"
# Should return logoUrl, name, etc.
```

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| No voice AI | CRM DB broken → voice-config API fails | Fix CRM DATABASE_URL in Vercel |
| Logo missing | CRM DB broken → agency-config API fails | Same |
| No listings | Wrong DATABASE_URL in Theodora's Vercel | Use Theodora's Neon URL (ep-delicate-bar), not CRM's |
