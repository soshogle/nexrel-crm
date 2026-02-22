# Phase 2: Multi-DB Infrastructure Setup

**Goal:** Create DBs and Prisma clients for Meta + all industries. The app continues to use a single DB until Phase 4 cutover.

## Completed (Code)

- [x] `lib/db/industry-db.ts` – `getIndustryDb(industry)` returns Prisma client per industry
- [x] `lib/db/meta-db.ts` – `getMetaDb()` returns Meta DB client
- [x] `lib/dal/db.ts` – `getCrmDb(ctx)` routes to industry DB when `ctx.industry` and `DATABASE_URL_{INDUSTRY}` are set
- [x] `.env.example` – All 15 `DATABASE_URL_*` variables documented

## Manual Steps (Neon Dashboard)

1. **Create 15 Neon projects** (or branches):
   - 1 Meta DB (User, Session, Account, Agency, etc.)
   - 14 Industry DBs (Lead, Deal, Campaign, Website, etc. per industry)

2. **Copy connection strings** to `.env`:
   ```
   DATABASE_URL_META="postgresql://..."
   DATABASE_URL_REAL_ESTATE="postgresql://..."
   DATABASE_URL_MEDICAL="postgresql://..."
   # ... etc for all 14 industries
   ```

3. **Run migrations** on each new DB (Phase 4 – same schema, different data).

## Behavior

| Phase | getCrmDb(ctx) | DATABASE_URL_* |
|-------|---------------|----------------|
| 2 (now) | Returns `prisma` (single DB) | Unset – all use `DATABASE_URL` |
| 4 (cutover) | Returns `getIndustryDb(ctx.industry)` | Set – each industry has own DB |

When `DATABASE_URL_REAL_ESTATE` is set and `ctx.industry === 'REAL_ESTATE'`, `getCrmDb(ctx)` returns the Real Estate DB client. Otherwise it returns the main `prisma` client.

## Industries (14)

ACCOUNTING, RESTAURANT, SPORTS_CLUB, CONSTRUCTION, LAW, MEDICAL, DENTIST, MEDICAL_SPA, OPTOMETRIST, HEALTH_CLINIC, REAL_ESTATE, HOSPITAL, TECHNOLOGY, ORTHODONTIST

## Next: Phase 5

Phase 3 (DAL routing) and Phase 4 (migration scripts) are complete. Phase 5 focuses on hardening: connection pooling, indexing, monitoring.
