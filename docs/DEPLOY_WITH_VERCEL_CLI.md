# Deploy with Vercel CLI - Step by Step

## Why Use CLI?

- ✅ More reliable than dashboard
- ✅ Shows real-time build progress
- ✅ Works even if webhook is broken
- ✅ Gives immediate feedback

---

## Step-by-Step Instructions

### Step 1: Install Vercel CLI

Open your terminal and run:

```bash
npm install -g vercel
```

Wait for installation to complete.

### Step 2: Login to Vercel

```bash
vercel login
```

This will:
- Open your browser
- Ask you to authorize Vercel CLI
- Complete authentication automatically

### Step 3: Navigate to Project

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
```

### Step 4: Link Project (First Time Only)

If this is your first time using CLI with this project:

```bash
vercel link
```

You'll be asked:
- **Set up and deploy?** → Type `Y` and press Enter
- **Which scope?** → Select your account (usually just press Enter)
- **Link to existing project?** → Type `Y` and press Enter
- **What's the name of your project?** → Type `nexrel-crm` and press Enter

### Step 5: Deploy to Production

```bash
vercel --prod
```

This will:
- Build your project
- Show build progress in terminal
- Deploy to production
- Give you a deployment URL

**Wait for it to complete** - takes 2-5 minutes.

---

## What You'll See

The CLI will show:
```
Vercel CLI 32.x.x
? Set up and deploy "nexrel-crm"? [Y/n] y
? Which scope? Your Account
? Link to existing project? [y/N] y
? What's the name of your project? nexrel-crm
🔗  Linked to soshogle/nexrel-crm (created .vercel)
🔍  Inspect: https://vercel.com/...
✅  Production: https://nexrel-crm.vercel.app [2s]
```

---

## Troubleshooting

### "Command not found: vercel"

Install it:
```bash
npm install -g vercel
```

### "Not logged in"

Run:
```bash
vercel login
```

### "Project not found"

Run:
```bash
vercel link
```

Then select your project.

---

## After Successful Deployment

Once deployed:
1. ✅ Your code will be live
2. ✅ Check the deployment URL
3. ✅ Verify your changes are there

Then we can fix the webhook for future auto-deploys.

---

## Quick Command Summary

```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Go to project
cd /Users/cyclerun/Desktop/nexrel-crm

# Link project (first time)
vercel link

# Deploy to production
vercel --prod
```

**This method is 100% reliable and will deploy your code immediately!**
