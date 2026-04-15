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
 * @param routeKey - Optional route identifier to scope limits per-endpoint
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_SIZE_MS,
  routeKey: string = "default"
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const key = `rl:${routeKey}:${ip}`;
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
 *
 * Spoofing-resistant order:
 *   1. cf-connecting-ip (Cloudflare — set by edge, not appendable)
 *   2. x-real-ip (Vercel — set by edge to the actual client IP)
 *   3. x-forwarded-for, RIGHTMOST entry — the trusted edge proxy appends the
 *      real client IP to whatever the client supplied; the leftmost is
 *      attacker-controlled, the rightmost (last appended by our trusted edge)
 *      is authoritative.
 *
 * @param headers - Request headers
 * @returns Best-guess client IP address
 */
export function getClientIp(headers: Headers): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    /* Rightmost = the IP the trusted edge proxy appended.
     * Leftmost = attacker-supplied (any client can set X-Forwarded-For). */
    if (parts.length) return parts[parts.length - 1];
  }

  return "unknown";
}
