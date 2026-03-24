"use client";

import { useState } from "react";
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
}: {
  item: FaqItem;
  language: Language;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const question = (item[`question_${language}` as keyof FaqItem] as string) || item.question_he || "";
  const answer = (item[`answer_${language}` as keyof FaqItem] as string) || item.answer_he || "";

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-1 text-start group"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-semibold text-[#4A4648] group-hover:text-[#B8D900] transition-colors leading-snug pr-4">
          {question}
        </span>
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? "bg-[#B8D900] rotate-180"
              : "bg-gray-100 group-hover:bg-[#B8D900]/20"
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
          isOpen ? "max-h-[500px] opacity-100 pb-5" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-[#716C70] text-base leading-relaxed px-1">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function FaqSection({ content, language }: FaqSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const items: FaqItem[] = (content.items as FaqItem[]) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
    <section className="py-16 md:py-20 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-10">
            {heading}
          </h2>
        )}

        <div className="bg-white rounded-2xl shadow-[0_2px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6 md:p-8">
          {items.map((item, index) => (
            <FaqAccordionItem
              key={index}
              item={item}
              language={language}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
