"use client";

/**
 * Programs List Section — expandable accordion of degree programs.
 *
 * Each item can be linked to a row in the `programs` table (hybrid mode)
 * or fully hand-entered. When linked, the section resolves title, description,
 * and image from programsMap — with per-item overrides always winning.
 *
 * Body text uses renderRichText() to support both legacy plain text and
 * new HTML from the Tiptap editor.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { richTextHtml } from "@/lib/rich-text/render";
import { useCtaModal } from "../cta-modal";
import type { ProgramMapEntry } from "../landing-page-layout";

interface ProgramListItem {
  program_id?: string;
  title_he?: string;
  title_en?: string;
  title_ar?: string;
  body_he?: string;
  body_en?: string;
  body_ar?: string;
  image_url?: string;
  link_url?: string;
  link_text_he?: string;
  link_text_en?: string;
  link_text_ar?: string;
}

interface ProgramsListSectionProps {
  content: Record<string, unknown>;
  language: Language;
  programsMap?: Record<string, ProgramMapEntry>;
}

export function ProgramsListSection({ content, language, programsMap = {} }: ProgramsListSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "התוכניות שלנו" : "Our Programs");

  const items: ProgramListItem[] = Array.isArray(content.items)
    ? (content.items as ProgramListItem[])
    : [];

  const expandMode = (content.expand_mode as string) || "single";
  const ctaEnabled = content.cta_enabled === true;
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "השאירו פרטים" : "Get Info");

  // Expand state — single mode tracks one index, multiple mode tracks a Set
  const [openSingle, setOpenSingle] = useState<number | null>(0);
  const [openMultiple, setOpenMultiple] = useState<Set<number>>(new Set([0]));

  const isOpen = (i: number) =>
    expandMode === "single" ? openSingle === i : openMultiple.has(i);

  const toggle = (i: number) => {
    if (expandMode === "single") {
      setOpenSingle((prev) => (prev === i ? null : i));
    } else {
      setOpenMultiple((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    }
  };

  // Resolve an item field — override > programsMap fallback
  const resolve = (item: ProgramListItem, field: string, lang: string): string => {
    const overrideKey = `${field}_${lang}` as keyof ProgramListItem;
    const overrideVal = item[overrideKey] as string | undefined;
    if (overrideVal) return overrideVal;

    // Fallback to Hebrew
    const heKey = `${field}_he` as keyof ProgramListItem;
    const heVal = item[heKey] as string | undefined;
    if (heVal) return heVal;

    // Fallback to programsMap
    if (item.program_id && programsMap[item.program_id]) {
      const prog = programsMap[item.program_id];
      const mapKey = `${field === "title" ? "name" : field}_${lang}` as keyof ProgramMapEntry;
      const mapVal = prog[mapKey] as string | null;
      if (mapVal) return mapVal;
      const mapKeyHe = `${field === "title" ? "name" : field}_he` as keyof ProgramMapEntry;
      return (prog[mapKeyHe] as string | null) || "";
    }
    return "";
  };

  const resolveImage = (item: ProgramListItem): string | null => {
    if (item.image_url) return item.image_url;
    if (item.program_id && programsMap[item.program_id]) {
      return programsMap[item.program_id].image_url || null;
    }
    return null;
  };

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

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-3xl mx-auto px-5">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          >
            {heading}
          </h2>
        </div>

        {/* Accordion items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const title = resolve(item, "title", language);
            const body = resolve(item, "body", language);
            const image = resolveImage(item);
            const linkUrl = item.link_url || "";
            const linkText =
              (item[`link_text_${language}` as keyof ProgramListItem] as string) ||
              item.link_text_he ||
              (isRtl ? "למידע נוסף →" : "Learn More →");
            const opened = isOpen(index);

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden opacity-0 ${
                  opened
                    ? "border-[#B8D900]/40 bg-white shadow-[0_4px_24px_rgba(184,217,0,0.08)]"
                    : "border-gray-200 bg-white hover:border-[#B8D900]/20"
                }`}
                style={{
                  animation: inView
                    ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.06}s forwards`
                    : "none",
                }}
              >
                {/* Title bar */}
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
                  aria-expanded={opened}
                >
                  <span className="font-heading text-base md:text-lg font-bold text-[#2a2628] leading-snug pr-3">
                    {title}
                  </span>
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      opened
                        ? "bg-[#B8D900] rotate-180 shadow-[0_0_15px_rgba(184,217,0,0.3)]"
                        : "bg-gray-100 group-hover:bg-[#B8D900]/15"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        opened ? "text-[#2a2628]" : "text-[#716C70]"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expandable content */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    opened ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 md:px-6 pb-6 space-y-4">
                      {/* Image */}
                      {image && (
                        <div className="rounded-xl overflow-hidden">
                          <img
                            src={image}
                            alt={title}
                            className="w-full h-auto max-h-[280px] object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Rich text body */}
                      {body && (
                        <div
                          className="prose prose-sm max-w-none font-heebo text-[#716C70] leading-[1.8] prose-headings:text-[#2a2628] prose-headings:font-heading prose-a:text-[#B8D900] prose-a:underline"
                          dangerouslySetInnerHTML={richTextHtml(body)}
                        />
                      )}

                      {/* Link button */}
                      {linkUrl && (
                        <a
                          href={linkUrl}
                          target={linkUrl.startsWith("http") ? "_blank" : undefined}
                          rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-2 text-sm font-heading font-bold text-[#B8D900] hover:text-[#9AB800] transition-colors"
                        >
                          {linkText}
                        </a>
                      )}
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
              onClick={() => open("section_programs_list")}
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
