/**
 * Distributed rate limiter powered by Upstash Redis.
 * Works across all Vercel replicas — counters are shared globally.
 * Falls back to in-memory if Upstash env vars are missing (dev convenience).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export const RATE_LIMITS = {
  api: { maxRequests: 100, windowMs: 60_000 } as RateLimitConfig,
  apiHeavy: { maxRequests: 300, windowMs: 60_000 } as RateLimitConfig, // dental, clinical, treatment plans
  auth: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
  webhook: { maxRequests: 200, windowMs: 60_000 } as RateLimitConfig,
  public: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
} as const

const redis = getRedis()

function createLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
    prefix: 'rl',
    analytics: true,
  })
}

const limiters = {
  api: createLimiter(RATE_LIMITS.api),
  apiHeavy: createLimiter(RATE_LIMITS.apiHeavy),
  auth: createLimiter(RATE_LIMITS.auth),
  webhook: createLimiter(RATE_LIMITS.webhook),
  public: createLimiter(RATE_LIMITS.public),
}

// ── In-memory fallback (dev only, when Upstash env vars missing) ──

interface MemEntry { tokens: number; lastRefill: number }
const memStore = new Map<string, MemEntry>()
let lastCleanup = Date.now()

function memCheck(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  if (now - lastCleanup > 60_000) {
    lastCleanup = now
    const expiry = now - 120_000
    for (const [k, v] of memStore) { if (v.lastRefill < expiry) memStore.delete(k) }
  }

  let entry = memStore.get(key)
  if (!entry) {
    entry = { tokens: config.maxRequests - 1, lastRefill: now }
    memStore.set(key, entry)
    return { allowed: true, remaining: entry.tokens, resetMs: config.windowMs }
  }

  const elapsed = now - entry.lastRefill
  const refill = Math.floor((elapsed / config.windowMs) * config.maxRequests)
  if (refill > 0) {
    entry.tokens = Math.min(config.maxRequests, entry.tokens + refill)
    entry.lastRefill = now
  }

  if (entry.tokens > 0) {
    entry.tokens--
    return { allowed: true, remaining: entry.tokens, resetMs: config.windowMs - elapsed }
  }
  return { allowed: false, remaining: 0, resetMs: config.windowMs - elapsed }
}

// ── Public API (same interface as before — middleware unchanged) ──

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const limiter =
    config === RATE_LIMITS.auth ? limiters.auth
    : config === RATE_LIMITS.webhook ? limiters.webhook
    : config === RATE_LIMITS.public ? limiters.public
    : config === RATE_LIMITS.apiHeavy ? limiters.apiHeavy
    : limiters.api

  if (limiter) {
    const result = await limiter.limit(key)
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetMs: Math.max(0, result.reset - Date.now()),
    }
  }

  return memCheck(key, config)
}

export function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`
}
