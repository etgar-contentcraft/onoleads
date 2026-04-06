"use client";

/**
 * FAQ Section - Clean accordion with smooth expand/collapse animations,
 * green accent on active question, and Schema.org FAQPage JSON-LD for SEO.
 */

import { useState, useEffect, useRef } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface FaqItem {
  question_he: string;
  question_en?: string;
  question_ar?: string;
  answer_he: string;
  answer_en?: string;
  answer_ar?: string;
}

interface FaqSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function FaqSection({ content, language }: FaqSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "שאלות נפוצות" : "FAQ");
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || "";
  const ctaEnabled = content.cta_enabled !== false;
  const items: FaqItem[] = Array.isArray(content.items) ? (content.items as FaqItem[]) : [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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

  if (items.length === 0) return null;

  /* ---- Schema.org FAQPage structured data ---- */
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item[`question_${language}` as keyof FaqItem] || item.question_he,
      acceptedAnswer: {
        "@type": "Answer",
        text: item[`answer_${language}` as keyof FaqItem] || item.answer_he,
      },
    })),
  };

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/<\/script>/gi, "<\\/script>") }}
      />

      <div className="max-w-3xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "שאלות ותשובות" : "Q&A"}
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

        {/* Accordion items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const question = (item[`question_${language}` as keyof FaqItem] as string) || item.question_he || "";
            const answer = (item[`answer_${language}` as keyof FaqItem] as string) || item.answer_he || "";
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden opacity-0 ${
                  isOpen
                    ? "border-[#B8D900]/40 bg-white shadow-[0_4px_24px_rgba(184,217,0,0.08)]"
                    : "border-gray-200 bg-white hover:border-[#B8D900]/20"
                }`}
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.06}s forwards` : "none" }}
              >
                <button
                  id={`faq-question-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Green accent bar */}
                    <div className={`w-1 self-stretch rounded-full transition-all duration-300 shrink-0 ${
                      isOpen ? "bg-[#B8D900]" : "bg-gray-200 group-hover:bg-[#B8D900]/50"
                    }`} />
                    <span className="font-heading text-base md:text-lg font-bold text-[#2a2628] leading-snug">
                      {question}
                    </span>
                  </div>
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isRtl ? "ml-4" : "mr-4"} ${
                    isOpen
                      ? "bg-[#B8D900] rotate-180 shadow-[0_0_15px_rgba(184,217,0,0.3)]"
                      : "bg-gray-100 group-hover:bg-[#B8D900]/15"
                  }`}>
                    <svg
                      className={`w-4 h-4 transition-colors ${isOpen ? "text-[#2a2628]" : "text-[#716C70]"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Answer with smooth animation */}
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`px-5 md:px-6 pb-6 ${isRtl ? "pr-10" : "pl-10"}`}>
                      <p className="font-heebo text-[#716C70] text-base leading-[1.8]">{answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        {ctaEnabled && ctaText && (
          <div
            className="text-center mt-14 opacity-0"
            style={{ animation: inView ? `fade-in-up 0.6s ease-out ${0.2 + items.length * 0.06}s forwards` : "none" }}
          >
            <button
              onClick={() => open("section_faq")}
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
