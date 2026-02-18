# Publish Templates to GitHub (Phase 3)

To enable automated provisioning that deploys real sites (instead of empty repos), publish the template folders to GitHub and mark them as template repos.

## Prerequisites

- GitHub account (or org) with repo create permission
- `gh` CLI installed and authenticated (`gh auth login`)

## Option A: Using the script (recommended)

```bash
# From nexrel-crm root
npm run publish:templates
# or: npx tsx scripts/publish-templates-to-github.ts
```

The script will:
1. Create `nexrel-ecommerce-template` and `nexrel-service-template` repos (if they don't exist)
2. Push the template code from `nexrel-ecommerce-template/` and `nexrel-service-template/`
3. Enable "Template repository" in each repo's settings

Set these env vars before running:
- `GITHUB_TOKEN` – Personal access token with `repo` scope
- `GITHUB_ORG` – Target org (e.g. `soshogle`). Omit to use your user as owner.

## Option B: Manual steps

### 1. Create repos on GitHub

Create two new repositories:
- `nexrel-ecommerce-template` (private)
- `nexrel-service-template` (private)

### 2. Push ecommerce template

```bash
cd nexrel-ecommerce-template
git init
git add .
git commit -m "Initial ecommerce template"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/nexrel-ecommerce-template.git
git push -u origin main
cd ..
```

### 3. Push service template

```bash
cd nexrel-service-template
git init
git add .
git commit -m "Initial service template"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/nexrel-service-template.git
git push -u origin main
cd ..
```

### 4. Enable template repository

For each repo on GitHub:
1. Settings → General
2. Check **Template repository**
3. Save

### 5. Configure CRM env vars

Add to your CRM `.env`:

```
NEXREL_ECOM_TEMPLATE_OWNER=your-org
NEXREL_ECOM_TEMPLATE_REPO=nexrel-ecommerce-template
NEXREL_SERVICE_TEMPLATE_OWNER=your-org
NEXREL_SERVICE_TEMPLATE_REPO=nexrel-service-template
GITHUB_ORG=your-org
```

## Migrations on first deploy

The ecommerce template runs `db-migrate` as part of `npm run build`. When Vercel deploys:
1. `DATABASE_URL` is injected by provisioning
2. Build runs `node scripts/db-migrate.mjs` → `drizzle-kit migrate`
3. Schema is applied to the new Neon database before the app builds

No extra step needed.
