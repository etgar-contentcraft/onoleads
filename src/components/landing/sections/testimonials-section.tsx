"use client";

import { useEffect, useRef, useState } from "react";
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
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "מה אומרים הסטודנטים שלנו" : "What our students say");
  const items: Testimonial[] = (content.items as Testimonial[]) || [];
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

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            {isRtl ? "המלצות" : "Testimonials"}
          </span>
          <h2
            className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        <div className={`grid gap-6 md:gap-8 ${
          items.length === 1 ? "max-w-xl mx-auto" : "md:grid-cols-2"
        }`}>
          {items.slice(0, 4).map((item, index) => {
            const quote = (item[`quote_${language}` as keyof Testimonial] as string) || item.quote_he || "";
            const role = (item[`role_${language}` as keyof Testimonial] as string) || item.role_he || "";

            return (
              <div
                key={index}
                className="relative bg-white rounded-2xl p-7 md:p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:border-[#B8D900]/20 transition-all duration-300 opacity-0"
                style={{ animation: inView ? `fade-in-up 0.6s ease-out ${0.15 + index * 0.12}s forwards` : "none" }}
              >
                {/* Large green quote mark */}
                <div className="mb-5">
                  <svg className="w-10 h-10 text-[#B8D900] opacity-30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <p className="text-[#2a2628] text-base md:text-lg leading-[1.8] mb-6 italic">
                  &ldquo;{quote}&rdquo;
                </p>

                <div className="flex items-center gap-4 pt-5 border-t border-gray-100">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#B8D900]/20"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B8D900] to-[#9ab800] flex items-center justify-center text-[#2a2628] font-heading font-bold text-xl">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-heading font-bold text-[#2a2628] text-base">{item.name}</p>
                    <p className="text-sm text-[#716C70]">{role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
