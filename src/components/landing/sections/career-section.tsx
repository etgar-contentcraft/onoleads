"use client";

/**
 * Career Section — Premium career outcomes visualization.
 * Horizontal scrollable cards on mobile, grid on desktop.
 * Each card has a glass-morphism treatment with colored accent,
 * decorative icon, and hover glow effect.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";
import { extractYoutubeId, DEFAULT_OVERLAY_OPACITY } from "@/lib/utils/youtube";

interface CareerItem {
  title_he: string;
  title_en?: string;
  title_ar?: string;
  description_he?: string;
  description_en?: string;
  description_ar?: string;
  icon?: string;
}

interface CareerSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Per-card accent palettes — rich, distinct colors for visual variety.
 */
const CARD_PALETTES = [
  { accent: "#B8D900", glow: "rgba(184,217,0,0.25)", bg: "rgba(184,217,0,0.08)", ring: "rgba(184,217,0,0.35)" },
  { accent: "#60C6F5", glow: "rgba(96,198,245,0.25)", bg: "rgba(96,198,245,0.08)", ring: "rgba(96,198,245,0.35)" },
  { accent: "#FF8C69", glow: "rgba(255,140,105,0.25)", bg: "rgba(255,140,105,0.08)", ring: "rgba(255,140,105,0.35)" },
  { accent: "#A78BFA", glow: "rgba(167,139,250,0.25)", bg: "rgba(167,139,250,0.08)", ring: "rgba(167,139,250,0.35)" },
  { accent: "#34D399", glow: "rgba(52,211,153,0.25)", bg: "rgba(52,211,153,0.08)", ring: "rgba(52,211,153,0.35)" },
  { accent: "#FB923C", glow: "rgba(251,146,60,0.25)", bg: "rgba(251,146,60,0.08)", ring: "rgba(251,146,60,0.35)" },
  { accent: "#F472B6", glow: "rgba(244,114,182,0.25)", bg: "rgba(244,114,182,0.08)", ring: "rgba(244,114,182,0.35)" },
  { accent: "#38BDF8", glow: "rgba(56,189,248,0.25)", bg: "rgba(56,189,248,0.08)", ring: "rgba(56,189,248,0.35)" },
];

/** Rotating career-related SVG icons — larger, filled style for impact */
const CAREER_ICONS = [
  /* briefcase */
  <svg key="0" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
  </svg>,
  /* rocket */
  <svg key="1" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>,
  /* chart */
  <svg key="2" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>,
  /* building */
  <svg key="3" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
  </svg>,
  /* lightbulb */
  <svg key="4" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>,
  /* globe */
  <svg key="5" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>,
  /* scale/legal */
  <svg key="6" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
  </svg>,
  /* academic cap */
  <svg key="7" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>,
];

/**
 * Normalizes career items from various data shapes
 */
function normalizeItems(raw: unknown): CareerItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return { title_he: item };
    }
    return item as CareerItem;
  });
}

export function CareerSection({ content, language }: CareerSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "לאן תגיעו אחרי התואר?" : "Career Outcomes");
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || "";
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "התחילו את הקריירה שלכם" : "Start Your Career");
  const ctaEnabled = content.cta_enabled !== false;
  const bgImage = (content.background_image_url as string) || "";
  const bgVideo = (content.background_video_url as string) || "";
  const overlayOpacity = ((content.background_overlay_opacity as number) ?? DEFAULT_OVERLAY_OPACITY) / 100;
  const youtubeId = extractYoutubeId(bgVideo);
  const items = normalizeItems(content.items);

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background with optional image/video */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1820] via-[#252228] to-[#1a1820] overflow-hidden">
        {/* YouTube background video */}
        {youtubeId && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              width: "max(100%, calc(100vh * 16 / 9))",
              height: "max(100%, calc(100vw * 9 / 16))",
              transform: "translate(-50%, -50%)",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              tabIndex={-1}
              aria-hidden="true"
              title="Background video"
            />
          </div>
        )}
        {/* Background image */}
        {bgImage && (
          <Image src={bgImage} alt="" fill className={`object-cover ${youtubeId ? "-z-10" : ""}`} sizes="100vw" quality={80} />
        )}
        {/* Dynamic overlay */}
        {(bgImage || youtubeId) && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(26,24,32,${overlayOpacity})` }} />
        )}
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orb top-right */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#B8D900]/[0.04] blur-[120px]" />
        {/* Small gradient orb bottom-left */}
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-[#60C6F5]/[0.03] blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-3 mb-6 opacity-0"
            style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) forwards" : "none" }}
          >
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full border border-[#B8D900]/30 bg-[#B8D900]/10 text-[#B8D900] text-sm font-semibold font-heebo tracking-wide">
              {isRtl ? "אפשרויות קריירה" : "Career Paths"}
            </span>
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 opacity-0"
            style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="font-heebo text-white/50 text-lg max-w-2xl mx-auto opacity-0"
              style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.2s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {/* Career cards — masonry-like layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-14">
          {items.map((item, index) => {
            const palette = CARD_PALETTES[index % CARD_PALETTES.length];
            const title = (item[`title_${language}` as keyof CareerItem] as string) || item.title_he;
            const description = (item[`description_${language}` as keyof CareerItem] as string) || item.description_he || "";

            return (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden opacity-0"
                style={{
                  animation: inView ? `slide-up-spring 0.6s var(--ease-out-expo) ${0.15 + index * 0.08}s forwards` : "none",
                }}
              >
                {/* Card glass body */}
                <div
                  className="relative p-6 md:p-7 backdrop-blur-sm transition-all duration-500 border border-white/[0.06] group-hover:border-opacity-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
                  }}
                >
                  {/* Hover glow overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(ellipse at center, ${palette.glow}, transparent 70%)`,
                    }}
                  />
                  {/* Hover border */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      border: `1px solid ${palette.ring}`,
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Top row: icon + index */}
                    <div className="flex items-start justify-between mb-5">
                      {/* Icon with colored background */}
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg"
                        style={{
                          background: palette.bg,
                          color: palette.accent,
                          boxShadow: `0 0 0 0 ${palette.glow}`,
                        }}
                      >
                        {CAREER_ICONS[index % CAREER_ICONS.length]}
                      </div>
                      {/* Index badge */}
                      <span
                        className="font-heebo text-[11px] font-bold tracking-widest opacity-40 group-hover:opacity-70 transition-opacity"
                        style={{ color: palette.accent }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-heading font-bold text-white text-lg md:text-xl leading-snug mb-2 group-hover:text-white/95 transition-colors">
                      {title}
                    </h3>

                    {/* Description (if available) */}
                    {description && (
                      <p className="font-heebo text-white/40 text-sm leading-relaxed group-hover:text-white/55 transition-colors">
                        {description}
                      </p>
                    )}

                    {/* Bottom accent line */}
                    <div className="mt-5 flex items-center gap-2">
                      <div
                        className="h-0.5 rounded-full transition-all duration-500"
                        style={{
                          width: "32px",
                          background: palette.accent,
                          opacity: 0.5,
                        }}
                      />
                      <div
                        className="h-0.5 rounded-full transition-all duration-500 group-hover:w-8"
                        style={{
                          width: "12px",
                          background: palette.accent,
                          opacity: 0.25,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        {ctaEnabled && (
          <div
            className="text-center opacity-0"
            style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.6s forwards" : "none" }}
          >
            <button
              onClick={() => open("section_career")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_8px_32px_rgba(184,217,0,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {ctaText}
              <svg className={`w-4 h-4 transition-transform ${isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"} />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
