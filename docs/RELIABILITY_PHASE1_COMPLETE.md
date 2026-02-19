# Phase 1: Foundation – Complete

## What Was Done

### 1. Consistent API Error Shape (`lib/api-error.ts`)

- **Format:** `{ code, message, error?, details? }`
- **Codes:** UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, VALIDATION_ERROR, CONFLICT, RATE_LIMITED, INTERNAL_ERROR
- **Helpers:** `apiErrors.unauthorized()`, `apiErrors.notFound()`, `apiErrors.internal()`, etc.
- **Backwards compatible:** Includes `error` key for clients that expect it

**Migrated routes:**
- `POST /api/real-estate/workflows/hitl/[id]/approve`
- `POST /api/real-estate/workflows/hitl/[id]/reject`
- `GET /api/real-estate/workflows/instances`

### 2. Health Check Endpoint (`/api/health`)

- **GET /api/health** – Returns 200 if DB is reachable, 503 if not
- Response: `{ status, timestamp, latencyMs, checks: { database } }`
- Use for load balancers, monitoring, and deployments

### 3. Structured Logging (`lib/logger.ts`)

- **createLogger(context)** – Creates logger with pre-bound context (requestId, userId, component)
- **Levels:** debug, info, warn, error
- **Format:** `[timestamp] [LEVEL] message { "context": "..." }`
- Debug logs only in development

### 4. Input Validation (Zod)

- **HITLApproveBodySchema** – Validates `{ notes?: string }`
- **HITLRejectBodySchema** – Validates `{ notes?: string, pauseWorkflow?: boolean }`
- HITL approve/reject routes parse and validate request body safely

## Next Steps (Phase 2)

- Install TanStack Query
- Migrate HITL fetches to React Query
- Add retry with exponential backoff
