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

/** Minimum seconds a real user takes to fill the form (bots submit instantly) */
const FORM_MIN_AGE_MS = 4000;
/** Maximum form token age — tokens older than this are stale */
const FORM_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
/** Seconds between submissions from the same session (cookie_id + IP) */
const SESSION_COOLDOWN_MS = 15000;
/** Minimum behavior score to accept (0–100) — below this is bot-like */
const MIN_BEHAVIOR_SCORE = 20;

/** In-memory store for session cooldown: key → last submit timestamp */
const recentSubmissions = new Map<string, number>();

/**
 * Validates the form time token (base64-encoded {t, n}).
 * Rejects if submitted too quickly (< 4s) or token is stale (> 15min).
 */
function validateFormToken(tokenStr: string | null | undefined): { ok: boolean; reason?: string } {
  if (!tokenStr) return { ok: false, reason: "missing_token" };
  try {
    const decoded = JSON.parse(Buffer.from(tokenStr, "base64").toString("utf-8"));
    if (!decoded || typeof decoded.t !== "number" || typeof decoded.n !== "string") {
      return { ok: false, reason: "invalid_format" };
    }
    const age = Date.now() - decoded.t;
    if (age < FORM_MIN_AGE_MS) return { ok: false, reason: "too_fast" };
    if (age > FORM_MAX_AGE_MS) return { ok: false, reason: "expired" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "parse_error" };
  }
}

/**
 * Checks session cooldown — same cookie_id+IP must not submit more than once per 15s.
 * Returns false if within cooldown window.
 */
function checkSessionCooldown(key: string): boolean {
  const last = recentSubmissions.get(key);
  if (last && Date.now() - last < SESSION_COOLDOWN_MS) return false;
  recentSubmissions.set(key, Date.now());
  /* Prevent unbounded growth — prune entries older than 2× cooldown */
  if (recentSubmissions.size > 500) {
    const cutoff = Date.now() - SESSION_COOLDOWN_MS * 2;
    Array.from(recentSubmissions.entries()).forEach(([k, v]) => {
      if (v < cutoff) recentSubmissions.delete(k);
    });
  }
  return true;
}

