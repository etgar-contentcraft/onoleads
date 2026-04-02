/**
 * YouTube URL utility — extracts video IDs from common URL formats.
 * Shared across all section components that support background video.
 */

/**
 * Extracts an 11-character YouTube video ID from common URL formats.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, and bare IDs.
 * @param input - YouTube URL or video ID
 * @returns 11-char video ID, or empty string if extraction fails
 */
export function extractYoutubeId(input: string): string {
  if (!input) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") {
      const c = url.pathname.slice(1).split("?")[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(c)) return c;
    }
    const pathMatch = url.pathname.match(/\/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  } catch { /* not a URL */ }
  return "";
}

/** Default overlay opacity for sections with background media (0-100) */
export const DEFAULT_OVERLAY_OPACITY = 70;
/** Default overlay opacity for hero sections (0-100) */
export const HERO_OVERLAY_OPACITY = 60;
