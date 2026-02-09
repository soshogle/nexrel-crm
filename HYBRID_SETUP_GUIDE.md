# Hybrid Development Setup - Cursor Local + Cloud Builds

## 🎯 Goal
Use Cursor locally but never build locally - all builds happen on Vercel (cloud).

---

## ✅ What You Get

- **Cursor:** Use locally (familiar, fast)
- **Builds:** Happen on Vercel (zero local disk usage)
- **Database:** Neon (works from anywhere)
- **Deployment:** Auto-deploys from GitHub
- **Cost:** $0/month
- **Local Space:** ~2GB (vs 6GB+)

---

## 🚀 Setup Steps

### Step 1: Verify Vercel Auto-Deploy

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your `nexrel-crm` project
3. Go to **Settings** → **Git**
4. Ensure:
   - ✅ GitHub is connected
   - ✅ Auto-deploy is enabled for `master` branch
   - ✅ Build command: `npm run build` (default)

---

### Step 2: Update Your Workflow

**Old workflow (builds locally):**
```bash
npm run build  # ❌ Don't do this locally
npm run dev    # ✅ OK for testing
```

**New workflow (builds on Vercel):**
```bash
npm run dev    # ✅ Test locally (small footprint)
git push       # ✅ Deploy (builds on Vercel)
```

---

### Step 3: Never Build Locally

**Add to your workflow:**
- ✅ Use `npm run dev` for local testing
- ❌ Never run `npm run build` locally
- ✅ Let Vercel handle all production builds

**Why:**
- `npm run build` creates `.next` folder (~4.2GB)
- Vercel builds for you automatically
- No need to build locally

---

### Step 4: Use Cleanup Script

**After each dev session:**
```bash
./cleanup.sh
```

**Or set up weekly automation:**
```bash
# Already set up! Runs every Sunday at 5am
# Check: ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

---

### Step 5: Deploy Workflow

**Simple deployment:**
```bash
# 1. Make changes in Cursor
# 2. Test locally (optional)
npm run dev

# 3. Commit and push
git add .
git commit -m "Your changes"
git push origin master

# 4. Vercel automatically:
#    - Detects push
#    - Builds on Vercel servers
#    - Deploys to production
#    - No local disk usage!
```

---

## 📊 Space Usage Comparison

### Before (Building Locally)
- Source code: ~70MB
- Git history: ~53MB
- `node_modules`: ~1.8GB
- `.next` folder: ~4.2GB ❌
- npm cache: ~1.5GB ❌
- **Total:** ~7.6GB

### After (Hybrid Approach)
- Source code: ~70MB ✅
- Git history: ~53MB ✅
- `node_modules`: ~1.8GB (can delete, reinstall when needed)
- `.next` folder: 0GB ✅ (never build locally)
- npm cache: 0GB ✅ (cleaned weekly)
- **Total:** ~2GB ✅

**Space saved:** ~5.6GB

---

## 🔧 Configuration

### Vercel Build Settings

Your `vercel.json` already configured:
```json
{
  "buildCommand": "NODE_OPTIONS='--max-old-space-size=8192' npm run build"
}
```

This means:
- ✅ Builds happen on Vercel (not local)
- ✅ Uses 8GB RAM for builds (plenty)
- ✅ No local disk usage

---

### Environment Variables

**Set in Vercel Dashboard:**
1. Go to Project → Settings → Environment Variables
2. Add all your variables:
   - `DATABASE_URL` (Neon connection string)
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - etc.

**Local development:**
- Keep `.env.local` for `npm run dev`
- Vercel uses its own env vars for builds

---

## ✅ Verification

**Check that builds happen on Vercel:**
1. Make a small change
2. Push to GitHub
3. Go to Vercel Dashboard → Deployments
4. Watch the build happen (on Vercel servers)
5. Check your local disk - no `.next` folder created ✅

**Check local space:**
```bash
du -sh .next node_modules .git
# Should show: .next doesn't exist or is very small
```

---

## 🎯 Daily Workflow

**Morning:**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npm run dev  # Test locally if needed
```

**During development:**
- Edit code in Cursor
- Test with `npm run dev` (small footprint)
- Never run `npm run build`

**End of day:**
```bash
./cleanup.sh  # Clean up .next and npm cache
git add .
git commit -m "Your changes"
git push origin master  # Deploys (builds on Vercel)
```

**Weekly:**
- Cleanup script runs automatically (Sunday 5am)
- Or run manually: `./cleanup.sh`

---

## 🆘 Troubleshooting

### "I need to test the production build locally"

**Option 1: Build once, then delete**
```bash
npm run build  # Build once
npm run start  # Test
rm -rf .next   # Delete immediately after
```

**Option 2: Test on Vercel preview**
- Push to a branch
- Vercel creates preview deployment
- Test there (no local build needed)

### "Build fails on Vercel"

1. Check Vercel build logs
2. Fix errors in code
3. Push again (Vercel rebuilds)

### "I accidentally built locally"

```bash
./cleanup.sh  # Cleans up .next and npm cache
```

---

## 📝 Summary

**Hybrid Approach Benefits:**
- ✅ Use Cursor locally (familiar)
- ✅ Zero local builds (Vercel builds)
- ✅ Minimal disk usage (~2GB)
- ✅ Zero cost
- ✅ Works with Neon, GitHub, Vercel
- ✅ Fast development (no cloud latency)

**What to do:**
1. Never run `npm run build` locally
2. Use `npm run dev` for testing
3. Deploy via `git push` (auto-deploys)
4. Run cleanup script weekly

**You're all set!** 🎉
