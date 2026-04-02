// Utilities for generating English-only URL slugs from Hebrew or English text.
// Includes Hebrew-to-Latin transliteration, slug generation, and slug sanitization.

/** Maximum length for a generated slug. */
const MAX_SLUG_LENGTH = 60;

/** Regex to detect Hebrew characters in a string. */
const HEBREW_CHAR_REGEX = /[\u0590-\u05FF]/;

/** Map of Hebrew characters to their Latin transliteration equivalents. */
const HEBREW_TO_LATIN_MAP: Record<string, string> = {
  'א': 'a',
  'ב': 'b',
  'ג': 'g',
  'ד': 'd',
  'ה': 'h',
  'ו': 'v',
  'ז': 'z',
  'ח': 'ch',
  'ט': 't',
  'י': 'y',
  'כ': 'k',
  'ך': 'k',
  'ל': 'l',
  'מ': 'm',
  'ם': 'm',
  'נ': 'n',
  'ן': 'n',
  'ס': 's',
  'ע': 'a',
  'פ': 'f',
  'ף': 'f',
  'צ': 'ts',
  'ץ': 'ts',
  'ק': 'k',
  'ר': 'r',
  'ש': 'sh',
  'ת': 't',
};

/**
 * Converts Hebrew characters in a string to their Latin equivalents.
 * Non-Hebrew characters are preserved as-is.
 * @param {string} text - The input text potentially containing Hebrew characters.
 * @returns {string} - The transliterated string with Hebrew replaced by Latin letters.
 */
export function transliterateHebrew(text: string): string {
  return text
    .split('')
    .map((char) => HEBREW_TO_LATIN_MAP[char] ?? char)
    .join('');
}

/**
 * Converts a raw string (Latin or Hebrew) into a lowercase, URL-safe, dash-separated slug.
 * Replaces spaces and special characters with dashes, removes non-alphanumeric
 * characters, collapses consecutive dashes, trims dashes from edges, and enforces
 * a maximum length of 60 characters.
 * @param {string} raw - The raw text to slugify.
 * @returns {string} - A clean, lowercased slug derived from the raw text.
 */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

/**
 * Generates a URL-safe slug from Hebrew or English text.
 * Detects whether the input contains Hebrew characters and transliterates them
 * to Latin equivalents before slugifying. English/Latin text is slugified directly.
 * @param {string} text - The input text (Hebrew or English).
 * @returns {string} - A clean, English-only, URL-safe slug.
 */
export function generateSlug(text: string): string {
  const normalized = HEBREW_CHAR_REGEX.test(text)
    ? transliterateHebrew(text)
    : text;

  return slugify(normalized);
}

/**
 * Sanitizes a user-edited slug to ensure it only contains valid characters.
 * Lowercases the input, strips everything except a-z, 0-9, and dashes,
 * collapses multiple consecutive dashes, and trims dashes from the edges.
 * @param {string} slug - The raw slug input from a user.
 * @returns {string} - A sanitized slug safe for use in URLs.
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
