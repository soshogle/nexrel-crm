# npx vercel Commands - Step by Step

## Current Step: Installing Vercel CLI

You're being asked: **"Ok to proceed? (y)"**

### ✅ Answer: Type `y` and press Enter

This will download Vercel CLI temporarily (no global install needed).

---

## Complete Command Sequence

After typing `y` and pressing Enter, follow these steps:

### Step 1: Login (You're Here)
```bash
npx vercel login
```
- Type `y` when asked
- Browser will open for authentication
- Authorize Vercel
- Return to terminal when done

### Step 2: Link Project
```bash
npx vercel link
```

**Answer these prompts:**
- **Set up and deploy "nexrel-crm"?** → Type `Y` and press Enter
- **Which scope?** → Press Enter (selects your account)
- **Link to existing project?** → Type `Y` and press Enter
- **What's the name of your project?** → Type `nexrel-crm` and press Enter

### Step 3: Deploy
```bash
npx vercel --prod
```

This will:
- Build your project
- Show progress
- Deploy to production
- Give you a deployment URL

---

## What to Expect

After `npx vercel login`:
1. Browser opens automatically
2. Click "Authorize" or "Continue"
3. Terminal shows "Success! Logged in as [your-email]"

Then proceed to Step 2 (link) and Step 3 (deploy).

---

**Right now: Just type `y` and press Enter!**
