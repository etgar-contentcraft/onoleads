"use client";

/**
 * Curriculum Section - Year-by-year breakdown with visual timeline/stepper,
 * expandable accordions, and course pill tags. Supports both legacy semester
 * format and new year-based format.
 */

import { useState, useEffect, useRef } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface CurriculumSemester {
  title_he: string;
  title_en?: string;
  courses: Array<{ name_he: string; name_en?: string }>;
}

interface CurriculumYear {
  year_label?: string;
  title_he?: string;
  title_en?: string;
  title_ar?: string;
  courses: string[] | string;
}

interface CurriculumSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Normalizes content into a unified year/label + courses structure.
 * Supports:
 *  - content.years: [{title_he/title_en/title_ar, courses: string (comma-separated)}] (new builder format)
 *  - content.years: [{year_label, courses: string[]}] (legacy / AI-import format)
 *  - content.semesters: [{title_he, courses: [{name_he}]}] (legacy semester format)
 */
function normalizeYears(content: Record<string, unknown>, language: Language): { label: string; courses: string[] }[] {
  const years = content.years as CurriculumYear[] | undefined;
  if (years && Array.isArray(years) && years.length > 0) {
    return years.map((y) => {
      /* Label: prefer localized title from builder, fall back to Hebrew, then legacy year_label */
      const label =
        (y[`title_${language}` as keyof CurriculumYear] as string) ||
        y.title_he ||
        y.year_label ||
        "";

      /* Courses: builder saves a comma-separated string; legacy format uses string[] */
      const raw = y.courses || [];
      const courses = typeof raw === "string"
        ? raw.split(",").map((c) => c.trim()).filter(Boolean)
        : raw;

      return { label, courses };
    });
  }

  const semesters = content.semesters as CurriculumSemester[] | undefined;
  if (semesters && Array.isArray(semesters) && semesters.length > 0) {
    return semesters.map((sem) => ({
      label: (sem[`title_${language}` as keyof CurriculumSemester] as string) || sem.title_he,
      courses: (sem.courses || []).map((c) => (c[`name_${language}` as keyof typeof c] as string) || c.name_he),
    }));
  }

  return [];
}

export function CurriculumSection({ content, language }: CurriculumSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "תוכנית הלימודים" : "Curriculum");
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "רוצה לדעת עוד על תוכנית הלימודים?" : "Want to learn more about the curriculum?");
  const ctaEnabled = content.cta_enabled !== false;

  const years = normalizeYears(content, language);
  const [openIndex, setOpenIndex] = useState<number>(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (years.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-[#fafafa]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "תוכנית הלימודים" : "Curriculum"}
            </span>
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        {/* Timeline + Accordions */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#B8D900] via-[#B8D900]/40 to-transparent ${
              isRtl ? "right-5 md:right-7" : "left-5 md:left-7"
            }`}
          />

          <div className="space-y-4">
            {years.map((year, index) => {
              const isOpen = openIndex === index;
              const isCompleted = index < openIndex;

              return (
                <div
                  key={index}
                  className="relative opacity-0"
                  style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.1}s forwards` : "none" }}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute top-6 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 border-4 border-[#fafafa] ${
                      isRtl ? "right-0 md:right-1.5" : "left-0 md:left-1.5"
                    } ${
                      isOpen
                        ? "bg-[#B8D900] text-[#2a2628] shadow-[0_0_20px_rgba(184,217,0,0.4)]"
                        : isCompleted
                          ? "bg-[#B8D900]/80 text-[#2a2628]"
                          : "bg-white text-[#5A5658] border-gray-200"
                    }`}
                  >
                    <span className="font-heading font-bold text-sm">{index + 1}</span>
                  </div>

                  {/* Accordion card */}
                  <div className={`${isRtl ? "mr-14 md:mr-18" : "ml-14 md:ml-18"}`}>
                    <div
                      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                        isOpen
                          ? "border-[#B8D900]/30 bg-white shadow-[0_4px_24px_rgba(184,217,0,0.08)]"
                          : "border-gray-200 bg-white hover:border-[#B8D900]/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                      }`}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? -1 : index)}
                        className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-heading font-bold text-[#2a2628] text-base md:text-lg">
                            {year.label}
                          </span>
                          <span className="text-xs text-[#5A5658] font-heebo">
                            {year.courses.length} {isRtl ? "קורסים" : "courses"}
                          </span>
                        </div>
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isOpen ? "bg-[#B8D900] rotate-180" : "bg-gray-100 group-hover:bg-[#B8D900]/20"
                        }`}>
                          <svg className={`w-4 h-4 ${isOpen ? "text-[#2a2628]" : "text-[#5A5658]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expandable course pills */}
                      <div className={`overflow-hidden transition-all duration-400 ${isOpen ? "max-h-[2000px]" : "max-h-0"}`}>
                        <div className="px-5 md:px-6 pb-6">
                          <div className="flex flex-wrap gap-2.5">
                            {year.courses.map((course, cIndex) => (
                              <span
                                key={cIndex}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B8D900]/8 text-[#2a2628] text-sm font-medium font-heebo border border-[#B8D900]/15 hover:bg-[#B8D900]/15 transition-colors"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#B8D900]" />
                                {course}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA at bottom */}
        {ctaEnabled && (
          <div
            className="text-center mt-14 opacity-0"
            style={{ animation: inView ? `fade-in-up 0.6s ease-out ${0.2 + years.length * 0.1}s forwards` : "none" }}
          >
            <button
              onClick={() => open("section_curriculum")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_8px_30px_rgba(184,217,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
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
