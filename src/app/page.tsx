/**
 * Homepage server component.
 * Fetches programs and upcoming published event pages from Supabase,
 * then passes both to the client component for rendering.
 */
import { createClient } from "@/lib/supabase/server";
import { HomepageClient } from "@/components/homepage/homepage-client";
import type { ProgramWithFaculty } from "@/lib/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הקריה האקדמית אונו | המכללה המומלצת בישראל - מצא את התואר שמתאים לך",
  description:
    "הקריה האקדמית אונו היא המכללה המומלצת בישראל. תואר ראשון ושני במנהל עסקים, משפטים, מדעי הרוח והחברה, מקצועות הבריאות ועוד. מצא את התוכנית שמתאימה לך.",
  openGraph: {
    title: "הקריה האקדמית אונו | המכללה המומלצת בישראל",
    description:
      "מצא את התואר שמתאים לך - תוכניות לימוד לתואר ראשון ושני במגוון תחומים.",
    type: "website",
    locale: "he_IL",
    images: [
      {
        url: "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
        width: 1200,
        height: 630,
        alt: "הקריה האקדמית אונו",
      },
    ],
  },
  other: {
    "theme-color": "#B8D900",
  },
};

export const revalidate = 3600;

/**
 * Minimal shape of an event page row used on the homepage events section.
 * custom_styles holds the EventMeta config (event_type, event_date, etc.).
 */
export interface HomepageEventPage {
  id: string;
  slug: string;
  title_he: string | null;
  custom_styles: Record<string, unknown> | null;
}

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch active programs with their faculty for the program finder section
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select(
      `
      *,
      faculty:faculties(*)
    `
    )
    .in("level", ["bachelor", "master"])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (programsError) {
    console.error("Failed to fetch programs:", programsError);
  }

  // Fetch published event pages for the "אירועים קרובים" section
  const { data: eventPages, error: eventsError } = await supabase
    .from("pages")
    .select("id, slug, title_he, custom_styles")
    .eq("page_type", "event")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (eventsError) {
    console.error("Failed to fetch event pages:", eventsError);
  }

  const safePrograms: ProgramWithFaculty[] = (programs as ProgramWithFaculty[]) || [];
  const safeEvents: HomepageEventPage[] = (eventPages as HomepageEventPage[]) || [];

  // Resolve the brand default logo from the logos library (falls back inside the component)
  const { data: defaultLogo } = await supabase
    .from("logos")
    .select("url")
    .eq("is_default", true)
    .maybeSingle();

  return (
    <HomepageClient
      programs={safePrograms}
      events={safeEvents}
      logoUrl={defaultLogo?.url}
    />
  );
}
