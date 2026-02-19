# Phase 0: Backup & Safety Checklist

**Date:** Before starting reliability improvements  
**Branch:** `reliability-improvements-phase-0`  
**Tag:** `pre-reliability-improvements`

## Git Backup

- [x] Create branch: `reliability-improvements-phase-0`
- [x] Commit all current changes
- [x] Create tag: `pre-reliability-improvements`

**Rollback:** `git checkout pre-reliability-improvements` or `git reset --hard pre-reliability-improvements`

## Database Backup

Run before any schema changes or risky migrations:

```bash
npm run backup
```

Backup is saved to `backups/pre-migration-<date>-<time>/`

**Restore:** `npm run restore` (see `scripts/backup/import-database.mjs` for details)

## Environment Backup

```bash
cp .env .env.backup
cp .env.local .env.local.backup
```

## Verification

After backup, verify:
- [ ] `git tag pre-reliability-improvements` exists
- [ ] `backups/` contains recent backup (if DB backup was run)
- [ ] `.env.backup` exists (optional)
