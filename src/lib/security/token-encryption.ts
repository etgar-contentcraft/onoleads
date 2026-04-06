/**
 * AES-256-GCM envelope encryption for CAPI platform tokens.
 * Tokens are encrypted before writing to the database and decrypted in-memory
 * only when building a CAPI request payload.
 *
 * Key management:
 * - The master key is stored in CAPI_TOKEN_MASTER_KEY env var (never in DB).
 * - Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - The stored format is "iv_b64:authTag_b64:ciphertext_b64" (colon-delimited).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;   // 96-bit IV required for GCM
const KEY_BYTES = 32;  // 256-bit key

/** Domain-separation prefix for deriving the CAPI key from the service role key */
const KEY_DERIVATION_CONTEXT = "onoleads:capi-token-master-key:v1";

/**
 * Derives the 32-byte AES key for CAPI token encryption.
 *
 * Strategy (in priority order):
 * 1. CAPI_TOKEN_MASTER_KEY env var — explicit standalone key (base64 / base64url)
 * 2. SUPABASE_SERVICE_ROLE_KEY — derive a deterministic 32-byte key via SHA-256
 *    with domain separation. This fallback exists because Vercel CLI deployments
 *    sometimes fail to inject newly-created env vars into serverless functions.
 *
 * The derived key is stable: same service-role-key → same AES key, so previously
 * encrypted tokens remain decryptable as long as the service-role-key is unchanged.
 */
function getMasterKey(): Buffer {
  // Strategy 1: explicit master key
  const master = process.env.CAPI_TOKEN_MASTER_KEY;
  if (master && master.trim().length >= 10) {
    const normalized = master.trim().replace(/-/g, "+").replace(/_/g, "/");
    const key = Buffer.from(normalized, "base64");
    if (key.length >= KEY_BYTES) {
      return key.subarray(0, KEY_BYTES);
    }
  }

  // Strategy 2: derive from Supabase service role key
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole && serviceRole.trim().length >= 20) {
    return createHash("sha256")
      .update(KEY_DERIVATION_CONTEXT + ":" + serviceRole.trim())
      .digest();
  }

  throw new Error(
    "No encryption key available. Set CAPI_TOKEN_MASTER_KEY or SUPABASE_SERVICE_ROLE_KEY."
  );
}

/**
 * Encrypts a plaintext CAPI access token for storage in the database.
 * @param plaintext - Raw API token string
 * @returns Colon-delimited "iv_b64:authTag_b64:ciphertext_b64" string
 */
export function encryptToken(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a stored CAPI token for use in a CAPI request.
 * The returned plaintext must not be logged or stored.
 * @param stored - The "iv_b64:authTag_b64:ciphertext_b64" string from DB
 * @returns Plaintext token string
 */
export function decryptToken(stored: string): string {
  const key = getMasterKey();
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format — expected iv:tag:ciphertext");
  }
  const [ivB64, tagB64, dataB64] = parts;

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return (
    decipher.update(Buffer.from(dataB64, "base64")).toString("utf8") +
    decipher.final("utf8")
  );
}

/**
 * Returns true if the given string looks like an encrypted token envelope.
 * Does not verify the key or decrypt — just checks format.
 */
export function isEncryptedToken(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.split(":").length === 3;
}
