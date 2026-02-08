# How to Create a Neon API Key

Follow these steps to create an API key in Neon that can be used for programmatic access.

## Step-by-Step Guide

### Step 1: Log in to Neon Console

1. Go to **https://console.neon.tech**
2. Log in with your account credentials

### Step 2: Navigate to API Settings

1. Click your **profile icon** (top right corner)
2. Click **"Settings"** from the dropdown menu
3. In the left sidebar, click **"API"**

### Step 3: Create API Key

1. You'll see a section called **"API Keys"**
2. Click the **"Create API Key"** button (or **"New API Key"**)
3. A dialog will appear asking for:
   - **Name**: Give it a descriptive name (e.g., "Migration Script", "Development API", "Production API")
   - **Description** (optional): Add notes about what this key is for
4. Click **"Create"** or **"Generate"**

### Step 4: Copy Your API Key

⚠️ **IMPORTANT**: You'll only see the API key **once**! Copy it immediately.

The API key will look something like:
```
neon_api_key_abc123xyz789...
```

**Copy it now** - you won't be able to see it again!

### Step 5: Get Your Project ID

You'll also need your **Project ID** to use the API:

**Method A: From Dashboard URL**
1. Go to your Neon project dashboard
2. Look at the URL - it will be something like:
   ```
   https://console.neon.tech/app/projects/abc123def456/...
   ```
3. The part after `/projects/` is your Project ID: `abc123def456`

**Method B: Via API (if you have the key)**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.neon.tech/v2/projects
```

### Step 6: Add to Your Project

Add these to your `.env.local` file:

```bash
# Neon API Configuration (Optional - only needed for Management API)
NEON_API_KEY=neon_api_key_your_actual_key_here
NEON_PROJECT_ID=your_project_id_here
```

**Note**: The API key is **optional** - the migration script can work with just `DATABASE_URL`!

---

## Visual Guide

```
Neon Console
├── Profile Icon (top right)
│   └── Settings
│       └── API (left sidebar)
│           └── Create API Key
│               ├── Name: "Migration Script"
│               ├── Description: (optional)
│               └── Create → Copy Key Immediately!
```

---

## Security Best Practices

1. **Never commit API keys to git**
   - ✅ Add `.env.local` to `.gitignore` (should already be there)
   - ❌ Never commit `.env.local` or `.env` files

2. **Use different keys for different environments**
   - Development key for local development
   - Production key for production (store in Vercel environment variables)

3. **Rotate keys regularly**
   - Delete old keys when creating new ones
   - Update your `.env.local` with the new key

4. **Limit key permissions** (if Neon supports it)
   - Only grant permissions needed for your use case
   - Use read-only keys when possible

---

## Do You Actually Need an API Key?

**For running migrations: NO!** 

The migration script can work with just your `DATABASE_URL` from `.env.local`. The API key is only needed if you want to:
- Use Neon's Management API to manage projects/branches
- Automate project creation/deletion
- Use advanced Neon features programmatically

**For simple SQL execution, just use:**
```bash
npx tsx scripts/run-migration-neon-api.ts
```

It will automatically use your `DATABASE_URL` and connect directly to PostgreSQL!

---

## Troubleshooting

### "API key not found" error

This is fine! The script will automatically fall back to using `DATABASE_URL` for direct PostgreSQL connection.

### "Invalid API key" error

1. Double-check you copied the entire key (they're long!)
2. Make sure there are no extra spaces or line breaks
3. Try creating a new API key

### "Project ID not found"

You can find it in:
- Your Neon dashboard URL
- Or let the script use `DATABASE_URL` instead (no Project ID needed)

---

## Next Steps

Once you have the API key (or if you skip it):

1. **Run the migration:**
   ```bash
   npx tsx scripts/run-migration-neon-api.ts
   ```

2. **The script will:**
   - Use API key if available, OR
   - Use DATABASE_URL for direct connection (simpler!)

3. **After migration:**
   ```bash
   npx prisma generate
   npx prisma migrate status
   ```

---

**Ready?** You can skip the API key and just run the script - it will use your `DATABASE_URL`! 🚀
