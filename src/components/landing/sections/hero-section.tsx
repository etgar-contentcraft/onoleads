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

  const [counterValue, setCounterValue] = useState("0");
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

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
      className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden"
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#4A4648] via-[#3a3638] to-[#2a2628]">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, #B8D900 1px, transparent 1px),
                                   radial-gradient(circle at 75% 75%, #B8D900 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          {/* College Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <div className="w-2 h-2 rounded-full bg-[#B8D900] animate-pulse" />
            <span className="text-white/90 text-xs md:text-sm font-medium tracking-wide">
              {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] mb-4 md:mb-6 tracking-tight">
            {heading}
          </h1>

          {/* Subheading */}
          {subheading && (
            <p className="text-lg md:text-xl text-white/85 leading-relaxed mb-8 max-w-xl">
              {subheading}
            </p>
          )}

          {/* CTA + Stat Row */}
          <div className="flex flex-wrap items-center gap-6">
            {ctaText && (
              <a
                href={ctaUrl}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-bold text-base md:text-lg transition-all duration-200 hover:bg-[#c8e920] hover:shadow-[0_0_30px_rgba(184,217,0,0.3)] hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/50 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                {ctaText}
              </a>
            )}

            {statValue && (
              <div className={`flex items-center gap-3 ${isRtl ? "border-r-2" : "border-l-2"} border-[#B8D900]/60 ${isRtl ? "pr-6" : "pl-6"}`}>
                <span className="text-3xl md:text-4xl font-extrabold text-[#B8D900] animate-count-up">
                  {counterValue}
                </span>
                {statLabel && (
                  <span className="text-sm md:text-base text-white/70 max-w-[120px] leading-tight">
                    {statLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
