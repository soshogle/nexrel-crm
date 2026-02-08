# Setup Single Deployment (No Duplicates)

## Current Situation

- ✅ Removed duplicate webhooks (good!)
- ❌ No webhook = no auto-deployments
- ✅ Need: ONE deployment per commit (via Vercel GitHub integration)

---

## Solution: Use Vercel GitHub Integration (Not Manual Webhooks)

Vercel's GitHub integration creates its own webhook automatically. You should **NOT** add manual webhooks.

---

## Step-by-Step Setup

### Step 1: Verify Vercel GitHub Integration

1. **Go to:** https://vercel.com/soshogle/nexrel-crm/settings/git

2. **Check:**
   - ✅ Shows "Connected to GitHub"
   - ✅ Repository: `soshogle/nexrel-crm`
   - ✅ Production branch: `master`

3. **If NOT connected:**
   - Click "Connect Git Repository"
   - Select GitHub
   - Authorize Vercel
   - Select `soshogle/nexrel-crm`
   - Set production branch: `master`
   - **DO NOT** check "Automatically deploy pull requests" (to avoid duplicates)
   - Click "Deploy"

---

### Step 2: Let Vercel Create Webhook Automatically

**When you connect GitHub in Vercel, it automatically:**
- Creates a webhook in GitHub
- Configures it correctly
- Sets up auto-deploy

**You should NOT manually add webhooks!**

---

### Step 3: Verify Webhook Was Created

1. **Go to:** https://github.com/soshogle/nexrel-crm/settings/hooks

2. **You should see ONE webhook:**
   - Name: Something like "Vercel" or "vercel.com"
   - URL: `https://api.vercel.com/v1/integrations/deploy-hooks/...`
   - Events: "push" (or similar)

3. **If you see MULTIPLE webhooks:**
   - Delete all except the Vercel one
   - Keep only the one created by Vercel integration

4. **If you see NO webhooks:**
   - Go back to Vercel settings
   - Disconnect GitHub
   - Reconnect GitHub
   - This should create the webhook

---

### Step 4: Test Auto-Deploy

```bash
git commit --allow-empty -m "Test single deployment"
git push
```

**Then check:**
- GitHub webhooks → Recent Deliveries (should show 1 delivery)
- Vercel dashboard → Should show 1 deployment starting

**If you see 2 deployments:**
- Check for duplicate webhooks in GitHub
- Remove any manual webhooks
- Keep only Vercel's automatic webhook

---

## Why You Had Duplicate Deployments Before

**Common causes:**
1. **Manual webhook + Vercel integration** = 2 deployments
2. **Multiple deploy hooks** = Multiple deployments
3. **GitHub integration + Deploy hook** = 2 deployments

**Solution:** Use ONLY Vercel's GitHub integration (no manual webhooks)

---

## Correct Setup (One Deployment)

### ✅ DO:
- Connect GitHub in Vercel Settings → Git
- Let Vercel create webhook automatically
- Use ONE webhook (created by Vercel)
- Push to `master` branch

### ❌ DON'T:
- Add manual webhooks in GitHub
- Create multiple deploy hooks
- Use both GitHub integration AND deploy hooks

---

## Troubleshooting

### Issue: "No webhook after connecting GitHub"

**Solution:**
1. Disconnect GitHub in Vercel
2. Reconnect GitHub
3. Check GitHub webhooks - should see Vercel webhook
4. If still missing, contact Vercel support

### Issue: "Still getting 2 deployments"

**Solution:**
1. Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
2. Delete ALL webhooks
3. Go to: https://vercel.com/soshogle/nexrel-crm/settings/git
4. Disconnect and reconnect GitHub
5. Check webhooks again - should see ONLY ONE

### Issue: "Webhook not firing"

**Solution:**
1. Check webhook in GitHub → Recent Deliveries
2. Should show recent pushes
3. If no deliveries, webhook isn't receiving events
4. Try disconnecting/reconnecting GitHub in Vercel

---

## Current Action Items

1. **Go to:** https://vercel.com/soshogle/nexrel-crm/settings/git
2. **Verify:** GitHub is connected
3. **Go to:** https://github.com/soshogle/nexrel-crm/settings/hooks
4. **Check:** Should see ONE Vercel webhook (created automatically)
5. **If missing:** Disconnect/reconnect GitHub in Vercel
6. **Test:** Push a commit and verify ONE deployment starts

---

## Manual Deploy (While Setting Up)

**Until auto-deploy works:**

1. Go to: https://vercel.com/soshogle/nexrel-crm
2. Click "Redeploy"
3. Select latest commit
4. Deploy

---

**Goal:** ONE webhook (created by Vercel) = ONE deployment per commit ✅
