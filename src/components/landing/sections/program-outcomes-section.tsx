"use client";

/**
 * Program Outcomes Section — displays a numbered list of learning outcomes
 * (what students will know/be able to do after the program).
 *
 * Each outcome is rendered as a card with a numbered badge, title and
 * optional description. CTA button at the bottom (with default fallback)
 * opens the lead form modal.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface OutcomeItem {
  title_he: string;
  title_en?: string;
  title_ar?: string;
  description_he?: string;
  description_en?: string;
  description_ar?: string;
}

interface ProgramOutcomesSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Default outcomes used when content.items is missing */
const DEFAULT_OUTCOMES: OutcomeItem[] = [
  { title_he: "ידע אקדמי עמוק בתחום", description_he: "תרכשו ידע מקיף ועדכני מהמובילים בתעשייה ובאקדמיה." },
  { title_he: "כלים מעשיים לעולם העבודה", description_he: "סדנאות, פרויקטים ולמידה מבוססת מקרה." },
  { title_he: "רשת קשרים מקצועית", description_he: "תוכלו להתחבר אל בוגרים, מרצים ומעסיקים." },
];

export function ProgramOutcomesSection({ content, language }: ProgramOutcomesSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "מה תוכלו לעשות בסיום התוכנית" : "What You'll Be Able to Do");

  const subheading =
    (content[`subheading_${language}`] as string) ||
    (content.subheading_he as string) ||
    "";

  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "אני מוכן להתחיל" : "I'm Ready to Start");

  const ctaEnabled = content.cta_enabled !== false;

  const rawItems = content.items;
  const items: OutcomeItem[] =
    Array.isArray(rawItems) && rawItems.length > 0
      ? (rawItems as OutcomeItem[])
      : DEFAULT_OUTCOMES;

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-gradient-to-b from-white to-[#FAFAFA]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "תוצרי הלמידה" : "Learning Outcomes"}
            </span>
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="mt-4 text-[#716C70] font-heebo text-base md:text-lg max-w-2xl mx-auto opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {/* Outcome cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, index) => {
            const title =
              (item[`title_${language}` as keyof OutcomeItem] as string) ||
              item.title_he ||
              "";
            const description =
              (item[`description_${language}` as keyof OutcomeItem] as string) ||
              item.description_he ||
              "";
            return (
              <div
                key={index}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-[#B8D900]/50 hover:shadow-[0_8px_30px_rgba(184,217,0,0.10)] opacity-0"
                style={{
                  animation: inView
                    ? `fade-in-up 0.5s ease-out ${0.2 + index * 0.08}s forwards`
                    : "none",
                }}
              >
                {/* Numbered badge */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-extrabold flex items-center justify-center text-base shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-heading text-lg md:text-xl font-bold text-[#2a2628] leading-snug flex-1">
                    {title}
                  </h3>
                </div>
                {description && (
                  <p className="font-heebo text-[#716C70] text-sm leading-[1.7] mt-2">
                    {description}
                  </p>
                )}
                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-[#B8D900] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>

        {/* CTA */}
        {ctaEnabled && (
          <div
            className="text-center mt-14 opacity-0"
            style={{
              animation: inView
                ? `fade-in-up 0.6s ease-out ${0.3 + items.length * 0.08}s forwards`
                : "none",
            }}
          >
            <button
              onClick={() => open("section_program_outcomes")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_8px_30px_rgba(184,217,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {ctaText}
              <svg
                className={`w-4 h-4 transition-transform ${
                  isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"}
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
