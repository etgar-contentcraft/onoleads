"use client";

import { useState, useEffect, useRef } from "react";
import type { Language } from "@/lib/types/database";

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

function FaqAccordionItem({
  item,
  language,
  isOpen,
  onToggle,
  index,
  inView,
}: {
  item: FaqItem;
  language: Language;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
  inView: boolean;
}) {
  const question = (item[`question_${language}` as keyof FaqItem] as string) || item.question_he || "";
  const answer = (item[`answer_${language}` as keyof FaqItem] as string) || item.answer_he || "";

  return (
    <div
      className="opacity-0"
      style={{ animation: inView ? `fade-in-up 0.5s ease-out ${index * 0.08}s forwards` : "none" }}
    >
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? "border-[#B8D900]/40 bg-white shadow-[0_4px_20px_rgba(184,217,0,0.08)]"
          : "border-gray-200 bg-white hover:border-[#B8D900]/30"
      }`}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
          aria-expanded={isOpen}
        >
          <div className="flex items-start gap-4">
            {/* Green accent bar */}
            <div className={`w-1 h-6 mt-0.5 rounded-full transition-all duration-300 ${
              isOpen ? "bg-[#B8D900]" : "bg-gray-200 group-hover:bg-[#B8D900]/50"
            }`} />
            <span className="font-heading text-base md:text-lg font-bold text-[#2a2628] group-hover:text-[#2a2628] transition-colors leading-snug">
              {question}
            </span>
          </div>
          <div
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 mr-4 ${
              isOpen
                ? "bg-[#B8D900] rotate-180"
                : "bg-gray-100 group-hover:bg-[#B8D900]/15"
            }`}
          >
            <svg
              className={`w-4 h-4 transition-colors ${isOpen ? "text-[#2a2628]" : "text-[#716C70]"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-5 md:px-6 pb-6 mr-5">
            <p className="text-[#716C70] text-base leading-[1.8]">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqSection({ content, language }: FaqSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "שאלות נפוצות" : "FAQ");
  const items: FaqItem[] = (content.items as FaqItem[]) || [];
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

  // Schema.org FAQPage JSON-LD
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
    <section ref={sectionRef} className="py-20 md:py-28 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto px-5">
        {heading && (
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              {isRtl ? "שאלות ותשובות" : "Q&A"}
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              {heading}
            </h2>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, index) => (
            <FaqAccordionItem
              key={index}
              item={item}
              language={language}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              index={index}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
