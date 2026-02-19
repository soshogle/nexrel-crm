/**
 * In-memory idempotency store for mutation endpoints.
 * Prevents duplicate processing when client retries with same Idempotency-Key.
 * For production at scale, use Redis or DB.
 */

interface IdempotencyEntry {
  status: number;
  body: unknown;
  expiresAt: number;
}

const store = new Map<string, IdempotencyEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 min

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

/**
 * Get cached response for idempotency key, or null if not found/expired.
 */
export function getIdempotentResponse(
  key: string,
  scope: string
): { status: number; body: unknown } | null {
  cleanup();
  const fullKey = `${scope}:${key}`;
  const entry = store.get(fullKey);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return { status: entry.status, body: entry.body };
}

/**
 * Store response for idempotency key.
 */
export function setIdempotentResponse(
  key: string,
  scope: string,
  status: number,
  body: unknown
): void {
  cleanup();
  const fullKey = `${scope}:${key}`;
  store.set(fullKey, {
    status,
    body,
    expiresAt: Date.now() + TTL_MS,
  });
}
