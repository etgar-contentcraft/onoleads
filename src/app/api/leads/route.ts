/**
 * Lead submission API endpoint.
 * Handles form submissions with input validation, rate limiting,
 * CSRF protection, bot detection, and audit logging.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeGeneral, isBot } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { validateCsrfToken } from "@/lib/security/csrf";
import { writeAuditLog } from "@/lib/security/audit-log";
import { sendWebhookWithRetry } from "@/lib/security/webhook";

/** Maximum lead submissions per IP per minute */
const MAX_SUBMISSIONS_PER_MINUTE = 5;

/** Zod schema for validating lead submission payloads */
const leadSchema = z.object({
  full_name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  page_id: z.string().optional().nullable(),
  program_id: z.string().optional().nullable(),
  program_interest: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  cookie_id: z.string().optional().nullable(),
  device_type: z.enum(["desktop", "mobile", "tablet"]).optional().nullable(),
  csrf_token: z.string().optional().nullable(),
  /* Honeypot field - should always be empty for real users */
  website: z.string().optional().nullable(),
});

/**
 * Handles POST requests for lead form submissions.
 * Validates input, checks rate limits, verifies CSRF, detects bots,
 * sanitizes data, stores in Supabase, and fires webhook.
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") || "";

  try {
    /* --- Rate limiting --- */
    const rateResult = checkRateLimit(clientIp, MAX_SUBMISSIONS_PER_MINUTE);
    if (!rateResult.allowed) {
      writeAuditLog({
        action: "rate_limit_exceeded",
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { remaining: rateResult.remaining },
      }).catch(() => {});

      return NextResponse.json(
        { error: "יותר מדי בקשות. אנא נסו שוב בעוד דקה." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateResult.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    /* --- Parse and validate request body --- */
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "גוף הבקשה אינו תקין" },
        { status: 400 }
      );
    }

    const parseResult = leadSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "נתונים לא תקינים" },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    /* --- Honeypot bot detection --- */
    if (isBot(data.website)) {
      writeAuditLog({
        action: "bot_detected",
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { honeypot_value: data.website },
      }).catch(() => {});

      /* Return success to avoid tipping off the bot */
      return NextResponse.json(
        { success: true, id: "00000000-0000-0000-0000-000000000000" },
        { status: 201 }
      );
    }

    /* --- CSRF validation --- */
    const csrfCookie = request.cookies.get("csrf_token")?.value;
    if (!validateCsrfToken(csrfCookie, data.csrf_token)) {
      writeAuditLog({
        action: "csrf_validation_failed",
        ip_address: clientIp,
        user_agent: userAgent,
      }).catch(() => {});

      return NextResponse.json(
        { error: "אימות הטופס נכשל. אנא רעננו את הדף ונסו שוב." },
        { status: 403 }
      );
    }

    /* --- Sanitize all inputs --- */
    const nameResult = sanitizeName(data.full_name);
    if (!nameResult.valid) {
      return NextResponse.json(
        { error: "שם לא תקין. אנא הזינו שם מלא." },
        { status: 400 }
      );
    }

    let sanitizedPhone: string | null = null;
    if (data.phone && data.phone.trim()) {
      const phoneResult = sanitizePhone(data.phone);
      if (!phoneResult.valid) {
        return NextResponse.json(
          { error: "מספר טלפון לא תקין. אנא הזינו מספר ישראלי תקין." },
          { status: 400 }
        );
      }
      sanitizedPhone = phoneResult.value;
    }

    let sanitizedEmail: string | null = null;
    if (data.email && data.email.trim()) {
      const emailResult = sanitizeEmail(data.email);
      if (!emailResult.valid) {
        return NextResponse.json(
          { error: "כתובת אימייל לא תקינה." },
          { status: 400 }
        );
      }
      sanitizedEmail = emailResult.value;
    }

    /* --- Build sanitized payload --- */
    const supabase = createAdminClient();

    const cookieId = data.cookie_id || crypto.randomUUID();

    const insertPayload = {
      full_name: nameResult.value,
      phone: sanitizedPhone,
      email: sanitizedEmail,
      page_id: data.page_id ? sanitizeGeneral(data.page_id) : null,
      program_id: data.program_id ? sanitizeGeneral(data.program_id) : null,
      program_interest: data.program_interest ? sanitizeGeneral(data.program_interest) : null,
      utm_source: data.utm_source ? sanitizeGeneral(data.utm_source) : null,
      utm_medium: data.utm_medium ? sanitizeGeneral(data.utm_medium) : null,
      utm_campaign: data.utm_campaign ? sanitizeGeneral(data.utm_campaign) : null,
      utm_content: data.utm_content ? sanitizeGeneral(data.utm_content) : null,
      utm_term: data.utm_term ? sanitizeGeneral(data.utm_term) : null,
      referrer: data.referrer ? sanitizeGeneral(data.referrer) : null,
      cookie_id: cookieId,
      device_type: data.device_type || null,
      webhook_status: "pending" as const,
    };

    /* --- Insert lead into database --- */
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Lead insert error:", insertError);
      return NextResponse.json(
        { error: "אירעה שגיאה בשמירת הפרטים. אנא נסו שוב." },
        { status: 500 }
      );
    }

    /* --- Audit log: successful submission --- */
    writeAuditLog({
      action: "lead_submitted",
      resource_type: "lead",
      resource_id: lead.id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        page_id: insertPayload.page_id,
        program_id: insertPayload.program_id,
      },
    }).catch(() => {});

    /* --- Fire webhook asynchronously --- */
    fireWebhookSecure(supabase, lead, clientIp, userAgent).catch((err) =>
      console.error("Webhook fire failed:", err)
    );

    /* --- Build response with first-party cookie --- */
    const response = NextResponse.json(
      { success: true, id: lead.id },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": rateResult.remaining.toString(),
        },
      }
    );

    response.cookies.set("onoleads_id", cookieId, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json(
      { error: "אירעה שגיאה פנימית. אנא נסו שוב מאוחר יותר." },
      { status: 500 }
    );
  }
}

