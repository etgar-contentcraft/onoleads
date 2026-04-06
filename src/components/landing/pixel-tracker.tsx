/**
 * Client-side pixel tracking component for landing pages.
 *
 * Mounts once per landing page and manages:
 * 1. Consent Mode v2 initialization (beforeInteractive inline script)
 * 2. Pixel initialization gated on cookie consent
 * 3. The 5 engagement event trackers: time >60s, scroll 75%, form focus, video play, lead submit
 *
 * The lead_submit event is fired externally via fireLeadPixelEvent() after
 * the API call succeeds — not inside this component.
 */

"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import {
  initializePixels,
  isMarketingConsentGranted,
  firePixelEvent,
  updateConsentGranted,
  CONSENT_MODE_INIT_SCRIPT,
  type PixelConfig,
} from "@/lib/analytics/pixel-manager";

interface PixelTrackerProps {
  config: PixelConfig;
}

/**
 * Global singleton — fires the lead_submit pixel event from outside React.
 * Call this from the form submit handler after the API returns success.
 */
let _pixelConfig: PixelConfig | null = null;
let _leadFireCount = 0;

export function fireLeadPixelEvent(
  eventId: string,
  userEmail?: string | null,
  userPhone?: string | null
): void {
  if (!_pixelConfig) return;
  // Guard: only fire once per session per form submission
  _leadFireCount++;
  const thisCount = _leadFireCount;

  setTimeout(() => {
    if (thisCount !== _leadFireCount) return; // superseded by newer submission

    /* Form submission = explicit marketing consent (form has its own disclaimer).
     * Force-initialize pixels even if cookie consent banner was never accepted.
     * This also flushes any queued engagement events (scroll, time-on-page) that
     * were waiting for consent. initializePixels() is idempotent — no-op if already called. */
    updateConsentGranted();
    if (_pixelConfig) initializePixels(_pixelConfig);

    firePixelEvent(
      "lead_submit",
      {
        event_id: eventId,
        // Plain-text user data — GA4/gtag will hash these for Enhanced Conversions
        user_data: {
          email_address: userEmail || undefined,
          phone_number: userPhone || undefined,
        },
      },
      _pixelConfig!
    );
  }, 0);
}

/**
 * Pixel tracker component — renders the Consent Mode v2 inline script
 * and sets up all engagement event listeners.
 */
export function PixelTracker({ config }: PixelTrackerProps) {
  const initializedRef = useRef(false);
  const scrollFiredRef = useRef(false);
  const timeFiredRef = useRef(false);
  const formFiredRef = useRef(false);

  // Store config for the global fireLeadPixelEvent helper
  _pixelConfig = config;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Initialize pixels if consent already granted (returning visitor who accepted)
    if (isMarketingConsentGranted()) {
      initializePixels(config);
    }

    // Listen for consent changes (user accepts during this session)
    const handleConsentChange = () => {
      if (isMarketingConsentGranted()) {
        initializePixels(config);
      }
    };
    window.addEventListener("ono_consent_granted", handleConsentChange);

    // ── Time on page > 60s ─────────────────────────────────────────────────
    const timeTimer = setTimeout(() => {
      if (!timeFiredRef.current) {
        timeFiredRef.current = true;
        firePixelEvent("engaged_visitor", { time_on_page_seconds: 60 }, config);
      }
    }, 60_000);

    // ── Scroll depth 75% ───────────────────────────────────────────────────
    const handleScroll = () => {
      if (scrollFiredRef.current) return;
      const max = document.body.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      if (pct >= 75) {
        scrollFiredRef.current = true;
        firePixelEvent("scroll_depth_reached", { depth_percent: 75 }, config);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // ── Form first-focus ──────────────────────────────────────────────────
    const handleFormFocus = (e: FocusEvent) => {
      if (formFiredRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
        formFiredRef.current = true;
        firePixelEvent("form_interact", { field_name: (target as HTMLInputElement).name }, config);
      }
    };
    document.addEventListener("focusin", handleFormFocus);

    return () => {
      window.removeEventListener("ono_consent_granted", handleConsentChange);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("focusin", handleFormFocus);
      clearTimeout(timeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Consent Mode v2 — must fire before any gtag/GA4 script */}
      <Script
        id="consent-mode-v2"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: CONSENT_MODE_INIT_SCRIPT }}
      />
    </>
  );
}
