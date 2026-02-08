# How to Trigger Vercel Deployment

## Quick Methods

### Method 1: Vercel Dashboard (Easiest) ⭐

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/soshogle/nexrel-crm
   ```

2. **Click "Redeploy"** button (top right)

3. **Select latest commit:**
   - Look for commit: `d7bc712` - "Add medical device disclaimers..."
   - Click "Redeploy"

---

### Method 2: Install Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

### Method 3: Check GitHub Integration

Vercel should auto-deploy when you push to GitHub. If it didn't:

1. **Check GitHub Integration:**
   ```
   https://vercel.com/soshogle/nexrel-crm/settings/git
   ```

2. **Verify:**
   - ✅ GitHub is connected
   - ✅ Production branch is `master`
   - ✅ "Auto-deploy" is **Enabled**

3. **If not enabled, enable it and push again:**
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push
   ```

---

### Method 4: Use Deploy Hook (If Configured)

1. **Get Deploy Hook URL:**
   ```
   https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks
   ```

2. **Trigger deployment:**
   ```bash
   curl -X POST YOUR_DEPLOY_HOOK_URL
   ```

---

## Check Deployment Status

**Vercel Dashboard:**
```
https://vercel.com/soshogle/nexrel-crm
```

**Check recent deployments:**
- Should see commit: `d7bc712`
- Status: Building / Ready / Error

---

## Troubleshooting

### Deployment Not Starting

1. **Check GitHub Integration:**
   - Go to: https://vercel.com/soshogle/nexrel-crm/settings/git
   - Verify GitHub is connected
   - Check auto-deploy is enabled

2. **Check Build Logs:**
   - Go to: https://vercel.com/soshogle/nexrel-crm
   - Click on latest deployment
   - Check "Build Logs" tab

3. **Manual Trigger:**
   - Use Method 1 (Dashboard) or Method 2 (CLI)

### Build Failing

1. **Check Build Logs** in Vercel dashboard
2. **Common Issues:**
   - Missing environment variables
   - Build timeout
   - Dependency errors
   - TypeScript errors

3. **Fix and push again:**
   ```bash
   git commit -m "Fix build issues"
   git push
   ```

---

## Recommended: Use GitHub Integration

**Best Practice:**
- ✅ Keep GitHub integration enabled
- ✅ Auto-deploy on every push
- ✅ One deployment per commit
- ✅ No manual steps needed

**Setup:**
1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/git
2. Connect GitHub repository
3. Enable "Auto-deploy"
4. Set production branch to `master`

---

**Quick Trigger:** Go to https://vercel.com/soshogle/nexrel-crm and click "Redeploy" 🚀
