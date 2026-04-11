"use client";

/**
 * Accordion Section — generic expandable content blocks.
 *
 * Similar to FAQ but with neutral semantics (not Q&A) — used for any
 * collapsible content like "Course details", "Admission steps",
 * "Tuition breakdown" etc. Each item has a title and rich text body.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";
import { richTextHtml } from "@/lib/rich-text/render";

interface AccordionItem {
  title_he: string;
  title_en?: string;
  title_ar?: string;
  body_he: string;
  body_en?: string;
  body_ar?: string;
}

interface AccordionSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function AccordionSection({ content, language }: AccordionSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "מידע נוסף" : "More Information");

  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "השאירו פרטים" : "Get Info");

  const ctaEnabled = content.cta_enabled !== false;

  const items: AccordionItem[] = Array.isArray(content.items)
    ? (content.items as AccordionItem[])
    : [];

  const [openIndex, setOpenIndex] = useState<number | null>(0);
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

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const title =
              (item[`title_${language}` as keyof AccordionItem] as string) ||
              item.title_he ||
              "";
            const body =
              (item[`body_${language}` as keyof AccordionItem] as string) ||
              item.body_he ||
              "";
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden opacity-0 ${
                  isOpen
                    ? "border-[#B8D900]/40 bg-white shadow-[0_6px_28px_rgba(184,217,0,0.12)]"
                    : "border-gray-200 bg-[#fafaf8] hover:border-[#B8D900]/25 hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                }`}
                style={{
                  animation: inView
                    ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.06}s forwards`
                    : "none",
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-4">
                    {/* Green accent bar */}
                    <div className={`w-1 self-stretch rounded-full transition-all duration-300 shrink-0 ${
                      isOpen ? "bg-[#B8D900]" : "bg-gray-200 group-hover:bg-[#B8D900]/50"
                    }`} />
                    <span className="font-heading text-base md:text-lg font-bold text-[#2a2628] leading-snug">
                      {title}
                    </span>
                  </div>
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen
                        ? "bg-[#B8D900] rotate-180 shadow-[0_0_15px_rgba(184,217,0,0.3)]"
                        : "bg-gray-100 group-hover:bg-[#B8D900]/15"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        isOpen ? "text-[#2a2628]" : "text-[#5A5658]"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 md:px-6 pb-6">
                      <div
                        className="prose prose-sm max-w-none font-heebo text-[#5A5658] leading-[1.8] prose-headings:text-[#2a2628] prose-headings:font-heading prose-a:text-[#B8D900] prose-a:underline"
                        dangerouslySetInnerHTML={richTextHtml(body)}
                      />
                    </div>
                  </div>
                </div>
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
                ? `fade-in-up 0.6s ease-out ${0.2 + items.length * 0.06}s forwards`
                : "none",
            }}
          >
            <button
              onClick={() => open("section_accordion")}
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
