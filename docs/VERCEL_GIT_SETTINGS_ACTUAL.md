# Vercel Git Integration Settings - Actual Interface

## Current Vercel Interface (2026)

The Vercel Git integration interface may have changed. Here's how to check and configure it:

---

## Step 1: Check Current Git Integration Status

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/git
   ```

2. **Look for:**
   - "Git Repository" section
   - Current repository connection status
   - Any toggle switches or checkboxes

---

## Step 2: If GitHub is NOT Connected

1. **Click "Connect Git Repository"** (or similar button)

2. **Select GitHub** and authorize

3. **Select repository:** `soshogle/nexrel-crm`

4. **After connecting, Vercel should:**
   - Automatically enable deployments
   - Create webhook automatically
   - Start deploying immediately

**Note:** In newer Vercel interfaces, auto-deploy is enabled by default when you connect.

---

## Step 3: If GitHub IS Connected

### Option A: Check Production Branch Settings

1. **Look for "Production Branch" setting:**
   - Should show: `master` or `main`
   - If wrong, change it to `master`

2. **Look for "Deploy Hooks" or "Automatic Deployments":**
   - May be in a different section
   - Check if there's a toggle or checkbox

### Option B: Disconnect and Reconnect

If you can't find auto-deploy settings:

1. **Disconnect GitHub:**
   - Find "Disconnect" or "Remove" button
   - Click it
   - Confirm

2. **Reconnect GitHub:**
   - Click "Connect Git Repository"
   - Select GitHub
   - Choose `soshogle/nexrel-crm`
   - This should recreate the webhook automatically

### Option C: Check Deploy Hooks Section

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Look for existing hooks:**
   - May already have a hook created
   - Check if it's active

3. **If no hook exists, create one:**
   - Click "Create Hook"
   - Name: `GitHub Auto-Deploy`
   - Branch: `master`
   - Copy the URL
   - Add to GitHub (see manual webhook guide)

---

## Step 4: Verify Webhook in GitHub

Regardless of Vercel settings, check GitHub:

1. **Go to:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Look for Vercel webhook:**
   - Should see a webhook with Vercel icon/name
   - Click on it

3. **Check "Recent Deliveries":**
   - Should show recent push events
   - Status should be "200 OK"

4. **If webhook is missing:**
   - Use manual webhook method (see below)

---

## Alternative: Manual Deploy Hook (Always Works)

If Git integration settings are confusing, use deploy hooks:

### Part 1: Create Deploy Hook

1. **Go to:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Click "Create Hook"**

3. **Fill in:**
   - Name: `GitHub Auto-Deploy`
   - Branch: `master`

4. **Copy the webhook URL**

### Part 2: Add to GitHub

1. **Go to:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Click "Add webhook"**

3. **Paste URL, select "Just the push event"**

4. **Click "Add webhook"**

**This method always works regardless of Vercel UI changes!**

---

## What to Look For in Vercel Settings

The actual interface might show:

- ✅ "Production Branch" dropdown
- ✅ "Automatic Deployments" toggle/checkbox
- ✅ "Deploy Hooks" section
- ✅ "Connected Repository" status
- ✅ "Disconnect" button

**If you can't find these, use the manual deploy hook method instead.**

---

## Quick Test

After setting up (either method):

```bash
git commit --allow-empty -m "Test deployment"
git push origin master
```

Check Vercel dashboard - should see deployment starting within seconds!
