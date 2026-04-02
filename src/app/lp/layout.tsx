/**
 * Layout for landing pages (/lp/*).
 * Overrides root layout with language/direction from child page props.
 * Fonts are loaded here to avoid duplication.
 */

import { Heebo, Rubik } from "next/font/google";
import "@/app/globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
