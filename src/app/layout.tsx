import type { Metadata } from "next";
import { Heebo, Rubik, Assistant, Noto_Sans_Hebrew, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

// Rubik — geometric sans-serif with excellent Hebrew + Latin + Arabic support
const rubik = Rubik({
  subsets: ["hebrew", "latin", "arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

// Assistant — contemporary rounded Hebrew sans-serif, very readable at body sizes
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

// Noto Sans Hebrew — universal coverage, neutral and highly legible
const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-hebrew",
  display: "swap",
});

// Frank Ruhl Libre — elegant Hebrew serif for a traditional, academic look
const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-frank-ruhl",
  display: "swap",
});

export const metadata: Metadata = {
  title: "הקריה האקדמית אונו | המכללה המומלצת בישראל",
  description:
    "הקריה האקדמית אונו היא המכללה המומלצת בישראל. תואר ראשון ושני במנהל עסקים, משפטים, מדעי הרוח והחברה, מקצועות הבריאות ועוד.",
  metadataBase: new URL("https://leads.ono.ac.il"),
  openGraph: {
    title: "הקריה האקדמית אונו | המכללה המומלצת בישראל",
    description:
      "מצא את התואר שמתאים לך - תוכניות לימוד לתואר ראשון ושני במגוון תחומים.",
    type: "website",
    locale: "he_IL",
  },
  other: {
    "theme-color": "#B8D900",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={cn("light", heebo.variable, rubik.variable, assistant.variable, notoSansHebrew.variable, frankRuhlLibre.variable)} style={{ colorScheme: "light" }}>
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          "font-heebo"
        )}
      >
        {children}
      </body>
    </html>
  );
}
