import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface LeadPayload {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  page_id?: string | null;
  program_id?: string | null;
  program_interest?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  cookie_id?: string | null;
  device_type?: "desktop" | "mobile" | "tablet" | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadPayload;

    // Validate required fields
    if (!body.full_name || body.full_name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (body.phone && !/^[\d\-+() ]{7,15}$/.test(body.phone)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate or use existing cookie_id
    let cookieId = body.cookie_id || null;
    if (!cookieId) {
      cookieId = crypto.randomUUID();
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        full_name: body.full_name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        page_id: body.page_id || null,
        program_id: body.program_id || null,
        program_interest: body.program_interest || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        referrer: body.referrer || null,
        cookie_id: cookieId,
        device_type: body.device_type || null,
        webhook_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Lead insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 }
      );
    }

    // Fire async webhook to Make.com
    fireWebhook(supabase, lead).catch((err) =>
      console.error("Webhook fire failed:", err)
    );

    // Build response with first-party cookie
    const response = NextResponse.json(
      { success: true, id: lead.id },
      { status: 201 }
    );

    // Set first-party cookie (365 days)
    response.cookies.set("onoleads_id", cookieId, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function fireWebhook(
  supabase: ReturnType<typeof createAdminClient>,
  lead: Record<string, unknown>
) {
  try {
    // Get webhook URL from settings table
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "make_webhook_url")
      .single();

    const webhookUrl = settings?.value;
    if (!webhookUrl || typeof webhookUrl !== "string") {
      // No webhook configured, mark as sent (nothing to do)
      await supabase
        .from("leads")
        .update({ webhook_status: "sent" })
        .eq("id", lead.id);
      return;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: lead.id,
        full_name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        page_id: lead.page_id,
        program_id: lead.program_id,
        program_interest: lead.program_interest,
        utm_source: lead.utm_source,
        utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign,
        utm_content: lead.utm_content,
        utm_term: lead.utm_term,
        referrer: lead.referrer,
        device_type: lead.device_type,
        created_at: lead.created_at,
      }),
    });

    await supabase
      .from("leads")
      .update({ webhook_status: res.ok ? "sent" : "failed" })
      .eq("id", lead.id);
  } catch (err) {
    console.error("Webhook error:", err);
    await supabase
      .from("leads")
      .update({ webhook_status: "failed" })
      .eq("id", lead.id);
  }
}
