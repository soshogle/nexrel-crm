# Simple Webhook Fix - Use Deploy Hooks

Since the Vercel Git settings interface may not show the options described, here's the **simplest method that always works:**

---

## ✅ Method: Create Deploy Hook (5 Minutes)

### Step 1: Create Hook in Vercel

1. **Go to Deploy Hooks:**
   ```
   https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/deploy-hooks
   ```

2. **Click "Create Hook"** (big button, usually top right)

3. **Fill in the form:**
   - **Name:** `GitHub Auto-Deploy` (or any name)
   - **Git Branch:** Type `master` (your production branch)
   - Leave other fields as default

4. **Click "Create Hook"** (or "Save")

5. **IMPORTANT:** Copy the webhook URL that appears
   - It will look like: `https://api.vercel.com/v1/integrations/deploy/prj_.../...`
   - Copy the entire URL

---

### Step 2: Add Webhook to GitHub

1. **Go to GitHub Webhooks:**
   ```
   https://github.com/soshogle/nexrel-crm/settings/hooks
   ```

2. **Click "Add webhook"** (top right, green button)

3. **Fill in the form:**

   **Payload URL:**
   - Paste the URL you copied from Step 1
   
   **Content type:**
   - Select: `application/json`
   
   **Secret:**
   - Leave empty (not required)
   
   **Which events would you like to trigger this webhook?**
   - Select: **"Just the push event"** (radio button)
   
   **Active:**
   - ✅ Make sure this checkbox is checked

4. **Click "Add webhook"** (green button at bottom)

---

### Step 3: Test It Works

1. **Make a test commit:**
   ```bash
   cd /Users/cyclerun/Desktop/nexrel-crm
   git commit --allow-empty -m "Test webhook setup"
   git push origin master
   ```

2. **Check Vercel Dashboard:**
   - Go to: https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/deployments
   - Within 10-30 seconds, you should see a new deployment starting
   - Status will show "Building" then "Ready"

3. **Verify in GitHub:**
   - Go back to: https://github.com/soshogle/nexrel-crm/settings/hooks
   - Click on your webhook
   - Click "Recent Deliveries" tab
   - Should see the push event with "200 OK" status

---

## ✅ Done!

Now every time you push to `master`, Vercel will automatically deploy!

---

## 🐛 Troubleshooting

### Webhook shows "404" in GitHub

- The URL might be wrong
- Go back to Vercel, delete the hook, create a new one
- Copy the new URL and update GitHub webhook

### Webhook shows "200 OK" but no deployment

- Check Vercel deploy hooks page - verify hook is active
- Check branch name matches (`master`)
- Try creating a new hook

### Still not working?

- Make sure you're pushing to `master` branch
- Check Vercel project is active (not paused)
- Verify you have the correct Vercel project selected

---

## 📋 Quick Checklist

- [ ] Created deploy hook in Vercel
- [ ] Copied webhook URL
- [ ] Added webhook to GitHub
- [ ] Selected "Just the push event"
- [ ] Tested with empty commit
- [ ] Verified deployment appears in Vercel
- [ ] Verified webhook shows "200 OK" in GitHub

**This method works regardless of Vercel UI changes!**
