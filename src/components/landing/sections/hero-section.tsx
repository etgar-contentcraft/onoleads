"use client";

/**
 * Hero Section - Full-screen hero with parallax background, animated counter,
 * and prominent CTA. First impression for every landing page.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface HeroSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Scroll amount before parallax caps out */
const PARALLAX_MAX_SCROLL = 600;
/** How much the background shifts relative to scroll (0-1) */
const PARALLAX_FACTOR = 0.35;
/** Counter animation duration in ms */
const COUNTER_DURATION = 1500;
/** Counter animation step count */
const COUNTER_STEPS = 40;

export function HeroSection({ content, language }: HeroSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  /* ---- Content fields ---- */
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || "";
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || (isRtl ? "קבלו מידע מלא" : "Get full info");
  const bgImage = (content.background_image_url as string) || (content.background_image as string) || "";
  const statValue = (content.stat_value as string) || "";
  const statLabel = (content[`stat_label_${language}`] as string) || (content.stat_label_he as string) || "";
  const facultyName = (content[`faculty_name_${language}`] as string) || (content.faculty_name_he as string) || "";
  const degreeType = (content.degree_type as string) || "";

  /* ---- State ---- */
  const [counterValue, setCounterValue] = useState("0");
  const [visible, setVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  /* ---- Appear on mount ---- */
  useEffect(() => {
    setVisible(true);
  }, []);

  /* ---- Parallax scroll handler ---- */
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const clamped = Math.min(scrollY, PARALLAX_MAX_SCROLL);
    setParallaxY(clamped * PARALLAX_FACTOR);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* ---- Counter animation on intersection ---- */
  useEffect(() => {
    if (!statValue || hasAnimated.current) return;

    const numeric = parseInt(statValue.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setCounterValue(statValue);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const stepTime = COUNTER_DURATION / COUNTER_STEPS;
          let current = 0;

          const timer = setInterval(() => {
            current += 1;
            const progress = current / COUNTER_STEPS;
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(eased * numeric);
            setCounterValue(val.toLocaleString() + statValue.replace(/[0-9,]/g, ""));

            if (current >= COUNTER_STEPS) {
              clearInterval(timer);
              setCounterValue(statValue);
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [statValue]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-x-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background with parallax */}
      <div className="absolute inset-0 z-0">
        {bgImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgImage}
              alt=""
              className="w-full h-[120%] object-cover will-change-transform"
              style={{ transform: `translateY(-${parallaxY}px)` }}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/85" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1618] via-[#2a2628] to-[#1a1618]">
            {/* Subtle dot grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />
            {/* Decorative gradient orbs */}
            <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[#B8D900]/5 blur-[150px]" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[#B8D900]/3 blur-[120px]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-32 md:py-40">
        <div className="max-w-3xl">
          {/* College branding pill */}
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 rounded-full bg-white/8 backdrop-blur-md border border-white/10 opacity-0"
            style={{ animation: visible ? "fade-in-down 0.7s ease-out 0.1s forwards" : "none" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#B8D900] animate-pulse" />
            <span className="text-white/80 text-xs md:text-sm font-medium tracking-wide font-heebo">
              {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
            </span>
          </div>

          {/* Faculty name */}
          {facultyName && (
            <div
              className="mb-3 opacity-0"
              style={{ animation: visible ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
            >
              <span className="text-[#B8D900]/80 font-heading font-semibold text-sm md:text-base uppercase tracking-wider">
                {facultyName}
              </span>
            </div>
          )}

          {/* Degree type badge */}
          {degreeType && (
            <div
              className="mb-5 opacity-0"
              style={{ animation: visible ? "fade-in-up 0.7s ease-out 0.25s forwards" : "none" }}
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm">
                {degreeType}
              </span>
            </div>
          )}

          {/* Main Heading */}
          <h1
            className="font-heading text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] mb-6 opacity-0"
            style={{ animation: visible ? "fade-in-up 0.8s ease-out 0.3s forwards" : "none" }}
          >
            {heading}
          </h1>

          {/* Subheading */}
          {subheading && (
            <p
              className="font-heebo text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed mb-10 max-w-2xl opacity-0"
              style={{ animation: visible ? "fade-in-up 0.8s ease-out 0.45s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}

          {/* CTA + Stat Row */}
          <div
            className="flex flex-wrap items-center gap-6 md:gap-8 opacity-0"
            style={{ animation: visible ? "fade-in-up 0.8s ease-out 0.6s forwards" : "none" }}
          >
            {ctaText && (
              <button
                onClick={open}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 md:px-12 md:py-6 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg md:text-xl transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_60px_rgba(184,217,0,0.5)] hover:scale-[1.03] active:scale-[0.98] animate-pulse-glow"
              >
                {ctaText}
                <svg className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
                </svg>
              </button>
            )}

            {statValue && (
              <div className={`flex items-center gap-4 ${isRtl ? "border-r-2" : "border-l-2"} border-[#B8D900]/40 ${isRtl ? "pr-8" : "pl-8"}`}>
                <span className="text-4xl md:text-5xl font-heading font-extrabold text-[#B8D900] tabular-nums">
                  {counterValue}
                </span>
                {statLabel && (
                  <span className="text-sm md:text-base text-white/60 max-w-[140px] leading-snug font-heebo">
                    {statLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-scroll-hint">
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/30 text-xs font-medium font-heebo">{isRtl ? "גללו למטה" : "Scroll"}</span>
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
