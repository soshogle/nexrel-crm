# Phase 6: API Design – Complete

## What Was Done

### 1. Cursor-Based Pagination (Workflow Instances)

**GET /api/real-estate/workflows/instances**

- **Query params:** `cursor`, `limit` (max 100)
- **Response:** `{ instances, nextCursor, hasMore }`
- **Usage:** Pass `?cursor=<lastId>` for next page; `nextCursor` is the last instance id

**Backward compatible:** Clients that ignore `nextCursor` still receive `instances` as before.

### 2. Rate Limiting (`lib/rate-limit.ts`)

- **checkRateLimit(key, limit, windowMs)** – In-memory sliding window
- **Applied to:** HITL approve, HITL reject (20 requests/min per user)
- **Production note:** For multi-instance deployments, use Redis (e.g. @upstash/ratelimit)

### 3. Idempotency (`lib/idempotency.ts`)

- **Idempotency-Key** header or `idempotencyKey` in body
- **Applied to:** HITL approve, HITL reject
- **TTL:** 5 minutes
- **Behavior:** Same key within TTL returns cached response without re-executing

**Usage:** Client sends `Idempotency-Key: <uuid>` on retries to avoid duplicate approvals.

## Next Steps (Phase 7+)

- E2E tests for critical flows
- Performance monitoring
- Input validation on all API routes
