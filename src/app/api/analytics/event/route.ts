/**
 * Anonymous analytics event tracking endpoint.
 * Accepts page_view, cta_click, popup_view, popup_dismiss events.
 * No PII is stored — only anonymous cookie ID, UTM params, and device type.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { sanitizeGeneral } from "@/lib/security/sanitize";

/** Maximum analytics events per IP per minute */
const MAX_EVENTS_PER_MINUTE = 30;

/** Valid event types for this endpoint (form_submit is handled by /api/leads) */
const ALLOWED_EVENT_TYPES = ["page_view", "cta_click", "popup_view", "popup_dismiss", "scroll_depth"] as const;

/** Zod schema for analytics event payloads */
const eventSchema = z.object({
  event_type: z.enum(ALLOWED_EVENT_TYPES),
  page_id: z.string().uuid().optional().nullable(),
  cookie_id: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  referrer_domain: z.string().optional().nullable(),
  device_type: z.enum(["desktop", "mobile", "tablet"]).optional().nullable(),
  /** Scroll depth percentage (0–100) — only sent with scroll_depth events */
  scroll_depth: z.number().int().min(0).max(100).optional().nullable(),
  /** Time on page in seconds — sent on page unload */
  time_on_page: z.number().int().min(0).optional().nullable(),
  /** Section identifier for section-level click events */
  section_id: z.string().max(100).optional().nullable(),
});

/**
 * Extracts domain from a URL string.
 * @param url - Full URL or domain string
 * @returns Hostname only, or the original string if already a domain
 */
function cleanDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return sanitizeGeneral(url.slice(0, 100));
  }
}

/**
 * POST /api/analytics/event
 * Records an anonymous analytics event.
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);

  /* --- Rate limiting --- */
  const rateResult = checkRateLimit(clientIp, MAX_EVENTS_PER_MINUTE);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "rate_limit" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  /* --- Parse and validate --- */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parseResult = eventSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  const data = parseResult.data;

  /* --- Insert anonymous event --- */
  const supabase = createAdminClient();
  const { error } = await supabase.from("analytics_events").insert({
    event_type: data.event_type,
    page_id: data.page_id || null,
    cookie_id: data.cookie_id || null,
    utm_source: data.utm_source ? sanitizeGeneral(data.utm_source) : null,
    utm_medium: data.utm_medium ? sanitizeGeneral(data.utm_medium) : null,
    utm_campaign: data.utm_campaign ? sanitizeGeneral(data.utm_campaign) : null,
    utm_content: data.utm_content ? sanitizeGeneral(data.utm_content) : null,
    utm_term: data.utm_term ? sanitizeGeneral(data.utm_term) : null,
    referrer_domain: cleanDomain(data.referrer_domain),
    device_type: data.device_type || null,
    scroll_depth: data.scroll_depth ?? null,
    time_on_page: data.time_on_page ?? null,
    section_id: data.section_id ? sanitizeGeneral(data.section_id.slice(0, 100)) : null,
  });

  if (error) {
    console.error("Analytics event insert error:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
