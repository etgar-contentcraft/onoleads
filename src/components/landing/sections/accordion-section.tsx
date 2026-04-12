"use client";

/**
 * Accordion Section — generic expandable content blocks.
 *
 * Premium Glass design: bg-mesh-light, numbered badges, gradient accent
 * lines, slide-up-spring animations with staggered delays, card-premium
 * glass cards with gradient-border-green hover reveal.
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

  const subheading =
    (content[`subheading_${language}`] as string) ||
    (content.subheading_he as string) ||
    "";

  const badgeText =
    (content[`badge_text_${language}`] as string) ||
    (content.badge_text_he as string) ||
    (isRtl ? "מידע" : "Details");

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
      className="py-20 md:py-28 bg-mesh-light"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-3xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) forwards" : "none" }}
          >
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo tracking-wide">
              {badgeText}
            </span>
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="mt-4 text-[#5A5658] font-heebo text-base md:text-lg max-w-xl mx-auto opacity-0"
              style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.2s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {/* Accordion items */}
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
                className={`rounded-2xl border overflow-hidden opacity-0 transition-all duration-[400ms] ${
                  isOpen
                    ? "border-[#B8D900]/30 bg-white shadow-[var(--shadow-card-hover)]"
                    : "border-gray-200/80 bg-white/70 hover:bg-white hover:border-[#B8D900]/20 hover:shadow-[var(--shadow-card)]"
                }`}
                style={{
                  animation: inView
                    ? `slide-up-spring 0.6s var(--ease-out-expo) ${0.15 + index * 0.08}s forwards`
                    : "none",
                }}
              >
                <button
                  id={`accordion-btn-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                  aria-expanded={isOpen}
                  aria-controls={`accordion-panel-${index}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Numbered badge */}
                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-sm transition-all duration-300 ${
                        isOpen
                          ? "bg-[#B8D900] text-[#2a2628] shadow-[var(--shadow-green-sm)]"
                          : "bg-[#B8D900]/8 text-[#9ab800] group-hover:bg-[#B8D900]/15"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <span
                      className={`font-heading text-base md:text-lg font-bold leading-snug transition-colors duration-300 ${
                        isOpen ? "text-[#2a2628]" : "text-[#3a3638] group-hover:text-[#2a2628]"
                      }`}
                    >
                      {title}
                    </span>
                  </div>
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isRtl ? "ml-3" : "mr-3"} ${
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

                {/* Animated gradient accent line */}
                <div
                  className={`mx-5 md:mx-6 h-px transition-all duration-500 ${
                    isOpen
                      ? "bg-gradient-to-r from-transparent via-[#B8D900]/30 to-transparent scale-x-100"
                      : "bg-transparent scale-x-0"
                  }`}
                />

                {/* Answer body with smooth animation */}
                <div
                  id={`accordion-panel-${index}`}
                  role="region"
                  aria-labelledby={`accordion-btn-${index}`}
                  className={`grid transition-all duration-[400ms] ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`px-5 md:px-6 pb-6 pt-4 ${isRtl ? "pr-[4.25rem]" : "pl-[4.25rem]"}`}>
                      <div
                        className={`prose prose-sm max-w-none font-heebo text-[#5A5658] leading-[1.8] prose-headings:text-[#2a2628] prose-headings:font-heading prose-a:text-[#B8D900] prose-a:underline ${
                          isRtl
                            ? "border-r-2 border-[#B8D900]/20 pr-4"
                            : "border-l-2 border-[#B8D900]/20 pl-4"
                        }`}
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
            className="text-center mt-16 opacity-0"
            style={{
              animation: inView
                ? `slide-up-spring 0.7s var(--ease-out-expo) ${0.3 + items.length * 0.08}s forwards`
                : "none",
            }}
          >
            <button
              onClick={() => open("section_accordion")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[var(--shadow-green)] hover:scale-[1.02] active:scale-[0.98]"
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
