"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface AboutSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function AboutSection({ content, language }: AboutSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "אודות התוכנית" : "About the Program");
  const description = (content[`description_${language}`] as string) || (content.description_he as string) || "";
  const imageUrl = (content.image_url as string) || "";
  const bullets = (content.bullets as string[]) || [];
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || (isRtl ? "לפרטים נוספים" : "Learn more");

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!description && bullets.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text column */}
          <div>
            <div
              className="opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-5">
                {isRtl ? "אודות התוכנית" : "About"}
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] mb-6 leading-tight">
                {heading}
              </h2>
            </div>

            {description && (
              <p
                className="text-[#716C70] text-base md:text-lg leading-[1.9] mb-8 opacity-0"
                style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
              >
                {description}
              </p>
            )}

            {bullets.length > 0 && (
              <ul className="space-y-3 mb-8">
                {bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 opacity-0"
                    style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.2 + i * 0.08}s forwards` : "none" }}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#B8D900]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-[#9ab800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#2a2628] text-base font-medium leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            <div
              className="opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.5s forwards" : "none" }}
            >
              <button
                onClick={open}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-base transition-all duration-300 hover:bg-[#3a3638] hover:shadow-lg active:scale-[0.98]"
              >
                {ctaText}
                <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image column */}
          <div
            className="opacity-0"
            style={{ animation: inView ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
          >
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={heading}
                  className="w-full h-auto object-cover aspect-[4/3]"
                  loading="lazy"
                />
                {/* Green accent corner */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[#B8D900]/20 to-transparent" />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 aspect-[4/3] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#B8D900]/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <p className="text-[#716C70] text-sm font-medium">
                    {isRtl ? "הקריה האקדמית אונו" : "Ono Academic College"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
