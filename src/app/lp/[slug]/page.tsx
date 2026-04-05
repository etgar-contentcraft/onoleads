/**
 * Dynamic landing page route for OnoLeads.
 * Fetches page data, program info, and sections from Supabase,
 * then renders the page with enhanced SEO metadata and JSON-LD structured data.
 */
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin client singleton — used for settings reads that require bypassing RLS */
const getAdminClient = () => createAdminClient();
import type { Page, PageSection, Language, Program } from "@/lib/types/database";
import type { PopupCampaign } from "@/lib/types/popup-campaigns";
import { LandingPageLayout, type PageSettings } from "@/components/landing/landing-page-layout";
import type { Metadata } from "next";
import { cache } from "react";

/** Default OG image used when the program has no hero image */
const DEFAULT_OG_IMAGE =
  "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg";

/** Base URL for canonical links and structured data */
const BASE_URL = "https://onoleads.vercel.app";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Derives a Hebrew degree label from the program's degree_type string.
 * @param degreeType - e.g. "B.A.", "M.A.", "B.Sc."
 * @returns Hebrew label like "תואר ראשון" or "תואר שני"
 */
function getDegreeLabel(degreeType: string): string {
  const lower = degreeType.toLowerCase();
  if (lower.includes("b.a") || lower.includes("b.sc") || lower === "ba") return "תואר ראשון";
  if (lower.includes("m.a") || lower.includes("m.sc") || lower === "ma") return "תואר שני";
  return "תואר";
}

/**
 * Derives an English educational level from the program's degree_type string.
 * @param degreeType - e.g. "B.A.", "M.A.", "B.Sc."
 * @returns Educational level like "Bachelor" or "Master"
 */
function getEducationalLevel(degreeType: string): string {
  const lower = degreeType.toLowerCase();
  if (lower.includes("b.a") || lower.includes("b.sc") || lower === "ba") return "Bachelor";
  if (lower.includes("m.a") || lower.includes("m.sc") || lower === "ma") return "Master";
  return "Postgraduate";
}

/**
 * Fetches all data needed for a landing page: page record, sections, program, settings, campaigns.
 * @param slug - URL slug identifying the landing page
 * @returns Combined page data or null if page not found/unpublished
 */
const getPageData = cache(async function getPageData(slug: string) {
  const supabase = await createClient();
  // Settings table is restricted to authenticated users via RLS.
  // Landing pages are public, so we must use the admin client to read settings.
  const adminClient = getAdminClient();

  const [pageRes, globalSettingsRes] = await Promise.all([
    supabase.from("pages").select("*").eq("slug", slug).eq("status", "published").single(),
    adminClient.from("settings").select("key, value"),
  ]);

  if (!pageRes.data) return null;
  const page = pageRes.data;

  const [sectionsRes, programRes, campaignsRes] = await Promise.all([
    supabase
      .from("page_sections")
      .select("*, shared_sections:shared_section_id(content, styles)")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true }),
    page.program_id
      ? supabase.from("programs").select("*").eq("id", page.program_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("page_popup_assignments")
      .select("*, campaign:campaign_id(*)")
      .eq("page_id", page.id)
      .eq("is_enabled", true)
      .order("priority", { ascending: false }),
  ]);

  // Build global settings map from key-value rows
  const globalMap: Record<string, string> = {};
  for (const row of globalSettingsRes.data || []) {
    if (row.value) globalMap[row.key] = row.value;
  }

  // Extract page-specific overrides from custom_styles.page_settings
  const customStyles = (page.custom_styles || {}) as Record<string, unknown>;
  const pageOverrides = (customStyles.page_settings || {}) as Record<string, string>;

  // Merge: page overrides win over global defaults when non-empty
  const settings: PageSettings = {
    webhook_url: pageOverrides.webhook_url || globalMap.webhook_url,
    whatsapp_number: pageOverrides.whatsapp_number || globalMap.whatsapp_number,
    phone_number: pageOverrides.phone_number || globalMap.phone_number,
    logo_url: pageOverrides.logo_url || globalMap.logo_url,
    default_cta_text: pageOverrides.default_cta_text || globalMap.default_cta_text,
    google_analytics_id: pageOverrides.google_analytics_id || globalMap.google_analytics_id,
    facebook_pixel_id: pageOverrides.facebook_pixel_id || globalMap.facebook_pixel_id,
    social_proof_enabled: pageOverrides.social_proof_enabled === "true",
    social_proof_days: pageOverrides.social_proof_days ? parseInt(pageOverrides.social_proof_days, 10) : 7,
  };

  // For global sections: use shared content when shared_section_id is set
  const sections = (sectionsRes.data || []).map((s) => {
    const shared = s.shared_sections as { content: Record<string, unknown>; styles: Record<string, unknown> } | null;
    if (shared) {
      return { ...s, content: shared.content, styles: shared.styles ?? s.styles };
    }
    return s;
  }) as PageSection[];

  // Filter active campaigns (check dates and is_active flag)
  const now = new Date().toISOString();
  const campaigns = ((campaignsRes.data || []) as { campaign: PopupCampaign | null }[])
    .map((a) => a.campaign)
    .filter((c): c is PopupCampaign => !!c && c.is_active)
    .filter((c) => !c.start_date || c.start_date <= now)
    .filter((c) => !c.end_date || c.end_date >= now);

  return {
    page: page as Page,
    sections,
    program: (programRes.data as Program | null),
    settings,
    campaigns,
  };
});

