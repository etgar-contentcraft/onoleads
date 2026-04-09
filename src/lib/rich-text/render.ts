/**
 * Rich-text rendering helper for landing pages.
 *
 * Accepts either plain text (\n-separated paragraphs, legacy data) or HTML
 * (produced by Tiptap in the builder). Returns a sanitized HTML string safe
 * for dangerouslySetInnerHTML.
 *
 * Loaded only on the landing-page side — the builder never imports this file.
 */

import DOMPurify from "isomorphic-dompurify";

/** Tags the Tiptap toolbar can produce — nothing else gets through. */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "h2", "h3",
  "ul", "ol", "li", "a", "span",
];

/** Attributes the RTE needs (href for links, style for text-align). */
const ALLOWED_ATTR = ["href", "target", "rel", "style", "dir"];

/**
 * Detect whether a string is HTML (contains at least one tag) or plain text.
 */
function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Convert plain text with \n separators into simple HTML paragraphs.
 * Double newlines become paragraph breaks; single newlines become <br>.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Render a rich-text value (HTML or legacy plain-text) into sanitized HTML.
 *
 * @param value — raw string from section.content JSONB
 * @returns sanitized HTML string, or empty string if value is falsy
 */
export function renderRichText(value: string | null | undefined): string {
  if (!value || !value.trim()) return "";

  const html = isHtml(value) ? value : plainTextToHtml(value);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Convenience wrapper returning the shape React expects for
 * dangerouslySetInnerHTML.
 */
export function richTextHtml(value: string | null | undefined): { __html: string } {
  return { __html: renderRichText(value) };
}
