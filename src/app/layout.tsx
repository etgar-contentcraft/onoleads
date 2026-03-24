import type { Metadata } from "next";
import { Heebo, Rubik } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-rubik",
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
    <html lang="he" dir="rtl" className={cn(heebo.variable, rubik.variable)}>
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
