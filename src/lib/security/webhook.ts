/**
 * Webhook security utilities.
 * Provides HMAC signing, verification, and retry logic with exponential backoff.
 */

/** Maximum number of webhook delivery retry attempts */
const MAX_RETRIES = 3;

/** Base delay in milliseconds for exponential backoff (doubles each retry) */
const BASE_DELAY_MS = 1000;

/**
 * Creates an HMAC-SHA256 signature for a webhook payload.
 * @param payload - JSON string of the webhook body
 * @param secret - Shared webhook secret key
 * @returns Hex-encoded HMAC signature
 */
export async function signWebhookPayload(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies an HMAC-SHA256 signature against a payload.
 * @param payload - JSON string of the webhook body
 * @param signature - Hex-encoded signature to verify
 * @param secret - Shared webhook secret key
 * @returns true if the signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await signWebhookPayload(payload, secret);
  if (expected.length !== signature.length) return false;

  /* Constant-time comparison */
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sends a webhook with retry logic and exponential backoff.
 * Signs each request with HMAC if a webhook secret is available.
 * @param url - Webhook destination URL
 * @param payload - Object to send as JSON
 * @param webhookSecret - Optional secret for HMAC signing
 * @returns Object indicating success status and HTTP status code
 */
export async function sendWebhookWithRetry(
  url: string,
  payload: Record<string, unknown>,
  webhookSecret?: string | null,
  /** Extra headers to include (e.g. Authorization for CAPI calls) */
  extraHeaders?: Record<string, string>
): Promise<{ success: boolean; statusCode: number; attempts: number }> {
  const body = JSON.stringify(payload);
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": Date.now().toString(),
        ...extraHeaders,
      };

      /* Sign payload if a webhook secret is configured */
      if (webhookSecret) {
        const signature = await signWebhookPayload(body, webhookSecret);
        headers["X-Webhook-Signature"] = signature;
      }

      const res = await fetch(url, { method: "POST", headers, body });
      lastStatus = res.status;

      if (res.ok) {
        return { success: true, statusCode: res.status, attempts: attempt };
      }

      /* Don't retry 4xx client errors (except 429 Too Many Requests) */
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { success: false, statusCode: res.status, attempts: attempt };
      }
    } catch {
      lastStatus = 0;
    }

    /* Exponential backoff before retrying */
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { success: false, statusCode: lastStatus, attempts: MAX_RETRIES };
}
