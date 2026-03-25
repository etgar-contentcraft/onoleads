"use client";

/**
 * Faculty Section - Clean academic grid of faculty member cards with photos,
 * names, and roles. Elegant hover effects with green accents.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface FacultyMember {
  name_he: string;
  name_en?: string;
  name?: string;
  title_he?: string;
  title_en?: string;
  role?: string;
  image_url?: string;
  image?: string;
}

interface FacultySectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function FacultySection({ content, language }: FacultySectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "הסגל האקדמי" : "Faculty");
  const members: FacultyMember[] = (content.members as FacultyMember[]) || [];

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

  if (members.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "צוות מרצים" : "Our Faculty"}
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

        {/* Faculty grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 ${
          members.length <= 3 ? "max-w-3xl mx-auto" : ""
        }`}>
          {members.map((member, index) => {
            const name = (member[`name_${language}` as keyof FacultyMember] as string) || member.name_he || member.name || "";
            const title = (member[`title_${language}` as keyof FacultyMember] as string) || member.title_he || member.role || "";
            const imageUrl = member.image_url || member.image || "";

            return (
              <div
                key={index}
                className="group text-center opacity-0"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.07}s forwards` : "none" }}
              >
                {/* Photo container with hover effect */}
                <div className="relative mx-auto w-28 h-28 md:w-32 md:h-32 mb-4">
                  {imageUrl ? (
                    <div className="w-full h-full rounded-full overflow-hidden border-3 border-transparent group-hover:border-[#B8D900]/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgba(184,217,0,0.15)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#B8D900]/15 to-[#B8D900]/5 flex items-center justify-center border-2 border-[#B8D900]/10 group-hover:border-[#B8D900]/30 transition-all duration-300">
                      <span className="font-heading font-bold text-3xl text-[#9ab800]">
                        {name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Subtle green ring indicator */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#B8D900]" />
                  </div>
                </div>

                <h3 className="font-heading font-bold text-[#2a2628] text-base mb-1">{name}</h3>
                {title && (
                  <p className="font-heebo text-[#716C70] text-xs leading-relaxed max-w-[180px] mx-auto">
                    {title}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
