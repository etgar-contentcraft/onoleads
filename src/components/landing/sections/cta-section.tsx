"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface CtaSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function CtaSection({ content, language }: CtaSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "מוכנים להתחיל? הצעד הראשון מתחיל כאן" : "Ready to start?");
  const description = (content[`description_${language}`] as string) || (content.description_he as string) || (isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "");
  const buttonText = (content[`button_text_${language}`] as string) || (content.button_text_he as string) || (isRtl ? "השאירו פרטים" : "Get info");
  const buttonUrl = (content.button_url as string) || "#form";
  const phone = (content.phone as string) || "";

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#B8D900] via-[#c8e920] to-[#B8D900]" />

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div
          style={{
            backgroundImage: `radial-gradient(circle, rgba(42,38,40,0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/10" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        {heading && (
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          >
            {heading}
          </h2>
        )}

        {description && (
          <p
            className="text-lg md:text-xl text-[#2a2628]/70 mb-10 max-w-xl mx-auto opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
          >
            {description}
          </p>
        )}

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0"
          style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.3s forwards" : "none" }}
        >
          {buttonText && (
            <a
              href={buttonUrl}
              className="inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-[#2a2628] text-white font-heading font-bold text-lg transition-all duration-300 hover:bg-[#3a3638] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:scale-[1.03] active:scale-[0.98]"
            >
              {buttonText}
            </a>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl bg-white/30 backdrop-blur-md text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-white/50 hover:scale-[1.03] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
