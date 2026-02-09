# How to Apply Twilio Failover Migration - Step by Step

## ✅ Safe Manual Application (No Data Loss)

### Step 1: Open Neon SQL Editor
1. Go to: https://console.neon.tech
2. Select your project: `neondb`
3. Make sure you're on the **production** branch (not the backup)
4. Click **"SQL Editor"** in the left sidebar

### Step 2: Copy the SQL
1. Open the file: `APPLY_TWILIO_FAILOVER_MIGRATION.sql`
2. Select **ALL** the contents (Cmd+A / Ctrl+A)
3. Copy it (Cmd+C / Ctrl+C)

### Step 3: Paste and Run
1. Go back to Neon SQL Editor
2. Paste the SQL into the editor (Cmd+V / Ctrl+V)
3. Click **"Run"** button
4. Wait for completion

### Step 4: Verify Success
You should see:
- ✅ "Success" message
- ✅ Notice messages about tables created
- ✅ No errors

### Step 5: Verify Tables Exist
Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'TwilioAccount',
    'TwilioFailoverEvent', 
    'TwilioHealthCheck',
    'TwilioBackupPhoneNumber'
  )
ORDER BY table_name;
```

You should see all 4 tables listed.

### Step 6: Verify VoiceAgent Columns
Run this query:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'VoiceAgent' 
  AND column_name IN (
    'twilioAccountId',
    'backupPhoneNumber',
    'lastHealthCheck',
    'healthStatus'
  )
ORDER BY column_name;
```

You should see all 4 columns listed.

### Step 7: Mark Migration as Applied (Optional)
After verifying, run this in your terminal:

```bash
npx prisma migrate resolve --applied 20260209120000_add_twilio_failover
```

Then check status:
```bash
npx prisma migrate status
```

## What This Migration Does

✅ **Creates 4 new tables**:
- `TwilioAccount` - Stores primary and backup Twilio accounts
- `TwilioFailoverEvent` - Tracks failover events
- `TwilioHealthCheck` - Stores health check history
- `TwilioBackupPhoneNumber` - Manages backup phone numbers

✅ **Adds 4 new columns to VoiceAgent**:
- `twilioAccountId` - Links agent to Twilio account
- `backupPhoneNumber` - Stores backup number if failover occurred
- `lastHealthCheck` - Last health check timestamp
- `healthStatus` - Current health status

✅ **Creates indexes** for performance

✅ **Adds foreign keys** for data integrity

## Safety Features

- Uses `IF NOT EXISTS` - Won't fail if columns already exist
- Uses `IF NOT EXISTS` for indexes - Safe to re-run
- Checks constraints before adding - Won't duplicate
- Only ADDS - Never deletes or modifies existing data

## If Something Goes Wrong

1. **Switch to backup branch** in Neon Console
2. **Or restore from point-in-time** recovery
3. **Or contact support** with error message

---

**Ready to apply?** Copy the SQL from `APPLY_TWILIO_FAILOVER_MIGRATION.sql` and run it in Neon SQL Editor!
