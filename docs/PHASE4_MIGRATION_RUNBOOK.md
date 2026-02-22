# Phase 4: Migration Runbook

**Goal:** Safely migrate from single DB to Meta + 14 Industry DBs.

---

## Pre-Migration Checklist

- [ ] **Backup:** Run `npx tsx scripts/backup-database.ts` or create Neon branch
- [ ] **15 DBs created** in Neon (1 Meta + 14 Industry) – see `docs/NEON_15_DB_SETUP.md`
- [ ] **Migrations applied:** `npx tsx scripts/migrate-all-dbs.ts` (runs deploy on each DATABASE_URL_*)
- [ ] **Env vars set** in `.env` / Vercel: `DATABASE_URL_META`, `DATABASE_URL_REAL_ESTATE`, etc.
- [ ] **Staging tested:** DAL + auth routing verified with test env vars

---

## Migration Order

### Step 1: Pre-flight check

```bash
tsx scripts/pre-migration-check.ts
```

Validates DATABASE_URL, DATABASE_URL_META, and industry URLs. Exits with clear errors if prerequisites fail.

### Step 2: Backup (if not done)

```bash
tsx scripts/backup-database.ts
```

### Step 3: Migrate Meta DB

```bash
tsx scripts/migrate-to-meta-db.ts --dry-run   # Preview first
tsx scripts/migrate-to-meta-db.ts            # Execute
```

### Step 4: Migrate Industry DBs

```bash
tsx scripts/migrate-to-industry-dbs.ts --dry-run   # Preview
tsx scripts/migrate-to-industry-dbs.ts             # All industries
# Or single industry: tsx scripts/migrate-to-industry-dbs.ts --industry=REAL_ESTATE
```

### Step 5: Validate

```bash
tsx scripts/validate-migration.ts
```

### Step 6: Cutover

1. Deploy code (auth uses getMetaDb, DAL routes by industry)
2. Set all `DATABASE_URL_*` in production (Vercel env)
3. Point `DATABASE_URL` to Meta DB for any legacy prisma usage, or keep as fallback
4. Monitor: errors, latency, connection usage
5. Rollback: revert env to single DB if critical issues

---

## Rollback Plan

If migration fails or issues arise:

1. Revert `DATABASE_URL` (and `DATABASE_URL_META`, `DATABASE_URL_*`) to original single DB
2. Redeploy previous version if auth/DAL changes cause issues
3. Restore from backup if data was corrupted (unlikely with upsert approach)

---

## Connection Pooling (Neon)

Use **pooled** connection strings from Neon dashboard for serverless (Vercel). Append `?pgbouncer=true` or use the pooler endpoint. See `docs/PHASE5_SETUP.md`.
