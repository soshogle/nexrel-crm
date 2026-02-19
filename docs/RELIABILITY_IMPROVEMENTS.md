# Reliability Improvements

This document describes the reliability measures added to prevent production crashes and improve observability.

## 1. Optional Chaining on API Data

**Where:** `components/workflows/unified-monitor.tsx`, HITL components

API responses can contain `undefined` or malformed items. We now use:
- `(arr || []).filter(Boolean)` before mapping
- Optional chaining (`?.`) when accessing nested properties
- Fallbacks (`?? 'default'`) for required display values

## 2. Error Boundaries

**Where:** `components/error-boundary.tsx`, `components/dashboard/dashboard-wrapper.tsx`

Layout-level components that fetch external data are wrapped in `<ErrorBoundary>`:
- `HITLApprovalBanner`
- `HITLNotificationBell`
- `AIChatAssistant`
- `GlobalVoiceAssistant`

If a component throws, the boundary catches it and shows a "Try again" fallback instead of crashing the entire dashboard.

## 3. Zod Validation for Critical API Responses

**Where:** `lib/api-validation.ts`

Schemas and parsers for:
- `parseHITLApprovals()` — HITL pending approvals
- `parseWorkflowInstances()` — RE workflow instances
- `parseWorkflowExecutions()` — Task executions

Invalid items are filtered out instead of causing runtime errors.

## 4. Stricter TypeScript (Optional)

**Current:** `strict: true` is enabled.

**To enable `noUncheckedIndexedAccess`** (adds `| undefined` to array index access):
```json
// tsconfig.json
"noUncheckedIndexedAccess": true
```
This may require fixing index access patterns across the codebase. Enable gradually.

## 5. Sentry Error Tracking

**Setup:**
1. Create a project at [sentry.io](https://sentry.io)
2. Add to `.env`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   SENTRY_ORG=your-org
   SENTRY_PROJECT=nexrel-crm
   SENTRY_AUTH_TOKEN=xxx  # For source maps in CI
   ```
3. Redeploy — errors will be captured automatically

**Files:**
- `instrumentation.ts` — Loads server/edge Sentry config
- `instrumentation-client.ts` — Client-side init + Session Replay
- `sentry.server.config.ts` — Node.js runtime
- `sentry.edge.config.ts` — Edge runtime
- `app/global-error.tsx` — App Router global error handler
- `next.config.js` — Wrapped with `withSentryConfig`

Sentry only activates when `NEXT_PUBLIC_SENTRY_DSN` is set.
