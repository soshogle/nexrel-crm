# Fix Migration Issue

## Problem
Prisma is having trouble finding the migration file, likely due to multiple migrations with the same timestamp.

## Solution

### Option 1: Run SQL Directly (Fastest)

Since the migration file exists, you can run it directly in Neon:

1. Go to Neon Dashboard: https://console.neon.tech
2. Open SQL Editor
3. Run this SQL:

```sql
ALTER TABLE "User" ADD COLUMN "crmVoiceAgentId" TEXT;
```

4. Then mark the migration as applied:

```sql
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  '20260208000000_add_crm_voice_agent_id',
  'a1b2c3d4e5f6', -- This will be auto-generated, but we can use a placeholder
  NOW(),
  '20260208000000_add_crm_voice_agent_id',
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
```

### Option 2: Rename Migration Directory (Recommended)

Rename the migration to have a unique timestamp:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
mv prisma/migrations/20260208000000_add_crm_voice_agent_id prisma/migrations/20260208120000_add_crm_voice_agent_id
```

Then run:
```bash
npx prisma migrate deploy
```

### Option 3: Check Migration Status First

Check which migrations are already applied:

```bash
npx prisma migrate status
```

If the migration shows as pending, try:
```bash
npx prisma migrate resolve --applied 20260208000000_add_crm_voice_agent_id
```

Then continue with:
```bash
npx prisma migrate deploy
```

## Quick Fix (Recommended)

Since you're running this locally and the migration is simple, just run the SQL directly in Neon dashboard - it's the fastest way!
