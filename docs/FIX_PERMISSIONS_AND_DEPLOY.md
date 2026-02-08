# Fix Permission Error & Deploy

## Problem: Permission Denied

You're getting `EACCES: permission denied` when trying to install globally.

## ✅ Solution: Use npx (No Installation Needed!)

You don't need to install Vercel CLI globally. Use `npx` instead:

### Step 1: Login (No Install Needed)

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx vercel login
```

This will:
- Download Vercel CLI temporarily
- Open browser for authentication
- Complete login

### Step 2: Link Project

```bash
npx vercel link
```

Answer the prompts:
- Set up and deploy? → **Y**
- Which scope? → Press **Enter** (your account)
- Link to existing project? → **Y**
- Project name? → **nexrel-crm**

### Step 3: Deploy

```bash
npx vercel --prod
```

This will deploy your code to production!

---

## Alternative: Fix npm Permissions (If You Want Global Install)

If you prefer to install globally:

### Option A: Use sudo (Quick Fix)

```bash
sudo npm install -g vercel
```

Then run:
```bash
vercel login
vercel link
vercel --prod
```

### Option B: Fix npm Permissions Properly

```bash
# Create directory for global packages
mkdir ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH (add this to ~/.zshrc or ~/.bash_profile)
export PATH=~/.npm-global/bin:$PATH

# Reload shell
source ~/.zshrc  # or source ~/.bash_profile

# Now install without sudo
npm install -g vercel
```

---

## Recommended: Use npx (Easiest)

**Just use `npx vercel` - no installation needed!**

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx vercel login
npx vercel link
npx vercel --prod
```

**This is the simplest solution and avoids all permission issues!**
