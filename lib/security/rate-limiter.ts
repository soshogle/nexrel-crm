
/**
 * Rate Limiting Middleware for API Routes
 * Prevents abuse and DDoS attacks by limiting request frequency
 */

import { NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Optional custom identifier
}

/**
 * Creates a rate limiter for API routes
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;

  return (request: Request, identifier: string = 'global') => {
    const now = Date.now();
    const key = identifier;

    // Initialize or get existing rate limit data
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment request count
    store[key].count++;

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const resetIn = Math.ceil((store[key].resetTime - now) / 1000);
      return {
        success: false,
        remaining: 0,
        resetIn,
      };
    }

    return {
      success: true,
      remaining: maxRequests - store[key].count,
      resetIn: Math.ceil((store[key].resetTime - now) / 1000),
    };
  };
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip =
    forwardedFor?.split(',')[0] ||
    realIp ||
    cfConnectingIp ||
    'unknown';

  return ip;
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetIn: number) {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${resetIn} seconds.`,
      resetIn,
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetIn.toString(),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const RateLimiters = {
  // Standard API endpoints (100 requests per minute)
  standard: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),

  // Authentication endpoints (5 attempts per 15 minutes)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  }),

  // Payment endpoints (10 requests per minute)
  payment: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Sensitive operations (20 requests per hour)
  sensitive: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  }),

  // Public endpoints (50 requests per minute)
  public: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),

  // AI/LLM endpoints (30 requests per minute)
  ai: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),
};
