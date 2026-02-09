# How to Run the Migration

## Where to Run

Run the command in your **local terminal** (Terminal app on Mac), in the project root directory:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx prisma migrate deploy
```

## Step-by-Step Instructions

### 1. Open Terminal
- Press `Cmd + Space` to open Spotlight
- Type "Terminal" and press Enter
- Or find Terminal in Applications > Utilities

### 2. Navigate to Project Directory
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
```

### 3. Run Migration
```bash
npx prisma migrate deploy
```

## What Will Happen

1. Prisma connects to your Neon database (using DATABASE_URL from .env)
2. Checks which migrations are already applied
3. Applies only new migrations (including the CRM voice agent one)
4. Since the column already exists, the migration will skip adding it (safe)
5. Marks the migration as applied in Prisma's tracking table

## Expected Output

You should see something like:
```
✅ Applied migration `20260208120000_crm_voice_agent`
✅ All migrations have been applied
```

## If You Get Network Errors

If you get connection errors, make sure:
1. Your `.env` file has the correct `DATABASE_URL`
2. Your internet connection is working
3. Neon database is accessible

## Alternative: Run SQL Directly in Neon

If the command still fails, you can mark it as applied directly in Neon SQL Editor:

1. Go to: https://console.neon.tech
2. Open SQL Editor
3. Run this SQL (using the shortened migration name):

```sql
-- Check if migration is already recorded
SELECT * FROM "_prisma_migrations" 
WHERE migration_name = '20260208120000_crm_voice_agent';

-- If not found, insert it (with shortened name that fits 36 chars)
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260208120000_crm_voice_agent',  -- 30 chars, fits in 36
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
```

Then verify:
```bash
npx prisma migrate status
```
