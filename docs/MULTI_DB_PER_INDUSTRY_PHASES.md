# Multi-DB Per-Industry Architecture: Phase System

> **Goal:** Each industry has its own database. Scale to 50k+ owners without bottlenecks.

## Quick Reference

| Phase | Focus | Duration |
|-------|-------|----------|
| **1** | Foundation – DAL, industry context, registry | 1–2 weeks |
| **2** | Multi-DB infra – 15 DBs, Prisma clients | 1 week |
| **3** | DAL routing – route by industry | 1 week |
| **4** | Migration – move data, cutover | 1–2 weeks |
| **5** | Hardening – pooling, indexes, monitoring | 1 week |
| **6** | Scale-out – replicas, sharding (when needed) | As needed |

**Total to production:** 5–7 weeks | **Capacity after Phase 5:** ~40–60k owners

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           META DB (Shared)                                   │
│  User, Session, Account, Agency, UserSubscription, ApiKey, UserFeatureToggle │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  REAL_ESTATE DB   │  │   MEDICAL DB      │  │  RESTAURANT DB    │  ... (14 total)
│  Lead, Deal,      │  │   Lead, Deal,     │  │  Lead, Deal,      │
│  Campaign,        │  │   Campaign,       │  │  Campaign,       │
│  Workflow,        │  │   Workflow,       │  │  Workflow,       │
│  Website,         │  │   Website,        │  │  Website,        │
│  Listing, etc.    │  │   Patient, etc.   │  │  etc.            │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

**Industries (14 total):**
- ACCOUNTING, RESTAURANT, SPORTS_CLUB, CONSTRUCTION, LAW
- MEDICAL, DENTIST, MEDICAL_SPA, OPTOMETRIST, HEALTH_CLINIC, HOSPITAL, ORTHODONTIST
- REAL_ESTATE, TECHNOLOGY

---

## Phase 1: Foundation (Weeks 1–2)

**Goal:** Prepare codebase for multi-DB without changing DB topology.

### 1.1 Data Access Layer (DAL)

| Task | Description | Files to Create/Modify |
|------|-------------|------------------------|
| Create DAL services | Wrap all Prisma CRM access in services | `lib/dal/lead-service.ts`, `deal-service.ts`, `campaign-service.ts`, `workflow-service.ts`, etc. |
| Standard interface | Every method takes `userId` and optionally `industry` | All services |
| Single DB for now | Services use current `prisma` – no routing yet | DAL returns same data |

**Deliverable:** No direct `prisma.lead`, `prisma.deal`, etc. in API routes, pages, or lib files. All go through DAL.

**Phase 1 = 100% complete when:** Every CRM data access (Lead, Deal, Campaign, Website, Task, Conversation, WorkflowTemplate, Note, Message) goes through DAL. See `docs/PHASE1_DAL_MIGRATION_MAP.md` for migration status.

### 1.2 Industry Context

| Task | Description | Files to Create/Modify |
|------|-------------|------------------------|
| Request context | Middleware or helper that sets `industry` from session | `lib/context/industry-context.ts` |
| `getIndustryForRequest()` | Returns `user.industry` from session/JWT | Used by DAL for routing |
| Session enrichment | Ensure `industry` is in session (auth.ts) | `lib/auth.ts` |

**Deliverable:** Every request has industry available for DAL routing.

### 1.3 Industry Component Registry

| Task | Description | Files to Create/Modify |
|------|-------------|------------------------|
| Workflow tab registry | Replace if/else chain with `WORKFLOW_TABS[industry]` | `lib/industry-registry.ts`, `app/dashboard/workflows/page.tsx` |
| Executor registry | Map industry → task executor | `lib/workflows/workflow-task-executor.ts` |

**Deliverable:** Adding new industry = registry entry + new module. No core file edits.

---

## Phase 2: Multi-DB Infrastructure (Weeks 2–3) ✅ COMPLETE

**Goal:** Create DBs and Prisma clients for Meta + all industries.

**Status:** Code complete. See `docs/PHASE2_SETUP.md` for setup instructions.

### 2.1 Database Setup

| Task | Description | Action |
|------|-------------|--------|
| Create Neon projects | 1 Meta + 14 Industry DBs (15 total) | Neon dashboard or API |
| Environment variables | `DATABASE_URL_META`, `DATABASE_URL_REAL_ESTATE`, `DATABASE_URL_MEDICAL`, etc. | `.env`, Vercel |
| Connection pooling | Enable Neon pooler or PgBouncer per DB | Per Neon project |

