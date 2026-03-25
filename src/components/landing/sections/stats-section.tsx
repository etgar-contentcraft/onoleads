"use client";

/**
 * Stats Section - Dark background with animated counter numbers.
 * 3-4 stat cards in a row with smooth count-up animation.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface StatItem {
  value: string;
  label_he: string;
  label_en?: string;
  label_ar?: string;
  suffix?: string;
}

interface StatsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Counter animation duration in ms */
const COUNTER_DURATION = 1800;
/** Counter animation step count */
const COUNTER_STEPS = 50;

/**
 * Individual stat card with animated counter
 */
function AnimatedStat({ item, language, inView, index }: { item: StatItem; language: Language; inView: boolean; index: number }) {
  const label = (item[`label_${language}` as keyof StatItem] as string) || item.label_he || "";
  const [displayValue, setDisplayValue] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const numeric = parseInt(item.value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setDisplayValue(item.value);
      return;
    }

    const stepTime = COUNTER_DURATION / COUNTER_STEPS;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / COUNTER_STEPS;
      const eased = 1 - Math.pow(1 - progress, 4);
      const val = Math.round(eased * numeric);
      setDisplayValue(val.toLocaleString());

      if (current >= COUNTER_STEPS) {
        clearInterval(timer);
        setDisplayValue(item.value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, item.value]);

  return (
    <div
      className="relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm opacity-0 hover:bg-white/[0.08] transition-all duration-300"
      style={{
        animation: inView ? `scale-in 0.5s ease-out ${index * 0.12}s forwards` : "none",
      }}
    >
      {/* Animated counter value */}
      <span className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-[#B8D900] tabular-nums leading-none mb-3">
        {displayValue}
        {item.suffix && <span className="text-2xl md:text-3xl">{item.suffix}</span>}
      </span>

      {/* Divider line */}
      <div className="w-10 h-0.5 bg-[#B8D900]/30 rounded-full mb-3" />

      {/* Label */}
      <span className="font-heebo text-sm md:text-base text-white/60 font-medium leading-snug">
        {label}
      </span>
    </div>
  );
}

export function StatsSection({ content, language }: StatsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const items: StatItem[] = (content.items as StatItem[]) || [];
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const bgImage = (content.background_image_url as string) || (content.background_image as string) || "";
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={ref} className="relative py-16 md:py-24 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Dark background */}
      <div className="absolute inset-0 z-0 bg-[#2a2628]">
        {bgImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-[#2a2628]/85" />
          </>
        )}
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Decorative gradient orb */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-[#B8D900]/5 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        {/* Optional heading */}
        {heading && (
          <div className="text-center mb-12">
            <div className="w-10 h-1 bg-[#B8D900] rounded-full mx-auto mb-4" />
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-white">
              {heading}
            </h2>
          </div>
        )}

        {/* Stats grid */}
        <div
          className="grid gap-4 md:gap-6"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
        >
          {items.map((item, index) => (
            <AnimatedStat key={index} item={item} language={language} inView={inView} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
