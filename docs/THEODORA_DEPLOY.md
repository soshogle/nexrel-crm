# Theodora's Website — Simple Deploy

## One-command deploy

When you add new features to `nexrel-service-template` (e.g. /market-appraisal, property evaluation), deploy to Theodora's site with:

```bash
GITHUB_TOKEN=your_token npx tsx scripts/deploy-theodora.ts
```

Or use the npm script:

```bash
npm run deploy-theodora
```

This will:
1. **Sync** template → Theodora-Stavropoulos-Remax (applies latest template updates)
2. **Push** to GitHub (Vercel auto-deploys)

## Step-by-step (optional)

```bash
# 1. Sync template updates into Theodora's local copy
npm run sync-theodora

# 2. Push to GitHub (triggers Vercel)
GITHUB_TOKEN=xxx npm run publish-theodora-to-github
```

## Skip sync (push only)

If you only changed Theodora-specific content and don't need template updates:

```bash
SKIP_SYNC=1 npm run deploy-theodora
```

## Prerequisites

- `GITHUB_TOKEN` with repo scope (for soshogle/Theodora-Stavropoulos-Remax)
- `nexrel-service-template` and `Theodora-Stavropoulos-Remax` folders in nexrel-crm

## What gets preserved

- Theodora's `.env` (never overwritten)
- Theodora's `.git` (preserves her repo history)
