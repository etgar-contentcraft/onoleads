"use client";

/**
 * ThankYouRenderer — picks the correct layout component for the supplied
 * template and hands it the resolved LayoutContext.
 *
 * This is the public-facing entry point used by `src/app/ty/page.tsx`.
 */

import { useEffect, useState } from "react";
import { getLayout } from "@/lib/thank-you/layouts/registry";
import { firstName, type LayoutContext } from "@/lib/thank-you/layouts/shared";
import type { ThankYouTemplate } from "@/lib/types/thank-you-templates";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";

interface ThankYouRendererProps {
  template: ThankYouTemplate;
  settings: ThankYouPageSettings; // legacy global/page settings (for whatsapp number, social links, etc.)
  programName?: string;
  pageSlug?: string;
  language?: string;
  logoUrl?: string;
}

export function ThankYouRenderer({
  template,
  settings,
  programName,
  pageSlug,
  language = "he",
  logoUrl,
}: ThankYouRendererProps) {
  const [displayName, setDisplayName] = useState("");

  // Read first name from sessionStorage (set by cta-modal before redirect)
  useEffect(() => {
    const stored = sessionStorage.getItem("ty_name") || "";
    if (stored) {
      setDisplayName(firstName(stored));
      sessionStorage.removeItem("ty_name"); // consume once
    }
  }, []);

  const ctx: LayoutContext = {
    template,
    language,
    displayName,
    programName,
    pageSlug,
    logoUrl,

    // Settings from the legacy global/page settings table
    whatsappNumber: settings.whatsapp_number,
    facebookUrl: settings.facebook_url,
    instagramUrl: settings.instagram_url,
    youtubeUrl: settings.youtube_url,
    linkedinUrl: settings.linkedin_url,
    tiktokUrl: settings.tiktok_url,

    // Visibility toggles
    showWhatsapp: settings.show_whatsapp,
    showSocial: settings.show_social,
    showReferral: settings.show_referral,
    showCalendar: settings.show_calendar,
    showVideo: settings.show_video,
    calendarUrl: settings.calendar_url,
    videoUrl: settings.video_url,
  };

  const Layout = getLayout(template.layout_id);
  return <Layout ctx={ctx} />;
}
