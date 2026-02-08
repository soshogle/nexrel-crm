# Database Migration Instructions

## Backup Status

✅ **Backup completed successfully!**
- **Backup Location:** `backups/pre-migration-2026-02-08-090038/`
- **Schema Backup:** `backups/pre-migration-2026-02-08-090038/schema.prisma.backup`
- **Manifest:** `backups/pre-migration-2026-02-08-090038/BACKUP_MANIFEST.md`

## TLS Certificate Issue

The migration is encountering a TLS certificate error. This is likely due to the `channel_binding=require` parameter in your DATABASE_URL.

## Solution Options

### Option 1: Fix DATABASE_URL (Recommended)

Edit your `.env.local` file and modify the DATABASE_URL:

**Current (problematic):**
```
DATABASE_URL="postgresql://...?sslmode=require&channel_binding=require"
```

**Change to:**
```
DATABASE_URL="postgresql://...?sslmode=require"
```

Remove the `channel_binding=require` parameter.

### Option 2: Use Neon Console

1. Go to your Neon dashboard
2. Navigate to your database
3. Use the SQL Editor to run migrations manually
4. Or use Neon's migration tool if available

### Option 3: Run Migration Manually

If you have direct database access:

```bash
# Export the migration SQL
cat prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql

# Then run it via psql or your database client
psql $DATABASE_URL < prisma/migrations/20260208000000_add_multi_clinic_support/migration.sql
```

## Pending Migrations

The following migrations are pending:

1. `20260208000000_add_multi_clinic_support` - Adds multi-clinic support with clinicId fields

## After Fixing DATABASE_URL

Once you've fixed the DATABASE_URL, run:

```bash
npx prisma migrate deploy
```

This will apply all pending migrations.

## Rollback Instructions

If you need to rollback:

1. **Restore Schema:**
   ```bash
   cp backups/pre-migration-2026-02-08-090038/schema.prisma.backup prisma/schema.prisma
   npx prisma generate
   ```

2. **Restore Database:**
   - Use Neon's point-in-time restore feature in the dashboard
   - Or restore from the SQL dump if pg_dump was successful

## Verification

After migration, verify:

```bash
# Check migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```
