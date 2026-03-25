/**
 * Thank You Page Route (/ty)
 *
 * Served after a lead form submission. Reads settings from:
 * 1. Global settings table (thank_you_page_settings JSON key)
 * 2. Per-page override in pages.custom_styles.thank_you_settings
 *
 * Query params:
 *   slug  - the landing page slug (to fetch per-page settings + back link)
 *   name  - NOT passed via URL; read from sessionStorage on the client
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThankYouPage } from "@/components/landing/thank-you-page";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

interface PageProps {
  searchParams: Promise<{ slug?: string }>;
}

export const metadata: Metadata = {
  title: "תודה! | הקריה האקדמית אונו",
  description: "קיבלנו את פרטיך. יועץ לימודים ייצור איתך קשר בהקדם.",
  robots: { index: false, follow: false },
};

export default async function ThankYouRoute({ searchParams }: PageProps) {
  const { slug } = await searchParams;
  const supabase = await createClient();

  // ── Fetch global TY settings ──────────────────────────────────────────────
  const [{ data: globalTyRow }, { data: globalWaRow }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "thank_you_page_settings").single(),
    supabase.from("settings").select("value").eq("key", "whatsapp_number").single(),
  ]);

  let globalTySettings: ThankYouPageSettings = { ...ONO_TY_DEFAULTS };
  if (globalTyRow?.value) {
    try {
      globalTySettings = { ...ONO_TY_DEFAULTS, ...JSON.parse(globalTyRow.value) };
    } catch { /* ignore malformed JSON */ }
  }

  // ── Fetch page-specific settings ──────────────────────────────────────────
  let pageTySettings: Partial<ThankYouPageSettings> = {};
  let pageWhatsapp = "";
  let programName = "";

  if (slug) {
    const { data: page } = await supabase
      .from("pages")
      .select("custom_styles, title_he")
      .eq("slug", slug)
      .single();

    if (page) {
      const cs = (page.custom_styles || {}) as Record<string, unknown>;
      pageTySettings = (cs.thank_you_settings || {}) as Partial<ThankYouPageSettings>;
      pageWhatsapp = ((cs.page_settings as Record<string, string>) || {}).whatsapp_number || "";
      programName = page.title_he || "";
    }
  }

  // ── Merge settings: page overrides global ─────────────────────────────────
  const cleanPage = Object.fromEntries(
    Object.entries(pageTySettings).filter(([, v]) => v !== undefined && v !== "")
  ) as Partial<ThankYouPageSettings>;

  const settings: ThankYouPageSettings = {
    ...globalTySettings,
    ...cleanPage,
    // Resolve whatsapp_number fallback chain
    whatsapp_number:
      cleanPage.whatsapp_number ||
      pageWhatsapp ||
      globalTySettings.whatsapp_number ||
      globalWaRow?.value ||
      "",
  };

  // ── Custom redirect ───────────────────────────────────────────────────────
  if (settings.custom_redirect_url) {
    redirect(settings.custom_redirect_url);
  }

  return (
    <html
      lang="he"
      dir="rtl"
      style={
        {
          "--font-heading": "'Rubik', sans-serif",
          "--font-heebo": "'Heebo', sans-serif",
        } as CSSProperties
      }
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Heebo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThankYouPage
          programName={programName}
          settings={settings}
          pageSlug={slug}
        />
      </body>
    </html>
  );
}
