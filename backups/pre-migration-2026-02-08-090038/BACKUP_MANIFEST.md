# Database Backup Manifest

**Date:** 2026-02-08T14:01:51.214Z
**Backup ID:** 2026-02-08-090038
**Git Commit:** 58f8530d203514daecedbf67725d1fd4af37d793
**Git Branch:** master

## Backup Contents

1. **SQL Dump:** `database.sql` (pg_dump output, if available)
2. **Prisma Schema:** `schema.prisma.backup`
3. **JSON Export:** Table-specific JSON files (if export script ran)

## Database Info

- **Host:** from DATABASE_URL
- **Database:** from DATABASE_URL
- **Port:** from DATABASE_URL

## How to Restore

### Restore SQL Dump:
```bash
psql $DATABASE_URL < /Users/cyclerun/Desktop/nexrel-crm/backups/pre-migration-2026-02-08-090038/database.sql
```

### Restore Schema:
```bash
cp /Users/cyclerun/Desktop/nexrel-crm/backups/pre-migration-2026-02-08-090038/schema.prisma.backup prisma/schema.prisma
npx prisma generate
```

### Restore from JSON (if needed):
Use the Prisma import scripts or manually restore JSON files.
