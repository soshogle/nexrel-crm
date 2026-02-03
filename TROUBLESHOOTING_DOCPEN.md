# Docpen Troubleshooting Guide

## Issue: "Abacus AI API key not configured" Error After Deployment

### Problem
Even though deployment completed, you're still seeing the old error message about Abacus AI API key.

### Root Cause
**Browser cache** - Your browser is still using old JavaScript files from before the migration.

### Solution

#### Step 1: Hard Refresh Browser (Most Important!)
**Chrome/Edge:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- Mac: `Cmd + Option + R`

#### Step 2: Clear Browser Cache
1. Open Chrome DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

#### Step 3: Verify Deployment
1. Check Vercel dashboard - ensure latest deployment is **Ready**
2. Check deployment URL matches your domain
3. Verify environment variables are set:
   - `OPENAI_API_KEY` ✅ (should be set)
   - `ABACUSAI_API_KEY` ❌ (should be removed)

#### Step 4: Test API Directly
Open browser console and test:
```javascript
fetch('/api/docpen/check-api-key')
  .then(r => r.json())
  .then(console.log)
```

Should return:
```json
{
  "configured": true,
  "keyLength": 51,
  "keyPreview": "sk-proj-...",
  "environment": "production",
  "hint": "API key is configured..."
}
```

### If Still Not Working

#### Check Vercel Environment Variables
1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/environment-variables
2. Verify `OPENAI_API_KEY` is set
3. Ensure it's set for **Production** environment
4. If you just added it, **redeploy** (Vercel → Deployments → Redeploy latest)

#### Check Server Logs
1. Go to Vercel dashboard
2. Click on latest deployment
3. Check "Functions" tab for errors
4. Look for `/api/docpen/transcribe` errors

#### Verify Code is Deployed
Check the deployed code matches:
- File: `app/api/docpen/transcribe/route.ts`
- Should check for `OPENAI_API_KEY` (not `ABACUSAI_API_KEY`)
- Line 73 should have: `const apiKey = process.env.OPENAI_API_KEY;`

### Common Issues

#### Issue 1: Environment Variable Not Set
**Symptom:** Error says "OPENAI_API_KEY not configured"
**Fix:** Add `OPENAI_API_KEY` in Vercel environment variables

#### Issue 2: Wrong Environment
**Symptom:** Works locally but not in production
**Fix:** Ensure env var is set for "Production" environment in Vercel

#### Issue 3: Cached Build
**Symptom:** Old error messages persist
**Fix:** Hard refresh browser + clear cache

#### Issue 4: Deployment Not Complete
**Symptom:** Changes not reflected
**Fix:** Wait for deployment to finish, then hard refresh

### Verification Checklist

- [ ] Hard refreshed browser (Cmd+Shift+R)
- [ ] Cleared browser cache
- [ ] Verified `OPENAI_API_KEY` is set in Vercel
- [ ] Verified env var is for "Production" environment
- [ ] Latest deployment is "Ready" in Vercel
- [ ] Tested `/api/docpen/check-api-key` endpoint
- [ ] Checked server logs for errors

### Still Having Issues?

1. **Check browser console** for exact error message
2. **Check Vercel function logs** for server-side errors
3. **Verify API key format** - should start with `sk-` (OpenAI key)
4. **Test in incognito mode** - eliminates cache issues
