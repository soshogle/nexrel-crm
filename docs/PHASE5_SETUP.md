# Phase 5: Hardening Setup

**Goal:** Production-ready performance and reliability for multi-DB.

---

## 5.1 Connection Pooling

### Neon

Use **pooled** connection strings from the Neon dashboard for serverless (Vercel):

1. In Neon: Project → Connection Details → **Pooled connection**
2. Copy the connection string (includes `-pooler` in hostname)
3. Set in env: `DATABASE_URL_META`, `DATABASE_URL_REAL_ESTATE`, etc.

Pool size: Neon pooler defaults are suitable. For high load, consider 20–50 connections per DB.

### Direct vs Pooled

| Use case        | Connection type |
|-----------------|-----------------|
| Vercel/serverless | Pooled (recommended) |
| Long-running jobs | Direct or pooled |
| Migrations       | Direct |

---

## 5.2 Indexing

### Added in Phase 5

- `User.industry` – used for migration and industry-scoped queries

### Audit

Ensure these indexes exist (from schema):

- `Lead`: userId, status, contactType
- `Deal`: userId, stageId, status
- `Campaign`: userId, status
- `Website`: userId
- `Task`: userId
- `Conversation`: userId
- `WorkflowTemplate`: userId, industry

Run `npx prisma migrate dev` to apply the User.industry index.

---

## 5.3 Monitoring

### DAL routing (dev only)

Set `DAL_LOG_ROUTING=true` in development to log which DB each request uses:

```
[DAL] Routing to industry DB: REAL_ESTATE
```

### Per-DB metrics

- **Neon:** Dashboard → Metrics (connections, CPU, query latency)
- **Alerts:** Configure in Neon for connection spikes, error rate
- **Logging:** Application logs for DAL errors and fallbacks

---

## Checklist

- [ ] Use pooled connection strings for all `DATABASE_URL_*`
- [ ] Apply migration for `User.industry` index
- [ ] Configure Neon alerts for each DB
- [ ] Test with `DAL_LOG_ROUTING=true` in staging
