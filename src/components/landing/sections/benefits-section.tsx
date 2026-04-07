"use client";

/**
 * Benefits Section - 3-column grid of benefit cards with icons,
 * green accent on hover, and smooth staggered entrance animations.
 * Supports both structured items and plain string arrays from scraped data.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface BenefitItem {
  icon?: string;
  title_he: string;
  title_en?: string;
  description_he?: string;
  description_en?: string;
}

interface BenefitsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/* ---- Icon library for benefit cards ---- */
const BENEFIT_ICONS: Record<string, JSX.Element> = {
  faculty: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  practical: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  placement: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  campuses: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
    </svg>
  ),
  scholarship: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  career: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  ),
  star: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
};

/** Fallback icon order for items without explicit icon key */
const ICON_CYCLE = ["star", "faculty", "practical", "placement", "campuses", "scholarship", "career"];

/**
 * Bilingual default benefits used as a last-resort fallback.
 * Only triggered when an editor explicitly drops a Benefits section but
 * forgets to fill in items — never auto-injected.
 */
const DEFAULT_BENEFITS: BenefitItem[] = [
  { icon: "faculty", title_he: "סגל אקדמי מוביל", title_en: "Leading Faculty", description_he: "מרצים מהשורה הראשונה בתעשייה ובאקדמיה", description_en: "Top instructors from industry and academia" },
  { icon: "practical", title_he: "הכשרה מעשית", title_en: "Hands-On Training", description_he: "שילוב תיאוריה ופרקטיקה מהיום הראשון", description_en: "Theory and practice from day one" },
  { icon: "placement", title_he: "שיעור השמה 92%", title_en: "92% Placement Rate", description_he: "הבוגרים שלנו מועסקים בחברות המובילות", description_en: "Our graduates work at leading companies" },
  { icon: "campuses", title_he: "קמפוסים ברחבי הארץ", title_en: "Nationwide Campuses", description_he: "קריית אונו, ירושלים וחיפה", description_en: "Kiryat Ono, Jerusalem & Haifa" },
  { icon: "scholarship", title_he: "מלגות והנחות", title_en: "Scholarships & Discounts", description_he: "מגוון מסלולי מימון ומלגות הצטיינות", description_en: "Many funding paths and merit scholarships" },
  { icon: "career", title_he: "ליווי קריירה אישי", title_en: "Personal Career Support", description_he: "מרכז קריירה וסדנאות הכנה לעולם העבודה", description_en: "Career center and job-ready workshops" },
];

/**
 * Normalizes items from various data shapes:
 * - Array of BenefitItem objects (structured)
 * - Array of strings (from scraped data)
 *
 * Returns DEFAULT_BENEFITS only when the section was placed but no items
 * were configured — this is the editor's safety net, not a content fallback.
 */
function normalizeItems(raw: unknown): BenefitItem[] {
  if (!Array.isArray(raw)) return DEFAULT_BENEFITS;
  if (raw.length === 0) return DEFAULT_BENEFITS;

  return raw.map((item, i) => {
    if (typeof item === "string") {
      return {
        icon: ICON_CYCLE[i % ICON_CYCLE.length],
        title_he: item,
      };
    }
    return item as BenefitItem;
  });
}

export function BenefitsSection({ content, language }: BenefitsSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "למה ללמוד באונו?" : "Why choose Ono?");
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "אני רוצה לדעת עוד" : "I Want to Learn More");
  const ctaEnabled = content.cta_enabled !== false;
  const items = normalizeItems(content.items);

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

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-[#fafafa]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "היתרונות שלנו" : "Our Advantages"}
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

        {/* Flex grid — centers orphan items on the last row */}
        <div className="flex flex-wrap justify-center gap-5 md:gap-7">
          {items.map((item, index) => {
            const title = (item[`title_${language}` as keyof BenefitItem] as string) || item.title_he;
            const desc = (item[`description_${language}` as keyof BenefitItem] as string) || item.description_he || "";
            const iconKey = item.icon || ICON_CYCLE[index % ICON_CYCLE.length];

            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-7 md:p-8 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:border-[#B8D900]/40 hover:shadow-[0_12px_40px_rgba(184,217,0,0.1)] transition-all duration-400 opacity-0 hover:-translate-y-1 w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-19px)]"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.1 + index * 0.08}s forwards` : "none" }}
              >
                {/* Green top accent line on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#B8D900] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />

                <div className="w-14 h-14 rounded-2xl bg-[#B8D900]/10 flex items-center justify-center text-[#9ab800] mb-5 group-hover:bg-[#B8D900] group-hover:text-[#2a2628] transition-all duration-300">
                  {BENEFIT_ICONS[iconKey] || BENEFIT_ICONS.star}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#2a2628] mb-2 leading-snug">{title}</h3>
                {desc && (
                  <p className="font-heebo text-[#716C70] text-sm leading-relaxed">{desc}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        {ctaEnabled && ctaText && (
          <div
            className="text-center mt-14 opacity-0"
            style={{ animation: inView ? `fade-in-up 0.6s ease-out ${0.2 + items.length * 0.08}s forwards` : "none" }}
          >
            <button
              onClick={() => open("section_benefits")}
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
