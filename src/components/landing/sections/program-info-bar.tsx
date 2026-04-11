"use client";

/**
 * Program Info Bar - Horizontal bar with 3-4 key facts about the program
 * (duration, campus, schedule, degree). Floats over the hero-to-content
 * transition with a white card design and icon for each fact.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface ProgramInfoBarProps {
  content: Record<string, unknown>;
  language: Language;
}

interface InfoItem {
  icon: string;
  label: string;
  value: string;
}

/* ---- Icon set for each fact type ---- */
const ICONS: Record<string, JSX.Element> = {
  duration: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  campus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  format: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  degree: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
};

export function ProgramInfoBar({ content, language }: ProgramInfoBarProps) {
  const isRtl = language === "he" || language === "ar";
  const [inView, setInView] = useState(false);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // Fallback: always show after 300ms even if IntersectionObserver doesn't fire
    // (happens when bar is at top of page with no hero above it)
    const fallback = setTimeout(() => setInView(true), 300);
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  const items: InfoItem[] = Array.isArray(content.items) ? (content.items as InfoItem[]) : [];

  /* Build default items from content fields if no items array */
  const displayItems: InfoItem[] = items.length > 0 ? items : [
    ...(content.duration ? [{
      icon: "duration",
      label: language === "ar" ? "مدة الدراسة" : language === "he" ? "משך הלימודים" : "Duration",
      value: content.duration as string,
    }] : []),
    ...(content.campus ? [{
      icon: "campus",
      label: language === "ar" ? "الحرم الجامعي" : language === "he" ? "קמפוס" : "Campus",
      value: content.campus as string,
    }] : []),
    ...(content.format ? [{
      icon: "format",
      label: language === "ar" ? "التنسيق" : language === "he" ? "מתכונת" : "Format",
      value: content.format as string,
    }] : []),
    ...(content.degree ? [{
      icon: "degree",
      label: language === "ar" ? "الدرجة" : language === "he" ? "תואר" : "Degree",
      value: content.degree as string,
    }] : []),
  ];

  if (displayItems.length === 0) return null;

  return (
    <section ref={barRef} className="relative -mt-4 md:-mt-8 z-20 pb-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        <div
          className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden opacity-0"
          style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
        >
          <div className={`grid grid-cols-2 ${(() => {
              const cols = Math.min(displayItems.length, 4);
              const map: Record<number, string> = {
                1: "md:grid-cols-1",
                2: "md:grid-cols-2",
                3: "md:grid-cols-3",
                4: "md:grid-cols-4",
              };
              return map[cols] || "md:grid-cols-4";
            })()} divide-x divide-gray-100 ${isRtl ? "divide-x-reverse" : ""}`}>
            {displayItems.map((item, index) => (
              <div
                key={index}
                className="group flex flex-col items-center gap-2 py-3 px-2 md:py-6 md:px-4 text-center hover:bg-[#B8D900]/[0.03] transition-colors duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[#B8D900]/10 flex items-center justify-center text-[#9ab800] mb-1 group-hover:bg-[#B8D900] group-hover:text-[#2a2628] transition-all duration-300">
                  {ICONS[item.icon] || ICONS.degree}
                </div>
                <span className="font-heebo text-xs text-[#716C70] font-medium">{item.label}</span>
                <span className="font-heading text-sm md:text-base font-bold text-[#2a2628]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
