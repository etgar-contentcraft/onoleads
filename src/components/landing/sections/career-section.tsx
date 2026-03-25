"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface CareerItem {
  title_he: string;
  title_en?: string;
  icon?: string;
}

interface CareerSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function CareerSection({ content, language }: CareerSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "לאן תגיעו אחרי התואר?" : "Career Outcomes");
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || "";
  const items: CareerItem[] = (content.items as CareerItem[]) || [];

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

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2628] via-[#353133] to-[#2a2628]" />
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          style={{
            backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/15 text-[#B8D900] text-sm font-semibold mb-4 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            {isRtl ? "אפשרויות קריירה" : "Career"}
          </span>
          <h2
            className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-3 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p className="text-white/60 text-lg max-w-2xl mx-auto opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.2s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-12">
          {items.map((item, index) => {
            const title = (item[`title_${language}` as keyof CareerItem] as string) || item.title_he;
            return (
              <div
                key={index}
                className="bg-white/6 backdrop-blur-sm rounded-2xl border border-white/8 p-5 md:p-6 text-center hover:bg-white/10 hover:border-[#B8D900]/20 transition-all duration-300 opacity-0"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.2 + index * 0.08}s forwards` : "none" }}
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#B8D900]/10 flex items-center justify-center text-[#B8D900] mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-white text-sm md:text-base">{title}</h3>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="text-center opacity-0"
          style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.5s forwards" : "none" }}
        >
          <button
            onClick={open}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_30px_rgba(184,217,0,0.3)] active:scale-[0.98]"
          >
            {isRtl ? "רוצים לשמוע עוד?" : "Want to learn more?"}
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
