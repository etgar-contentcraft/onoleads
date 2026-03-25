"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface FacultyMember {
  name_he: string;
  name_en?: string;
  title_he?: string;
  title_en?: string;
  image_url?: string;
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
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            {isRtl ? "צוות מרצים" : "Our Faculty"}
          </span>
          <h2
            className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${members.length <= 3 ? "max-w-3xl mx-auto" : ""} gap-6 md:gap-8`}>
          {members.map((member, index) => {
            const name = (member[`name_${language}` as keyof FacultyMember] as string) || member.name_he;
            const title = (member[`title_${language}` as keyof FacultyMember] as string) || member.title_he || "";

            return (
              <div
                key={index}
                className="text-center opacity-0"
                style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.08}s forwards` : "none" }}
              >
                {member.image_url ? (
                  <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full overflow-hidden border-3 border-[#B8D900]/20 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.image_url}
                      alt={name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full bg-gradient-to-br from-[#B8D900]/20 to-[#B8D900]/5 flex items-center justify-center mb-4 border-2 border-[#B8D900]/10">
                    <span className="font-heading font-bold text-2xl text-[#9ab800]">
                      {name.charAt(0)}
                    </span>
                  </div>
                )}
                <h3 className="font-heading font-bold text-[#2a2628] text-base mb-1">{name}</h3>
                {title && <p className="text-[#716C70] text-xs leading-relaxed">{title}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