**Env vars:**
```
DATABASE_URL_META=
DATABASE_URL_ACCOUNTING=
DATABASE_URL_RESTAURANT=
DATABASE_URL_SPORTS_CLUB=
DATABASE_URL_CONSTRUCTION=
DATABASE_URL_LAW=
DATABASE_URL_MEDICAL=
DATABASE_URL_DENTIST=
DATABASE_URL_MEDICAL_SPA=
DATABASE_URL_OPTOMETRIST=
DATABASE_URL_HEALTH_CLINIC=
DATABASE_URL_REAL_ESTATE=
DATABASE_URL_HOSPITAL=
DATABASE_URL_TECHNOLOGY=
DATABASE_URL_ORTHODONTIST=
```

### 2.2 Prisma Schema Split

| Task | Description | Files |
|------|-------------|-------|
| Meta schema | User, Session, Account, Agency, UserSubscription, ApiKey, UserFeatureToggle | `prisma/schema-meta.prisma` |
| Industry schema | Lead, Deal, Campaign, Workflow, Website, Task, Conversation, etc. | `prisma/schema-industry.prisma` |
| Generate clients | One client per DB | `prisma/meta-client.ts`, `prisma/industry-clients.ts` |

**Option A:** Multiple schema files, each with own datasource, generate separate clients.
**Option B:** Single schema with multiple datasource blocks (Prisma 5.15+), assign models to datasources.

### 2.3 Industry DB Client Factory

| Task | Description | Files |
|------|-------------|-------|
| `getIndustryDb(industry)` | Returns correct Prisma client for industry | `lib/db/industry-db.ts` |
| `getMetaDb()` | Returns Meta DB client | `lib/db/meta-db.ts` |

**Deliverable:** `getIndustryDb('REAL_ESTATE')` → Real Estate DB client. `getMetaDb()` → Meta client.

### 2.4 Table Assignment

| Meta DB | Industry DBs |
|---------|--------------|
| User | Lead |
| Session | Deal |
| Account | Campaign |
| Agency | Workflow, WorkflowInstance |
| UserSubscription | Website |
| ApiKey | Task |
| UserFeatureToggle | Conversation, ConversationMessage |
| VerificationToken | CallLog |
| | BookingAppointment |
| | EmailCampaign, SmsCampaign |
| | Payment, Invoice |
| | Industry-specific (Listing, Patient, etc.) |

---

## Phase 3: DAL Routing (Week 3–4) ✅ COMPLETE

**Goal:** DAL uses correct DB based on industry.

**Status:** Session includes `industry`; `getDalContextFromSession(session)` passes it to DAL. Auth uses `getMetaDb()` for User/Session/Account when `DATABASE_URL_META` is set.

### 3.1 Update DAL Services

| Service | Change |
|---------|--------|
| LeadService | `findMany(userId)` → resolve industry → `getIndustryDb(industry).lead.findMany(...)` |
| DealService | Same pattern |
| CampaignService | Same pattern |
| WorkflowService | Same pattern |
| All CRM services | Route to industry DB |

### 3.2 Auth & Billing

| Area | DB |
|------|-----|
| Login, session, user lookup | Meta DB |
| Billing, subscriptions | Meta DB |
| Feature toggles | Meta DB |

### 3.3 API Route Updates

| Task | Description |
|------|-------------|
| Replace direct Prisma | All API routes use DAL |
| Industry from session | Pass industry to DAL from `getServerSession()` |

**Deliverable:** All CRM reads/writes go through DAL. DAL routes to correct industry DB.

---

## Phase 4: Migration (Week 4–5) ✅ COMPLETE (Scripts)

**Goal:** Move existing data from single DB to Meta + industry DBs.

**Status:** Migration scripts created. Run in order: `migrate-to-meta-db.ts` → `migrate-to-industry-dbs.ts` → `validate-migration.ts`.

### 4.1 Pre-Migration Checklist

- [ ] Backup production DB
- [ ] All 15 DBs created and migrations applied
- [ ] DAL + routing deployed and tested in staging
- [ ] Rollback plan documented

### 4.2 Migration Order

| Step | Action |
|------|--------|
| 1 | Migrate User, Session, Account, Agency, etc. → Meta DB |
| 2 | For each industry: migrate Lead, Deal, Campaign, etc. → Industry DB |
| 3 | Validate row counts and referential integrity |
| 4 | Cutover: point app to new DB URLs |

