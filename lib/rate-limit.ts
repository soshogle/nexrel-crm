/**
 * Rate-limit shim (temporarily disabled).
 *
 * Rationale:
 * - Keep API compatibility for existing imports/calls.
 * - Disable request throttling while production stability is restored.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  api: {
    maxRequests: Number.MAX_SAFE_INTEGER,
    windowMs: 60_000,
  } as RateLimitConfig,
  apiHeavy: {
    maxRequests: Number.MAX_SAFE_INTEGER,
    windowMs: 60_000,
  } as RateLimitConfig,
  auth: {
    maxRequests: Number.MAX_SAFE_INTEGER,
    windowMs: 60_000,
  } as RateLimitConfig,
  webhook: {
    maxRequests: Number.MAX_SAFE_INTEGER,
    windowMs: 60_000,
  } as RateLimitConfig,
  public: {
    maxRequests: Number.MAX_SAFE_INTEGER,
    windowMs: 60_000,
  } as RateLimitConfig,
} as const;

export async function checkRateLimit(
  _key: string,
  _config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  return {
    allowed: true,
    remaining: Number.MAX_SAFE_INTEGER,
    resetMs: 0,
  };
}

export function getRateLimitKey(
  ip: string,
  path: string,
  userId?: string,
): string {
  const subject = userId ? `u:${userId}` : `ip:${ip}`;
  return `${subject}:${path}`;
}
