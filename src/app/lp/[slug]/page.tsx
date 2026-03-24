import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page, PageSection, Language } from "@/lib/types/database";
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

  return {
    page: page as Page,
    sections: (sections || []) as PageSection[],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) return { title: "Page Not Found" };

  const { page } = data;
  const isRtl = page.language === "he" || page.language === "ar";
  const title = page.seo_title || page.title_he || "Ono Academic College";
  const description =
    page.seo_description ||
    (isRtl
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

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) notFound();

  const { page, sections } = data;
  const language = (page.language || "he") as Language;
  const isRtl = language === "he" || language === "ar";

  return (
    <html lang={language} dir={isRtl ? "rtl" : "ltr"}>
      <head>
        {/* Preconnect to common CDNs */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "הקריה האקדמית אונו",
              alternateName: "Ono Academic College",
              url: "https://www.ono.ac.il",
              description: "המכללה המומלצת בישראל",
            }),
          }}
        />
      </head>
      <body className="antialiased">
        <LandingPageLayout
          sections={sections}
          language={language}
          pageId={page.id}
          programId={page.program_id || undefined}
          pageTitle={page.title_he}
        />
      </body>
    </html>
  );
}
