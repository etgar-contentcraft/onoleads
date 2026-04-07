/**
 * Event Landing Page Route - /lp/events/[slug]
 * Serves open day event pages (physical and zoom) from Supabase.
 * Fetches pages with page_type = 'event' and delegates to EventPageLayout.
 */

import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page } from "@/lib/types/database";
import { EventPageLayout, type EventMeta } from "@/components/landing/event-page-layout";
import type { Metadata } from "next";

// ============================================================================
// Types
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Re-export EventMeta so other modules can import it from this route file
export type { EventMeta };

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetches a published event page, its meta, and the resolved brand logo URL.
 * The logo cascades: page override → global default → undefined (component falls back).
 * @param slug - URL slug identifying the event page
 * @returns page data + resolved logo URL, or null if not found
 */
async function getEventPageData(
  slug: string
): Promise<{ page: Page; eventMeta: EventMeta; logoUrl?: string } | null> {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("page_type", "event")
    .eq("status", "published")
    .single();

  if (!page) return null;

  // Event configuration is stored in custom_styles JSON field
  const customStyles = (page.custom_styles || {}) as Record<string, unknown>;
  const eventMeta = customStyles as unknown as EventMeta;

  // Resolve the brand logo: per-page override > default logo from logos table
  const pageSettings = (customStyles.page_settings ?? {}) as { logo_url?: string };
  let logoUrl: string | undefined = pageSettings.logo_url;
  if (!logoUrl) {
    const { data: defaultLogo } = await supabase
      .from("logos")
      .select("url")
      .eq("is_default", true)
      .maybeSingle();
    logoUrl = defaultLogo?.url;
  }

  return {
    page: page as Page,
    eventMeta,
    logoUrl,
  };
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventPageData(slug);

  if (!data) return { title: "Page Not Found" };

  const { page } = data;
  const title = page.seo_title || page.title_he || "יום פתוח - הקריה האקדמית אונו";
  const description =
    page.seo_description ||
    "הצטרפו ליום הפתוח של הקריה האקדמית אונו. הכירו את הצוות האקדמי, שמעו על התוכניות ותשאלו כל שאלה.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "he_IL",
      images: [
        {
          url: "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
          width: 1200,
          height: 630,
          alt: "יום פתוח - הקריה האקדמית אונו",
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      "theme-color": "#B8D900",
    },
  };
}

export const revalidate = 3600;

// ============================================================================
// Page Component
// ============================================================================

export default async function EventLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getEventPageData(slug);

  if (!data) notFound();

  const { page, eventMeta, logoUrl } = data;

  // JSON-LD Event schema for SEO
  const eventSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: page.title_he,
    description: page.seo_description || "יום פתוח - הקריה האקדמית אונו",
    startDate: eventMeta.event_date,
    organizer: {
      "@type": "EducationalOrganization",
      name: "הקריה האקדמית אונו",
      url: "https://www.ono.ac.il",
    },
    ...(eventMeta.event_type === "event_physical" && eventMeta.venue
      ? {
          location: {
            "@type": "Place",
            name: eventMeta.venue,
            address: {
              "@type": "PostalAddress",
              streetAddress: eventMeta.venue,
              addressCountry: "IL",
            },
          },
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        }
      : {
          location: {
            "@type": "VirtualLocation",
            url: eventMeta.zoom_link || "https://zoom.us",
          },
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        }),
    eventStatus: "https://schema.org/EventScheduled",
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/<\/script>/gi, "<\\/script>") }}
      />
      <EventPageLayout
        page={page}
        eventMeta={eventMeta}
        logoUrl={logoUrl}
      />
    </>
  );
}
