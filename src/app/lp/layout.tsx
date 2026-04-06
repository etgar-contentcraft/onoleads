/**
 * Layout for landing pages (/lp/*).
 * Overrides root layout with language/direction from child page props.
 * Fonts are loaded here to avoid duplication.
 */

import { Heebo, Rubik, Assistant, Noto_Sans_Hebrew, Frank_Ruhl_Libre } from "next/font/google";
import "@/app/globals.css";
import { CONSENT_MODE_INIT_SCRIPT } from "@/lib/analytics/pixel-manager";

/* Primary fonts — loaded on every LP page.
 * Weights trimmed to only those actually used in landing page components.
 * Each removed weight saves ~20-40KB of font data. */
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin", "arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

/* Alternative fonts — available when pages override the default font.
 * Kept minimal weights since they're secondary. */
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-sans-hebrew",
  display: "swap",
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
  variable: "--font-frank-ruhl",
  display: "swap",
});

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable} ${assistant.variable} ${notoSansHebrew.variable} ${frankRuhlLibre.variable}`}>
      <head>
        {/* Preconnect to critical external origins — saves ~100-200ms per connection */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />

        {/* Consent Mode v2 — MUST execute before any gtag/GA4 script loads.
            Uses a raw <script> tag because Next.js <Script strategy="beforeInteractive">
            does NOT render in nested layouts (App Router limitation). */}
        <script
          id="consent-mode-v2"
          dangerouslySetInnerHTML={{ __html: CONSENT_MODE_INIT_SCRIPT }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