### 4.3 Migration Scripts

| Script | Purpose |
|--------|---------|
| `scripts/migrate-to-meta-db.ts` | Copy Agency, User, Account, Session, AdminSession, SuperAdminSession → Meta DB |
| `scripts/migrate-to-industry-dbs.ts` | Copy User (subset) + Lead, Deal, Campaign, etc. by `User.industry` → each Industry DB |
| `scripts/validate-migration.ts` | Compare row counts between source and targets |

**Usage:**
```bash
tsx scripts/migrate-to-meta-db.ts [--dry-run]
tsx scripts/migrate-to-industry-dbs.ts [--dry-run] [--industry=REAL_ESTATE]
tsx scripts/validate-migration.ts
```

### 4.4 Cutover

| Task | Description |
|------|-------------|
| Deploy | New code with multi-DB routing |
| Env switch | Set all `DATABASE_URL_*` to new DBs |
| Monitor | Errors, latency, connection usage |
| Rollback | Revert env to single DB if critical issues |

---

## Phase 5: Hardening (Week 5–6) ✅ IN PROGRESS

**Goal:** Production-ready performance and reliability.

**Status:** Index on `User.industry` added. DAL logging (dev). See `docs/PHASE5_SETUP.md`.

### 5.1 Connection Pooling

| Task | Description |
|------|-------------|
| Pool size | 20–50 per DB (tune based on load) |
| PgBouncer / Neon pooler | Enable for each DB |

### 5.2 Indexing

| Task | Description |
|------|-------------|
| Audit indexes | `userId`, `industry`, common filters on Lead, Deal, Campaign |
| Add missing indexes | Based on slow query analysis |

### 5.3 Monitoring

| Task | Description |
|------|-------------|
| Per-DB metrics | Connections, CPU, query latency |
| Alerts | Connection spikes, error rate |
| Logging | DAL logs which DB was used (dev only) |

---

## Phase 6: Scale-Out (When Needed)

**Goal:** Support 50k+ owners.

### 6.1 Read Replicas

| Task | Description |
|------|-------------|
| Add replica per industry DB | For high-read industries |
| DAL read/write split | Writes → primary, reads → replica |

### 6.2 Shard Large Industries

| Task | Description |
|------|-------------|
| If one industry > ~15k owners | Shard (e.g. REAL_ESTATE_1, REAL_ESTATE_2) |
| Shard key | `hash(userId) % N` |

### 6.3 Caching

| Task | Description |
|------|-------------|
| Redis | Session, user profile, feature flags |
| Cache invalidation | On user/feature updates |

---

## Capacity Estimates

| Phase | Owners Supported | Notes |
|-------|------------------|-------|
| Current (single DB) | ~1–2k | Shared connections |
| After Phase 5 | ~40–60k | 15 DBs, pooling, indexes |
| After Phase 6 | 100k+ | Replicas, sharding, cache |

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1. Foundation | 1–2 weeks | 2 weeks |
| 2. Multi-DB Infra | 1 week | 3 weeks |
| 3. DAL Routing | 1 week | 4 weeks |
| 4. Migration | 1–2 weeks | 6 weeks |
| 5. Hardening | 1 week | 7 weeks |
| **Total** | **5–7 weeks** | |
| 6. Scale-out | As needed | When approaching 40k+ |

---

## Per-Industry Dashboard Support

Each industry continues to have its own dashboard:

- **Menu:** `industry-menu-config.ts` controls visibility per industry
- **Routes:** `/dashboard/real-estate/*`, `/dashboard/dental/*`, etc.
- **Data:** DAL routes each industry's requests to that industry's DB
- **Registry:** New industry = new module + registry entry

---

## Rollout Options

### Option A: Big Bang (All 14 industries at once)
- Migrate all industries in Phase 4
- Higher complexity, single cutover

### Option B: Phased by Industry (Recommended)
- Phase 4a: Migrate REAL_ESTATE + MEDICAL first (largest)
- Phase 4b: Migrate remaining 12 industries
- Lower risk, validate with 2 industries first

---

## Checklist: Phase 1 Start

- [ ] Create `lib/dal/` directory structure
- [ ] Create `lib/context/industry-context.ts`
- [ ] Create `lib/industry-registry.ts`
- [ ] Identify all files with direct `prisma.lead`, `prisma.deal`, etc.
- [ ] Create LeadService, DealService stubs
- [ ] Replace one API route (e.g. `/api/leads`) with DAL as proof of concept
