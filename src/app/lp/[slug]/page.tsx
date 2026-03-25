import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page, PageSection, Language, Program } from "@/lib/types/database";
import { LandingPageLayout } from "@/components/landing/landing-page-layout";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageData(slug: string) {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) return null;

  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", page.id)
    .order("sort_order", { ascending: true });

  // Fetch program data if linked
  let program: Program | null = null;
  if (page.program_id) {
    const { data: programData } = await supabase
      .from("programs")
      .select("*")
      .eq("id", page.program_id)
      .single();
    program = programData as Program | null;
  }

  return {
    page: page as Page,
    sections: (sections || []) as PageSection[],
    program,
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

  const { page, sections, program } = data;
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
    <html lang={language} dir={isRtl ? "rtl" : "ltr"}>
      <head>
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

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
          pageTitle={page.title_he}
          program={program}
        />
      </body>
    </html>
  );
}
