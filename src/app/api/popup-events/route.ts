/**
 * API endpoint for tracking popup campaign analytics events.
 * Accepts view, dismiss, and cta_click events and increments
 * the corresponding counter on the popup_campaigns table.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Valid event types for popup campaigns */
const VALID_EVENT_TYPES = ["view", "dismiss", "cta_click", "form_submit"] as const;

/** Maximum allowed length for string fields to prevent abuse */
const MAX_FIELD_LENGTH = 100;

/**
 * POST /api/popup-events
 * Records a popup event and increments the relevant campaign counter.
 *
 * Body: { campaign_id: string, page_id?: string, event_type: string, device_type?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaign_id, page_id, event_type, device_type } = body;

    // Validate required fields
    if (!campaign_id || typeof campaign_id !== "string" || campaign_id.length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: "Invalid campaign_id" }, { status: 400 });
    }

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    const supabase = await createClient();

    // Increment the appropriate counter on the campaign
    if (event_type === "view") {
      await supabase.rpc("increment_campaign_views", { cid: campaign_id });
    } else if (event_type === "cta_click" || event_type === "form_submit") {
      await supabase.rpc("increment_campaign_conversions", { cid: campaign_id });
    }
    // "dismiss" events are tracked but don't increment counters

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
