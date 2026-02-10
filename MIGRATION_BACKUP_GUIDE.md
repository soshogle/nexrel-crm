# Database Backup Before Migration Guide

## 🛡️ Automatic Backup System

This project includes an automatic backup system that runs before any database migration to ensure your data is safe.

## Quick Start

### Safe Migration Commands (with automatic backup)

Instead of using `npx prisma migrate` directly, use these commands:

```bash
# Development migration (creates new migration)
# Note: Use -- to pass arguments through npm
npm run migrate:dev -- --name add_new_feature

# Production deployment (applies pending migrations)
npm run migrate:deploy

# Reset database (⚠️ deletes all data - backup created first)
npm run migrate:reset

# Manual backup only
npm run backup
```

## How It Works

The `migrate-with-backup.ts` script automatically:

1. **Creates backup directory** with timestamp: `backups/pre-migration-YYYY-MM-DD-HHmmss/`
2. **Attempts multiple backup methods**:
   - `pg_dump` SQL backup (if available)
   - Prisma schema backup
   - Prisma JSON export (if script exists)
   - Neon branch recommendation (if using Neon)
3. **Creates backup manifest** with details
4. **Runs the migration** only after backup is attempted

## Backup Methods

### Method 1: pg_dump (Automatic)
If `pg_dump` is installed, a full SQL backup is created automatically.

**Install pg_dump:**
- macOS: `brew install postgresql`
- Ubuntu/Debian: `sudo apt-get install postgresql-client`
- Windows: Install PostgreSQL from https://www.postgresql.org/download/

### Method 2: Neon Branch Backup (Recommended for Neon)
If using Neon database, the script will remind you to create a branch backup:

1. Go to https://console.neon.tech
2. Select your project
3. Click "Branches" → "Create Branch"
4. Name it: `backup-pre-migration-YYYY-MM-DD-HHmmss`

**Why Neon branches are great:**
- Instant snapshot
- No downtime
- Can switch back anytime
- Independent copy

### Method 3: Prisma Schema Backup
Your current `schema.prisma` is always backed up before migration.

### Method 4: JSON Export
If the export script exists, a JSON backup of all data is created.

## Backup Location

All backups are stored in:
```
backups/
  └── pre-migration-YYYY-MM-DD-HHmmss/
      ├── database.sql (pg_dump backup)
      ├── schema.prisma.backup
      ├── BACKUP_MANIFEST.json
      └── (other backup files)
```

## Restoring from Backup

### From pg_dump backup:
```bash
psql $DATABASE_URL < backups/pre-migration-YYYY-MM-DD-HHmmss/database.sql
```

### From Neon branch:
1. Go to Neon Console → Branches
2. Select your backup branch
3. Copy the connection string
4. Update `DATABASE_URL` to use the backup branch

### From Prisma schema:
```bash
cp backups/pre-migration-YYYY-MM-DD-HHmmss/schema.prisma.backup prisma/schema.prisma
npx prisma db push
```

## Manual Backup

If you want to create a backup without running a migration:

```bash
npm run backup
```

Or use the script directly:
```bash
tsx scripts/backup-database.ts
```

## Migration Commands Reference

### Development (creates new migration)
```bash
# With automatic backup
npm run migrate:dev --name add_new_feature

# Equivalent to:
npx prisma migrate dev --name add_new_feature
# (but with backup first)
```

### Production (applies pending migrations)
```bash
# With automatic backup
npm run migrate:deploy

# Equivalent to:
npx prisma migrate deploy
# (but with backup first)
```

### Reset Database (⚠️ DANGEROUS)
```bash
# Creates backup first, then resets
npm run migrate:reset

# Equivalent to:
npx prisma migrate reset
# (but with backup first)
```

## Best Practices

1. **Always use the safe migration commands** (`npm run migrate:*`)
2. **Check backup success** before proceeding with migration
3. **For production**: Create Neon branch backup manually for extra safety
4. **Keep backups** for at least 30 days
5. **Test restores** periodically to ensure backups work

## Troubleshooting

### "pg_dump not found"
Install PostgreSQL client tools (see Method 1 above). The script will continue with other backup methods.

### "DATABASE_URL not set"
Make sure your `.env` file has `DATABASE_URL` set. The script will exit if it's missing.

### Backup fails but migration succeeds
The script will warn you but continue. Consider creating a manual backup before proceeding.

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `NEON_API_KEY` - For Neon API backups (future feature)

## See Also

- `scripts/migrate-with-backup.ts` - Main backup script
- `scripts/backup-database.ts` - Standalone backup script
- `scripts/backup-and-migrate.ts` - Alternative backup script
