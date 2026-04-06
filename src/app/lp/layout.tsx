/**
 * Layout for landing pages (/lp/*).
 * Overrides root layout with language/direction from child page props.
 * Fonts are loaded here to avoid duplication.
 */

import { Heebo, Rubik, Assistant, Noto_Sans_Hebrew, Frank_Ruhl_Libre } from "next/font/google";
import "@/app/globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin", "arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-hebrew",
  display: "swap",
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-frank-ruhl",
  display: "swap",
});

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable} ${assistant.variable} ${notoSansHebrew.variable} ${frankRuhlLibre.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
