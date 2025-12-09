/**
 * Rate Limiting Utility
 * 
 * Provides IP-based and user-based rate limiting for API endpoints.
 * Uses in-memory storage for simplicity - can be upgraded to Redis/Upstash for distributed systems.
 * 
 * @version 2.5.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rate limit storage (in-memory)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Custom error message */
  message?: string;
}

/**
 * Predefined rate limit configurations by endpoint type
 */
export const RateLimitPresets = {
  /** Very strict - for auth endpoints (sign-in, sign-up, password reset) */
  AUTH: {
    limit: 5,
    window: 60, // 5 requests per minute
    message: 'Çok fazla deneme. Lütfen 1 dakika sonra tekrar deneyin.',
  },

  /** Strict - for sensitive operations (admin actions, payments) */
  STRICT: {
    limit: 10,
    window: 60, // 10 requests per minute
    message: 'Çok fazla istek. Lütfen 1 dakika sonra tekrar deneyin.',
  },

  /** Medium - for general CRUD operations */
  MEDIUM: {
    limit: 60,
    window: 60, // 60 requests per minute (1 per second)
    message: 'İstek limiti aşıldı. Lütfen biraz bekleyin.',
  },

  /** Loose - for read-heavy operations */
  LOOSE: {
    limit: 120,
    window: 60, // 120 requests per minute (2 per second)
    message: 'İstek limiti aşıldı. Lütfen biraz bekleyin.',
  },

  /** Very loose - for analytics, health checks */
  VERY_LOOSE: {
    limit: 300,
    window: 60, // 300 requests per minute (5 per second)
    message: 'İstek limiti aşıldı. Lütfen biraz bekleyin.',
  },
} as const;

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Vercel provides the real IP in x-forwarded-for header
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback to x-real-ip
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Last resort - use a placeholder (shouldn't happen on Vercel)
  return 'unknown-ip';
}

/**
 * Get user ID from Supabase session
 */
async function getUserID(request: NextRequest): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Check rate limit for a given key
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired entry - create new
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.window * 1000;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Apply rate limiting to API endpoint
 * 
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH);
 *   if (rateLimitResult) return rateLimitResult;
 *   
 *   // Your endpoint logic here
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.MEDIUM
): Promise<NextResponse | null> {
  try {
    // Get user ID if authenticated
    const userID = await getUserID(request);

    // Use user ID if available, otherwise use IP address
    const identifier = userID || getClientIP(request);
    const key = `rate-limit:${identifier}:${request.nextUrl.pathname}`;

    // Check rate limit
    const { allowed, remaining, resetTime } = checkRateLimit(key, config);

    // Add rate limit headers to all responses
    const headers = {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };

    // If rate limit exceeded, return 429
    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: config.message || 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Rate limit passed - return null to continue
    return null;
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow request to proceed (fail open)
    return null;
  }
}

/**
 * IP-based rate limiting (for anonymous requests)
 * 
 * Use this for endpoints that should be limited by IP regardless of authentication.
 */
export async function rateLimitByIP(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.MEDIUM
): Promise<NextResponse | null> {
  try {
    const ip = getClientIP(request);
    const key = `rate-limit-ip:${ip}:${request.nextUrl.pathname}`;

    const { allowed, remaining, resetTime } = checkRateLimit(key, config);

    const headers = {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: config.message || 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    return null;
  } catch (error) {
    console.error('Rate limit by IP error:', error);
    return null;
  }
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(identifier: string, pathname: string): RateLimitEntry | null {
  const key = `rate-limit:${identifier}:${pathname}`;
  return rateLimitStore.get(key) || null;
}

/**
 * Clear rate limit for a specific identifier (useful for testing)
 */
export function clearRateLimit(identifier: string, pathname: string): void {
  const key = `rate-limit:${identifier}:${pathname}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
