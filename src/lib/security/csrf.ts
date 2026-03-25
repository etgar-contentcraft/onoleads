/**
 * CSRF token generation and validation utilities.
 * Uses a simple double-submit cookie pattern suitable for SPA forms.
 */

/**
 * Generates a cryptographically secure CSRF token.
 * @returns A random hex string token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates that the CSRF token from the request body matches the cookie token.
 * @param cookieToken - Token value from the csrf cookie
 * @param bodyToken - Token value from the request body
 * @returns true if both tokens exist and match
 */
export function validateCsrfToken(
  cookieToken: string | undefined | null,
  bodyToken: string | undefined | null
): boolean {
  if (!cookieToken || !bodyToken) return false;
  if (cookieToken.length !== bodyToken.length) return false;

  /* Constant-time comparison to prevent timing attacks */
  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ bodyToken.charCodeAt(i);
  }
  return result === 0;
}
