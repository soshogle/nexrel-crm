# Safe Migration Guide - Twilio Failover

## ⚠️ IMPORTANT: Do NOT Reset Database

The warning about "data loss" is because Prisma detected migration file changes. **DO NOT run `prisma migrate reset`** - it will delete all your data!

## Safe Migration Steps

### Step 1: Create Backup (REQUIRED)

**Option A: Neon Branch Backup (Easiest & Safest)**
1. Go to https://console.neon.tech
2. Select project: `neondb`
3. Click "Branches" → "Create Branch"
4. Name: `backup-before-twilio-failover-$(date +%Y%m%d)`
5. This creates an instant snapshot

**Option B: Neon Point-in-Time Recovery**
- Neon keeps automatic backups
- You can restore from any point if needed

### Step 2: Generate Migration (Don't Apply Yet)

```bash
npx prisma migrate dev --create-only --name add_twilio_failover
```

This will:
- ✅ Create the migration SQL file
- ✅ NOT apply it to the database
- ✅ NOT delete any data
- ✅ Safe to run

### Step 3: Review the Migration SQL

Check the generated file:
```
prisma/migrations/20260209120000_add_twilio_failover/migration.sql
```

Verify it only:
- Creates new tables (TwilioAccount, TwilioFailoverEvent, etc.)
- Adds new columns to VoiceAgent
- Creates indexes
- Does NOT drop or modify existing data

### Step 4: Apply Migration Safely

**Option A: Manual Application (Safest)**
1. Copy the SQL from the migration file
2. Go to Neon Console → SQL Editor
3. Paste and run the SQL
4. Verify it completes successfully

**Option B: Use Deploy Command**
```bash
npx prisma migrate deploy
```

This command:
- ✅ Applies only NEW migrations
- ✅ Does NOT reset database
- ✅ Safe for production
- ✅ Won't delete data

## Why Prisma is Warning About Drift

Prisma detected that migration files were modified after being applied:
- We removed npm warnings from baseline migration
- We created placeholder migrations for ones that were applied manually
- This creates "drift" between migration files and database state

**This is OK** - we just need to apply the NEW migration without resetting.

## Commands Reference

### ✅ SAFE Commands:
- `npx prisma migrate dev --create-only` - Generate migration, don't apply
- `npx prisma migrate deploy` - Apply pending migrations (production-safe)
- `npx prisma migrate status` - Check migration status

### ❌ DANGEROUS Commands:
- `npx prisma migrate reset` - **DELETES ALL DATA** - DO NOT USE
- `npx prisma migrate dev` - Can reset in development - Use with caution

## Verification After Migration

After applying, verify:
1. New tables exist: `TwilioAccount`, `TwilioFailoverEvent`, etc.
2. VoiceAgent table has new columns: `twilioAccountId`, `backupPhoneNumber`, etc.
3. All existing data is intact
4. No errors in application logs

## If Something Goes Wrong

1. **Restore from Neon Branch**: Switch to backup branch
2. **Point-in-Time Recovery**: Restore from Neon backup
3. **Manual Rollback**: Drop new tables if needed

## Summary

1. ✅ Create backup (Neon branch)
2. ✅ Generate migration: `npx prisma migrate dev --create-only --name add_twilio_failover`
3. ✅ Review SQL file
4. ✅ Apply via Neon SQL Editor OR `npx prisma migrate deploy`
5. ✅ Verify data intact

**DO NOT run `prisma migrate reset` - it will delete everything!**
