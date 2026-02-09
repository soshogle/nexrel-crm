# Deploy to Vercel - Quick Guide

## ✅ Your Project is Linked to Vercel

Your project is already linked to Vercel:
- **Project ID:** `prj_TtBTAMHeXkbofxX808MlIgSzSIzu`
- **Project Name:** `nexrel-crm`

---

## 🚀 Deployment Options

### Option 1: Auto-Deploy from GitHub (Recommended)

If your Vercel project is connected to GitHub, it should **automatically deploy** when you push to the `master` branch.

**Check if auto-deploy is enabled:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your `nexrel-crm` project
3. Go to **Settings** → **Git**
4. Check if GitHub is connected and auto-deploy is enabled

**If not connected:**
1. In Vercel Dashboard → Settings → Git
2. Click **Connect Git Repository**
3. Select your GitHub repository
4. Choose `master` branch
5. Enable **Auto-deploy**

---

### Option 2: Manual Deploy via Vercel CLI

**Install Vercel CLI (if needed):**
```bash
npm install -g vercel
```

**Deploy to production:**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx vercel --prod
```

**Or use the full command:**
```bash
vercel --prod
```

This will:
1. Build your Next.js app
2. Deploy to production
3. Give you a deployment URL

---

### Option 3: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your `nexrel-crm` project
3. Click **Deployments** tab
4. Click **Redeploy** on the latest deployment
5. Or click **Create Deployment** → Select branch `master` → Deploy

---

## 🔍 Check Deployment Status

**Via Dashboard:**
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click on `nexrel-crm`
- Check the **Deployments** tab

**Via CLI:**
```bash
vercel ls
```

---

## 📋 What Gets Deployed

Your latest commit includes:
- ✅ Workflow channel type filtering
- ✅ Automated cleanup system
- ✅ All code changes

**Commit:** `38fb734` - "Add workflow channel type filtering and automated cleanup system"

---

## ⚠️ If Deployment Fails

**Common issues:**

1. **Build errors:**
   - Check build logs in Vercel Dashboard
   - Fix any TypeScript/compilation errors
   - Ensure all dependencies are in `package.json`

2. **Environment variables missing:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add any missing variables (FACEBOOK_APP_ID, etc.)

3. **Disk space (if building locally):**
   - Run `./cleanup.sh` first
   - Then deploy

---

## 🎯 Quick Deploy Command

**Run this in Terminal:**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx vercel --prod
```

**Or if Vercel CLI is installed globally:**
```bash
vercel --prod
```

---

## ✅ After Deployment

1. Check deployment URL in Vercel Dashboard
2. Test your changes:
   - Workflow channel filtering
   - Instagram/Messenger webhooks
   - All features

---

## 📝 Notes

- If GitHub is connected, deployments happen automatically on push
- Manual deploy via CLI gives you more control
- Check Vercel Dashboard for deployment status and logs
