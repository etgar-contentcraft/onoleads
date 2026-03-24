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

export default async function HomePage() {
  const supabase = await createClient();

  const { data: programs, error } = await supabase
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

  if (error) {
    console.error("Failed to fetch programs:", error);
  }

  const safePrograms: ProgramWithFaculty[] =
    (programs as ProgramWithFaculty[]) || [];

  return <HomepageClient programs={safePrograms} />;
}
