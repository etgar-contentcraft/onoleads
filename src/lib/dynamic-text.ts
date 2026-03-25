/**
 * Dynamic Text Replacement (DTR) utility.
 * Replaces {{variable}} and {{variable|fallback}} tokens in content strings
 * with values from URL parameters (UTM, referrer, etc.).
 *
 * Usage in content editors:
 *   "קורס מ-{{utm_source|אונו}}"  → "קורס מ-Facebook" (or "קורס מ-אונו" if no utm_source)
 *   "תוכנית {{utm_campaign}}"      → "תוכנית MBA" (or "" if missing)
 */

/** Supported dynamic variable keys */
const SUPPORTED_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
]);

/** Regex to match {{key}} or {{key|fallback}} */
const TOKEN_REGEX = /\{\{([a-z_]+)(?:\|([^}]*))?\}\}/g;

/**
 * Replaces all {{key}} and {{key|fallback}} tokens in a string.
 * @param text - The template string (e.g. "קורס מ-{{utm_source|אונו}}")
 * @param params - URL search params (e.g. from window.location.search)
 * @returns The string with tokens replaced
 */
export function replaceDynamicText(text: string, params: URLSearchParams): string {
  if (!text || !text.includes("{{")) return text;

  return text.replace(TOKEN_REGEX, (_match, key: string, fallback: string = "") => {
    if (!SUPPORTED_KEYS.has(key)) return _match; // leave unknown tokens untouched
    return params.get(key) || fallback;
  });
}

/**
 * Applies DTR to all string values in a content record recursively.
 * Handles nested objects and arrays (e.g. FAQ items, testimonials).
 * @param content - Section content object
 * @param params - URL search params
 * @returns New content object with all string values replaced
 */
export function replaceDynamicContent(
  content: Record<string, unknown>,
  params: URLSearchParams
): Record<string, unknown> {
  if (!params.toString() && !hasAnyToken(content)) return content;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    result[key] = replaceValue(value, params);
  }
  return result;
}

function replaceValue(value: unknown, params: URLSearchParams): unknown {
  if (typeof value === "string") return replaceDynamicText(value, params);
  if (Array.isArray(value)) return value.map((v) => replaceValue(v, params));
  if (value && typeof value === "object") {
    return replaceDynamicContent(value as Record<string, unknown>, params);
  }
  return value;
}

/** Quick check — avoids allocating if no tokens present */
function hasAnyToken(content: unknown): boolean {
  return JSON.stringify(content).includes("{{");
}