/**
 * Generates enhanced SEO metadata including OpenGraph, Twitter Cards,
 * canonical URL, keywords, and authorship info.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) return { title: "Page Not Found" };

  const { page, program } = data;
  const isRtl = page.language === "he" || page.language === "ar";
  const title = page.seo_title || page.title_he || "הקריה האקדמית אונו";
  const description =
    page.seo_description ||
    (program?.description_he
      ? program.description_he.substring(0, 160)
      : isRtl
        ? "הקריה האקדמית אונו - המכללה המומלצת בישראל. השאירו פרטים ונחזור אליכם."
        : "Ono Academic College - Israel's most recommended college.");

  const ogImage = program?.hero_image_url || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    authors: [{ name: "הקריה האקדמית אונו" }],
    creator: "הקריה האקדמית אונו",
    publisher: "הקריה האקדמית אונו",
    category: "education",
    keywords: program
      ? [
          program.name_he,
          "הקריה האקדמית אונו",
          "תואר",
          getDegreeLabel(program.degree_type),
          "לימודים",
          "אקדמיה",
        ].filter(Boolean)
      : ["הקריה האקדמית אונו", "לימודים אקדמיים"],
    alternates: {
      canonical: `${BASE_URL}/lp/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: page.language === "he" ? "he_IL" : page.language === "ar" ? "ar_SA" : "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
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

/** Pre-generate all published pages as static HTML at build time. */
export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("pages").select("slug").eq("status", "published");
  return (data || []).map(({ slug }: { slug: string }) => ({ slug }));
}

/**
 * Never auto-revalidate — pages stay static until the admin explicitly saves,
 * which triggers on-demand revalidation via /api/revalidate.
 * New slugs not in generateStaticParams are SSR'd on first request, then cached.
 */
export const revalidate = false;
export const dynamicParams = true;

/**
 * Builds an array of JSON-LD structured data schemas for the landing page.
 * Includes: EducationalOrganization, Course (if program), BreadcrumbList,
 * WebPage, and FAQPage (if FAQ section exists).
 * @param slug - Page URL slug
 * @param page - Page record from Supabase
 * @param sections - Page sections array
 * @param program - Associated program or null
 * @param title - Resolved page title for SEO
 * @param description - Resolved page description for SEO
 * @returns Array of JSON-LD schema objects
 */
