"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface HeroSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function HeroSection({ content, language }: HeroSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || "";
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || "";
  const ctaUrl = (content.cta_url as string) || "#form";
  const bgImage = (content.background_image_url as string) || "";
  const statValue = (content.stat_value as string) || "";
  const statLabel = (content[`stat_label_${language}`] as string) || (content.stat_label_he as string) || "";
  const facultyName = (content[`faculty_name_${language}`] as string) || (content.faculty_name_he as string) || "";
  const degreeType = (content.degree_type as string) || "";

  const [counterValue, setCounterValue] = useState("0");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // Counter animation
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
          const duration = 1500;
          const steps = 40;
          const stepTime = duration / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += 1;
            const progress = current / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(eased * numeric);
            setCounterValue(val.toLocaleString() + statValue.replace(/[0-9,]/g, ""));

            if (current >= steps) {
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
      className="relative min-h-screen flex items-center overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {bgImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgImage}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/80" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a2628] via-[#3a3638] to-[#2a2628]">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* College branding */}
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 rounded-full bg-white/10 backdrop-blur-md border border-white/15 opacity-0"
            style={{ animation: visible ? "fade-in-down 0.7s ease-out 0.1s forwards" : "none" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#B8D900] animate-pulse" />
            <span className="text-white/90 text-xs md:text-sm font-medium tracking-wide">
              {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
            </span>
          </div>

          {/* Faculty name */}
          {facultyName && (
            <div
              className="mb-4 opacity-0"
              style={{ animation: visible ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
            >
              <span className="text-[#B8D900] font-heading font-bold text-base md:text-lg">
                {facultyName}
              </span>
            </div>
          )}

          {/* Main Heading */}
          <h1
            className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] mb-5 opacity-0"
            style={{ animation: visible ? "fade-in-up 0.8s ease-out 0.3s forwards" : "none" }}
          >
            {heading}
          </h1>

          {/* Degree badge */}
          {degreeType && (
            <div
              className="mb-6 opacity-0"
              style={{ animation: visible ? "fade-in-up 0.7s ease-out 0.4s forwards" : "none" }}
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm">
                {degreeType}
              </span>
            </div>
          )}

          {/* Subheading */}
          {subheading && (
            <p
              className="text-lg md:text-xl lg:text-2xl text-white/80 leading-relaxed mb-10 max-w-2xl opacity-0"
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
              <a
                href={ctaUrl}
                className="inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_40px_rgba(184,217,0,0.4)] hover:scale-[1.03] active:scale-[0.98]"
              >
                {ctaText}
              </a>
            )}

            {statValue && (
              <div className={`flex items-center gap-4 ${isRtl ? "border-r-2" : "border-l-2"} border-[#B8D900]/50 ${isRtl ? "pr-8" : "pl-8"}`}>
                <span className="text-4xl md:text-5xl font-heading font-extrabold text-[#B8D900]">
                  {counterValue}
                </span>
                {statLabel && (
                  <span className="text-sm md:text-base text-white/70 max-w-[140px] leading-snug">
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
        <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
