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
      config.twitterPixelId ||
      config.outbrainAccountId ||
      config.clarityProjectId;
    if (!hasAnyPixel) return;

    // Read the shared event_id written by cta-modal.tsx before the redirect.
    // Used for CAPI ↔ browser pixel deduplication — Meta/Google discard duplicates.
    const eventId = sessionStorage.getItem("ty_event_id") || "";
    if (eventId) sessionStorage.removeItem("ty_event_id"); // consume once

    // Read user data from sessionStorage for Enhanced Conversions (Google Ads / GA4).
    // Written by cta-modal.tsx before redirect. Consumed once for privacy.
    const tyName = sessionStorage.getItem("ty_name") || "";
    const tyEmail = sessionStorage.getItem("ty_email") || "";
    const tyPhone = sessionStorage.getItem("ty_phone") || "";
    if (tyEmail) sessionStorage.removeItem("ty_email");
    if (tyPhone) sessionStorage.removeItem("ty_phone");

    // Split full name for Enhanced Conversions (gtag auto-hashes)
    const nameParts = tyName.trim().split(/\s+/);
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    // Safety net: ensure consent defaults are set before GA4 loads.
    // The primary consent defaults come from the inline script in <head>,
    // but this guards against edge cases.
    initConsentModeDefaults();

    // Form submission = explicit marketing consent. Upgrade consent mode before
    // initializing pixels so GA4/Google Ads don't operate in denied mode.
    updateConsentGranted();
    initializePixels(config); // idempotent — no-op if already initialized

    // Fire Lead event on all configured platforms (with user_data for Enhanced Conversions)
    firePixelEvent(
      "lead_submit",
      {
        event_id: eventId || undefined,
        user_data: (tyEmail || tyPhone) ? {
          email_address: tyEmail || undefined,
          phone_number: tyPhone || undefined,
          address: { first_name: firstName, last_name: lastName },
        } : undefined,
      },
      config
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
