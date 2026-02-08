# Troubleshoot Deployment Not Starting

## Issue: GitHub Reconnected But Still No Auto-Deploy

### Quick Checks

1. **Verify GitHub Webhook is Active:**
   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
   - Look for Vercel webhook
   - Check "Recent Deliveries" - should show recent pushes
   - If no deliveries, webhook isn't firing

2. **Check Vercel Git Settings:**
   - Go to: https://vercel.com/soshogle/nexrel-crm/settings/git
   - Verify:
     - ✅ Repository: `soshogle/nexrel-crm`
     - ✅ Production branch: `master`
     - ✅ "Automatically deploy every push" is checked

3. **Check Branch Name:**
   ```bash
   git branch
   ```
   - Should be on `master` branch
   - If on different branch, switch: `git checkout master`

---

## Solutions

### Solution 1: Verify Webhook in GitHub

1. **Go to:** https://github.com/soshogle/nexrel-crm/settings/hooks
2. **Find Vercel webhook** (should have Vercel icon/name)
3. **Click on it**
4. **Check "Recent Deliveries" tab:**
   - Should show recent push events
   - Status should be "200 OK"
   - If "404" or errors, webhook URL is wrong

5. **If webhook missing or broken:**
   - Go back to Vercel: https://vercel.com/soshogle/nexrel-crm/settings/git
   - Disconnect GitHub
   - Reconnect GitHub
   - This should recreate the webhook

---

### Solution 2: Manual Trigger (Immediate)

**While troubleshooting, trigger manually:**

1. **Go to:** https://vercel.com/soshogle/nexrel-crm
2. **Click:** "Redeploy" button
3. **Select:** Latest commit (`26f7795` or newer)
4. **Click:** "Redeploy"

This deploys immediately while you fix auto-deploy.

---

### Solution 3: Check Repository Permissions

**Vercel needs access to your GitHub repository:**

1. **Go to:** https://github.com/settings/applications
2. **Find:** Vercel application
3. **Check:** Repository access includes `soshogle/nexrel-crm`
4. **If not:** Re-authorize Vercel with repository access

---

### Solution 4: Recreate Webhook Manually

**If webhook isn't working:**

1. **Get Deploy Hook URL:**
   - Go to: https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks
   - Click "Create Hook"
   - Name: "GitHub Auto-Deploy"
   - Branch: `master`
   - Copy the webhook URL

2. **Add to GitHub:**
   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
   - Click "Add webhook"
   - Paste URL
   - Content type: `application/json`
   - Events: "Just the push event"
   - Click "Add webhook"

3. **Test:**
   ```bash
   git commit --allow-empty -m "Test webhook"
   git push
   ```

---

### Solution 5: Check Vercel Project Settings

**Verify project configuration:**

1. **Go to:** https://vercel.com/soshogle/nexrel-crm/settings/general
2. **Check:**
   - Framework: Next.js
   - Root Directory: `./` (or correct path)
   - Build Command: (should auto-detect)
   - Output Directory: (should auto-detect)

3. **Go to:** Settings → Git
   - Production Branch: `master`
   - Auto-deploy: Enabled

---

## Diagnostic Steps

### Step 1: Test Push

```bash
git commit --allow-empty -m "Test auto-deploy"
git push
```

**Then immediately check:**
- GitHub webhook deliveries (should show push)
- Vercel dashboard (should show deployment starting)

### Step 2: Check Webhook Payload

1. Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
2. Click on Vercel webhook
3. Click "Recent Deliveries"
4. Click on latest delivery
5. Check:
   - **Request:** Should show push event
   - **Response:** Should be "200 OK"
   - **Payload:** Should include commit info

### Step 3: Verify Branch

```bash
# Check current branch
git branch

# Should show: * master

# If not, switch to master
git checkout master

# Push again
git push
```

---

## Common Issues

### Issue: "Webhook not found"
**Solution:** Reconnect GitHub in Vercel settings

### Issue: "404 Not Found" in webhook deliveries
**Solution:** Webhook URL is wrong, recreate it

### Issue: "No deliveries" in webhook
**Solution:** Webhook isn't receiving events, check GitHub permissions

### Issue: "Wrong branch"
**Solution:** Ensure pushing to `master` branch

### Issue: "Vercel not authorized"
**Solution:** Re-authorize Vercel in GitHub settings

---

## Immediate Action

**Right now, deploy manually:**

1. Go to: https://vercel.com/soshogle/nexrel-crm
2. Click "Redeploy"
3. Select latest commit
4. Deploy

**Then fix auto-deploy** using solutions above.

---

## Still Not Working?

**Last resort - Use Vercel CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy
vercel --prod
```

This bypasses GitHub integration and deploys directly.

---

**Quick Fix:** Go to https://vercel.com/soshogle/nexrel-crm → Click "Redeploy" → Select latest commit 🚀
