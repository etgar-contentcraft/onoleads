"use client";

/**
 * Text Block Section — flexible heading + rich text + optional CTA.
 *
 * A single section type with style toggles that covers both "light centered
 * paragraph" and "dark hero-style text with CTA" use cases. Background,
 * alignment, width, padding, heading size, and CTA are all configurable.
 *
 * Body text is rendered via renderRichText() which handles both legacy
 * plain-text (\n-separated) and new HTML from the Tiptap editor.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { richTextHtml } from "@/lib/rich-text/render";
import { useCtaModal } from "../cta-modal";

interface TextBlockSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Map padding toggle values to Tailwind classes. */
const PADDING_MAP: Record<string, string> = {
  compact: "py-12 md:py-16",
  normal: "py-20 md:py-28",
  spacious: "py-32 md:py-40",
};

/** Map width toggle values to Tailwind max-width classes. */
const WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-xl",
  normal: "max-w-3xl",
  wide: "max-w-5xl",
};

export function TextBlockSection({ content, language }: TextBlockSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  // ── Content fields ──────────────────────────────────────────────────
  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    "";
  const body =
    (content[`body_${language}`] as string) ||
    (content.body_he as string) ||
    "";

  // ── Style toggles ──────────────────────────────────────────────────
  const background = (content.background as string) || "white";
  const textColorPref = (content.text_color as string) || "auto";
  const alignment = (content.alignment as string) || "center";
  const width = (content.width as string) || "normal";
  const headingSize = (content.heading_size as string) || "h2";
  const padding = (content.padding as string) || "normal";

  // ── CTA ─────────────────────────────────────────────────────────────
  const ctaEnabled = content.cta_enabled === true;
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "השאירו פרטים" : "Get Info");
  const ctaStyle = (content.cta_style as string) || "button";

  // ── Derive colors ───────────────────────────────────────────────────
  const isDarkBg = background === "dark" || background === "brand";
  const customBg = background === "custom" ? (content.background_custom as string) || "#1e1a2e" : undefined;

  let bgClass = "bg-white";
  let bgStyle: React.CSSProperties | undefined;
  if (background === "dark") bgClass = "bg-[#1e1a2e]";
  else if (background === "brand") bgClass = "bg-[#B8D900]";
  else if (background === "custom") {
    bgClass = "";
    bgStyle = { backgroundColor: customBg };
  }

  let textColor = "text-[#4A4648]";
  if (textColorPref === "light" || (textColorPref === "auto" && isDarkBg)) {
    textColor = "text-white";
  } else if (textColorPref === "dark") {
    textColor = "text-[#4A4648]";
  }

  const headingColor =
    textColorPref === "light" || (textColorPref === "auto" && isDarkBg)
      ? "text-[#B8D900]"
      : "text-[#2a2628]";

  const alignClass =
    alignment === "center"
      ? "text-center"
      : alignment === "left"
      ? "text-left"
      : "text-right";

  const headingSizeClass =
    headingSize === "h3"
      ? "text-2xl md:text-3xl"
      : "text-3xl md:text-4xl lg:text-5xl";

  // ── Fade-in animation ──────────────────────────────────────────────
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

  // Nothing to render if both heading and body are empty
  if (!heading && !body) return null;

  const HeadingTag = headingSize === "h3" ? "h3" : "h2";

  return (
    <section
      ref={sectionRef}
      className={`${PADDING_MAP[padding] || PADDING_MAP.normal} ${bgClass} ${textColor}`}
      style={bgStyle}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={`${WIDTH_MAP[width] || WIDTH_MAP.normal} mx-auto px-5 ${alignClass}`}>
        {/* Heading */}
        {heading && (
          <HeadingTag
            className={`font-heading ${headingSizeClass} font-extrabold ${headingColor} mb-6 opacity-0`}
            style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          >
            {heading}
          </HeadingTag>
        )}

        {/* Body — rich text */}
        {body && (
          <div
            className={`prose prose-sm max-w-none font-heebo leading-[1.8] opacity-0 ${
              isDarkBg || textColorPref === "light"
                ? "prose-invert prose-a:text-[#B8D900]"
                : "prose-a:text-[#B8D900]"
            }`}
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
            dangerouslySetInnerHTML={richTextHtml(body)}
          />
        )}

        {/* CTA */}
        {ctaEnabled && (
          <div
            className="mt-10 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.2s forwards" : "none" }}
          >
            {ctaStyle === "link" ? (
              <button
                onClick={() => open("section_text_block")}
                className={`font-heading font-bold text-sm underline underline-offset-4 transition-colors ${
                  isDarkBg ? "text-[#B8D900] hover:text-white" : "text-[#B8D900] hover:text-[#9AB800]"
                }`}
              >
                {ctaText}
              </button>
            ) : (
              <button
                onClick={() => open("section_text_block")}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_8px_30px_rgba(184,217,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
              >
                {ctaText}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
