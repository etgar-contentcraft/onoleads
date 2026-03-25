/**
 * In-memory rate limiter for API routes.
 * Limits requests per IP address within a sliding time window.
 */

/** Rate limit configuration */
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_SIZE_MS = 60 * 1000; /* 1 minute */

/** In-memory store for request counts per IP */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Periodic cleanup interval to prevent memory leaks (every 5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Removes expired entries from the rate limit store.
 * Called automatically during rate limit checks.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const keys: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) {
      keys.push(key);
    }
  });
  keys.forEach((key) => rateLimitStore.delete(key));
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Checks whether a request from the given IP is within rate limits.
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests per window (default: 5)
 * @param windowMs - Window duration in milliseconds (default: 60000)
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_SIZE_MS
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const key = `rl:${ip}`;
  const entry = rateLimitStore.get(key);

  /* No existing entry or window expired: create fresh entry */
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  /* Within the window: increment counter */
  entry.count += 1;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extracts the client IP from a Next.js request.
 * Checks common proxy headers before falling back to a default.
 * @param headers - Request headers
 * @returns Best-guess client IP address
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
