/**
 * Format validation for platform pixel/dataset IDs.
 * These are client-side format checks only — they do NOT call platform APIs.
 *
 * Used in the settings page before writing to pixel_configurations.
 */

export interface PixelValidationResult {
  valid: boolean;
  reason?: string;
}

/** Meta pixel IDs: 15–16 digit numeric strings */
const META_PIXEL_RE = /^\d{15,16}$/;

/** Google Ads conversion IDs: "AW-" + 9–11 digits */
const GOOGLE_ADS_RE = /^AW-\d{9,11}$/;

/** TikTok pixel IDs: alphanumeric, 15–25 chars */
const TIKTOK_PIXEL_RE = /^[A-Z0-9]{15,25}$/i;

/** LinkedIn partner/insight tag IDs: 6–10 digits */
const LINKEDIN_PARTNER_RE = /^\d{6,10}$/;

/** Google Analytics 4 measurement IDs: "G-" + alphanumeric */
const GA4_RE = /^G-[A-Z0-9]{4,12}$/i;

/** Microsoft Clarity project IDs: alphanumeric, 6–15 chars */
const CLARITY_PROJECT_RE = /^[a-z0-9]{6,15}$/i;

/** Outbrain marketer/advertiser IDs: alphanumeric + dashes, 8–40 chars */
const OUTBRAIN_RE = /^[A-Z0-9-]{8,40}$/i;

/** Taboola account IDs: 6–12 digits */
const TABOOLA_RE = /^\d{6,12}$/;

/** Twitter (X) pixel IDs: lowercase alphanumeric, 5–8 chars */
const TWITTER_RE = /^[a-z0-9]{5,8}$/;

/**
 * Defensive sanitizer for any value injected into an inline <script> body.
 * Allows only characters that appear in legitimate platform IDs and prevents
 * script-context breakouts (', ", ;, <, >, parentheses, whitespace, etc.).
 * Returns the original string when safe, an empty string otherwise.
 */
export function sanitizePixelIdForInlineScript(value: string): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  return /^[A-Za-z0-9._-]{1,64}$/.test(v) ? v : "";
}

export function validateMetaPixelId(pixelId: string): PixelValidationResult {
  const v = pixelId.trim();
  if (!v) return { valid: true }; // Empty = not configured (allowed)
  return META_PIXEL_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Meta pixel ID must be 15–16 digits" };
}

export function validateGoogleConversionId(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return GOOGLE_ADS_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Google Ads ID must be in AW-XXXXXXXXX format" };
}

export function validateTikTokPixelId(pixelId: string): PixelValidationResult {
  const v = pixelId.trim();
  if (!v) return { valid: true };
  return TIKTOK_PIXEL_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "TikTok pixel ID must be 15–25 alphanumeric characters" };
}

export function validateLinkedInPartnerId(partnerId: string): PixelValidationResult {
  const v = partnerId.trim();
  if (!v) return { valid: true };
  return LINKEDIN_PARTNER_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "LinkedIn partner ID must be 6–10 digits" };
}

export function validateGa4Id(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return GA4_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "GA4 measurement ID must be in G-XXXXXXXX format" };
}

export function validateClarityProjectId(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return CLARITY_PROJECT_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Clarity project ID must be 6–15 alphanumeric characters" };
}

export function validateOutbrainAccountId(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return OUTBRAIN_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Outbrain account ID must be 8–40 alphanumeric characters" };
}

export function validateTaboolaAccountId(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return TABOOLA_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Taboola account ID must be 6–12 digits" };
}

export function validateTwitterPixelId(id: string): PixelValidationResult {
  const v = id.trim();
  if (!v) return { valid: true };
  return TWITTER_RE.test(v)
    ? { valid: true }
    : { valid: false, reason: "Twitter pixel ID must be 5–8 lowercase alphanumeric characters" };
}

/**
 * Returns the validator for a given platform.
 */
export function validatePixelId(
  platform: "meta" | "google" | "tiktok" | "linkedin" | "clarity" | "ga4" | "outbrain" | "taboola" | "twitter",
  value: string
): PixelValidationResult {
  switch (platform) {
    case "meta":     return validateMetaPixelId(value);
    case "google":   return validateGoogleConversionId(value);
    case "tiktok":   return validateTikTokPixelId(value);
    case "linkedin": return validateLinkedInPartnerId(value);
    case "clarity":  return validateClarityProjectId(value);
    case "ga4":      return validateGa4Id(value);
    case "outbrain": return validateOutbrainAccountId(value);
    case "taboola":  return validateTaboolaAccountId(value);
    case "twitter":  return validateTwitterPixelId(value);
  }
}
