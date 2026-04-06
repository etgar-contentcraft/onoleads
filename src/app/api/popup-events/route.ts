/**
 * API endpoint for tracking popup campaign analytics events.
 * Accepts view, dismiss, and cta_click events and increments
 * the corresponding counter on the popup_campaigns table.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { z } from "zod";

/** Valid event types for popup campaigns */
const VALID_EVENT_TYPES = ["view", "dismiss", "cta_click", "form_submit"] as const;

/** Maximum allowed events per IP per minute */
const MAX_EVENTS_PER_MINUTE = 30;

/** Zod schema for validating the request body */
const popupEventSchema = z.object({
  campaign_id: z.string().uuid("campaign_id must be a valid UUID"),
  event_type: z.enum(VALID_EVENT_TYPES),
});

/**
 * POST /api/popup-events
 * Records a popup event and increments the relevant campaign counter.
 *
 * Body: { campaign_id: string (UUID), event_type: string }
 */
export async function POST(request: Request) {
  try {
    /* --- Rate limiting --- */
    const clientIp = getClientIp(request.headers);
    const rateLimitResult = checkRateLimit(clientIp, MAX_EVENTS_PER_MINUTE, 60_000, "popup");

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();

    /* --- Validate request body with zod --- */
    const parsed = popupEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const { campaign_id, event_type } = parsed.data;

    // Use admin client — landing page visitors are unauthenticated, and the
    // settings/popup_campaigns table requires auth. Admin client bypasses RLS.
    const supabase = createAdminClient();

    /* --- Increment the appropriate counter on the campaign --- */
    if (event_type === "view") {
      const { error } = await supabase.rpc("increment_campaign_views", { cid: campaign_id });
      if (error) {
        console.error("increment_campaign_views RPC error:", error);
        return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
      }
    } else if (event_type === "cta_click" || event_type === "form_submit") {
      const { error } = await supabase.rpc("increment_campaign_conversions", { cid: campaign_id });
      if (error) {
        console.error("increment_campaign_conversions RPC error:", error);
        return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
      }
    }
    /* "dismiss" events are tracked but don't increment counters */

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
