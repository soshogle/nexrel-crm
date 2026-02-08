# Setup Manual Webhook: GitHub → Vercel

## Overview

This guide will help you create a deploy hook in Vercel and add it as a webhook in GitHub, so that every push to `master` automatically triggers a Vercel deployment.

---

## Step 1: Create Deploy Hook in Vercel

### 1.1 Go to Vercel Deploy Hooks Settings

1. **Open your browser** and go to:
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Or navigate manually:**
   - Go to: https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm
   - Click **"Settings"** (top navigation)
   - Click **"Deploy Hooks"** (left sidebar)

### 1.2 Create New Deploy Hook

1. **Click "Create Hook"** button (usually top right)

2. **Fill in the form:**
   - **Name:** `GitHub Auto-Deploy` (or any name you prefer)
   - **Git Branch:** `master` (this is your production branch)
   - **Project:** Should auto-select `nexrel-crm`

3. **Click "Create Hook"**

### 1.3 Copy the Webhook URL

After creating, you'll see:
- ✅ **Hook created successfully**
- 📋 **Webhook URL** (looks like: `https://api.vercel.com/v1/integrations/deploy/prj_.../...`)

**IMPORTANT:** Copy this URL immediately - you'll need it in Step 2!

**Example format:**
```
https://api.vercel.com/v1/integrations/deploy/prj_TtBTAMHeXkbofxX808MlIgSzSIzu/...
```

---

## Step 2: Add Webhook to GitHub

### 2.1 Go to GitHub Webhooks Settings

1. **Open your browser** and go to:
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Or navigate manually:**
   - Go to: https://github.com/soshogle/nexrel-crm
   - Click **"Settings"** tab (top right of repository)
   - Click **"Webhooks"** (left sidebar)
   - Click **"Add webhook"** button

### 2.2 Configure the Webhook

1. **Payload URL:**
   - Paste the webhook URL you copied from Step 1.3
   - Should look like: `https://api.vercel.com/v1/integrations/deploy/...`

2. **Content type:**
   - Select: **`application/json`**

3. **Secret:**
   - Leave empty (Vercel doesn't require a secret for deploy hooks)

4. **Which events would you like to trigger this webhook?**
   - Select: **"Just the push event"**
   - This ensures it only triggers on code pushes

5. **Active:**
   - ✅ **Check this box** (should be checked by default)

6. **Click "Add webhook"** (green button at bottom)

---

## Step 3: Verify Webhook is Working

### 3.1 Test the Webhook

1. **Make a test commit:**
   ```bash
   cd /Users/cyclerun/Desktop/nexrel-crm
   git commit --allow-empty -m "Test webhook after manual setup"
   git push origin master
   ```

### 3.2 Check GitHub Webhook Delivery

1. **Go back to GitHub webhooks:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Click on your newly created webhook**

3. **Click "Recent Deliveries" tab**

4. **You should see:**
   - ✅ Recent push event
   - ✅ Status: "200 OK" (green)
   - ✅ Response: Success message

### 3.3 Check Vercel Deployment

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/deployments
   ```

2. **You should see:**
   - ✅ New deployment starting automatically
   - ✅ Commit: "Test webhook after manual setup"
   - ✅ Status: "Building" → "Ready"

---

## Troubleshooting

### Webhook Shows "404" or "Failed" in GitHub

**Problem:** Webhook URL is incorrect or expired

**Solution:**
1. Go back to Vercel Deploy Hooks
2. Delete the old hook
3. Create a new hook
4. Copy the new URL
5. Update GitHub webhook with new URL

### Webhook Shows "200 OK" but No Deployment

**Problem:** Vercel project settings issue

**Solution:**
1. Check Vercel project settings:
   - Go to: https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/general
   - Verify project is active
   - Check build settings

2. Check deploy hook settings:
   - Go back to Deploy Hooks
   - Verify branch is set to `master`
   - Verify hook is active

### Multiple Deployments Triggering

**Problem:** Both webhook AND Git integration are active

**Solution:**
- This is actually fine - you can have both
- Or disable one if you prefer:
  - Option A: Keep webhook, disconnect Git integration
  - Option B: Keep Git integration, remove webhook

---

## Alternative: Use Vercel Git Integration (Easier)

Instead of manual webhook, you can use Vercel's built-in Git integration:

### Step 1: Go to Git Settings
```
https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/git
```

### Step 2: Connect GitHub
1. Click **"Connect Git Repository"**
2. Select **GitHub**
3. Authorize Vercel (if needed)
4. Select repository: `soshogle/nexrel-crm`
5. Set production branch: `master`
6. ✅ **Enable "Automatically deploy every push"**
7. Click **"Deploy"**

**This automatically creates the webhook for you!**

---

## Summary

**Manual Webhook Method:**
1. ✅ Create deploy hook in Vercel → Copy URL
2. ✅ Add webhook in GitHub → Paste URL
3. ✅ Test with empty commit
4. ✅ Verify deployment triggers

**Git Integration Method (Easier):**
1. ✅ Connect GitHub in Vercel settings
2. ✅ Enable auto-deploy
3. ✅ Done! (Webhook created automatically)

**Recommendation:** Use Git Integration method - it's simpler and Vercel manages the webhook automatically.
