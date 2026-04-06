/**
 * ViewportTracker — invisible client component that records which vertical
 * zones of the landing page were visible in the viewport and for how long.
 *
 * Data powers the "dwell time" heatmap in the analytics dashboard.
 *
 * Algorithm:
 *   - Every TICK_MS (2s), records the current visible Y-range as % of page height
 *   - Accumulates time per band (each band = BAND_PCT% of page height)
 *   - On page unload, sends a single "viewport_time" event via sendBeacon
 *     with a compact array of {band_pct, seconds} entries
 *
 * Pauses when page is hidden (tab switch) via visibilitychange.
 * Caps at MAX_SESSION_S to prevent forgotten tabs from skewing data.
 */
"use client";

import { useEffect } from "react";

interface ViewportTrackerProps {
  pageId: string;
  cookieId: string;
}

/** How often we sample the viewport position (ms) */
const TICK_MS = 2000;

/** Each band covers this % of total page height (5% = 20 bands) */
const BAND_PCT = 5;

/** Stop tracking after this many seconds to prevent stale-tab pollution */
const MAX_SESSION_S = 600;

/** Total number of bands */
const BAND_COUNT = Math.ceil(100 / BAND_PCT);

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
 * ViewportTracker — renders nothing, just side-effects.
 * Place inside a landing page layout next to ScrollTracker and ClickTracker.
 */
export function ViewportTracker({ pageId, cookieId }: ViewportTrackerProps) {
  useEffect(() => {
    if (!pageId) return;

    /** Accumulated seconds per band (index 0 = top 0-5%, index 19 = 95-100%) */
    const bandSeconds = new Float32Array(BAND_COUNT);
    let isVisible = !document.hidden;
    let totalElapsed = 0;
    const tickS = TICK_MS / 1000;
    const device = detectDevice();

    /**
     * Called every TICK_MS — determines which bands are in the viewport
     * and adds tickS seconds to each visible band.
     */
    function tick() {
      if (!isVisible) return;
      totalElapsed += tickS;
      if (totalElapsed > MAX_SESSION_S) return; // cap

      const scrollTop = window.scrollY;
      const viewportH = window.innerHeight;
      const pageH = document.documentElement.scrollHeight;
      if (pageH <= 0) return;

      /* Visible range as percentage of total page height */
      const topPct = (scrollTop / pageH) * 100;
      const bottomPct = ((scrollTop + viewportH) / pageH) * 100;

      /* Mark each band that overlaps with the visible range */
      for (let i = 0; i < BAND_COUNT; i++) {
        const bandTop = i * BAND_PCT;
        const bandBottom = bandTop + BAND_PCT;

        /* Band overlaps viewport if band's bottom > viewport's top AND band's top < viewport's bottom */
        if (bandBottom > topPct && bandTop < bottomPct) {
          bandSeconds[i] += tickS;
        }
      }
    }

    const interval = setInterval(tick, TICK_MS);

    /* Pause when tab is hidden */
    function onVisibilityChange() {
      isVisible = !document.hidden;
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    /**
     * Send accumulated data on page unload.
     * Format: compact array of [bandIndex, seconds] tuples, only non-zero bands.
     */
    function sendData() {
      /* Only send if we have meaningful data (at least 4s total) */
      const totalBandTime = bandSeconds.reduce((a, b) => a + b, 0);
      if (totalBandTime < 4) return;

      /* Build compact payload: array of {b: bandIndex*BAND_PCT, s: seconds} */
      const bands: Array<{ b: number; s: number }> = [];
      for (let i = 0; i < BAND_COUNT; i++) {
        if (bandSeconds[i] >= 1) { // only include bands with ≥ 1 second
          bands.push({ b: i * BAND_PCT, s: Math.round(bandSeconds[i]) });
        }
      }

      if (bands.length === 0) return;

      const payload = JSON.stringify({
        event_type: "viewport_time",
        page_id: pageId,
        cookie_id: cookieId,
        device_type: device,
        event_data: { bands, total_time: Math.round(totalElapsed) },
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/event",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/analytics/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }

    window.addEventListener("pagehide", sendData);
    window.addEventListener("beforeunload", sendData);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", sendData);
      window.removeEventListener("beforeunload", sendData);
    };
  }, [pageId, cookieId]);

  return null;
}
