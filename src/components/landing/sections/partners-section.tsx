"use client";

/**
 * Partners / Logos Section — horizontal strip of partner logos.
 *
 * Displays logos at uniform height while preserving original aspect ratios.
 * Each logo can optionally have a caption and a link.
 * Full implementation follows in Task 5.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface PartnerItem {
  id?: string;
  image_url: string;
  name?: string;
  link_url?: string;
  caption_he?: string;
  caption_en?: string;
  caption_ar?: string;
}

interface PartnersSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function PartnersSection({ content, language }: PartnersSectionProps) {
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    "";
  const subheading =
    (content[`subheading_${language}`] as string) ||
    (content.subheading_he as string) ||
    "";

  const items: PartnerItem[] = Array.isArray(content.items)
    ? (content.items as PartnerItem[])
    : [];
  const logoHeight = (content.logo_height as number) || 64;
  const background = (content.background as string) || "white";
  const showSeparator = content.show_separator_line === true;
  const alignment = (content.alignment as string) || "center";

  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
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

  if (items.length === 0) return null;

  const bgClass =
    background === "gray" ? "bg-[#F5F5F5]" : background === "transparent" ? "bg-transparent" : "bg-white";
  const justifyClass = alignment === "space-between" ? "justify-between" : "justify-center";

  return (
    <section
      ref={sectionRef}
      className={`py-12 md:py-16 ${bgClass} ${showSeparator ? "border-t border-[#E5E5E5]" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Optional heading */}
        {heading && (
          <div className="text-center mb-8">
            <h2
              className="font-heading text-2xl md:text-3xl font-bold text-[#2a2628] opacity-0"
              style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
            >
              {heading}
            </h2>
            {subheading && (
              <p
                className="text-sm text-[#5A5658] mt-2 opacity-0"
                style={{ animation: inView ? "fade-in-up 0.5s ease-out 0.1s forwards" : "none" }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Logo strip */}
        <div
          className={`flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 ${justifyClass} opacity-0`}
          style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
        >
          {items.map((item, index) => {
            const caption =
              (item[`caption_${language}` as keyof PartnerItem] as string) ||
              item.caption_he ||
              "";

            const logoEl = (
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="flex items-center justify-center"
                  style={{ height: `clamp(48px, 8vw, ${logoHeight}px)` }}
                >
                  <img
                    src={item.image_url}
                    alt={item.name || ""}
                    className="h-full w-auto max-w-none object-contain"
                    loading="lazy"
                  />
                </div>
                {caption && (
                  <span className="text-xs text-[#5A5658] text-center max-w-[140px] leading-tight">
                    {caption}
                  </span>
                )}
              </div>
            );

            if (item.link_url) {
              return (
                <a
                  key={item.id || index}
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  {logoEl}
                </a>
              );
            }
            return <div key={item.id || index}>{logoEl}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