/**
 * CSRF token endpoint - generates a fresh token for forms.
 * Returns the token so the client can include it in form submissions.
 */
export async function GET(request: NextRequest) {
  const csrfToken = request.cookies.get("csrf_token")?.value;

  if (!csrfToken) {
    return NextResponse.json(
      { error: "CSRF token not available" },
      { status: 403 }
    );
  }

  return NextResponse.json({ csrf_token: csrfToken });
}

/**
 * Fires webhook with HMAC signing and retry logic.
 * @param supabase - Supabase admin client
 * @param lead - Lead record from database
 * @param clientIp - Client IP for audit logging
 * @param userAgent - User-Agent for audit logging
 */
async function fireWebhookSecure(
  supabase: ReturnType<typeof createAdminClient>,
  lead: Record<string, unknown>,
  clientIp: string,
  userAgent: string
) {
  try {
    /* Get webhook URL from settings */
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "make_webhook_url")
      .single();

    const webhookUrl = settings?.value;
    if (!webhookUrl || typeof webhookUrl !== "string") {
      await supabase
        .from("leads")
        .update({ webhook_status: "sent" })
        .eq("id", lead.id);
      return;
    }

    /* Get optional webhook secret for HMAC signing */
    const { data: secretSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "webhook_secret")
      .single();

    const webhookSecret =
      secretSetting?.value && typeof secretSetting.value === "string"
        ? secretSetting.value
        : process.env.WEBHOOK_SECRET || null;

    const webhookPayload = {
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
    };

    const result = await sendWebhookWithRetry(webhookUrl, webhookPayload, webhookSecret);

    const newStatus = result.success ? "sent" : "failed";
    await supabase
      .from("leads")
      .update({ webhook_status: newStatus })
      .eq("id", lead.id);

    /* Audit log webhook outcome */
    writeAuditLog({
      action: result.success ? "lead_webhook_sent" : "lead_webhook_failed",
      resource_type: "lead",
      resource_id: lead.id as string,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        status_code: result.statusCode,
        attempts: result.attempts,
      },
    }).catch(() => {});
  } catch (err) {
    console.error("Webhook error:", err);
    await supabase
      .from("leads")
      .update({ webhook_status: "failed" })
      .eq("id", lead.id);
  }
}
