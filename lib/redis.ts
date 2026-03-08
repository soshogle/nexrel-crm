/**
 * Redis shim (temporarily disabled).
 *
 * Returning null keeps cache/rate-limit callers in safe fallback mode
 * without any external Redis dependency.
 */

export interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  scan(
    cursor: number,
    options?: { match?: string; count?: number },
  ): Promise<[number, string[]]>;
}

export function getRedis(): RedisLike | null {
  return null;
}
