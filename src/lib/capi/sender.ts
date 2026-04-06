/**
 * Server-side CAPI (Conversions API) senders for Meta, Google, and TikTok.
 *
 * Design:
 * - All functions are fire-and-continue: call without await from the leads API route
 * - PII is hashed in-flight and never logged
 * - Click IDs (gclid, fbc, ttclid) passed from client for better match rates
 * - Uses existing sendWebhookWithRetry for retries + consistent error handling
 * - All CAPI calls require marketing_consent=true from the client
 */

import { buildMetaUserData, buildTikTokContactInfo, hashPii, hashPhone } from "./hash-pii";
import { CAPI_ENDPOINTS } from "./endpoints";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebhookWithRetry } from "@/lib/security/webhook";
import { decryptToken, isEncryptedToken } from "@/lib/security/token-encryption";

// ============================================================================
// Types
// ============================================================================

export interface CAPILeadPayload {
  /** Dedup event ID — shared with browser pixel */
  eventId: string;
  /** Sanitized email (never log this) */
  email: string | null;
  /** Sanitized phone in Israeli format (never log this) */
  phone: string | null;
  /** Source URL of the landing page */
  sourceUrl: string;
  /** Client IP from request headers */
  clientIp: string;
  /** User-agent from request headers */
  userAgent: string;
  /** Click IDs from client localStorage */
  gclid?: string | null;
  fbclid?: string | null;
  fbc?: string | null;          // fb.1.{ts}.{fbclid}
  ttclid?: string | null;
  /** Supabase page UUID */
  pageId: string | null;
  /** anonymous cookie ID */
  cookieId: string;
}

interface PixelRow {
  platform: string;
  is_enabled: boolean;
  pixel_id: string | null;
  access_token_enc: string | null;
  test_event_code: string | null;
  additional_config: Record<string, string | null>;
}

// ============================================================================
// Token decryption helper
// ============================================================================

function safeDecryptToken(enc: string | null): string | null {
  if (!enc || !isEncryptedToken(enc)) return null;
  try {
    return decryptToken(enc);
  } catch {
    // Log only that decryption failed, not the encrypted value
    console.error("[capi] Token decryption failed — check CAPI_TOKEN_MASTER_KEY");
    return null;
  }
}

// ============================================================================
// Fetch pixel configs from DB
// ============================================================================

async function loadPixelConfig(platform: string): Promise<PixelRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pixel_configurations")
      .select("platform, is_enabled, pixel_id, access_token_enc, test_event_code, additional_config")
      .eq("platform", platform)
      .single();
    return data as PixelRow | null;
  } catch {
    return null;
  }
}

// ============================================================================
// Meta Conversions API
// ============================================================================

/**
 * Sends a Lead event to Meta Conversions API (CAPI).
 * Fires only when Meta pixel is configured + enabled, and marketing consent given.
 * @param payload - Lead event data with PII (hashed in-flight)
 */