function buildJsonLdSchemas(
  slug: string,
  page: Page,
  sections: PageSection[],
  program: Program | null,
  title: string,
  description: string,
): Record<string, unknown>[] {
  const pageUrl = `${BASE_URL}/lp/${slug}`;

  // EducationalOrganization — enhanced with social links, geo, and contact info
  const orgSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "הקריה האקדמית אונו",
    alternateName: "Ono Academic College",
    url: "https://www.ono.ac.il",
    logo: "https://www.ono.ac.il/wp-content/uploads/2023/01/ono-logo.png",
    sameAs: [
      "https://www.facebook.com/OnoCampus",
      "https://www.instagram.com/ono_academic",
      "https://www.youtube.com/@onoacademiccollege",
      "https://www.linkedin.com/school/ono-academic-college/",
      "https://he.wikipedia.org/wiki/הקריה_האקדמית_אונו",
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "רחוב הבנאי 104",
      addressLocality: "קריית אונו",
      addressRegion: "מחוז מרכז",
      postalCode: "5545173",
      addressCountry: "IL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.0636,
      longitude: 34.8621,
    },
    telephone: "*2899",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "*2899",
      contactType: "admissions",
      availableLanguage: ["Hebrew", "Arabic", "English"],
    },
  };

  const schemas: Record<string, unknown>[] = [orgSchema];

  // Course schema — enhanced with courseInstance, offers, prerequisites
  if (program) {
    const isMaster = getEducationalLevel(program.degree_type) === "Master";
    const campusName = program.campuses?.length
      ? program.campuses[0]
      : "קמפוס קריית אונו";

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Course",
      name: program.name_he,
      description: program.description_he || `לימודי ${program.name_he} בהקריה האקדמית אונו`,
      url: pageUrl,
      provider: {
        "@type": "EducationalOrganization",
        name: "הקריה האקדמית אונו",
        sameAs: "https://www.ono.ac.il",
      },
      educationalLevel: getEducationalLevel(program.degree_type),
      educationalCredentialAwarded: program.degree_type,
      inLanguage: page.language || "he",
      coursePrerequisites: isMaster ? "Bachelor's degree" : "Bagrut certificate",
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "onsite",
        ...(program.duration_semesters && {
          courseWorkload: `${program.duration_semesters} סמסטרים`,
        }),
        instructor: {
          "@type": "Organization",
          name: "הקריה האקדמית אונו",
        },
        location: {
          "@type": "Place",
          name: campusName,
          address: {
            "@type": "PostalAddress",
            addressLocality: "קריית אונו",
            addressCountry: "IL",
          },
        },
      },
      offers: {
        "@type": "Offer",
        category: "Tuition",
        availability: "https://schema.org/InStock",
        url: pageUrl,
      },
    });
  }

  // BreadcrumbList — navigation path for search engines
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "הקריה האקדמית אונו",
        item: "https://www.ono.ac.il",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "לימודים",
        item: "https://www.ono.ac.il",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: pageUrl,
      },
    ],
  });

  // WebPage schema — helps LLM crawlers understand page purpose and freshness
  schemas.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: pageUrl,
    inLanguage: page.language || "he",
    isPartOf: {
      "@type": "WebSite",
      name: "OnoLeads",
      url: BASE_URL,
    },
    about: {
      "@type": "Thing",
      name: program?.name_he || title,
    },
    datePublished: page.created_at,
    dateModified: page.updated_at || page.created_at,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".hero-description"],
    },
  });

  // FAQPage schema — generated from FAQ sections for rich results and LLM optimization
  const faqSection = sections.find((s) => s.section_type === "faq");
  const faqItems = faqSection?.content?.items as
    | { question: string; answer: string }[]
    | undefined;

  if (faqItems && faqItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return schemas;
}

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) {
    // Check if this is an old slug that was changed — redirect to new slug
    const supabase = await createClient();
    const { data: redir } = await supabase
      .from("slug_redirects")
      .select("page_id")
      .eq("old_slug", slug)
      .single();
    if (redir) {
      const { data: newPage } = await supabase
        .from("pages")
        .select("slug")
        .eq("id", redir.page_id)
        .eq("status", "published")
        .single();
      if (newPage) {
        redirect(`/lp/${newPage.slug}`);
      }
    }
    notFound();
  }

  const { page, sections, program, settings, campaigns } = data;
  const language = (page.language || "he") as Language;
  const isRtl = language === "he" || language === "ar";

  // Resolve title and description for JSON-LD (mirrors generateMetadata logic)
  const title = page.seo_title || page.title_he || "הקריה האקדמית אונו";
  const description =
    page.seo_description ||
    (program?.description_he
      ? program.description_he.substring(0, 160)
      : isRtl
        ? "הקריה האקדמית אונו - המכללה המומלצת בישראל. השאירו פרטים ונחזור אליכם."
        : "Ono Academic College - Israel's most recommended college.");

  // Build all JSON-LD structured data schemas
  const schemas = buildJsonLdSchemas(slug, page, sections, program, title, description);

  return (
    <>
      {/* JSON-LD Schemas for SEO and LLM optimization */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/<\/script>/gi, "<\\/script>") }}
        />
      ))}
      <LandingPageLayout
        sections={sections}
        language={language}
        pageId={page.id}
        programId={page.program_id || undefined}
        pageSlug={slug}
        pageTitle={page.title_he}
        program={program}
        settings={settings}
        campaigns={campaigns}
      />
    </>
  );
}
