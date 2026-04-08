/**
 * Thank You Page Route (/ty)
 *
 * Served after a lead form submission. Reads settings from:
 * 1. Global settings table (thank_you_page_settings JSON key)
 * 2. Per-page override in pages.custom_styles.thank_you_settings
 *
 * Query params:
 *   slug     - the landing page slug (to fetch per-page settings + back link)
 *   template - explicit template id (from the templates dashboard preview button)
 *              When set, this overrides the page's saved template selection
 *              and the global default — used for previewing templates standalone.
 *   name     - NOT passed via URL; read from sessionStorage on the client
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThankYouPage } from "@/components/landing/thank-you-page";
import { ThankYouRenderer } from "@/components/landing/thank-you-renderer";
import { TyPixelFire } from "@/components/landing/ty-pixel-fire";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";
import type { ThankYouTemplate } from "@/lib/types/thank-you-templates";
import type { EventRow } from "@/lib/types/events";
import { overlayEventOnTemplate } from "@/lib/thank-you/event-overlay";
import type { PixelConfig } from "@/lib/analytics/pixel-manager";
import { CONSENT_MODE_INIT_SCRIPT } from "@/lib/analytics/pixel-manager";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

interface PageProps {
  searchParams: Promise<{ slug?: string; template?: string }>;
}

export const metadata: Metadata = {
  title: "תודה! | הקריה האקדמית אונו",
  description: "קיבלנו את פרטיך. יועץ לימודים ייצור איתך קשר בהקדם.",
  robots: { index: false, follow: false },
};

export default async function ThankYouRoute({ searchParams }: PageProps) {
  const { slug, template: templateIdOverride } = await searchParams;
  const supabase = await createClient();
  // Settings table is restricted to authenticated users via RLS.
  // The thank-you page is public so we use the admin client for settings reads.
  const adminClient = createAdminClient();

  // ── Fetch global TY settings + pixel config in parallel ──────────────────
  const [{ data: globalTyRow }, { data: globalWaRow }, { data: pixelRows }] = await Promise.all([
    adminClient.from("settings").select("value").eq("key", "thank_you_page_settings").single(),
    adminClient.from("settings").select("value").eq("key", "whatsapp_number").single(),
    adminClient.from("pixel_configurations").select("platform, is_enabled, pixel_id, additional_config"),
  ]);

  // Build pixel config from enabled platform rows
  const pixelMap: Record<string, { pixel_id: string | null; additional_config: Record<string, string | null> }> = {};
  for (const row of pixelRows || []) {
    if (row.is_enabled && row.pixel_id) {
      pixelMap[row.platform] = {
        pixel_id: row.pixel_id,
        additional_config: (row.additional_config as Record<string, string | null>) || {},
      };
    }
  }

  const pixelConfig: PixelConfig = {
    metaPixelId: pixelMap["meta"]?.pixel_id || null,
    ga4Id: pixelMap["ga4"]?.pixel_id || null,
    googleAdsId: pixelMap["google"]?.pixel_id || null,
    googleAdsConversionLabel: pixelMap["google"]?.additional_config?.conversion_label || null,
    tikTokPixelId: pixelMap["tiktok"]?.pixel_id || null,
    linkedInPartnerId: pixelMap["linkedin"]?.pixel_id || null,
    outbrainAccountId: pixelMap["outbrain"]?.pixel_id || null,
    taboolaAccountId: pixelMap["taboola"]?.pixel_id || null,
    twitterPixelId: pixelMap["twitter"]?.pixel_id || null,
    pageSlug: slug || null,
  };

  let globalTySettings: ThankYouPageSettings = { ...ONO_TY_DEFAULTS };
  if (globalTyRow?.value) {
    try {
      globalTySettings = { ...ONO_TY_DEFAULTS, ...JSON.parse(globalTyRow.value) };
    } catch { /* ignore malformed JSON */ }
  }

  // ── Fetch page-specific settings ──────────────────────────────────────────
  let pageTySettings: Partial<ThankYouPageSettings> = {};
  let pageWhatsapp = "";
  let pageLogoUrl = "";
  let programName = "";
  let language = "he";
  let pageTemplateId: string | null = null;

  if (slug) {
    const { data: page } = await supabase
      .from("pages")
      .select("custom_styles, title_he, language")
      .eq("slug", slug)
      .single();

    if (page) {
      const cs = (page.custom_styles || {}) as Record<string, unknown>;
      // The settings page writes to `ty_settings`; older code read `thank_you_settings`.
      // Read both, preferring the newer key, to keep every historical write live.
      pageTySettings = (cs.ty_settings || cs.thank_you_settings || {}) as Partial<ThankYouPageSettings>;
      // Extract per-page template selection (set via builder PageSettings dialog)
      pageTemplateId = (pageTySettings as { template_id?: string }).template_id || null;
      const pageSettingsObj = (cs.page_settings as Record<string, string>) || {};
      pageWhatsapp = pageSettingsObj.whatsapp_number || "";
      pageLogoUrl = pageSettingsObj.logo_url || "";
      programName = page.title_he || "";
      language = page.language || "he";
    }
  }

  // ── Resolve logo: page override > default logo from logos table ───────────
  let resolvedLogoUrl: string | undefined = pageLogoUrl || undefined;
  if (!resolvedLogoUrl) {
    const { data: defaultLogoRow } = await supabase
      .from("logos")
      .select("url")
      .eq("is_default", true)
      .maybeSingle();
    resolvedLogoUrl = defaultLogoRow?.url;
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

  // ── Resolve template: ?template= override > page selection > global default ──
  let template: ThankYouTemplate | null = null;
  if (templateIdOverride) {
    // Explicit template id from the dashboard preview button — used to view
    // a specific template layout standalone, regardless of the page selection.
    const { data } = await adminClient
      .from("thank_you_templates")
      .select("*")
      .eq("id", templateIdOverride)
      .eq("is_active", true)
      .maybeSingle();
    template = (data as ThankYouTemplate) || null;
  }
  if (!template && pageTemplateId) {
    const { data } = await adminClient
      .from("thank_you_templates")
      .select("*")
      .eq("id", pageTemplateId)
      .eq("is_active", true)
      .maybeSingle();
    template = (data as ThankYouTemplate) || null;
  }
  if (!template) {
    const { data } = await adminClient
      .from("thank_you_templates")
      .select("*")
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();
    template = (data as ThankYouTemplate) || null;
  }

  // ── Optional: resolve linked event + overlay onto template ──────────────
  // If the page is linked to an event (via /dashboard/events), fetch the
  // event row and overlay its fields on top of the template content before
  // rendering. This lets editors maintain event details in one place and
  // have them appear on every page that references the event.
  if (settings.event_id && template && template.layout_id === "open_day") {
    const { data: eventRow } = await adminClient
      .from("events")
      .select("*")
      .eq("id", settings.event_id)
      .eq("is_active", true)
      .maybeSingle();
    if (eventRow) {
      template = overlayEventOnTemplate(template, eventRow as EventRow);
    }
  }

  // ── Custom redirect ───────────────────────────────────────────────────────
  if (settings.custom_redirect_url) {
    redirect(settings.custom_redirect_url);
  }

  return (
    <html
      lang={language}
      dir={language === "he" || language === "ar" ? "rtl" : "ltr"}
      style={
        {
          "--font-heading": "'Rubik', sans-serif",
          "--font-heebo": "'Heebo', sans-serif",
        } as CSSProperties
      }
    >
      <head>
        {/* Consent Mode v2 — MUST execute before any gtag/GA4 script loads.
            Uses raw <script> because Next.js <Script strategy="beforeInteractive">
            does NOT render in nested layouts or pages with custom <html>. */}
        <script
          id="consent-mode-v2"
          dangerouslySetInnerHTML={{ __html: CONSENT_MODE_INIT_SCRIPT }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Heebo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `:root,html{--font-heading:'Rubik',sans-serif;--font-heebo:'Heebo',sans-serif}.font-heading{font-family:'Rubik',sans-serif!important}` }} />
      </head>
      <body className="antialiased">
        {/* Fire Lead pixel event on all configured platforms.
            Must render inside <body> so scripts can inject into <head>. */}
        <TyPixelFire config={pixelConfig} />
        {template ? (
          <ThankYouRenderer
            template={template}
            settings={settings}
            programName={programName}
            pageSlug={slug}
            language={language}
            logoUrl={resolvedLogoUrl}
          />
        ) : (
          // Fallback to legacy renderer if no templates exist (e.g. fresh DB)
          <ThankYouPage
            programName={programName}
            settings={settings}
            pageSlug={slug}
            language={language}
            logoUrl={resolvedLogoUrl}
          />
        )}
      </body>
    </html>
  );
}
