"use client";

import type { Language } from "@/lib/types/database";

interface CtaSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function CtaSection({ content, language }: CtaSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const description = (content[`description_${language}`] as string) || (content.description_he as string) || "";
  const buttonText = (content[`button_text_${language}`] as string) || (content.button_text_he as string) || "";
  const buttonUrl = (content.button_url as string) || "#form";
  const bgColor = (content.bg_color as string) || "#B8D900";

  return (
    <section
      className="py-16 md:py-20 relative overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ backgroundColor: bgColor }}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 text-center">
        {heading && (
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2a2628] mb-4">
            {heading}
          </h2>
        )}

        {description && (
          <p className="text-lg text-[#2a2628]/80 mb-8 max-w-xl mx-auto">
            {description}
          </p>
        )}

        {buttonText && (
          <a
            href={buttonUrl}
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-[#4A4648] text-white font-bold text-lg transition-all duration-200 hover:bg-[#3a3638] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            {buttonText}
          </a>
        )}
      </div>
    </section>
  );
}
