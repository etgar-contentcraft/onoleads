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
  li_fat_id?: string | null;    // LinkedIn click ID
  obclid?: string | null;       // Outbrain click ID
  tblclid?: string | null;      // Taboola click ID
  twclid?: string | null;       // Twitter/X click ID
  /** Supabase page UUID */
  pageId: string | null;
  /** anonymous cookie ID */
  cookieId: string;
  /** Full name from form (used to derive fn/ln hashes — never log) */
  fullName?: string | null;
  /** _fbp cookie value set by Meta Pixel in browser */
  fbp?: string | null;
}

interface PixelRow {
  platform: string;
  is_enabled: boolean;
  pixel_id: string | null;
  access_token_enc: string | null;
  test_event_code: string | null;
  additional_config: Record<string, string | null>;
}

/** Splits a full name string into first/last components */
function splitName(fullName: string | null | undefined): { first: string | null; last: string | null } {
  if (!fullName?.trim()) return { first: null, last: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
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
  const { first, last } = splitName(payload.fullName);
  const userData = buildMetaUserData(payload.email, payload.phone, first, last);

  // Israel country hash — all leads are Israeli (hash of lowercase "il" per Meta spec)
  const countryHash = hashPii("il");

  // Add non-hashed signals
  const fullUserData: Record<string, unknown> = {
    ...userData,
    ...(countryHash ? { country: countryHash } : {}),
    client_ip_address: payload.clientIp,
    client_user_agent: payload.userAgent,
    external_id: hashPii(payload.cookieId),
  };
  // fbc from explicit click ID parameter
  if (payload.fbc) fullUserData.fbc = payload.fbc;
  else if (payload.fbclid) fullUserData.fbc = `fb.1.${Date.now()}.${payload.fbclid}`;
  // fbp from browser-side _fbp cookie (set by Meta Pixel)
  if (payload.fbp) fullUserData.fbp = payload.fbp;

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
      user_identifiers: (() => {
        const { first, last } = splitName(payload.fullName);
        const ids: Record<string, string | undefined> = {};
        const em = hashPii(payload.email);
        const ph = hashPhone(payload.phone);
        const fn = hashPii(first);
        const ln = hashPii(last);
        if (em) ids.hashed_email = em;
        if (ph) ids.hashed_phone_number = ph;
        if (fn) ids.hashed_first_name = fn;
        if (ln) ids.hashed_last_name = ln;
        return [ids];
      })(),
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
      user: (() => {
        const { first, last } = splitName(payload.fullName);
        const fn = hashPii(first);
        const ln = hashPii(last);
        const country = hashPii("il");
        return {
          ...contactInfo,
          ...(fn ? { hashed_first_name: fn } : {}),
          ...(ln ? { hashed_last_name: ln } : {}),
          ...(country ? { hashed_country: country } : {}),
          ...(payload.ttclid ? { ttclid: payload.ttclid } : {}),
          external_id: hashPii(payload.cookieId),
          ip: payload.clientIp,
          user_agent: payload.userAgent,
        };
      })(),
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
// GA4 Measurement Protocol (server-side)
// ============================================================================

/**
 * Sends a generate_lead event to GA4 via the Measurement Protocol.
 * Requires GA4 measurement_id (pixel_id) and api_secret (access_token_enc).
 * @param payload - Lead event data
 */
export async function sendGA4CAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("ga4");
  if (!config?.is_enabled || !config.pixel_id) return;

  const apiSecret = safeDecryptToken(config.access_token_enc);
  if (!apiSecret) return;

  const { first: ga4First, last: ga4Last } = splitName(payload.fullName);
  const userProps: Record<string, { value: string }> = {};
  if (payload.email) userProps.email = { value: payload.email };
  if (payload.phone) userProps.phone_number = { value: payload.phone };
  if (ga4First) userProps.first_name = { value: ga4First };
  if (ga4Last) userProps.last_name = { value: ga4Last };

  const body = {
    client_id: payload.cookieId || "server",
    ...(Object.keys(userProps).length > 0 ? { user_properties: userProps } : {}),
    events: [{
      name: "generate_lead",
      params: {
        event_id: payload.eventId,
        page_location: payload.sourceUrl,
        send_to: config.pixel_id,
      },
    }],
  };

  const url = `${CAPI_ENDPOINTS.ga4}?measurement_id=${encodeURIComponent(config.pixel_id)}&api_secret=${encodeURIComponent(apiSecret)}`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(url, body as Record<string, unknown>, null);
  logCapiResult("ga4", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// LinkedIn Conversions API
// ============================================================================

/**
 * Sends a Lead conversion to LinkedIn Conversions API.
 * Requires access token (access_token_enc) and conversion_id in additional_config.
 * @param payload - Lead event data
 */
export async function sendLinkedInCAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("linkedin");
  if (!config?.is_enabled || !config.pixel_id) return;

  const accessToken = safeDecryptToken(config.access_token_enc);
  if (!accessToken) return;

  const conversionId = config.additional_config?.conversion_id;
  if (!conversionId) return;

  const userIds: Array<Record<string, string>> = [];
  const emailHash = payload.email ? hashPii(payload.email) : null;
  const phoneHash = payload.phone ? hashPhone(payload.phone) : null;
  const { first, last } = splitName(payload.fullName);
  const fnHash = hashPii(first);
  const lnHash = hashPii(last);
  const countryHash = hashPii("il");
  if (emailHash) userIds.push({ idType: "SHA256_EMAIL", idValue: emailHash });
  if (phoneHash) userIds.push({ idType: "SHA256_PHONE", idValue: phoneHash });
  if (fnHash) userIds.push({ idType: "SHA256_FIRST_NAME", idValue: fnHash });
  if (lnHash) userIds.push({ idType: "SHA256_LAST_NAME", idValue: lnHash });
  if (countryHash) userIds.push({ idType: "SHA256_COUNTRY", idValue: countryHash });
  if (payload.li_fat_id) {
    userIds.push({ idType: "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID", idValue: payload.li_fat_id });
  }
  if (userIds.length === 0) return;

  const body = {
    conversion: `urn:lla:llaPartnerConversion:${conversionId}`,
    conversionHappenedAt: Date.now(),
    eventId: payload.eventId,
    user: { userIds },
  };

  const url = `${CAPI_ENDPOINTS.linkedin}/conversionEvents`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(url, body as Record<string, unknown>, null, {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": "202406",
    "X-Restli-Protocol-Version": "2.0.0",
  });
  logCapiResult("linkedin", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// Outbrain S2S Pixel
// ============================================================================

/**
 * Sends a Lead conversion to Outbrain via server-to-server pixel endpoint.
 * Requires ob_click_id from client — if missing, call is skipped (click ID required for attribution).
 * @param payload - Lead event data
 */
export async function sendOutbrainCAPI(payload: CAPILeadPayload): Promise<void> {
  if (!payload.obclid) return; // Outbrain S2S requires click ID

  const config = await loadPixelConfig("outbrain");
  if (!config?.is_enabled || !config.pixel_id) return;

  // Outbrain S2S: GET request with click ID and conversion data
  const params = new URLSearchParams({
    ob_click_id: payload.obclid,
    name: "Lead",
    orderid: payload.eventId,
    amount: "0",
    currency: "ILS",
  });

  const url = `${CAPI_ENDPOINTS.outbrain}?${params.toString()}`;

  const start = Date.now();
  // Outbrain S2S uses GET — sendWebhookWithRetry only does POST so fetch directly
  try {
    const res = await fetch(url, { method: "GET" });
    logCapiResult("outbrain", payload.eventId, payload.pageId, res.ok, res.status, Date.now() - start);
  } catch {
    logCapiResult("outbrain", payload.eventId, payload.pageId, false, 0, Date.now() - start);
  }
}

// ============================================================================
// Taboola Server-Side Events
// ============================================================================

/**
 * Sends a Lead event to Taboola via server-to-server events API.
 * Requires tblclid (Taboola click ID) for attribution.
 * @param payload - Lead event data
 */
export async function sendTaboolaCAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("taboola");
  if (!config?.is_enabled || !config.pixel_id) return;

  const body: Record<string, unknown> = {
    "pixel-id": config.pixel_id,
    "event-name": "lead",
    "revenue": 0,
    "currency": "ILS",
    "order-id": payload.eventId,
    "page-url": payload.sourceUrl,
  };

  // Include click ID for attribution if available
  if (payload.tblclid) {
    body["click-id"] = payload.tblclid;
  }

  // Optional signed request secret for enhanced security
  const secret = safeDecryptToken(config.access_token_enc);
  const url = secret
    ? `${CAPI_ENDPOINTS.taboola}?secret=${encodeURIComponent(secret)}`
    : CAPI_ENDPOINTS.taboola;

  const start = Date.now();
  const result = await sendWebhookWithRetry(url, body, null);
  logCapiResult("taboola", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
}

// ============================================================================
// Twitter/X Conversions API
// ============================================================================

/**
 * Sends a SIGN_UP conversion to Twitter/X via Conversions API.
 * Requires access token (access_token_enc).
 * @param payload - Lead event data
 */
export async function sendTwitterCAPI(payload: CAPILeadPayload): Promise<void> {
  const config = await loadPixelConfig("twitter");
  if (!config?.is_enabled || !config.pixel_id) return;

  const accessToken = safeDecryptToken(config.access_token_enc);
  if (!accessToken) return;

  const twitterEmailHash = payload.email ? hashPii(payload.email) : null;
  const twitterPhoneHash = payload.phone ? hashPhone(payload.phone) : null;
  const { first: twFirst, last: twLast } = splitName(payload.fullName);
  const twFirstHash = hashPii(twFirst);
  const twLastHash = hashPii(twLast);
  const identifiers: Array<Record<string, string>> = [];
  if (twitterEmailHash) identifiers.push({ hashed_email: twitterEmailHash });
  if (twitterPhoneHash) identifiers.push({ hashed_phone_number: twitterPhoneHash });
  if (twFirstHash) identifiers.push({ hashed_first_name: twFirstHash });
  if (twLastHash) identifiers.push({ hashed_last_name: twLastHash });
  if (identifiers.length === 0) return;

  const body = {
    conversions: [{
      conversion_time: new Date().toISOString(),
      event_id: payload.eventId,
      conversion_type: "SIGN_UP",
      identifiers,
      ...(payload.twclid ? { click_id: payload.twclid } : {}),
    }],
  };

  const url = `${CAPI_ENDPOINTS.twitter}/${config.pixel_id}`;

  const start = Date.now();
  const result = await sendWebhookWithRetry(url, body as Record<string, unknown>, null, {
    Authorization: `Bearer ${accessToken}`,
  });
  logCapiResult("twitter", payload.eventId, payload.pageId, result.success, result.statusCode, Date.now() - start);
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
    sendMetaCAPI(payload).catch((err: Error) => {
      console.error("[capi:meta]", { error: err.message, page: payload.pageId });
    }),
    sendGoogleCAPI(payload).catch((err: Error) => {
      console.error("[capi:google]", { error: err.message, page: payload.pageId });
    }),
    sendTikTokCAPI(payload).catch((err: Error) => {
      console.error("[capi:tiktok]", { error: err.message, page: payload.pageId });
    }),
    sendGA4CAPI(payload).catch((err: Error) => {
      console.error("[capi:ga4]", { error: err.message, page: payload.pageId });
    }),
    sendLinkedInCAPI(payload).catch((err: Error) => {
      console.error("[capi:linkedin]", { error: err.message, page: payload.pageId });
    }),
    sendOutbrainCAPI(payload).catch((err: Error) => {
      console.error("[capi:outbrain]", { error: err.message, page: payload.pageId });
    }),
    sendTaboolaCAPI(payload).catch((err: Error) => {
      console.error("[capi:taboola]", { error: err.message, page: payload.pageId });
    }),
    sendTwitterCAPI(payload).catch((err: Error) => {
      console.error("[capi:twitter]", { error: err.message, page: payload.pageId });
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
