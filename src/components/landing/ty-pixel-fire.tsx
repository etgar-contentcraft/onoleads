"use client";

/**
 * TyPixelFire — fires the Lead pixel event on the Thank You page.
 *
 * The Lead event is intentionally fired HERE (on the TY page) rather than
 * during form submission. This is the approach recommended by Meta and Google:
 * - Confirms the user reached the confirmation page (true conversion)
 * - CAPI fires server-side when the lead is saved (in /api/leads)
 * - Both CAPI and browser pixel share the same event_id for deduplication
 *
 * The event_id is written to sessionStorage by cta-modal.tsx before the redirect.
 */

import { useEffect } from "react";
import type { PixelConfig } from "@/lib/analytics/pixel-manager";
import {
  initConsentModeDefaults,
  updateConsentGranted,
  initializePixels,
  firePixelEvent,
} from "@/lib/analytics/pixel-manager";

interface TyPixelFireProps {
  /** Pixel configuration fetched server-side from pixel_configurations table */
  config: PixelConfig;
}

export function TyPixelFire({ config }: TyPixelFireProps) {
  useEffect(() => {
    // Skip if no platforms are configured
    const hasAnyPixel =
      config.metaPixelId ||
      config.ga4Id ||
      config.tikTokPixelId ||
      config.googleAdsId ||
      config.linkedInPartnerId ||
      config.taboolaAccountId ||
      config.twitterPixelId;
    if (!hasAnyPixel) return;

    // Read the shared event_id written by cta-modal.tsx before the redirect.
    // Used for CAPI ↔ browser pixel deduplication — Meta/Google discard duplicates.
    const eventId = sessionStorage.getItem("ty_event_id") || "";
    if (eventId) sessionStorage.removeItem("ty_event_id"); // consume once

    // Safety net: ensure consent defaults are set before GA4 loads.
    // The primary consent defaults come from the inline script in <head>,
    // but this guards against edge cases.
    initConsentModeDefaults();

    // Form submission = explicit marketing consent. Upgrade consent mode before
    // initializing pixels so GA4/Google Ads don't operate in denied mode.
    updateConsentGranted();
    initializePixels(config); // idempotent — no-op if already initialized

    // Fire Lead event on all configured platforms
    firePixelEvent(
      "lead_submit",
      { event_id: eventId || undefined },
      config
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
