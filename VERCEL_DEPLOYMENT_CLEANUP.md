# Vercel Deployment Cleanup Guide

## Problem
Multiple deployments are triggering for the same commit, causing:
- Wasted build minutes
- Confusion about which deployment is "real"
- Slower feedback loop

## Current Situation
You have 3 triggers firing for each commit:
1. ✅ GitHub Integration (auto-deploy) - **KEEP THIS**
2. ❌ Deploy Hook #1 - **REMOVE** (duplicate)
3. ❌ Deploy Hook #2 - **REMOVE** (duplicate)

## Step-by-Step Cleanup

### Step 1: Check GitHub Integration Status
1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/git
2. Verify GitHub is connected
3. Check "Production Branch" is set to `master`
4. Ensure "Auto-deploy" is **Enabled**

**If GitHub is connected and auto-deploy is enabled, you don't need Deploy Hooks!**

### Step 2: Remove Deploy Hooks
1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks
2. You should see multiple hooks listed
3. **Delete all Deploy Hooks** (click the trash icon next to each)
4. Keep only GitHub integration

### Step 3: Remove GitHub Webhooks (if you added them manually)
1. Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
2. Look for webhooks pointing to Vercel
3. **Delete any webhooks** that have URLs like:
   - `https://api.vercel.com/v1/integrations/deploy-hooks/...`
   - Any Vercel deploy hook URLs

**Note:** GitHub integration handles webhooks automatically - you don't need manual webhooks!

### Step 4: Verify Cleanup
After cleanup, test by making a small commit:
```bash
git commit --allow-empty -m "Test: Verify single deployment"
git push origin master
```

You should see **only 1 deployment** in Vercel dashboard.

## Recommended Setup

### ✅ Keep:
- **GitHub Integration** (Settings → Git)
  - Auto-deploys on every push
  - No manual configuration needed
  - One deployment per commit

### ❌ Remove:
- **Deploy Hooks** (Settings → Deploy Hooks)
  - Redundant if GitHub integration is enabled
  - Causes duplicate deployments

- **Manual GitHub Webhooks** (GitHub → Settings → Webhooks)
  - Not needed when using Vercel GitHub integration
  - Can cause duplicate triggers

## Troubleshooting

### If deployments stop working after cleanup:
1. Check GitHub integration is connected: https://vercel.com/soshogle/nexrel-crm/settings/git
2. Verify "Auto-deploy" is enabled
3. Check "Production Branch" matches your branch name (`master`)
4. Try pushing a commit to trigger a deployment

### If you still see multiple deployments:
1. Check if you have multiple Vercel projects connected to the same repo
2. Verify you're looking at the correct project
3. Check team/organization settings for additional triggers

## Summary

**One trigger is enough:**
- GitHub Integration = Auto-deploy on push ✅
- Deploy Hooks = Manual/webhook triggers ❌ (redundant)
- Manual GitHub Webhooks = ❌ (redundant)

After cleanup, you'll have:
- ✅ One deployment per commit
- ✅ Faster builds (no duplicate builds)
- ✅ Cleaner deployment history
- ✅ Lower build minute usage
