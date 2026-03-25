/**
 * Input sanitization utilities for XSS prevention and data cleaning.
 * Used across all form inputs and API endpoints.
 */

/** Maximum allowed length for common input fields */
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 20;
const MAX_GENERAL_LENGTH = 500;

/**
 * Strips HTML tags from a string to prevent XSS attacks.
 * @param input - Raw string input
 * @returns Sanitized string with all HTML tags removed
 */
export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Removes potentially dangerous characters and normalizes whitespace.
 * @param input - Raw string input
 * @returns Cleaned string safe for storage and display
 */
export function sanitizeString(input: string): string {
  return stripHtmlTags(input)
    .replace(/[<>'"`;(){}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates and sanitizes a full name input.
 * @param name - Raw name string
 * @returns Object with sanitized value and validity flag
 */
export function sanitizeName(name: string): { value: string; valid: boolean } {
  const cleaned = sanitizeString(name).substring(0, MAX_NAME_LENGTH);
  const valid = cleaned.length >= 2 && /^[a-zA-Z\u0590-\u05FF\u0600-\u06FF\s\-'.]+$/.test(cleaned);
  return { value: cleaned, valid };
}

/**
 * Validates an Israeli phone number format.
 * Accepts formats: 05X-XXXXXXX, 05XXXXXXXX, +972-5X-XXXXXXX, etc.
 * @param phone - Raw phone string
 * @returns Object with sanitized value and validity flag
 */
export function sanitizePhone(phone: string): { value: string; valid: boolean } {
  const cleaned = phone.replace(/[^\d+\-() ]/g, "").substring(0, MAX_PHONE_LENGTH);
  const digitsOnly = cleaned.replace(/\D/g, "");

  /* Israeli phone patterns: 05X (10 digits), 972-5X (12 digits), 0X-XXXXXXX (9-10) */
  const israeliMobilePattern = /^(0[2-9]\d{7,8}|972[2-9]\d{7,8}|\+972[2-9]\d{7,8})$/;
  const generalPattern = /^\+?[\d]{7,15}$/;
  const valid = israeliMobilePattern.test(digitsOnly) || generalPattern.test(digitsOnly);

  return { value: cleaned, valid };
}

/**
 * Validates and sanitizes an email address.
 * @param email - Raw email string
 * @returns Object with sanitized value and validity flag
 */
export function sanitizeEmail(email: string): { value: string; valid: boolean } {
  const cleaned = email.trim().toLowerCase().substring(0, MAX_EMAIL_LENGTH);
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const valid = emailRegex.test(cleaned);
  return { value: cleaned, valid };
}

/**
 * Sanitizes a generic text field (UTM params, referrer, etc.).
 * @param input - Raw string
 * @returns Sanitized and truncated string
 */
export function sanitizeGeneral(input: string): string {
  return stripHtmlTags(input)
    .replace(/[<>'"`;]/g, "")
    .trim()
    .substring(0, MAX_GENERAL_LENGTH);
}

/**
 * Checks if a honeypot field was filled (bot detection).
 * Legitimate users should never fill the honeypot field.
 * @param value - Honeypot field value
 * @returns true if the submission appears to be from a bot
 */
export function isBot(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0;
}
