/**
 * Reusable on-demand ISR revalidation helpers for the admin dashboard.
 *
 * Why this exists:
 *   /lp/[slug] uses `export const revalidate = false` (cached forever) so
 *   every save in the builder, settings page, etc. must explicitly tell
 *   Next.js to regenerate the static HTML. Without this, edits sit in the
 *   database but the public landing page keeps serving stale content.
 *
 * Two flavours:
 *   - scheduleRevalidate(slug)  — debounced; safe to call from auto-save
 *                                  paths that fire many times per second.
 *   - revalidateNow(slug)       — immediate; awaits the response. Use for
 *                                  explicit "Save" / "Publish" clicks.
 *
 * Module-level Map keyed by slug → only one pending revalidation per page.
 */

const revalidateTimers = new Map<string, ReturnType<typeof setTimeout>>();

const REVALIDATE_DEBOUNCE_MS = 1200;

/**
 * Debounced revalidation. Multiple rapid calls collapse into one request.
 * Fire-and-forget — never throws.
 *
 * @param slug - the landing-page slug to revalidate (e.g. "my-program")
 * @param delay - optional override of debounce window in ms
 */
export function scheduleRevalidate(
  slug: string | undefined | null,
  delay: number = REVALIDATE_DEBOUNCE_MS,
): void {
  if (!slug) return;

  const existing = revalidateTimers.get(slug);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    revalidateTimers.delete(slug);
    void fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {
      /* ignore — best-effort cache bust */
    });
  }, delay);

  revalidateTimers.set(slug, timer);
}

/**
 * Immediate revalidation. Awaits the API response so callers can be sure
 * the cache is busted before they navigate / show success toasts.
 * Cancels any pending debounced revalidation for the same slug.
 *
 * @param slug - the landing-page slug to revalidate
 */
export async function revalidateNow(
  slug: string | undefined | null,
): Promise<void> {
  if (!slug) return;

  const existing = revalidateTimers.get(slug);
  if (existing) {
    clearTimeout(existing);
    revalidateTimers.delete(slug);
  }

  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch {
    /* ignore — best-effort cache bust */
  }
}
