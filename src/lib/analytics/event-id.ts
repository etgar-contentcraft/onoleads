/**
 * Deterministic event ID generation for pixel deduplication.
 *
 * The same function runs in both browser and Node.js server so that the
 * browser pixel and the CAPI server call share identical event IDs, enabling
 * Meta/TikTok/Google to deduplicate them (count as one conversion, not two).
 *
 * Algorithm: minute-bucket → same event within a 60-second window gets same ID.
 * This handles the typical ~1-2s latency between browser pixel fire and CAPI call.
 *
 * Edge case: form submitted at X:59 (bucket N) — server call arrives at (X+1):01 (bucket N+1).
 * Solution: pass the client-generated event_id in the form payload and use it server-side.
 */

/**
 * Generates a deduplication-safe event ID usable in both browser and Node.js.
 * @param eventName - e.g. "lead_submit", "scroll_depth"
 * @param pageId - Supabase page UUID (first 8 chars used)
 * @param cookieId - onoleads_id first-party cookie value (first 8 chars used)
 * @returns 32-char base64url string
 */
export function generateEventId(
  eventName: string,
  pageId: string,
  cookieId: string
): string {
  // Bucket to nearest minute — 60-second dedup window
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const raw = `${eventName}:${pageId.slice(0, 8)}:${cookieId.slice(0, 8)}:${minuteBucket}`;

  // Browser: btoa | Node: Buffer.from
  const encoded =
    typeof btoa !== "undefined"
      ? btoa(raw)
      : Buffer.from(raw).toString("base64");

  // Strip base64 padding/special chars → URL-safe
  return encoded.replace(/[+/=]/g, "").slice(0, 32);
}

/**
 * Generates a random fallback event ID when page/cookie context is unavailable.
 * Less ideal for dedup but better than a missing event_id.
 */
export function generateRandomEventId(): string {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return random.slice(0, 32);
}
