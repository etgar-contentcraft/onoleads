"use client";

import { useState } from "react";
import type { Language } from "@/lib/types/database";

interface Testimonial {
  name: string;
  role_he: string;
  role_en?: string;
  role_ar?: string;
  quote_he: string;
  quote_en?: string;
  quote_ar?: string;
  image_url?: string;
}

interface TestimonialsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function TestimonialsSection({ content, language }: TestimonialsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const items: Testimonial[] = (content.items as Testimonial[]) || [];
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-12">
            {heading}
          </h2>
        )}

        {/* Grid for 3+ testimonials, single card for fewer */}
        {items.length <= 3 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <TestimonialCard key={index} item={item} language={language} />
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Featured testimonial */}
            <div className="max-w-2xl mx-auto">
              <TestimonialCard item={items[activeIndex]} language={language} featured />
            </div>

            {/* Navigation dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    activeIndex === index
                      ? "bg-[#B8D900] w-8"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Testimonial ${index + 1}`}
                />
              ))}
            </div>

            {/* Arrow navigation */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setActiveIndex(activeIndex === 0 ? items.length - 1 : activeIndex - 1)}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#B8D900] hover:text-[#B8D900] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                </svg>
              </button>
              <button
                onClick={() => setActiveIndex(activeIndex === items.length - 1 ? 0 : activeIndex + 1)}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#B8D900] hover:text-[#B8D900] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({
  item,
  language,
  featured = false,
}: {
  item: Testimonial;
  language: Language;
  featured?: boolean;
}) {
  const quote = (item[`quote_${language}` as keyof Testimonial] as string) || item.quote_he || "";
  const role = (item[`role_${language}` as keyof Testimonial] as string) || item.role_he || "";

  return (
    <div
      className={`bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100 p-6 md:p-8 ${
        featured ? "animate-fade-in-up" : ""
      }`}
    >
      {/* Quote mark */}
      <div className="text-[#B8D900] mb-4">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>

      <p className="text-[#4A4648] text-base md:text-lg leading-relaxed mb-6">
        {quote}
      </p>

      <div className="flex items-center gap-3">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#B8D900]/30"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#B8D900]/20 flex items-center justify-center text-[#B8D900] font-bold text-lg">
            {item.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-semibold text-[#4A4648] text-sm">{item.name}</p>
          <p className="text-xs text-[#716C70]">{role}</p>
        </div>
      </div>
    </div>
  );
}