/** Allowed webhook destination hosts — prevents SSRF via settings table manipulation */
const ALLOWED_WEBHOOK_HOSTS = [
  // Make.com / Celonis (all regions — Make rebranded under celonis.com)
  "hook.eu1.make.com",
  "hook.eu2.make.com",
  "hook.us1.make.com",
  "hook.us2.make.com",
  "hook.make.com",
  "hook.eu1.make.celonis.com",
  "hook.eu2.make.celonis.com",
  "hook.us1.make.celonis.com",
  "hook.us2.make.celonis.com",
  "hook.make.celonis.com",
  // Zapier
  "hooks.zapier.com",
  // n8n cloud
  "n8n.cloud",
  "app.n8n.cloud",
  // Additional domains from env variable (comma-separated)
  ...(process.env.WEBHOOK_EXTRA_HOSTS ? process.env.WEBHOOK_EXTRA_HOSTS.split(",").map((h) => h.trim()).filter(Boolean) : []),
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
  /* Bot protection signals */
  form_token: z.string().optional().nullable(),
  behavior_score: z.number().min(0).max(100).optional().nullable(),
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

    /* --- Time token validation --- */
    const tokenResult = validateFormToken(data.form_token);
    if (!tokenResult.ok) {
      writeAuditLog({
        action: "form_token_invalid",
        metadata: { reason: tokenResult.reason },
      }).catch(() => {});

      if (tokenResult.reason === "too_fast") {
        /* Silent success to avoid tipping off the bot */
        return NextResponse.json({ success: true, id: "00000000-0000-0000-0000-000000000000" }, { status: 201 });
      }
      return NextResponse.json(
        { error: "הטופס פג תוקף. אנא רעננו את הדף ונסו שוב." },
        { status: 400 }
      );
    }

    /* --- Session cooldown (15s between submissions, same cookie+IP) --- */
    const cookieIdForCooldown = (body as Record<string, unknown>)?.cookie_id as string | undefined;
    const cooldownKey = `${clientIp}:${cookieIdForCooldown || "anonymous"}`;
    if (!checkSessionCooldown(cooldownKey)) {
      writeAuditLog({
        action: "session_cooldown_blocked",
        metadata: { cooldown_ms: SESSION_COOLDOWN_MS },
      }).catch(() => {});

      return NextResponse.json(
        { error: "אנא המתינו מספר שניות לפני שליחה נוספת." },
        { status: 429 }
      );
    }

    /* --- Behavioral score check --- */
    const behaviorScore = data.behavior_score ?? 0;
    if (behaviorScore < MIN_BEHAVIOR_SCORE) {
      writeAuditLog({
        action: "behavior_score_too_low",
        metadata: { score: behaviorScore },
      }).catch(() => {});

      /* Silent success — bot should not learn our threshold */
      return NextResponse.json({ success: true, id: "00000000-0000-0000-0000-000000000000" }, { status: 201 });
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

    /* Referrer: if it's our own domain treat as "direct" */
    const OWN_DOMAINS = ["onoleads.vercel.app", "localhost"];
    const rawReferrerDomain = extractDomain(data.referrer);
    const referrerDomain = rawReferrerDomain && OWN_DOMAINS.some((d) => rawReferrerDomain.includes(d))
      ? null
      : rawReferrerDomain;

    const utmSource = data.utm_source ? sanitizeGeneral(data.utm_source) : null;
    const utmMedium = data.utm_medium ? sanitizeGeneral(data.utm_medium) : null;
    const utmCampaign = data.utm_campaign ? sanitizeGeneral(data.utm_campaign) : null;
    const utmContent = data.utm_content ? sanitizeGeneral(data.utm_content) : null;
    const utmTerm = data.utm_term ? sanitizeGeneral(data.utm_term) : null;

    /* --- Build Make.com-friendly webhook payload ---
     * All UTM fields always included (empty string if no value).
     * referrer_domain = "direct" when visitor arrived directly. */
    const webhookPayload: Record<string, string> = {
      full_name: nameResult.value,
      phone: sanitizedPhone || "",
      email: sanitizedEmail || "",
      page_id: pageId || "",
      page_slug: data.page_slug ? sanitizeGeneral(data.page_slug) : "",
      interest_area: data.interest_area ? sanitizeGeneral(data.interest_area) : "",
      program_id: data.program_id ? sanitizeGeneral(data.program_id) : "",
      program_interest: data.program_interest ? sanitizeGeneral(data.program_interest) : "",
      device_type: data.device_type || "",
      referrer_domain: referrerDomain || "direct",
      utm_source: utmSource || "",
      utm_medium: utmMedium || "",
      utm_campaign: utmCampaign || "",
      utm_content: utmContent || "",
      utm_term: utmTerm || "",
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
    /* Check per-page webhook override first, then fall back to global */
    let webhookUrl: string | null = null;

    const pageId = payload.page_id as string | null;
    if (pageId) {
      const { data: pageData } = await supabase
        .from("pages")
        .select("custom_styles")
        .eq("id", pageId)
        .single();
      const cs = pageData?.custom_styles as Record<string, unknown> | null;
      /* Page overrides are stored under custom_styles.page_settings */
      const pageSettings = (cs?.page_settings || cs) as Record<string, string> | null;
      const pageWebhook = pageSettings?.webhook_url;
      if (pageWebhook && typeof pageWebhook === "string" && pageWebhook.trim()) {
        webhookUrl = pageWebhook.trim();
      }
    }

    if (!webhookUrl) {
      /* Fetch all relevant keys in one query — supports both old (make_webhook_url) and new (webhook_url) key names */
      const { data: settingsRows } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["webhook_url", "make_webhook_url"]);

      const settingsMap: Record<string, string> = {};
      for (const row of settingsRows || []) {
        /* value column is JSONB — unwrap if stored as a JSON-encoded string */
        const raw = row.value;
        settingsMap[row.key] = typeof raw === "string" ? raw : (raw as Record<string, unknown>)?.toString?.() ?? "";
      }

      webhookUrl = (settingsMap["webhook_url"] || settingsMap["make_webhook_url"] || "").trim() || null;
    }

    if (!webhookUrl) {
      /* No webhook configured — skip silently */
      console.log("[webhook] no URL configured, skipping");
      return true;
    }

    /* Strip surrounding quotes if the value was double-encoded in JSONB */
    if (webhookUrl.startsWith('"') && webhookUrl.endsWith('"')) {
      webhookUrl = webhookUrl.slice(1, -1);
    }

    /* Validate webhook URL against allowlist to prevent SSRF */
    let parsedHost: string;
    try {
      parsedHost = new URL(webhookUrl).hostname;
    } catch {
      console.error("[webhook] invalid URL:", webhookUrl);
      return false;
    }

    if (!ALLOWED_WEBHOOK_HOSTS.includes(parsedHost)) {
      console.error("[webhook] host not in allowlist:", parsedHost);
      return false;
    }

    console.log("[webhook] firing to", parsedHost);

    const result = await sendWebhookWithRetry(webhookUrl, payload, null);
    console.log("[webhook] result:", result);
    return result.success;
  } catch (err) {
    console.error("Webhook error:", err);
    return false;
  }
}
