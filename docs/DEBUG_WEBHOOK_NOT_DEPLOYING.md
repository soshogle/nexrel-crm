# Debug: Webhook Not Triggering Deployments

## Current Status

✅ **GitHub Webhook Configured:**
- URL: `https://api.vercel.com/v1/integrations/deploy/prj_TIBTAMHeXkbofxX808MlIgSzSlzu/MsqblP8hQX`
- Content type: `application/json`
- Events: "Just the push event"
- Active: ✅ Checked

✅ **Vercel Git Connected:**
- Repository: `soshogle/nexrel-crm`
- Connected 2h ago

❌ **Still Not Deploying**

---

## Step 1: Check Webhook Delivery Status

### Check if Webhook is Actually Firing

1. **Go to GitHub Webhooks:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks/595241732
   ```

2. **Click "Recent Deliveries" tab**

3. **Look for the test commit `9f152b2`:**
   - Should see a delivery for the push event
   - Check the status:
     - ✅ **"200 OK"** = Webhook received by Vercel
     - ❌ **"404"** = Wrong URL
     - ❌ **"500"** = Vercel error
     - ❌ **No delivery** = Webhook not firing

4. **Click on the delivery** to see:
   - Request payload (what GitHub sent)
   - Response (what Vercel returned)
   - Response headers

**What to look for:**
- If status is "200 OK" but no deployment → Vercel received it but didn't deploy
- If status is "404" → Webhook URL is wrong/expired
- If no delivery → Webhook isn't configured correctly

---

## Step 2: Verify Deploy Hook is Active

1. **Go to Vercel Deploy Hooks:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Check if hook `MsqblP8hQX` exists:**
   - Should see a hook with that ID
   - Verify it's active/enabled
   - Check branch is set to `master`

3. **If hook doesn't exist or is wrong:**
   - Delete the old webhook in GitHub
   - Create a new deploy hook in Vercel
   - Copy the new URL
   - Add to GitHub again

---

## Step 3: Try Disconnect/Reconnect Git Integration

Sometimes the Git integration needs to be refreshed:

1. **Go to Vercel Git Settings:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/git
   ```

2. **Click "Disconnect"** button

3. **Wait 10 seconds**

4. **Click "Connect Git Repository"**

5. **Select GitHub** → Choose `soshogle/nexrel-crm`

6. **This should:**
   - Recreate the webhook automatically
   - Enable auto-deploy
   - Start deploying immediately

7. **Test again:**
   ```bash
   git commit --allow-empty -m "Test after reconnect"
   git push origin master
   ```

---

## Step 4: Manual Deploy Hook Method (Most Reliable)

If Git integration isn't working, use deploy hooks:

### A. Create New Deploy Hook

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Delete old hook** (if exists)

3. **Click "Create Hook"**

4. **Fill in:**
   - Name: `GitHub Auto-Deploy`
   - Branch: `master`

5. **Copy the NEW webhook URL**

### B. Update GitHub Webhook

1. **Go to:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks/595241732
   ```

2. **Update Payload URL:**
   - Replace with the NEW URL from Step A

3. **Click "Update webhook"**

4. **Test:**
   ```bash
   git commit --allow-empty -m "Test new webhook"
   git push origin master
   ```

---

## Step 5: Check Vercel Project Status

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm
   ```

2. **Check:**
   - Project is not paused
   - No build errors blocking deployments
   - Project is active

3. **Check Production Branch:**
   - Go to Settings → General
   - Verify Production Branch is `master`

---

## Step 6: Manual Deployment (While Fixing)

While troubleshooting, deploy manually:

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/deployments
   ```

2. **Click "Redeploy"**

3. **Select commit:** `9f152b2` or `875c73a`

4. **Click "Redeploy"**

This ensures your code is deployed while we fix the webhook.

---

## Common Issues & Solutions

### Issue: Webhook shows "200 OK" but no deployment

**Possible causes:**
- Deploy hook is disabled in Vercel
- Branch mismatch (webhook for different branch)
- Vercel project paused

**Solution:**
- Check deploy hooks page - verify hook is active
- Verify branch matches (`master`)
- Check project isn't paused

### Issue: Webhook shows "404"

**Cause:** Webhook URL is wrong or expired

**Solution:**
- Create new deploy hook
- Update GitHub webhook with new URL

### Issue: No webhook deliveries

**Cause:** Webhook not configured correctly

**Solution:**
- Verify webhook is "Active" in GitHub
- Check "Just the push event" is selected
- Try disconnecting/reconnecting Git integration

---

## Quick Diagnostic Checklist

- [ ] Check GitHub webhook "Recent Deliveries" - what status?
- [ ] Check Vercel deploy hooks - is hook active?
- [ ] Verify branch is `master` in both places
- [ ] Try disconnect/reconnect Git integration
- [ ] Create new deploy hook and update GitHub
- [ ] Manually deploy commit `875c73a` while fixing

**Start with Step 1 - check Recent Deliveries to see what's actually happening!**
