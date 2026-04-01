/**
 * Anonymous page-view and event tracking hook.
 * Sends analytics beacons to /api/analytics/event using a first-party cookie
 * to identify returning visitors without collecting personal data.
 */

"use client";

import { useEffect, useRef } from "react";

// ============================================================================
// Constants
// ============================================================================

/** Cookie name used to store the anonymous visitor identifier */
const COOKIE_NAME = "onoleads_id";

/** Cookie lifetime in days */
const COOKIE_MAX_AGE_DAYS = 365;

/** Seconds in one day — used for cookie max-age calculation */
const SECONDS_PER_DAY = 86_400;

/** Analytics endpoint all events are sent to */
const ANALYTICS_ENDPOINT = "/api/analytics/event";

/** Screen-width breakpoint: below this value the device is classified as mobile */
const MOBILE_BREAKPOINT = 768;

/** Screen-width breakpoint: at or below this value the device is classified as tablet */
const TABLET_BREAKPOINT = 1024;

/** UTM query-string parameter names we extract */
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a v4-style UUID using the crypto API (falls back to Math.random).
 * @returns A unique identifier string
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Read a cookie value by name from document.cookie.
 * @param name - The cookie name to look up
 * @returns The cookie value, or null if not found
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a first-party cookie with the given name, value, and max-age in days.
 * @param name - Cookie name
 * @param value - Cookie value
 * @param days - Lifetime in days
 */
function setCookie(name: string, value: string, days: number): void {
  const maxAge = days * SECONDS_PER_DAY;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Return the anonymous visitor cookie ID, creating and persisting one if needed.
 * @returns The visitor's cookie ID string
 */
function getOrCreateCookieId(): string {
  let cookieId = getCookie(COOKIE_NAME);
  if (!cookieId) {
    cookieId = generateUUID();
    setCookie(COOKIE_NAME, cookieId, COOKIE_MAX_AGE_DAYS);
  }
  return cookieId;
}

/**
 * Classify the current device based on screen width.
 * @returns "mobile", "tablet", or "desktop"
 */
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.screen.width;
  if (width < MOBILE_BREAKPOINT) return "mobile";
  if (width <= TABLET_BREAKPOINT) return "tablet";
  return "desktop";
}

/**
 * Extract UTM parameters from the current page URL.
 * @returns An object containing any UTM values found (keys with no value are null)
 */
function extractUtmParams(): Record<string, string | null> {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string | null> = {};
  for (const key of UTM_PARAMS) {
    result[key] = params.get(key) || null;
  }
  return result;
}

/**
 * Extract the referrer domain hostname, returning null if it matches the
 * current domain (i.e. an internal navigation) or if there is no referrer.
 * @returns The external referrer hostname or null
 */
function getReferrerDomain(): string | null {
  if (!document.referrer) return null;
  try {
    const referrerHost = new URL(document.referrer).hostname;
    if (referrerHost === window.location.hostname) return null;
    return referrerHost;
  } catch {
    return null;
  }
}

/**
 * Send a JSON payload to the analytics endpoint using sendBeacon when
 * available, falling back to fetch with keepalive.
 * @param payload - The event data object to send
 */
function sendAnalyticsEvent(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
    return;
  }

  // Fallback: fetch with keepalive so the request survives page unload
  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Silently ignore analytics failures — they must never affect the user
  });
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Track an anonymous page view when a landing page loads.
 *
 * On mount the hook:
 * 1. Reads (or creates) a first-party `onoleads_id` cookie
 * 2. Detects device type from screen width
 * 3. Extracts UTM params from the URL
 * 4. Reads the referrer domain
 * 5. Sends a `page_view` event to `/api/analytics/event`
 *
 * The event fires at most once per component lifecycle. If `pageId` is null
 * the hook does nothing (useful while the page is still loading).
 *
 * @param pageId - The landing page's database ID, or null to skip tracking
 */
export function usePageTracking(pageId: string | null): void {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!pageId) return;
    if (hasFired.current) return;
    hasFired.current = true;

    const cookieId = getOrCreateCookieId();
    const deviceType = detectDeviceType();
    const utmParams = extractUtmParams();
    const referrerDomain = getReferrerDomain();

    sendAnalyticsEvent({
      event_type: "page_view",
      page_id: pageId,
      cookie_id: cookieId,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      utm_term: utmParams.utm_term,
      referrer_domain: referrerDomain,
      device_type: deviceType,
    });
  }, [pageId]);
}

// ============================================================================
// Standalone event helper
// ============================================================================

/**
 * Fire a one-off analytics event (e.g. CTA click, popup interaction).
 * Reads the same `onoleads_id` cookie used by `usePageTracking`.
 *
 * Can be called from event handlers outside of React lifecycle hooks.
 *
 * @param eventType - The event name (e.g. "cta_click", "popup_open")
 * @param pageId - The landing page's database ID
 */
export function trackEvent(eventType: string, pageId: string): void {
  const cookieId = getOrCreateCookieId();

  sendAnalyticsEvent({
    event_type: eventType,
    page_id: pageId,
    cookie_id: cookieId,
  });
}
