/**
 * ScrollTracker — invisible client component that fires scroll depth and time-on-page
 * analytics events to /api/analytics/event.
 *
 * Scroll milestones: 25, 50, 75, 90 percent.
 * Each milestone is tracked once per page per session (deduped via sessionStorage).
 * Time-on-page is sent via sendBeacon on page unload.
 */
"use client";

import { useEffect } from "react";

interface ScrollTrackerProps {
  pageId: string;
  cookieId: string;
  utmParams?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
  deviceType?: "desktop" | "mobile" | "tablet";
}

/** Scroll depth milestones to track (percent) */
const SCROLL_MILESTONES = [25, 50, 75, 90];

/** Returns a dedup key for a given page + milestone */
function milestoneKey(pageId: string, depth: number): string {
  return `scroll_tracked_${pageId}_${depth}`;
}

/**
 * Fires a single analytics event via fetch (non-blocking, fire-and-forget).
 * Uses keepalive for sendBeacon-like behavior.
 */
function fireEvent(payload: Record<string, unknown>) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {/* ignore — analytics should never break the page */});
}

/**
 * Detects device type based on window.innerWidth.
 */
function detectDevice(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/**
 * ScrollTracker — renders nothing, just side-effects.
 * Place this inside a landing page layout to activate tracking.
 */
export function ScrollTracker({ pageId, cookieId, utmParams, deviceType }: ScrollTrackerProps) {
  useEffect(() => {
    if (!pageId) return;

    const startTime = Date.now();
    const device = deviceType || detectDevice();
    const sessionKey = `session_${pageId}`;

    // Ensure session key exists
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
    }

    // ── Scroll depth tracking ──
    const firedMilestones = new Set<number>(
      SCROLL_MILESTONES.filter((d) => !!sessionStorage.getItem(milestoneKey(pageId, d)))
    );

    function getScrollPercent(): number {
      const scrolled = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return 100;
      return Math.min(100, Math.round((scrolled / totalHeight) * 100));
    }

    function handleScroll() {
      const pct = getScrollPercent();
      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !firedMilestones.has(milestone)) {
          firedMilestones.add(milestone);
          sessionStorage.setItem(milestoneKey(pageId, milestone), "1");
          fireEvent({
            event_type: "scroll_depth",
            page_id: pageId,
            cookie_id: cookieId,
            scroll_depth: milestone,
            device_type: device,
            ...utmParams,
          });
        }
      }
    }

    // Throttle scroll handler to max once per 200ms
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        handleScroll();
      }, 200);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    // ── Time on page — send on unload via sendBeacon ──
    function onUnload() {
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds < 2) return; // ignore bounces under 2 seconds

      const payload = JSON.stringify({
        event_type: "page_view",
        page_id: pageId,
        cookie_id: cookieId,
        time_on_page: seconds,
        device_type: device,
        ...utmParams,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/event",
          new Blob([payload], { type: "application/json" })
        );
      }
    }

    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [pageId, cookieId, deviceType, utmParams]);

  return null;
}
