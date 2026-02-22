# Website Auto-Deploy (Model B: Auto-deploy on save)

When owners edit their website in the CRM (structure, menu, content), the site is automatically redeployed. No manual Git push or Vercel deploy needed.

## Automatic setup

**New sites:** Deploy hooks are created automatically during provisioning. Owners don't need to do anything.

**Existing sites:** On first save after deploy, the CRM tries to create or fetch a deploy hook. If that fails, the Vercel Deployments API is used (requires `VERCEL_TOKEN` and project in same team).

**Backfill script** (for sites created before automation):
```bash
npx tsx scripts/backfill-deploy-hooks.ts
```

## Manual override (optional)

If auto-deploy isn't working, owners can paste a Deploy Hook URL in Website → Settings. Create one in Vercel → Project → Settings → Git → Deploy Hooks.

## Env vars (CRM)

| Var | Purpose |
|-----|---------|
| `VERCEL_TOKEN` | For API-based deploys (Option B) |
| `VERCEL_TEAM_ID` | Optional; defaults to soshogle team |
| `WEBSITE_AUTO_DEPLOY` | Set to `false` to disable auto-deploy |

## When deploys trigger

- PATCH `/api/websites/[id]` with `structure`, `navConfig`, `pageLabels`, or `agencyConfig`
- PATCH `/api/websites/[id]/structure` (section props, layout, global styles)
- POST `/api/website-builder/approve`
- Apply template, import from URL, import all pages

## Safeguards

- **Rate limit:** Max 1 deploy per website per 60 seconds
- **Feature flag:** `WEBSITE_AUTO_DEPLOY=false` disables
- **Fire-and-forget:** Deploy trigger runs async; API response is not blocked
