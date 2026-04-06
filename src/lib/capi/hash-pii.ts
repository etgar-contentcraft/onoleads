/**
 * PII hashing utilities for CAPI submission.
 *
 * Rules (per Meta/TikTok/LinkedIn spec):
 * - lowercase + trim before hashing
 * - Phone numbers normalized to E.164 (digits only, country code prefix)
 * - SHA-256 hex output
 *
 * IMPORTANT: Hash values must only exist in-flight (during request handling).
 * Never log, store, or return them in API responses alongside PII context.
 * Spec: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters
 */

import { createHash } from "crypto";

/**
 * Normalizes and SHA-256 hashes a string value per CAPI spec.
 * @param value - Raw PII string (email, name, city, etc.)
 * @returns Lowercase hex SHA-256 hash, or null if value is empty
 */
export function hashPii(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/**
 * Normalizes a phone number to E.164-style digits before hashing.
 * Handles Israeli mobile (05x → 9725x) and landline (0x → 972x) prefixes.
 * @param phone - Raw phone string ("054-123-4567", "0541234567", "+972541234567")
 * @returns SHA-256 hash of E.164 digits, or null if invalid
 */
export function hashPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Strip everything except digits
  let digits = phone.replace(/\D/g, "");

  if (!digits) return null;

  // Israeli mobile: 05x (10 digits) → 972 + rest
  if (/^05\d{8}$/.test(digits)) {
    digits = "972" + digits.slice(1);
  }
  // Israeli landline: 0[2-9]x (9-10 digits) → 972 + rest
  else if (/^0[2-9]\d{7,8}$/.test(digits)) {
    digits = "972" + digits.slice(1);
  }
  // Already has country code starting with 972
  else if (digits.startsWith("972") && digits.length >= 11) {
    // already correct
  }
  // US: 1 + 10 digits
  else if (digits.startsWith("1") && digits.length === 11) {
    // already correct
  }
  // Unknown format — hash as-is if it looks plausible (≥7 digits)
  else if (digits.length < 7) {
    return null;
  }

  return createHash("sha256").update(digits).digest("hex");
}

/**
 * Builds the hashed user_data object for Meta CAPI.
 * Only includes fields that have non-null values — omits nulls entirely.
 * @param email - Raw email address
 * @param phone - Raw phone number
 * @param firstName - Raw first name
 * @param lastName - Raw last name (if available)
 * @returns Meta-compatible user_data object with hashed fields
 */
export function buildMetaUserData(
  email: string | null,
  phone: string | null,
  firstName: string | null,
  lastName?: string | null
): Record<string, string> {
  const userData: Record<string, string> = {};

  const em = hashPii(email);
  const ph = hashPhone(phone);
  const fn = hashPii(firstName);
  const ln = hashPii(lastName);

  if (em) userData.em = em;
  if (ph) userData.ph = ph;
  if (fn) userData.fn = fn;
  if (ln) userData.ln = ln;

  return userData;
}

/**
 * Builds the hashed contact_info object for TikTok CAPI.
 * Field names differ from Meta.
 */
export function buildTikTokContactInfo(
  email: string | null,
  phone: string | null
): Record<string, string> {
  const contactInfo: Record<string, string> = {};

  const em = hashPii(email);
  const ph = hashPhone(phone);

  if (em) contactInfo.email = em;
  if (ph) contactInfo.phone_number = ph;

  return contactInfo;
}