export async function sendMetaCAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("meta");
  if (!config?.is_enabled || !config.pixel_id) return;

  const accessToken = safeDecryptToken(config.access_token_enc);
  if (!accessToken) return;

  const eventTime = Math.floor(Date.now() / 1000);

  // Hash PII — never log these values
  const userData = buildMetaUserData(payload.email, payload.phone, null);

  // Add non-hashed signals
  const fullUserData: Record<string, unknown> = {
    ...userData,
    client_ip_address: payload.clientIp,
    client_user_agent: payload.userAgent,
    external_id: hashPii(payload.cookieId),
  };
  if (payload.fbc) fullUserData.fbc = payload.fbc;
  // _fbp cookie is set by the Meta Pixel — pass it if stored
  if (payload.fbclid && !payload.fbc) {
    // Construct fbc if not already done client-side
    fullUserData.fbc = `fb.1.${Date.now()}.${payload.fbclid}`;
  }

  const body = {
    data: [{
      event_name: "Lead",
      event_time: eventTime,
      event_id: payload.eventId,
      event_source_url: payload.sourceUrl,
      action_source: "website",
      user_data: fullUserData,
    }],
    // test_event_code: only include in non-production — null in prod
    ...(config.test_event_code ? { test_event_code: config.test_event_code } : {}),
  };

  const url = `${CAPI_ENDPOINTS.meta}/${config.pixel_id}/events?access_token=${accessToken}`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(url, body as Record<string, unknown>, null);

  logCapiResult("meta", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// Google Enhanced Conversions
// ============================================================================

/**
 * Sends a conversion to Google Ads via the Offline Conversions API.
 * Only fires when gclid is present and not expired.
 * @param payload - Lead event data
 */
export async function sendGoogleCAPI(payload: CAPILeadPayload): Promise<void> {
  if (!payload.gclid) return; // Google CAPI requires a click ID

  const config = await loadPixelConfig("google");
  if (!config?.is_enabled || !config.pixel_id) return;

  const accessToken = safeDecryptToken(config.access_token_enc);
  if (!accessToken) return;

  const conversionLabel = config.additional_config?.conversion_label;
  if (!conversionLabel) return;

  // Google Ads conversion time format: "YYYY-MM-DD HH:MM:SS+HH:MM"
  const now = new Date();
  const offset = "+03:00"; // Israel Time (IST)
  const conversionTime = now.toISOString().replace("T", " ").replace("Z", "") + offset;

  const customerId = config.pixel_id.replace(/^AW-/, "");

  const body = {
    conversions: [{
      gclid: payload.gclid,
      conversion_action: `customers/${customerId}/conversionActions/${conversionLabel}`,
      conversion_date_time: conversionTime,
      conversion_value: 1.0,
      currency_code: "ILS",
      order_id: payload.eventId,
      user_identifiers: [
        {
          hashed_email: hashPii(payload.email),
          hashed_phone_number: hashPhone(payload.phone),
        },
      ],
    }],
    partial_failure: true,
  };

  const url = `${CAPI_ENDPOINTS.google}/customers/${customerId}:uploadClickConversions`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(
    url,
    body as Record<string, unknown>,
    null,
    { Authorization: `Bearer ${accessToken}` }
  );

  logCapiResult("google", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// TikTok Events API (CAPI)
// ============================================================================

/**
 * Sends a SubmitForm event to TikTok Events API.
 * @param payload - Lead event data
 */
export async function sendTikTokCAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("tiktok");
  if (!config?.is_enabled || !config.pixel_id) return;

  const accessToken = safeDecryptToken(config.access_token_enc);
  if (!accessToken) return;

  const contactInfo = buildTikTokContactInfo(payload.email, payload.phone);

  const body = {
    pixel_code: config.pixel_id,
    event_source: "web",
    partner_name: "onoleads",
    data: [{
      event: "SubmitForm",
      event_id: payload.eventId,
      event_time: Math.floor(Date.now() / 1000),
      user: {
        ...contactInfo,
        ...(payload.ttclid ? { ttclid: payload.ttclid } : {}),
        external_id: hashPii(payload.cookieId),
        ip: payload.clientIp,
        user_agent: payload.userAgent,
      },
      properties: {
        url: payload.sourceUrl,
      },
      page: {
        url: payload.sourceUrl,
      },
    }],
  };

  const url = `${CAPI_ENDPOINTS.tiktok}/event/track/`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(
    url,
    body as Record<string, unknown>,
    null,
    { "Access-Token": accessToken }
  );

  logCapiResult("tiktok", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// Fire all CAPI platforms in parallel
// ============================================================================

/**
 * Fires all enabled CAPI platforms simultaneously.
 * Non-blocking: errors from one platform don't affect others.
 * Gated on marketing_consent — never fires without explicit user consent.
 *
 * @param payload - Lead event data (PII will be hashed in-flight, never logged)
 * @param marketingConsent - Whether user has consented to marketing tracking
 */
export async function fireAllCAPI(
  payload: CAPILeadPayload,
  marketingConsent: boolean
): Promise<void> {
  if (!marketingConsent) return;

  await Promise.allSettled([
    sendMetaCAPI(payload).catch((err) => {
      console.error("[capi:meta]", { error: err.message, page: payload.pageId });
    }),
    sendGoogleCAPI(payload).catch((err) => {
      console.error("[capi:google]", { error: err.message, page: payload.pageId });
    }),
    sendTikTokCAPI(payload).catch((err) => {
      console.error("[capi:tiktok]", { error: err.message, page: payload.pageId });
    }),
  ]);
}

// ============================================================================
// Audit logging (no PII)
// ============================================================================

function logCapiResult(
  platform: string,
  eventId: string,
  pageId: string | null,
  success: boolean,
  httpStatus: number | undefined,
  durationMs: number
): void {
  try {
    const supabase = createAdminClient();
    void supabase.from("capi_event_log").insert({
      platform,
      event_name: "Lead",
      page_id: pageId,
      success,
      http_status: httpStatus,
      duration_ms: durationMs,
    });
  } catch {
    // Audit log failure is non-critical
  }
}
