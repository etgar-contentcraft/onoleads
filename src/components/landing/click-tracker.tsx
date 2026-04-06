/**
 * Click Tracker — invisible client component that records click positions
 * on landing pages for heatmap visualization in the analytics dashboard.
 *
 * Captures: x/y as percentage of page dimensions, element tag, nearest text,
 * viewport width, and device type. Data is sent to /api/analytics/event
 * with event_type "click" and coordinates in event_data JSONB.
 *
 * Throttled to max 1 click per 300ms to avoid flooding on rapid taps.
 * Ignores clicks on the cookie consent banner and accessibility widget.
 */
"use client";

import { useEffect } from "react";

interface ClickTrackerProps {
  pageId: string;
  cookieId: string;
}

/** Minimum interval between tracked clicks (ms) */
const THROTTLE_MS = 300;

/** Maximum clicks tracked per page session to prevent abuse */
const MAX_CLICKS_PER_SESSION = 200;

/**
 * Returns a short label for the clicked element (tag + nearest visible text).
 * Truncated to 80 chars to keep event_data small.
 */
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const text = (
    el.textContent?.trim().slice(0, 40) ||
    (el as HTMLInputElement).placeholder?.trim().slice(0, 40) ||
    el.getAttribute("aria-label")?.trim().slice(0, 40) ||
    ""
  );
  return text ? `${tag}:${text}` : tag;
}

/**
 * Detects device type based on viewport width.
 */
function detectDevice(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/**
 * ClickTracker — renders nothing, just side-effects.
 * Place inside a landing page layout to activate click heatmap tracking.
 */
export function ClickTracker({ pageId, cookieId }: ClickTrackerProps) {
  useEffect(() => {
    if (!pageId) return;

    let lastClickTime = 0;
    let clickCount = 0;

    function handleClick(e: MouseEvent) {
      /* Throttle rapid clicks */
      const now = Date.now();
      if (now - lastClickTime < THROTTLE_MS) return;
      lastClickTime = now;

      /* Cap clicks per session */
      if (clickCount >= MAX_CLICKS_PER_SESSION) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      /* Ignore clicks on compliance widgets (cookie banner, a11y panel) */
      if (target.closest("[role='dialog'][aria-label]") && target.closest(".z-\\[80\\], .z-\\[90\\]")) return;

      /* Calculate position as percentage of full page dimensions */
      const pageWidth = document.documentElement.scrollWidth;
      const pageHeight = document.documentElement.scrollHeight;
      if (pageWidth === 0 || pageHeight === 0) return;

      const absX = e.pageX;
      const absY = e.pageY;
      const xPct = Math.round((absX / pageWidth) * 1000) / 10;   // 1 decimal place
      const yPct = Math.round((absY / pageHeight) * 1000) / 10;

      /* Clamp to valid range */
      if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;

      clickCount++;

      /* Fire-and-forget analytics event */
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "click",
          page_id: pageId,
          cookie_id: cookieId,
          device_type: detectDevice(),
          event_data: {
            x_pct: xPct,
            y_pct: yPct,
            viewport_w: window.innerWidth,
            element: getElementLabel(target),
          },
        }),
        keepalive: true,
      }).catch(() => {/* silent — analytics never breaks the page */});
    }

    document.addEventListener("click", handleClick, { passive: true });

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [pageId, cookieId]);

  return null;
}
