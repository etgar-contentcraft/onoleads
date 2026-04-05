"use client";

/**
 * About Section - Two-column layout with text + image,
 * green checkmark USP bullets, and CTA button.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";
import { extractYoutubeId } from "@/lib/utils/youtube";

interface AboutSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function AboutSection({ content, language }: AboutSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  /* ---- Content fields ---- */
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "אודות התוכנית" : "About the Program");
  const description = (content[`description_${language}`] as string) || (content.description_he as string) || "";
  const imageUrl = (content.image_url as string) || (content.image as string) || "";
  const videoUrl = (content.video_url as string) || "";
  const bullets = (content.bullets as string[]) || [];
  const ctaText = (content[`cta_text_${language}`] as string) || (content.cta_text_he as string) || (isRtl ? "לפרטים נוספים" : "Learn more");
  const ctaEnabled = content.cta_enabled !== false;

  /* ---- Intersection observer ---- */
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
    <section ref={sectionRef} className="py-20 md:py-28 bg-white overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text column (right in RTL) */}
          <div className="order-2 md:order-1">
            <div
              className="opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-1 bg-[#B8D900] rounded-full" />
                <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
                  {isRtl ? "אודות התוכנית" : "About"}
                </span>
              </div>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] mb-6 leading-tight">
                {heading}
              </h2>
            </div>

            {description && (
              <p
                className="font-heebo text-[#716C70] text-base md:text-lg leading-[1.9] mb-8 opacity-0"
                style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
              >
                {description}
              </p>
            )}

            {/* USP Bullets with green checkmarks */}
            {bullets.length > 0 && (
              <ul className="space-y-4 mb-10">
                {bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3.5 opacity-0"
                    style={{ animation: inView ? `fade-in-up 0.5s ease-out ${0.2 + i * 0.08}s forwards` : "none" }}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#B8D900] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_8px_rgba(184,217,0,0.3)]">
                      <svg className="w-4 h-4 text-[#2a2628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-heebo text-[#2a2628] text-base md:text-lg font-medium leading-relaxed">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* CTA Button */}
            {ctaEnabled && ctaText && (
              <div
                className="opacity-0"
                style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.5s forwards" : "none" }}
              >
                <button
                  onClick={() => open("section_about")}
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-base transition-all duration-300 hover:bg-[#3a3638] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  {ctaText}
                  <svg className={`w-4 h-4 transition-transform ${isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"} />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Image / Video column (left in RTL) */}
          <div
            className="order-1 md:order-2 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
          >
            {videoUrl && extractYoutubeId(videoUrl) ? (
              /* YouTube embed in the visual column */
              <div className="relative">
                <div className={`absolute -top-4 ${isRtl ? "-right-4" : "-left-4"} w-full h-full rounded-2xl bg-[#B8D900]/10 -z-10`} />
                <div className="relative rounded-2xl overflow-hidden shadow-[0_12px_50px_rgba(0,0,0,0.12)] aspect-video bg-[#2a2628]">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId(videoUrl)}?rel=0&modestbranding=1`}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={heading}
                  />
                </div>
              </div>
            ) : imageUrl ? (
              <div className="relative">
                {/* Decorative accent shape behind image */}
                <div className={`absolute -top-4 ${isRtl ? "-right-4" : "-left-4"} w-full h-full rounded-2xl bg-[#B8D900]/10 -z-10`} />
                <div className="relative rounded-2xl overflow-hidden shadow-[0_12px_50px_rgba(0,0,0,0.12)]">
                  <Image
                    src={imageUrl}
                    alt={heading}
                    width={600}
                    height={450}
                    className="w-full h-auto object-cover aspect-[4/3]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={80}
                  />
                  {/* Green accent corner overlay */}
                  <div className={`absolute bottom-0 ${isRtl ? "right-0" : "left-0"} w-32 h-32 ${isRtl ? "bg-gradient-to-tl" : "bg-gradient-to-tr"} from-[#B8D900]/25 to-transparent`} />
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 aspect-[4/3] flex items-center justify-center shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#B8D900]/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <p className="text-[#716C70] text-sm font-medium font-heebo">
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
