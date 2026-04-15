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

  // ── Phase 1: Fetch ALL independent data in a single parallel batch ──────
  // This is the critical optimization: instead of 5-7 sequential DB queries
  // (~100-200ms each = 0.5-1.4s total), we run everything in parallel (~200ms).
  const [
    { data: globalTyRow },
    { data: globalWaRow },
    { data: pixelRows },
    { data: page },
    { data: defaultLogoRow },
    { data: defaultTemplate },
    // If a template override ID is provided (dashboard preview), fetch it in parallel too
    ...overrideResults
  ] = await Promise.all([
    adminClient.from("settings").select("value").eq("key", "thank_you_page_settings").single(),
    adminClient.from("settings").select("value").eq("key", "whatsapp_number").single(),
    adminClient.from("pixel_configurations").select("platform, is_enabled, pixel_id, additional_config"),
    // Page query runs in parallel — no need to wait for settings first
    slug
      ? supabase.from("pages").select("custom_styles, title_he, language").eq("slug", slug).single()
      : Promise.resolve({ data: null }),
    // Default logo — always needed as fallback, so fetch eagerly
    supabase.from("logos").select("url").eq("is_default", true).maybeSingle(),
    // Default template — always needed as fallback, so fetch eagerly
    adminClient.from("thank_you_templates").select("*").eq("is_default", true).eq("is_active", true).maybeSingle(),
    // Override template (dashboard preview mode) — fetch in parallel if ID is provided
    ...(templateIdOverride
      ? [adminClient.from("thank_you_templates").select("*").eq("id", templateIdOverride).eq("is_active", true).maybeSingle()]
      : []),
  ]);

  const overrideTemplate = overrideResults[0]?.data || null;

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
    linkedInConversionId: pixelMap["linkedin"]?.additional_config?.conversion_id || null,
    outbrainAccountId: pixelMap["outbrain"]?.pixel_id || null,
    taboolaAccountId: pixelMap["taboola"]?.pixel_id || null,
    twitterPixelId: pixelMap["twitter"]?.pixel_id || null,
    clarityProjectId: pixelMap["clarity"]?.pixel_id || null,
    pageSlug: slug || null,
  };

  let globalTySettings: ThankYouPageSettings = { ...ONO_TY_DEFAULTS };
  if (globalTyRow?.value) {
    try {
      globalTySettings = { ...ONO_TY_DEFAULTS, ...JSON.parse(globalTyRow.value) };
    } catch { /* ignore malformed JSON */ }
  }

  // ── Extract page-specific settings (from the parallel page query) ─────────
  let pageTySettings: Partial<ThankYouPageSettings> = {};
  let pageWhatsapp = "";
  let pageLogoUrl = "";
  let programName = "";
  let language = "he";
  let pageTemplateId: string | null = null;

  if (page) {
    const cs = (page.custom_styles || {}) as Record<string, unknown>;
    pageTySettings = (cs.ty_settings || cs.thank_you_settings || {}) as Partial<ThankYouPageSettings>;
    pageTemplateId = (pageTySettings as { template_id?: string }).template_id || null;
    const pageSettingsObj = (cs.page_settings as Record<string, string>) || {};
    pageWhatsapp = pageSettingsObj.whatsapp_number || "";
    pageLogoUrl = pageSettingsObj.logo_url || "";
    programName = page.title_he || "";
    language = page.language || "he";
  }

  // ── Resolve logo: page override > default logo from logos table ───────────
  const resolvedLogoUrl: string | undefined = pageLogoUrl || defaultLogoRow?.url || undefined;

  // ── Merge settings: page overrides global ─────────────────────────────────
  const cleanPage = Object.fromEntries(
    Object.entries(pageTySettings).filter(([, v]) => v !== undefined && v !== "")
  ) as Partial<ThankYouPageSettings>;

  const settings: ThankYouPageSettings = {
    ...globalTySettings,
    ...cleanPage,
    whatsapp_number:
      cleanPage.whatsapp_number ||
      pageWhatsapp ||
      globalTySettings.whatsapp_number ||
      globalWaRow?.value ||
      "",
  };

  // ── Resolve template: override > page-specific > default ──────────────────
  // Override and default templates were fetched in Phase 1. Only the page-specific
  // template might need a Phase 2 fetch (if it differs from override/default).
  let template: ThankYouTemplate | null = null;

  if (templateIdOverride && overrideTemplate) {
    template = overrideTemplate as ThankYouTemplate;
  }

  if (!template && pageTemplateId) {
    // Check if the page template is the same as the default (avoid redundant query)
    if (defaultTemplate && (defaultTemplate as ThankYouTemplate).id === pageTemplateId) {
      template = defaultTemplate as ThankYouTemplate;
    } else {
      // Phase 2: Only query needed when page has a non-default template selection
      const { data } = await adminClient
        .from("thank_you_templates")
        .select("*")
        .eq("id", pageTemplateId)
        .eq("is_active", true)
        .maybeSingle();
      template = (data as ThankYouTemplate) || null;
    }
  }

  if (!template && defaultTemplate) {
    template = defaultTemplate as ThankYouTemplate;
  }

  // ── Optional: resolve linked event + overlay onto template ──────────────
  let linkedEventMeta: EventRow["meta"] | undefined;
  if (settings.event_id && template && template.layout_id === "open_day") {
    const { data: eventRow } = await adminClient
      .from("events")
      .select("*")
      .eq("id", settings.event_id)
      .eq("is_active", true)
      .maybeSingle();
    if (eventRow) {
      template = overlayEventOnTemplate(template, eventRow as EventRow);
      linkedEventMeta = (eventRow as EventRow).meta || undefined;
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
            eventMeta={linkedEventMeta || undefined}
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
