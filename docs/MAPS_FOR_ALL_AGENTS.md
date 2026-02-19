# Google Maps for All Real Estate Agents

Broker sites (nexrel-service-template) load the Google Maps script from the **CRM** instead of requiring `GOOGLE_MAPS_API_KEY` on each Vercel deployment. One key in the CRM works for all agents.

## How It Works

1. **CRM** has `GOOGLE_MAPS_API_KEY` set (once).
2. **Agency config API** (`/api/websites/[id]/agency-config`) returns `mapsScriptUrl: "https://your-crm.com/api/maps/js"` when the key is configured.
3. **Broker sites** fetch agency config from the CRM (they already do this for logo, nav, etc.).
4. **Map component** uses `config.mapsScriptUrl` when available, loading the script from the CRM. No per-site env var needed.

## Setup (One-Time)

1. **Add `GOOGLE_MAPS_API_KEY` to the CRM** (nexrel-crm Vercel project):
   - Vercel → nexrel-crm project → Settings → Environment Variables
   - Add `GOOGLE_MAPS_API_KEY` with your Google Maps API key
   - Redeploy the CRM

2. **Ensure broker sites have CRM config** (they already do for agency config):
   - `NEXREL_CRM_URL` — CRM base URL (e.g. https://nexrel.soshogle.com)
   - `NEXREL_WEBSITE_ID` — Website record ID
   - `WEBSITE_VOICE_CONFIG_SECRET` — for auth

## Fallback

If `mapsScriptUrl` is not returned (e.g. CRM has no key), the Map component falls back to `/api/maps/js` on the broker site. In that case, the broker site would need `GOOGLE_MAPS_API_KEY` in its own Vercel env. The template's server has this route for backward compatibility.

## New Agents

When you provision a new real estate agent site from nexrel-service-template, the map works automatically as long as:
- The CRM has `GOOGLE_MAPS_API_KEY` set
- The new site has `NEXREL_CRM_URL`, `NEXREL_WEBSITE_ID`, and `WEBSITE_VOICE_CONFIG_SECRET` (standard provisioning)

No need to add `GOOGLE_MAPS_API_KEY` to each agent's Vercel project.
