# Fix Migration Mismatch

## Problem
Your local migration history and database migrations are out of sync:

```
The last common migration is: 20260208120000_crm_voice_agent

The migration have not yet been applied:
20260209101551_add_website_builder

The migrations from the database are not found locally in prisma/migrations:
20260208000000_add_crm_voice_agent_id
20260208120000_add_crm_voice_agent_id
```

## Solution

The database has migrations that were applied manually (via Neon SQL Editor) but don't exist in your local `prisma/migrations` folder. You need to mark them as applied locally.

### Option 1: Mark Missing Migrations as Applied (Recommended)

Run these commands locally (they will sync your local state with the database):

```bash
# Mark the first missing migration as applied
npx prisma migrate resolve --applied 20260208000000_add_crm_voice_agent_id

# Mark the second missing migration as applied  
npx prisma migrate resolve --applied 20260208120000_add_crm_voice_agent_id
```

### Option 2: Create Migration Files Locally

If the above doesn't work, create placeholder migration files:

```bash
# Create the migration directories
mkdir -p prisma/migrations/20260208000000_add_crm_voice_agent_id
mkdir -p prisma/migrations/20260208120000_add_crm_voice_agent_id

# Create empty migration.sql files
touch prisma/migrations/20260208000000_add_crm_voice_agent_id/migration.sql
touch prisma/migrations/20260208120000_add_crm_voice_agent_id/migration.sql

# Add minimal SQL to each (they're already applied, so just a comment)
echo "-- Migration already applied in database" > prisma/migrations/20260208000000_add_crm_voice_agent_id/migration.sql
echo "-- Migration already applied in database" > prisma/migrations/20260208120000_add_crm_voice_agent_id/migration.sql
```

### Option 3: Apply Pending Migration

After fixing the mismatch, apply the pending migration:

```bash
npx prisma migrate deploy
```

This will apply `20260209101551_add_website_builder` if it hasn't been applied yet.

## Verify Fix

After running the commands, check status again:

```bash
npx prisma migrate status
```

You should see:
```
✅ All migrations have been applied
```

## Next Steps

1. Fix the migration mismatch (use Option 1)
2. Run `CHECK_VOICE_AGENTS.sql` in Neon SQL Editor to see if voice agents exist
3. If voice agents exist but routing isn't working, check:
   - Twilio webhook URLs
   - Environment variables in Vercel
   - Voice agent status (should be ACTIVE)
