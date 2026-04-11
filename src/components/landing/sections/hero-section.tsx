"use client";

/**
 * Hero Section - Full-screen hero with parallax background, animated counter,
 * and prominent CTA. First impression for every landing page.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";
import { extractYoutubeId, HERO_OVERLAY_OPACITY } from "@/lib/utils/youtube";

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
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || (language === "ar" ? "احصل على معلومات كاملة" : language === "he" ? "קבלו מידע מלא" : "Get full info");
  const ctaEnabled = content.cta_enabled !== false;
  const bgImage = (content.background_image_url as string) || (content.background_image as string) || "";
  const bgVideo = (content.background_video_url as string) || "";
  const bgVideoType = (content.background_video_type as string) || "mp4";
  /** Overlay opacity: 0-100, default 60% for hero */
  const overlayOpacity = ((content.background_overlay_opacity as number) ?? HERO_OVERLAY_OPACITY) / 100;
  const statValue = (content.stat_value as string) || "";
  const statLabel = (content[`stat_label_${language}`] as string) || (content.stat_label_he as string) || "";
  const facultyName = (content[`faculty_name_${language}`] as string) || (content.faculty_name_he as string) || "";
  const degreeType = (content.degree_type as string) || "";

  /* ---- State ---- */
  const [counterValue, setCounterValue] = useState("0");
  const [visible, setVisible] = useState(false);
  /** Controls the gentle CTA pulse — active for 3s, pauses, restarts on tab focus */
  const [ctaPulse, setCtaPulse] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);
  /** Refs for parallax elements — direct DOM mutation avoids React re-renders on scroll */
  const parallaxRefs = useRef<HTMLElement[]>([]);
  const addParallaxRef = useCallback((el: HTMLElement | null) => {
    if (el && !parallaxRefs.current.includes(el)) parallaxRefs.current.push(el);
  }, []);

  /* ---- Appear on mount ---- */
  useEffect(() => {
    setVisible(true);
  }, []);

  /* ---- CTA button gentle pulse: 3s on, pause, restart on tab visibility ---- */
  useEffect(() => {
    /** Fire pulse for 3 seconds, then stop. Restarts when user returns to tab. */
    const startPulse = () => {
      setCtaPulse(true);
      setTimeout(() => setCtaPulse(false), 3000);
    };
    // Start on mount (small delay so page has settled)
    const initial = setTimeout(startPulse, 1200);
    // Restart each time user focuses the tab.
    // IMPORTANT: the named function reference must match between add/removeEventListener.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") startPulse();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(initial);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /* ---- Parallax scroll handler (direct DOM, no React re-renders) ---- */
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, PARALLAX_MAX_SCROLL) * PARALLAX_FACTOR;
        for (const el of parallaxRefs.current) {
          el.style.transform = `translateY(-${y}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---- Counter animation on intersection ---- */
  useEffect(() => {
    if (!statValue || hasAnimated.current) return;

    const numeric = parseInt(statValue.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setCounterValue(statValue);
      return;
    }

    let animTimer: ReturnType<typeof setInterval> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const stepTime = COUNTER_DURATION / COUNTER_STEPS;
          let current = 0;

          animTimer = setInterval(() => {
            current += 1;
            const progress = current / COUNTER_STEPS;
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(eased * numeric);
            setCounterValue(val.toLocaleString() + statValue.replace(/[0-9,]/g, ""));

            if (current >= COUNTER_STEPS) {
              clearInterval(animTimer!);
              animTimer = null;
              setCounterValue(statValue);
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      observer.disconnect();
      if (animTimer) clearInterval(animTimer);
    };
  }, [statValue]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[80vh] md:min-h-screen flex flex-col justify-end overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background with parallax */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Auto-detect YouTube URLs even if type is set to mp4 */}
        {bgVideo && (bgVideoType === "youtube" || extractYoutubeId(bgVideo)) && extractYoutubeId(bgVideo) ? (
          <>
            {/* YouTube background — muted, autoplay, loop, no controls.
                Extra bottom extension (220px) prevents gap when parallax shifts the frame up. */}
            <div
              ref={addParallaxRef}
              className="absolute inset-0 will-change-transform"
              style={{ bottom: "-220px" }}
            >
              {/* Cover the container like object-fit:cover — center the 16:9 iframe
                  and make it large enough to always fill the parent, cropping edges */}
              {/* Scale 10% larger than cover size to crop off YouTube's built-in
                  UI elements (logo, "More videos") that appear at the edges */}
              <div
                className="absolute border-0 pointer-events-none"
                style={{
                  top: "50%",
                  left: "50%",
                  width: "calc(max(100%, calc(100vh * 16 / 9)) * 1.1)",
                  height: "calc(max(100%, calc(100vw * 9 / 16)) * 1.1)",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId(bgVideo)}?autoplay=1&mute=1&loop=1&playlist=${extractYoutubeId(bgVideo)}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  tabIndex={-1}
                  aria-hidden="true"
                  title="Background video"
                />
              </div>
            </div>
            {/* Fallback poster image behind iframe */}
            {bgImage && (
              <Image
                src={bgImage}
                alt=""
                fill
                priority
                className="object-cover -z-10"
                sizes="100vw"
                quality={80}
              />
            )}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity * 0.15}), rgba(0,0,0,${overlayOpacity * 0.5}) 40%, rgba(0,0,0,${overlayOpacity * 0.85}) 70%, rgba(0,0,0,${Math.min(overlayOpacity * 1.2, 0.95)}))` }} />
          </>
        ) : bgVideo ? (
          <>
            <div ref={addParallaxRef} className="absolute inset-0 will-change-transform" style={{ bottom: "-220px" }}>
              <video
                autoPlay
                muted
                loop
                playsInline
                poster={bgImage || undefined}
                className="w-full h-full object-cover"
              >
                <source src={bgVideo} type="video/mp4" />
              </video>
            </div>
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity * 0.15}), rgba(0,0,0,${overlayOpacity * 0.5}) 40%, rgba(0,0,0,${overlayOpacity * 0.85}) 70%, rgba(0,0,0,${Math.min(overlayOpacity * 1.2, 0.95)}))` }} />
          </>
        ) : bgImage ? (
          <>
            <div ref={addParallaxRef} className="absolute inset-0 will-change-transform" style={{ bottom: "-220px" }}>
              <Image
                src={bgImage}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="100vw"
                quality={80}
              />
            </div>
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity * 0.15}), rgba(0,0,0,${overlayOpacity * 0.5}) 40%, rgba(0,0,0,${overlayOpacity * 0.85}) 70%, rgba(0,0,0,${Math.min(overlayOpacity * 1.2, 0.95)}))` }} />
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
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 pt-24 md:pt-32 pb-36 md:pb-44 lg:pb-48">
        <div className="max-w-3xl">
          {/* College branding pill — item 4: prominent badge */}
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 rounded-full bg-white/10 backdrop-blur-md border border-[#B8D900]/30 opacity-0"
            style={{ animation: visible ? "fade-in-down 0.7s ease-out 0.1s forwards" : "none" }}
          >
            {/* Award icon */}
            <svg className="w-4 h-4 text-[#B8D900] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-white/90 text-xs md:text-sm font-semibold tracking-wide font-heebo">
              {isRtl ? "הקריה האקדמית אונו — המכללה המומלצת בישראל" : "Ono Academic College — Israel's top-ranked college"}
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
          {heading && (
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] mb-6 opacity-0"
              style={{ animation: visible ? "fade-in-up 0.8s ease-out 0.3s forwards" : "none" }}
            >
              {heading}
            </h1>
          )}

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
            {ctaEnabled && ctaText && (
              <button
                onClick={() => open("hero_cta")}
                className={`group relative inline-flex items-center justify-center gap-3 px-10 py-5 md:px-12 md:py-6 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg md:text-xl transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_60px_rgba(184,217,0,0.5)] hover:scale-[1.03] active:scale-[0.98] ${ctaPulse ? "animate-pulse-glow" : ""}`}
              >
                {ctaText}
                <svg className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"} />
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
      <div className="absolute bottom-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
