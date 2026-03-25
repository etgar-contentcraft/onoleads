import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page, PageSection, Language, Program } from "@/lib/types/database";
import { LandingPageLayout, type PageSettings } from "@/components/landing/landing-page-layout";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageData(slug: string) {
  const supabase = await createClient();

  const [pageRes, globalSettingsRes] = await Promise.all([
    supabase.from("pages").select("*").eq("slug", slug).eq("status", "published").single(),
    supabase.from("settings").select("key, value"),
  ]);

  if (!pageRes.data) return null;
  const page = pageRes.data;

  const [sectionsRes, programRes] = await Promise.all([
    supabase.from("page_sections").select("*").eq("page_id", page.id).order("sort_order", { ascending: true }),
    page.program_id
      ? supabase.from("programs").select("*").eq("id", page.program_id).single()
      : Promise.resolve({ data: null }),
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
  };

  return {
    page: page as Page,
    sections: (sectionsRes.data || []) as PageSection[],
    program: (programRes.data as Program | null),
    settings,
  };
}

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: page.language === "he" ? "he_IL" : page.language === "ar" ? "ar_SA" : "en_US",
      images: program?.hero_image_url
        ? [{ url: program.hero_image_url, width: 1200, height: 630, alt: title }]
        : [
            {
              url: "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
              width: 1200,
              height: 630,
              alt: "הקריה האקדמית אונו",
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

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) notFound();

  const { page, sections, program, settings } = data;
  const language = (page.language || "he") as Language;
  const isRtl = language === "he" || language === "ar";

  // Build JSON-LD schemas
  const schemas: Record<string, unknown>[] = [
    // Organization
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "הקריה האקדמית אונו",
      alternateName: "Ono Academic College",
      url: "https://www.ono.ac.il",
      description: "המכללה המומלצת בישראל",
      logo: "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png",
      address: {
        "@type": "PostalAddress",
        addressLocality: "קריית אונו",
        addressCountry: "IL",
      },
    },
  ];

  // Course schema for program pages
  if (program) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Course",
      name: program.name_he,
      description: program.description_he || `לימודי ${program.name_he} בהקריה האקדמית אונו`,
      provider: {
        "@type": "EducationalOrganization",
        name: "הקריה האקדמית אונו",
        url: "https://www.ono.ac.il",
      },
      educationalCredentialAwarded: program.degree_type,
      ...(program.duration_semesters && {
        timeRequired: `P${Math.ceil(program.duration_semesters / 2)}Y`,
      }),
      ...(program.campuses && program.campuses.length > 0 && {
        locationCreated: program.campuses.map((campus) => ({
          "@type": "Place",
          name: campus,
        })),
      }),
    });
  }

  return (
    <html
      lang={language}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        {
          "--font-heading": "'Rubik', sans-serif",
          "--font-heebo": "'Heebo', sans-serif",
        } as React.CSSProperties
      }
    >
      <head>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Heebo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Force Rubik as the heading font — belt-and-suspenders since LP pages bypass root layout */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root, html {
            --font-heading: 'Rubik', sans-serif;
            --font-heebo: 'Heebo', sans-serif;
          }
          .font-heading, h1.font-heading, h2.font-heading, h3.font-heading {
            font-family: 'Rubik', sans-serif !important;
          }
        ` }} />

        {/* JSON-LD Schemas */}
        {schemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="antialiased">
        <LandingPageLayout
          sections={sections}
          language={language}
          pageId={page.id}
          programId={page.program_id || undefined}
          pageSlug={slug}
          pageTitle={page.title_he}
          program={program}
          settings={settings}
        />
      </body>
    </html>
  );
}
