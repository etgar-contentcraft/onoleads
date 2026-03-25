"use client";

import { useState, useEffect, useRef } from "react";
import type { Language } from "@/lib/types/database";

interface CurriculumSemester {
  title_he: string;
  title_en?: string;
  courses: Array<{ name_he: string; name_en?: string }>;
}

interface CurriculumSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function CurriculumSection({ content, language }: CurriculumSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "תוכנית הלימודים" : "Curriculum");
  const semesters = (content.semesters as CurriculumSemester[]) || [];
  const downloadUrl = (content.download_url as string) || "";
  const downloadText = (content[`download_text_${language}`] as string) || (content.download_text_he as string) || (isRtl ? "הורידו את הידיעון המלא" : "Download full syllabus");

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

  if (semesters.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            {isRtl ? "תוכנית הלימודים" : "Curriculum"}
          </span>
          <h2
            className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        <div className="space-y-3">
          {semesters.map((sem, index) => {
            const title = (sem[`title_${language}` as keyof CurriculumSemester] as string) || sem.title_he;
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 opacity-0 hover:border-[#B8D900]/30"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.08}s forwards` : "none" }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-sm transition-colors ${
                      isOpen
                        ? "bg-[#B8D900] text-[#2a2628]"
                        : "bg-gray-100 text-[#716C70] group-hover:bg-[#B8D900]/20"
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-heading font-bold text-[#2a2628] text-base md:text-lg">{title}</span>
                  </div>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen ? "bg-[#B8D900] rotate-180" : "bg-gray-100"
                  }`}>
                    <svg className={`w-4 h-4 ${isOpen ? "text-[#2a2628]" : "text-[#716C70]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[2000px]" : "max-h-0"}`}>
                  <div className="px-5 md:px-6 pb-6">
                    <div className="grid md:grid-cols-2 gap-2.5">
                      {sem.courses.map((course, cIndex) => {
                        const courseName = (course[`name_${language}` as keyof typeof course] as string) || course.name_he;
                        return (
                          <div
                            key={cIndex}
                            className="flex items-center gap-3 text-[#2a2628] text-sm py-2.5 px-3 rounded-lg hover:bg-[#B8D900]/5 transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-[#B8D900] shrink-0" />
                            {courseName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Download button */}
        {downloadUrl && (
          <div className="text-center mt-10">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-base transition-all duration-300 hover:bg-[#3a3638] hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
