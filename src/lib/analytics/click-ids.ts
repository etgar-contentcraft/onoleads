/**
 * Click ID capture and storage for multi-platform attribution.
 *
 * Click IDs are stored in localStorage with per-platform expiry windows.
 * Each entry is a JSON object with value, captured_at, expires_at, and source_url
 * so expired IDs are never sent to CAPI (platforms reject stale click IDs).
 *
 * Storage is first-party (localStorage) which is ITP-resistant in Safari.
 * When the site moves to a custom domain, also set server-side cookies for
 * cross-subdomain sharing (see cookie strategy comment below).
 */

/** Platform expiry windows per platform attribution policy */
const EXPIRY_DAYS: Record<string, number> = {
  gclid:     90,  // Google's max attribution window
  fbclid:    7,   // Meta's default attribution window
  fbc:       7,   // Constructed fbc (fbclid → fbc) — same as fbclid
  fbp:       90,  // _fbp cookie (set by Meta pixel) — mirror in localStorage
  ttclid:    7,   // TikTok's attribution window
  li_fat_id: 30,  // LinkedIn
  obclid:    30,  // Outbrain
  tblclid:   30,  // Taboola
  twclid:    7,   // Twitter/X
};

/** localStorage key prefix */
const PREFIX = "ono_";

interface StoredClickId {
  value: string;
  captured_at: number;  // Unix ms
  expires_at: number;   // Unix ms
  source_url: string;   // Full URL where click ID was captured
}

/**
 * Stores a click ID in localStorage with expiry metadata.
 * @param name - click ID type (e.g. "gclid", "fbclid")
 * @param value - raw click ID value from URL param
 */
export function storeClickId(name: string, value: string): void {
  if (typeof window === "undefined" || !value.trim()) return;
  const expiry_days = EXPIRY_DAYS[name] ?? 30;
  const now = Date.now();

  const stored: StoredClickId = {
    value: value.trim(),
    captured_at: now,
    expires_at: now + expiry_days * 86_400_000,
    source_url: window.location.href,
  };

  try {
    localStorage.setItem(`${PREFIX}${name}`, JSON.stringify(stored));
  } catch {
    /* Ignore storage quota errors */
  }
}

/**
 * Reads a click ID from localStorage, returning null if missing or expired.
 * @param name - click ID type
 * @returns Raw click ID value or null
 */
export function readClickId(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${name}`);
    if (!raw) return null;
    const stored: StoredClickId = JSON.parse(raw);
    if (Date.now() > stored.expires_at) {
      localStorage.removeItem(`${PREFIX}${name}`);
      return null;
    }
    return stored.value;
  } catch {
    return null;
  }
}

/**
 * Reads all valid (non-expired) click IDs at once.
 * @returns Object with all click ID types as keys, null when absent/expired
 */
export function readAllClickIds(): Record<string, string | null> {
  return Object.fromEntries(
    Object.keys(EXPIRY_DAYS).map((name) => [name, readClickId(name)])
  );
}

/**
 * Parses current URL search params and stores any click IDs found.
 * Call this once on page load from the tracking hook.
 * Also constructs the fbc value from fbclid per Meta's spec.
 */
export function captureClickIdsFromUrl(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  const clickIdParams = [
    "gclid", "fbclid", "ttclid", "li_fat_id",
    "obclid", "tblclid", "twclid",
  ] as const;

  for (const param of clickIdParams) {
    const value = params.get(param);
    if (value) storeClickId(param, value);
  }

  // Construct fbc from fbclid: "fb.1.{timestamp}.{fbclid}"
  // This is the format Meta requires for CAPI user_data.fbc
  const fbclid = params.get("fbclid");
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    storeClickId("fbc", fbc);
  }
}

/**
 * Returns click IDs in the shape expected by the /api/leads route payload.
 * Only includes click IDs that are currently valid (not expired).
 * Covers all 8 supported CAPI platforms.
 */
export function getLeadClickIds(): {
  gclid?: string;
  fbclid?: string;
  fbc?: string;
  ttclid?: string;
  li_fat_id?: string;
  obclid?: string;
  tblclid?: string;
  twclid?: string;
} {
  const result: Record<string, string> = {};
  for (const name of ["gclid", "fbclid", "fbc", "ttclid", "li_fat_id", "obclid", "tblclid", "twclid"]) {
    const value = readClickId(name);
    if (value) result[name] = value;
  }
  return result;
}
