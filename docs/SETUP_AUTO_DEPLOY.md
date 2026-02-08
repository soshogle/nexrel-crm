# Setup Auto-Deploy in Vercel

## Current Issue

- ❌ No "Auto-deploy" option visible
- ❌ GitHub integration may not be properly connected
- ✅ Commits are pushed but not deploying automatically

---

## Step-by-Step: Connect GitHub Integration

### Step 1: Go to Project Settings

1. **Go to:** https://vercel.com/soshogle/nexrel-crm
2. **Click:** "Settings" tab (top navigation)
3. **Click:** "Git" in the left sidebar

---

### Step 2: Check Current Integration

**You should see one of these:**

**Option A: GitHub Already Connected**
- You'll see: "Connected to GitHub"
- Repository: `soshogle/nexrel-crm`
- **Action:** Check if there's a "Disconnect" button
- If connected but not auto-deploying, see Step 3

**Option B: No Integration**
- You'll see: "Connect Git Repository" button
- **Action:** Click it and follow Step 3

**Option C: Wrong Repository**
- Shows different repository
- **Action:** Disconnect and reconnect (Step 3)

---

### Step 3: Connect/Reconnect GitHub

1. **Click:** "Connect Git Repository" (or "Disconnect" then reconnect)

2. **Select:** GitHub

3. **Authorize Vercel:**
   - You'll be redirected to GitHub
   - Click "Authorize Vercel"
   - Grant repository access

4. **Select Repository:**
   - Find: `soshogle/nexrel-crm`
   - Click it

5. **Configure:**
   - **Production Branch:** `master`
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `./` (leave default)
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)

6. **Important:** Look for these options:
   - ✅ **"Automatically deploy every push"** - CHECK THIS
   - ✅ **"Automatically deploy pull requests"** - Optional
   - ✅ **"Wait for CI checks"** - Optional

7. **Click:** "Deploy" or "Save"

---

### Step 4: Verify Auto-Deploy

After connecting:

1. **Check Settings → Git:**
   - Should show: "Connected to GitHub"
   - Should show: `soshogle/nexrel-crm`
   - Should show: Production branch `master`

2. **Test Auto-Deploy:**
   ```bash
   git commit --allow-empty -m "Test auto-deploy"
   git push
   ```

3. **Check Vercel Dashboard:**
   - Should see new deployment starting automatically
   - Within 30 seconds of push

---

## Alternative: Use Deploy Hooks

If GitHub integration doesn't work, use Deploy Hooks:

### Step 1: Create Deploy Hook

1. **Go to:** https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks
2. **Click:** "Create Hook"
3. **Configure:**
   - **Name:** "GitHub Auto-Deploy"
   - **Branch:** `master`
   - **Git Provider:** GitHub
4. **Copy** the webhook URL

### Step 2: Add to GitHub

1. **Go to:** https://github.com/soshogle/nexrel-crm/settings/hooks
2. **Click:** "Add webhook"
3. **Paste** the webhook URL from Step 1
4. **Content type:** `application/json`
5. **Events:** Select "Just the push event"
6. **Click:** "Add webhook"

### Step 3: Test

```bash
git commit --allow-empty -m "Test deploy hook"
git push
```

---

## Troubleshooting

### "No Git Repository Connected"

**Solution:**
- Go to Settings → Git
- Click "Connect Git Repository"
- Follow Step 3 above

### "Repository Not Found"

**Solution:**
- Verify repository exists: https://github.com/soshogle/nexrel-crm
- Check you have access
- Reconnect in Vercel

### "Auto-Deploy Still Not Working"

**Solution:**
1. **Disconnect** GitHub integration
2. **Reconnect** following Step 3
3. **Verify** webhook in GitHub:
   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks
   - Should see Vercel webhook
   - Check recent deliveries

### "Can't Find Settings"

**Solution:**
- Make sure you're logged into Vercel
- Make sure you have project access
- Try: https://vercel.com/soshogle/nexrel-crm/settings/git

---

## Quick Checklist

- [ ] Go to Vercel Settings → Git
- [ ] GitHub is connected
- [ ] Repository: `soshogle/nexrel-crm`
- [ ] Production branch: `master`
- [ ] Auto-deploy is enabled (or deploy hook configured)
- [ ] Test with empty commit
- [ ] Verify deployment starts automatically

---

## After Setup

Once auto-deploy is working:

1. **Every push to `master`** will trigger deployment
2. **No manual steps needed**
3. **Deployments appear in dashboard automatically**

---

**Next Step:** Go to https://vercel.com/soshogle/nexrel-crm/settings/git and connect/reconnect GitHub integration 🚀
