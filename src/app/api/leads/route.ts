/**
 * Lead submission API endpoint (privacy-first).
 * PII is forwarded ONLY via webhook to Make.com — never stored in the database.
 * An anonymous form_submit event is logged for analytics.
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

/** Allowed webhook destination hosts — prevents SSRF via settings table manipulation */
const ALLOWED_WEBHOOK_HOSTS = [
  "hook.eu1.make.com",
  "hook.eu2.make.com",
  "hook.us1.make.com",
  "hook.us2.make.com",
  "hook.make.com",
];

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
  lead_source: z.string().optional().nullable(),
  page_slug: z.string().optional().nullable(),
  interest_area: z.string().optional().nullable(),
  /* Honeypot field — should always be empty for real users */
  website: z.string().optional().nullable(),
});

/**
 * Extracts the domain from a full URL or referrer string.
 * Returns only the hostname — never the full path (which may contain PII).
 * @param referrer - Full referrer URL
 * @returns Domain string or null
 */
function extractDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/**
 * Handles POST requests for lead form submissions.
 * Validates, sanitizes, fires webhook with PII, logs anonymous analytics event.
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);

  try {
    /* --- Rate limiting --- */
    const rateResult = checkRateLimit(clientIp, MAX_SUBMISSIONS_PER_MINUTE);
    if (!rateResult.allowed) {
      writeAuditLog({
        action: "rate_limit_exceeded",
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

    /* --- Prepare anonymous analytics data (NO PII) --- */
    const supabase = createAdminClient();
    const cookieId = data.cookie_id || crypto.randomUUID();
    const pageId = data.page_id ? sanitizeGeneral(data.page_id) : null;
    const referrerDomain = extractDomain(data.referrer);

    const utmSource = data.utm_source ? sanitizeGeneral(data.utm_source) : null;
    const utmMedium = data.utm_medium ? sanitizeGeneral(data.utm_medium) : null;
    const utmCampaign = data.utm_campaign ? sanitizeGeneral(data.utm_campaign) : null;
    const utmContent = data.utm_content ? sanitizeGeneral(data.utm_content) : null;
    const utmTerm = data.utm_term ? sanitizeGeneral(data.utm_term) : null;

    /* --- Fire webhook with full PII (transient — not stored) --- */
    const webhookPayload = {
      full_name: nameResult.value,
      phone: sanitizedPhone,
      email: sanitizedEmail,
      page_id: pageId,
      page_slug: data.page_slug ? sanitizeGeneral(data.page_slug) : null,
      interest_area: data.interest_area ? sanitizeGeneral(data.interest_area) : null,
      program_id: data.program_id ? sanitizeGeneral(data.program_id) : null,
      program_interest: data.program_interest ? sanitizeGeneral(data.program_interest) : null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      referrer: data.referrer ? sanitizeGeneral(data.referrer) : null,
      device_type: data.device_type || null,
      created_at: new Date().toISOString(),
    };

    let webhookStatus = "sent";
    try {
      const result = await fireWebhook(supabase, webhookPayload);
      webhookStatus = result ? "sent" : "failed";
    } catch {
      webhookStatus = "failed";
    }

    /* --- Insert anonymous analytics event (NO PII stored) --- */
    const { error: insertError } = await supabase
      .from("analytics_events")
      .insert({
        event_type: "form_submit",
        page_id: pageId,
        cookie_id: cookieId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        referrer_domain: referrerDomain,
        device_type: data.device_type || null,
        webhook_status: webhookStatus,
        lead_source: data.lead_source ? sanitizeGeneral(data.lead_source) : null,
      });

    if (insertError) {
      console.error("Analytics event insert error:", insertError);
    }

    /* --- Audit log (no PII — only page_id and status) --- */
    writeAuditLog({
      action: "lead_submitted",
      resource_type: "analytics_event",
      metadata: {
        page_id: pageId,
        webhook_status: webhookStatus,
      },
    }).catch(() => {});

    /* --- Build response with first-party cookie --- */
    const response = NextResponse.json(
      { success: true },
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
 * CSRF token endpoint — generates a fresh token for forms.
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
 * PII is sent transiently — never stored in our database.
 * @param supabase - Supabase admin client
 * @param payload - Webhook payload with lead data
 * @returns true if webhook succeeded, false otherwise
 */
async function fireWebhook(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    /* Get webhook URL from settings */
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "make_webhook_url")
      .single();

    const webhookUrl = settings?.value;
    if (!webhookUrl || typeof webhookUrl !== "string") {
      /* No webhook configured — skip silently */
      return true;
    }

    /* Validate webhook URL against allowlist to prevent SSRF */
    try {
      const parsed = new URL(webhookUrl);
      if (!ALLOWED_WEBHOOK_HOSTS.includes(parsed.hostname)) {
        console.error("Webhook URL host not in allowlist:", parsed.hostname);
        return false;
      }
    } catch {
      console.error("Invalid webhook URL:", webhookUrl);
      return false;
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

    const result = await sendWebhookWithRetry(webhookUrl, payload, webhookSecret);
    return result.success;
  } catch (err) {
    console.error("Webhook error:", err);
    return false;
  }
}
