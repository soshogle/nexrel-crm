# Quick Webhook Setup Guide

## 🎯 Fastest Method: Use Vercel Git Integration

### Step 1: Connect GitHub in Vercel (2 minutes)

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/git
   ```

2. **If GitHub is NOT connected:**
   - Click **"Connect Git Repository"**
   - Select **GitHub**
   - Authorize Vercel
   - Select: `soshogle/nexrel-crm`
   - Branch: `master`
   - ✅ **Check "Automatically deploy every push"**
   - Click **"Deploy"**

3. **If GitHub IS connected but auto-deploy is OFF:**
   - ✅ **Enable "Automatically deploy every push"**
   - Click **"Save"**

**Done!** Vercel will automatically create the webhook.

---

## 🔧 Manual Webhook Method (If Git Integration Doesn't Work)

### Part A: Create Deploy Hook in Vercel

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Click "Create Hook"**

3. **Fill in:**
   - Name: `GitHub Auto-Deploy`
   - Branch: `master`

4. **Click "Create Hook"**

5. **Copy the webhook URL** (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### Part B: Add to GitHub

1. **Go to:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Click "Add webhook"**

3. **Fill in:**
   - **Payload URL:** Paste the URL from Part A
   - **Content type:** `application/json`
   - **Events:** Select "Just the push event"
   - ✅ **Active:** Checked

4. **Click "Add webhook"**

### Part C: Test

```bash
git commit --allow-empty -m "Test webhook"
git push origin master
```

Check Vercel dashboard - should see deployment starting!

---

## ✅ Verification Checklist

- [ ] Vercel Git Integration connected OR Deploy Hook created
- [ ] GitHub webhook added (if manual method)
- [ ] Auto-deploy enabled in Vercel
- [ ] Test commit pushed successfully
- [ ] Deployment appears in Vercel dashboard
- [ ] Deployment completes successfully

---

## 🆘 Still Not Working?

1. **Check GitHub webhook deliveries:**
   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
   - Click on webhook
   - Check "Recent Deliveries" tab
   - Look for errors

2. **Check Vercel logs:**
   - Go to: https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/deployments
   - Check if deployments are being created
   - Look at build logs for errors

3. **Try reconnecting:**
   - Disconnect GitHub in Vercel
   - Reconnect GitHub
   - Enable auto-deploy again
