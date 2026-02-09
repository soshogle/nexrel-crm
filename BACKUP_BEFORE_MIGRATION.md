# ⚠️ CRITICAL: Backup Database Before Migration

## The Warning You're Seeing

Prisma detected that some migration files were modified after they were applied. This creates "drift" between your migration history and the actual database state.

**DO NOT RUN `prisma migrate reset`** - This will DELETE ALL YOUR DATA!

## Safe Migration Approach

### Option 1: Use Neon's Built-in Backup (Recommended)

1. **Go to Neon Console**: https://console.neon.tech
2. **Select your project**: `neondb`
3. **Go to Branches**
4. **Click "Create Branch"** → Name it `backup-before-twilio-failover`
5. This creates an instant snapshot/backup

### Option 2: Use Neon's Point-in-Time Recovery

Neon automatically keeps point-in-time backups. You can restore from any point if needed.

### Option 3: Manual SQL Backup (if you have pg_dump)

```bash
# Make script executable
chmod +x scripts/backup-database.sh

# Run backup
./scripts/backup-database.sh
```

## Safe Migration Commands

### For Production (Neon Database):

**DO NOT use `prisma migrate dev`** - This is for development only and can reset the database.

Instead, use:

```bash
# 1. Generate the migration SQL (without applying)
npx prisma migrate dev --create-only --name add_twilio_failover

# 2. Review the generated SQL file
# File: prisma/migrations/20260209120000_add_twilio_failover/migration.sql

# 3. Apply manually in Neon SQL Editor (safest)
# Copy the SQL and run it in Neon Console → SQL Editor

# OR use deploy command (applies pending migrations)
npx prisma migrate deploy
```

### Why This Happened

The migration files were modified (we removed npm warnings, added missing migrations, etc.) after they were already applied to the database. Prisma sees this as "drift" and wants to reset to match.

## Recommended Steps

1. **Create backup** using Neon's branch feature (safest)
2. **Generate migration** without applying:
   ```bash
   npx prisma migrate dev --create-only --name add_twilio_failover
   ```
3. **Review the SQL** in the generated migration file
4. **Apply manually** in Neon SQL Editor OR use `prisma migrate deploy`

## What `prisma migrate deploy` Does

- ✅ Applies only NEW migrations that haven't been applied
- ✅ Does NOT reset the database
- ✅ Safe for production
- ✅ Won't delete data

## What `prisma migrate reset` Does

- ❌ DELETES ALL DATA
- ❌ Drops all tables
- ❌ Recreates from scratch
- ❌ Only for development/testing

## Next Steps

1. Create backup in Neon Console (branch)
2. Run: `npx prisma migrate dev --create-only --name add_twilio_failover`
3. Review the generated SQL
4. Apply via Neon SQL Editor OR run `npx prisma migrate deploy`
