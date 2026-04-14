"use client";

/**
 * Homepage Hero — Cinematic full-screen institutional page.
 *
 * Design concept: "Quiet Authority"
 * A single immersive campus photograph fills the viewport. A frosted glass
 * panel floats in the center carrying the Ono logo, a single line of copy,
 * and a prominent CTA to the main website. Social links and phone sit at
 * the bottom in an elegant footer strip. The whole page feels like an
 * invitation — not a sales pitch.
 *
 * Typography: Frank Ruhl Libre (serif) for the tagline, Heebo for UI.
 * Palette: Deep charcoal + brand green (#B8D900) accents.
 */

import { useEffect, useState } from "react";
import Image from "next/image";

/* ── Assets ────────────────────────────────────────────────── */

const CAMPUS_IMAGE =
  "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg";
const ONO_LOGO =
  "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";

/* ── Social Links ──────────────────────────────────────────── */

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    url: "https://www.facebook.com/OnoAcademic",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    url: "https://www.instagram.com/ono_academic/",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    url: "https://www.youtube.com/@OnoAcademic",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    url: "https://il.linkedin.com/school/ono-academic-college",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    url: "https://www.tiktok.com/@ono_academic",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
];

/* ── Component ─────────────────────────────────────────────── */

export function HomepageHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    /* Trigger entrance animations after mount */
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-hidden bg-[#0f0e12]">
      {/* ── Background Image ────────────────────────────────── */}
      <div className="absolute inset-0">
        <Image
          src={CAMPUS_IMAGE}
          alt="קמפוס הקריה האקדמית אונו"
          fill
          className="object-cover"
          sizes="100vw"
          quality={85}
          priority
        />
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e12] via-transparent to-transparent opacity-80" />
      </div>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 py-20">
        <div
          className="w-full max-w-lg mx-auto text-center"
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Logo */}
          <div
            className="mb-10"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "scale(1)" : "scale(0.9)",
              transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s",
            }}
          >
            <Image
              src={ONO_LOGO}
              alt="הקריה האקדמית אונו"
              width={240}
              height={80}
              className="mx-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              priority
            />
          </div>

          {/* Glass Card */}
          <div
            className="relative rounded-3xl p-8 md:p-10 backdrop-blur-xl border border-white/[0.08] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
              boxShadow: "0 32px 64px -16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s",
            }}
          >
            {/* Subtle inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Tagline */}
            <h1
              className="font-heading text-2xl md:text-3xl font-bold text-white/90 leading-relaxed mb-3"
            >
              המכללה המומלצת בישראל
            </h1>
            <p className="font-heebo text-white/45 text-sm md:text-base mb-8 leading-relaxed">
              תואר ראשון ושני במגוון תחומים
            </p>

            {/* CTA Button */}
            <a
              href="https://www.ono.ac.il"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#B8D900] text-[#1a1820] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_12px_40px_rgba(184,217,0,0.35)] hover:scale-[1.03] active:scale-[0.98]"
            >
              <span>לאתר הקריה האקדמית</span>
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 18l-6-6 6-6" />
              </svg>
            </a>

            {/* Phone */}
            <div className="mt-6">
              <a
                href="tel:03-5311888"
                className="inline-flex items-center gap-2 text-white/40 hover:text-[#B8D900] transition-colors duration-300 text-sm font-heebo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span dir="ltr">03-5311888</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer Strip ────────────────────────────────────── */}
      <footer
        className="relative z-10 py-6 px-5"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.7s",
        }}
      >
        <div className="max-w-lg mx-auto">
          {/* Social Links */}
          <div className="flex items-center justify-center gap-3 mb-5">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/35 hover:text-[#B8D900] hover:bg-white/[0.06] transition-all duration-300"
              >
                {link.icon}
              </a>
            ))}
          </div>

          {/* Separator */}
          <div className="w-16 h-px mx-auto bg-white/10 mb-4" />

          {/* Copyright */}
          <p className="text-center text-white/20 text-xs font-heebo leading-relaxed">
            <span>&copy; {new Date().getFullYear()} </span>
            <span>הקריה האקדמית אונו</span>
            <span className="mx-1.5 opacity-50">|</span>
            <span>כל הזכויות שמורות</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
