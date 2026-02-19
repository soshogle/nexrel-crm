# Phase 2: Data Fetching & Resilience – Complete

## What Was Done

### 1. TanStack Query Setup

- **QueryProvider** (`components/providers/query-provider.tsx`) – Wraps app with QueryClientProvider
- **Default options:**
  - `staleTime: 30s` – Data considered fresh for 30s
  - `gcTime: 5min` – Cache retained for 5 minutes
  - `retry: 3` – Retry failed requests 3 times
  - `retryDelay` – Exponential backoff: 1s, 2s, 4s… (max 30s)
  - `refetchOnWindowFocus: false` – Avoid refetch on tab focus (polling handles it)

### 2. HITL Query Layer (`lib/hitl-queries.ts`)

- **Query keys:** `hitlQueryKeys.pending()` → `['hitl', 'pending']`
- **Fetcher:** `fetchHITLPendingData()` – Single fetch, shared across components
- **Parsers:** `parseBannerNotifications()`, `parsePanelNotifications()` – Zod-validated

### 3. Migrated Components

| Component | Changes |
|-----------|---------|
| **HITLApprovalBanner** | `useQuery` + `queryClient.invalidateQueries` on approve/reject |
| **HITLNotificationBell** | `useQuery` + invalidate on approve/reject |
| **HITLApprovalPanel** | `useQuery` + invalidate on approve/reject |

### 4. Benefits

- **Request deduplication** – Banner, bell, and panel share the same query; one fetch serves all
- **Automatic retries** – Transient failures retry with exponential backoff
- **Stale-while-revalidate** – `staleTime: 15s` shows cached data while refetching in background
- **No AbortController** – React Query handles cleanup on unmount
- **Cache invalidation** – Approve/reject invalidates cache; all components refetch

## Next Steps (Phase 3)

- Lazy-load heavy routes (AI Brain, Workflow Builder)
- Add virtualization to long lists
- Debounce search/filters
