# Fix Migration Name Length Issue

## Problem
The `migration_name` column in `_prisma_migrations` table is `character varying(36)`, but our migration name is 42 characters:
- Migration name: `20260208120000_add_crm_voice_agent_id` (42 chars)
- Column limit: 36 characters

## Solution Options

### Option 1: Use Prisma's Resolve Command (Recommended)
Run this locally (it will handle the migration name correctly):

```bash
npx prisma migrate resolve --applied 20260208120000_add_crm_voice_agent_id
```

### Option 2: Use Shortened Migration Name in SQL
If you need to insert manually, use a shortened name that fits 36 characters:

```sql
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260208120000_add_crm_voice',  -- Shortened to 30 chars (fits in 36)
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
```

### Option 3: Check Actual Column Size
First, check what the actual column size is:

```sql
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = '_prisma_migrations' 
AND column_name = 'migration_name';
```

If it's actually larger than 36, the error might be from a different column.

### Option 4: Rename Migration Directory (Best Long-term Fix)
Rename the migration to a shorter name:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
mv prisma/migrations/20260208120000_add_crm_voice_agent_id prisma/migrations/20260208120000_crm_voice_agent
```

Then update the migration.sql file is still there, and run:
```bash
npx prisma migrate deploy
```

## Recommended Action

**Try Option 1 first** - Prisma's resolve command should handle this correctly:

```bash
npx prisma migrate resolve --applied 20260208120000_add_crm_voice_agent_id
```

If that doesn't work due to network issues, use **Option 4** to rename the migration to a shorter name.
