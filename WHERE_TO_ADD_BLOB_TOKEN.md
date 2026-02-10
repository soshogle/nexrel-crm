# 📍 Where to Add Vercel Blob Token - Exact Locations

## ✅ For Local Development

### Option 1: `.env.local` (Recommended) ⭐

**File:** `/Users/cyclerun/Desktop/nexrel-crm/.env.local`

**Add these lines at the end:**
```env
# Vercel Blob Storage (for website image storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
IMAGE_STORAGE_PROVIDER=vercel
ENABLE_IMAGE_DOWNLOAD=true
```

**Why `.env.local`?**
- ✅ Takes precedence over `.env`
- ✅ Not committed to git (already in `.gitignore`)
- ✅ Perfect for local development

### Option 2: `.env` (Alternative)

**File:** `/Users/cyclerun/Desktop/nexrel-crm/.env`

**Add the same lines at the end**

**Note:** `.env.local` takes precedence if both exist

---

## ✅ For Vercel Production

### Step 1: Go to Vercel Dashboard

**URL:** https://vercel.com/dashboard

### Step 2: Select Your Project

Click on your project: `nexrel-crm` (or whatever it's named)

### Step 3: Go to Settings → Environment Variables

**Direct link format:**
```
https://vercel.com/[your-username]/nexrel-crm/settings/environment-variables
```

### Step 4: Add These 3 Variables

Click **"Add New"** for each:

**Variable 1:**
- **Key:** `BLOB_READ_WRITE_TOKEN`
- **Value:** `vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx` (your actual token)
- **Environments:** ✅ Production ✅ Preview ✅ Development

**Variable 2:**
- **Key:** `IMAGE_STORAGE_PROVIDER`
- **Value:** `vercel`
- **Environments:** ✅ Production ✅ Preview ✅ Development

**Variable 3:**
- **Key:** `ENABLE_IMAGE_DOWNLOAD`
- **Value:** `true`
- **Environments:** ✅ Production ✅ Preview ✅ Development

### Step 5: Save

Click **"Save"** after adding each variable

### Step 6: Redeploy (Optional but Recommended)

After adding variables:
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

---

## 📝 Quick Reference

### Local Development Files:

**Primary:** `.env.local`
```
/Users/cyclerun/Desktop/nexrel-crm/.env.local
```

**Alternative:** `.env`
```
/Users/cyclerun/Desktop/nexrel-crm/.env
```

### Vercel Production:

**Settings Page:**
```
https://vercel.com/[your-username]/nexrel-crm/settings/environment-variables
```

---

## 🔍 How to Verify It's Set

### Check Local:

```bash
# Check if variable is set
grep BLOB_READ_WRITE_TOKEN .env.local

# Or check all blob-related vars
grep -E "BLOB|IMAGE_STORAGE|ENABLE_IMAGE" .env.local
```

### Check Vercel:

1. Go to: Settings → Environment Variables
2. Look for: `BLOB_READ_WRITE_TOKEN`
3. Should show: `vercel_blob_rw_...` (masked)

### Test It:

```bash
npx tsx scripts/test-vercel-blob.ts
```

---

## ⚠️ Important Notes

1. **Restart Dev Server:**
   After adding to `.env.local`, restart your Next.js dev server:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

2. **Don't Commit Token:**
   - `.env.local` is already in `.gitignore` ✅
   - Never commit tokens to git
   - Token should start with `vercel_blob_rw_`

3. **Different Tokens:**
   - Local: Use token from your Vercel project
   - Production: Same token (or can be different if you want)

---

## ✅ Summary

**Local Development:**
- File: `.env.local` (or `.env`)
- Location: `/Users/cyclerun/Desktop/nexrel-crm/.env.local`
- Add 3 variables at the end
- Restart dev server

**Vercel Production:**
- Go to: Vercel Dashboard → Project → Settings → Environment Variables
- Add 3 variables
- Select all environments (Production, Preview, Development)
- Save and optionally redeploy

That's it! 🎉
