/**
 * Smart Link redirect route handler.
 * Looks up a short slug, logs the click asynchronously, and performs a 302 redirect.
 * Designed for speed — the redirect happens immediately while click logging is fire-and-forget.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/security/rate-limit";

/* ─── Constants ─── */

/** HTTP status for permanent removal (expired links with no fallback) */
const HTTP_GONE = 410;

/** Regex patterns for user-agent device detection */
const MOBILE_UA_PATTERN = /Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_UA_PATTERN = /Tablet|iPad|Android(?!.*Mobile)|Kindle|Silk/i;

/** Regex patterns for browser detection */
const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg(e|A)?\//, "Edge"],
  [/OPR\/|Opera\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/Safari\/(?!.*Chrome)/, "Safari"],
  [/Firefox\//, "Firefox"],
];

/** Regex patterns for OS detection */
const OS_PATTERNS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Macintosh|Mac OS/, "Mac"],
  [/Linux/, "Linux"],
];

/* ─── User-Agent Parsing Helpers ─── */

/**
 * Detects the device type from a user-agent string.
 * Checks for mobile first, then tablet, defaults to desktop.
 * @param ua - The raw user-agent string
 * @returns "mobile" | "desktop" | "tablet"
 */
function detectDevice(ua: string): "mobile" | "desktop" | "tablet" {
  if (!ua) return "desktop";
  if (MOBILE_UA_PATTERN.test(ua)) return "mobile";
  if (TABLET_UA_PATTERN.test(ua)) return "tablet";
  return "desktop";
}

/**
 * Detects the browser name from a user-agent string.
 * Tests against known browser patterns in priority order (Edge before Chrome).
 * @param ua - The raw user-agent string
 * @returns Browser name string (Chrome, Safari, Firefox, Edge, Opera, or Other)
 */
function detectBrowser(ua: string): string {
  if (!ua) return "Other";
  for (const [pattern, name] of BROWSER_PATTERNS) {
    if (pattern.test(ua)) return name;
  }
  return "Other";
}

/**
 * Detects the operating system from a user-agent string.
 * Tests against known OS patterns in priority order.
 * @param ua - The raw user-agent string
 * @returns OS name string (iOS, Android, Windows, Mac, Linux, or Other)
 */
function detectOS(ua: string): string {
  if (!ua) return "Other";
  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(ua)) return name;
  }
  return "Other";
}

/**
 * Hashes an IP address using SHA-256 so the raw IP is never stored.
 * Uses the Web Crypto API available in Edge Runtime and Node.js 18+.
 * @param ip - The raw IP address string
 * @returns Hex-encoded SHA-256 hash of the IP
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── URL Safety ─── */

/**
 * Validates that a URL is safe to redirect to.
 * Only allows https:// protocol to prevent open-redirect abuse
 * (javascript:, data:, http:, file:, etc. are rejected).
 * @param url - URL string to validate
 * @returns True if safe to redirect
 */
function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/* ─── Route Handler ─── */

/**
 * GET handler for /go/[slug].
 * Looks up the smart link, validates it, logs the click asynchronously,
 * and returns a 302 redirect to the target URL.
 *
 * Performance: The redirect response is returned immediately.
 * Click logging uses waitUntil-style fire-and-forget via an unawaited promise
 * so the user is not blocked by database writes.
 *
 * @param request - Incoming Next.js request
 * @param context - Route params containing the slug
 * @returns Redirect response or error response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  /* ── Look up the smart link ── */
  const { data: link, error } = await supabase
    .from("smart_links")
    .select("id, target_url, is_active, expires_at, fallback_url")
    .eq("slug", slug)
    .single();

  /* Not found */
  if (error || !link) {
    return new NextResponse("Not Found", { status: 404 });
  }

  /* Paused */
  if (!link.is_active) {
    return new NextResponse("Not Found", { status: 404 });
  }

  /* Expired — redirect to fallback or return 410 Gone */
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    if (link.fallback_url && isSafeRedirectUrl(link.fallback_url)) {
      return NextResponse.redirect(link.fallback_url, 302);
    }
    return new NextResponse("Gone", { status: HTTP_GONE });
  }

  /* ── Fire-and-forget click logging ── */
  const ua = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const ip = getClientIp(request.headers);

  /* Do not await — let the redirect happen immediately */
  logClick(supabase, link.id, ip, ua, referrer).catch((err) => {
    console.error("Smart link click logging failed:", err);
  });

  /* ── 302 Redirect ── */
  if (!isSafeRedirectUrl(link.target_url)) {
    return new NextResponse("Invalid redirect target", { status: 400 });
  }
  return NextResponse.redirect(link.target_url, 302);
}

/**
 * Logs a click event to the smart_link_clicks table.
 * Called as fire-and-forget so it does not block the redirect response.
 *
 * @param supabase - Admin Supabase client instance
 * @param linkId - The smart link UUID
 * @param ip - Raw IP address (will be hashed before storage)
 * @param ua - User-agent string
 * @param referrer - Referrer header value
 */
async function logClick(
  supabase: ReturnType<typeof createAdminClient>,
  linkId: string,
  ip: string,
  ua: string,
  referrer: string
): Promise<void> {
  const ipHash = await hashIP(ip);

  const { error } = await supabase.from("smart_link_clicks").insert({
    link_id: linkId,
    clicked_at: new Date().toISOString(),
    ip_hash: ipHash,
    country: "",
    city: "",
    device_type: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    referrer: referrer || null,
    user_agent: ua || null,
  });

  if (error) {
    console.error("Failed to insert smart_link_click:", error);
  }
}
