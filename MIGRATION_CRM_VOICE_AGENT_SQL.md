# CRM Voice Agent Migration - SQL

## Quick Migration

Run this SQL command directly against your Neon database:

```sql
ALTER TABLE "User" ADD COLUMN "crmVoiceAgentId" TEXT;
```

## How to Run

### Option 1: Neon Dashboard (Recommended)
1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project
3. Click on "SQL Editor"
4. Paste the SQL command above
5. Click "Run"

### Option 2: Using psql (Command Line)
```bash
psql "your-database-connection-string" -c "ALTER TABLE \"User\" ADD COLUMN \"crmVoiceAgentId\" TEXT;"
```

### Option 3: Using Prisma Migrate (Local Terminal)
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx prisma migrate deploy
```

This will apply the migration file: `prisma/migrations/20260208000000_add_crm_voice_agent_id/migration.sql`

## Verification

After running the migration, verify it worked:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'crmVoiceAgentId';
```

You should see:
```
crmVoiceAgentId | text
```

## What This Does

- Adds a new column `crmVoiceAgentId` to the `User` table
- Stores the ElevenLabs agent ID for each user's CRM voice assistant
- Nullable (users without voice agents will have NULL)
- No data loss - only adds a new column

## Safety

✅ **100% Safe**
- Only adds a new column
- No existing data affected
- No breaking changes
- Can be rolled back if needed
