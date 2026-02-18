# Website Auto-Deploy (Eyal, Theodora, Future Sites)

When owners edit their website structure in the CRM, the site is automatically redeployed via Vercel.

## Setup

### 1. Run migration scripts

**Eyal (darksword-armory):**
```bash
npx tsx scripts/wire-eyal-darksword-to-crm.ts
```
- Sets `githubRepoUrl` and `vercelProjectId` on his Website record
- Requires `VERCEL_TOKEN` in .env
- His existing repo and Vercel project stay as-is

**Theodora:**
```bash
npx tsx scripts/migrate-theodora-to-own-repo.ts
```
- Creates `theodora-stavropoulos-website` repo from nexrel-service-template
- Updates CRM with `githubRepoUrl` and `vercelProjectId`
- **Manual step:** In Vercel → theodora-stavropoulos-remax → Settings → Git → Disconnect → Connect to new repo `theodora-stavropoulos-website`

### 2. Env vars

| Var | Purpose |
|-----|---------|
| `VERCEL_TOKEN` | Required for deploy triggers |
| `VERCEL_TEAM_ID` | Optional; defaults to soshogle team |
| `WEBSITE_AUTO_DEPLOY` | Set to `false` to disable auto-deploy |

### 3. Safeguards

- **Rate limit:** Max 1 deploy per website per 60 seconds
- **Feature flag:** `WEBSITE_AUTO_DEPLOY=false` disables
- **Only when vercelProjectId set:** Sites without Vercel project are skipped
- **Fire-and-forget:** Deploy trigger runs async; API response is not blocked

## When deploys trigger

- PATCH `/api/websites/[id]` with `structure` in body
- PATCH `/api/websites/[id]/structure` (section props, layout, global styles)
- POST `/api/website-builder/approve` when approving structure changes
- Apply template, import from URL

## Future sites

New sites created via the website builder already get `githubRepoUrl` and `vercelProjectId` from provisioning. They will auto-deploy when edited.
