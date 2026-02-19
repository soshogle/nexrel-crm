/**
 * Simple in-memory rate limiter for API routes.
 * For production at scale, use Redis (e.g. @upstash/ratelimit).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000; // 1 min
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit. Returns { success, remaining, resetAt }.
 * Key format: "userId" or "ip:1.2.3.4" for anonymous.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (now >= bucket.resetAt) {
    bucket.count = 1;
    bucket.resetAt = now + windowMs;
    return { success: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  const success = bucket.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
