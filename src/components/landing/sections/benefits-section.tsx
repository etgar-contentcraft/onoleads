"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

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

const BENEFIT_ICONS: Record<string, JSX.Element> = {
  faculty: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  practical: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 21h18" />
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
};

const DEFAULT_BENEFITS: BenefitItem[] = [
  { icon: "faculty", title_he: "סגל אקדמי מוביל", description_he: "מרצים מהשורה הראשונה בתעשייה ובאקדמיה" },
  { icon: "practical", title_he: "הכשרה מעשית", description_he: "שילוב תיאוריה ופרקטיקה מהיום הראשון" },
  { icon: "placement", title_he: "שיעור השמה 92%", description_he: "הבוגרים שלנו מועסקים בחברות המובילות" },
  { icon: "campuses", title_he: "קמפוסים ברחבי הארץ", description_he: "קריית אונו, ירושלים וחיפה" },
  { icon: "scholarship", title_he: "מלגות והנחות", description_he: "מגוון מסלולי מימון ומלגות הצטיינות" },
  { icon: "career", title_he: "ליווי קריירה אישי", description_he: "מרכז קריירה וסדנאות הכנה לעולם העבודה" },
];

export function BenefitsSection({ content, language }: BenefitsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "למה ללמוד באונו?" : "Why choose Ono?");
  const items: BenefitItem[] = (content.items as BenefitItem[]) || DEFAULT_BENEFITS;

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
    <section ref={sectionRef} className="py-20 md:py-28 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            {isRtl ? "היתרונות שלנו" : "Our Advantages"}
          </span>
          <h2
            className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((item, index) => {
            const title = (item[`title_${language}` as keyof BenefitItem] as string) || item.title_he;
            const desc = (item[`description_${language}` as keyof BenefitItem] as string) || item.description_he || "";

            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 md:p-7 border border-gray-100 hover:border-[#B8D900]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 opacity-0"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.1 + index * 0.08}s forwards` : "none" }}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#B8D900]/10 flex items-center justify-center text-[#9ab800] mb-5 group-hover:bg-[#B8D900]/20 transition-colors">
                  {BENEFIT_ICONS[item.icon || ""] || BENEFIT_ICONS.faculty}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#2a2628] mb-2">{title}</h3>
                {desc && <p className="text-[#716C70] text-sm leading-relaxed">{desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
