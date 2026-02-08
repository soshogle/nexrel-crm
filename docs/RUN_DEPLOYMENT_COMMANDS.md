# Run These Commands in Your Terminal

Since I can't run interactive commands that require browser authentication, **please run these in your own terminal:**

## Quick Deploy Commands

Open your terminal (Terminal.app or iTerm) and run:

```bash
# Step 1: Install Vercel CLI globally
npm install -g vercel

# Step 2: Navigate to project
cd /Users/cyclerun/Desktop/nexrel-crm

# Step 3: Login (will open browser)
vercel login

# Step 4: Link project (first time only - answer prompts)
vercel link
# When asked:
# - Set up and deploy? → Y
# - Which scope? → Press Enter (your account)
# - Link to existing project? → Y
# - Project name? → nexrel-crm

# Step 5: Deploy to production
vercel --prod
```

## Or Use the Script

I've created a script that does this automatically:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
./scripts/deploy-with-vercel.sh
```

## What to Expect

1. **`vercel login`** will:
   - Open your browser
   - Ask you to authorize
   - Complete automatically

2. **`vercel link`** will:
   - Ask a few questions (answer Y/Enter)
   - Link to your existing project

3. **`vercel --prod`** will:
   - Build your project
   - Show progress in terminal
   - Deploy to production
   - Give you a URL

**Total time: 2-5 minutes**

---

## Why I Can't Run These

These commands require:
- Browser authentication (interactive)
- User confirmation prompts
- Network access to npm registry

You need to run them in your own terminal where you have full control.

---

## After Deployment

Once deployed:
1. ✅ Your code will be live
2. ✅ Check the URL provided
3. ✅ Verify your changes are there
4. ✅ Then we can fix the webhook for future auto-deploys

**Please run these commands in your terminal now!**
