# Neon API Setup Guide

This guide will help you set up Neon API access so we can run migrations programmatically.

## Option 1: Direct PostgreSQL Connection (Recommended - No API Key Needed)

This is the simplest approach - we'll use a direct PostgreSQL connection that bypasses Prisma's SSL issues.

### Step 1: Install Required Package

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npm install pg @types/pg
```

### Step 2: Run the Migration Script

```bash
npx tsx scripts/run-migration-neon-api.ts
```

**That's it!** The script will:
- Use your existing `DATABASE_URL` from `.env.local`
- Convert pooler connection to direct connection automatically
- Execute the migration SQL
- Handle errors gracefully

---

## Option 2: Using Neon Management API (Advanced)

If you want to use Neon's official API:

### Step 1: Get Your Neon API Key

1. Go to **https://console.neon.tech**
2. Click your profile icon (top right)
3. Click **"Settings"**
4. Click **"API"** in the left sidebar
5. Click **"Create API Key"**
6. Give it a name (e.g., "Migration Script")
7. Copy the API key (you'll only see it once!)

### Step 2: Get Your Project ID

**Method A: From Dashboard URL**
- When you're in your Neon project dashboard, the URL looks like:
  `https://console.neon.tech/app/projects/[PROJECT_ID]/...`
- Copy the `PROJECT_ID` from the URL

**Method B: Via API**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.neon.tech/v2/projects
```

### Step 3: Add to Environment Variables

Add these to your `.env.local` file:

```bash
# Neon API Configuration
NEON_API_KEY=your_api_key_here
NEON_PROJECT_ID=your_project_id_here
```

### Step 4: Run the Migration Script

```bash
npx tsx scripts/run-migration-neon-api.ts
```

---

## Option 3: Create a Next.js API Route (For Web UI)

If you want to run migrations from your web app:

### Step 1: Create API Route

Create `app/api/admin/run-neon-migration/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (add your auth check here)
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { DATABASE_URL } = process.env;
    if (!DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Read migration SQL
    const migrationSql = readFileSync(
      join(process.cwd(), 'NEON_MIGRATION_READY.sql'),
      'utf-8'
    );

    // Connect and execute
    const client = new Client({
      connectionString: DATABASE_URL.replace('-pooler.', '.'),
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    
    // Execute SQL
    await client.query(migrationSql);
    await client.end();

    return NextResponse.json({ 
      success: true,
      message: 'Migration completed successfully' 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 2: Install pg Package

```bash
npm install pg @types/pg
```

### Step 3: Call from Frontend

```typescript
const response = await fetch('/api/admin/run-neon-migration', {
  method: 'POST',
});
const result = await response.json();
```

---

## Quick Start (Recommended)

**Just run this:**

```bash
# Install pg library
npm install pg @types/pg

# Run migration
npx tsx scripts/run-migration-neon-api.ts
```

The script will automatically:
- ✅ Use your existing `DATABASE_URL`
- ✅ Convert pooler to direct connection
- ✅ Execute all migration SQL
- ✅ Handle errors gracefully
- ✅ Show progress and summary

---

## Troubleshooting

### Error: "Cannot find module 'pg'"

```bash
npm install pg @types/pg
```

### Error: "Connection refused" or SSL errors

The script automatically:
- Converts pooler URLs to direct connections
- Uses `rejectUnauthorized: false` for SSL

If it still fails, check your `DATABASE_URL` in `.env.local`.

### Error: "NEON_API_KEY not found"

This is only needed for Option 2. For Option 1 (direct connection), you don't need an API key.

---

## Security Notes

- **Never commit API keys** to git
- **Add `.env.local` to `.gitignore`** (should already be there)
- **Use environment variables** for all sensitive data
- **Restrict API key permissions** in Neon dashboard if possible

---

## Next Steps After Migration

Once the migration runs successfully:

```bash
# Generate Prisma Client
npx prisma generate

# Verify migration status
npx prisma migrate status

# Restart dev server
npm run dev
```

---

**Ready?** Run: `npx tsx scripts/run-migration-neon-api.ts` 🚀
