/**
 * Cache-aside utility powered by Upstash Redis.
 * Transparent fallback: when Redis is unavailable, queries run uncached.
 *
 * Usage:
 *   const user = await cached(`user:${id}`, 300, () => db.user.findUnique({...}))
 *   await invalidate(`user:${id}`)
 *   await invalidatePattern('user:*')
 */

import { getRedis } from '@/lib/redis'

const PREFIX = 'cache:'

/**
 * Cache-aside: return cached value if exists, otherwise run fetcher and cache result.
 * @param key   Unique cache key (auto-prefixed with "cache:")
 * @param ttl   Time-to-live in seconds (e.g., 300 = 5 minutes)
 * @param fetcher  Async function that fetches the data when cache misses
 */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedis()
  if (!redis) return fetcher()

  const fullKey = PREFIX + key

  try {
    const hit = await redis.get<string>(fullKey)
    if (hit !== null && hit !== undefined) {
      return (typeof hit === 'string' ? JSON.parse(hit) : hit) as T
    }
  } catch {
    // Redis down — fall through to fetcher
  }

  const data = await fetcher()

  try {
    await redis.set(fullKey, JSON.stringify(data), { ex: ttl })
  } catch {
    // Redis down — data still returned, just not cached
  }

  return data
}

/**
 * Invalidate a single cache key.
 */
export async function invalidate(key: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(PREFIX + key)
  } catch {
    // Best-effort
  }
}

/**
 * Invalidate all keys matching a pattern (e.g., "user:abc123:*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: PREFIX + pattern, count: 100 }) as unknown as [number, string[]]
      cursor = Number(nextCursor)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== 0)
  } catch {
    // Best-effort
  }
}

/** Common TTL presets in seconds */
export const TTL = {
  SHORT: 60,         // 1 minute — volatile data (counts, stats)
  MEDIUM: 300,       // 5 minutes — list queries
  LONG: 1800,        // 30 minutes — slowly changing data (user profiles, settings)
  VERY_LONG: 3600,   // 1 hour — templates, configs
} as const
