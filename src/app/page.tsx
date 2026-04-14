/**
 * Homepage — Static institutional landing page.
 * Full-screen cinematic hero with campus photo, Ono logo,
 * link to main website (ono.ac.il), social media links,
 * and contact phone number. No dynamic data needed.
 */
import type { Metadata } from "next";
import { HomepageHero } from "@/components/homepage/homepage-hero";

export const metadata: Metadata = {
  title: "הקריה האקדמית אונו | דפי נחיתה",
  description:
    "דפי נחיתה של הקריה האקדמית אונו — המכללה המומלצת בישראל. תואר ראשון ושני במנהל עסקים, משפטים, מדעי הרוח והחברה, מקצועות הבריאות ועוד.",
  openGraph: {
    title: "הקריה האקדמית אונו | דפי נחיתה",
    description: "דפי נחיתה של הקריה האקדמית אונו — המכללה המומלצת בישראל.",
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
    "theme-color": "#1a1820",
  },
};

export default function HomePage() {
  return <HomepageHero />;
}
