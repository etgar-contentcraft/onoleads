"use client";

/**
 * CTA Section - Clean, minimal call-to-action with a large heading,
 * short description, one primary button (opens CTA modal), and phone link.
 * No inline form - all leads go through the modal.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";
import { extractYoutubeId, DEFAULT_OVERLAY_OPACITY } from "@/lib/utils/youtube";
import { richTextHtml } from "@/lib/rich-text/render";

interface CtaSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function CtaSection({ content, language }: CtaSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  /* ---- Content fields ----
   * Language-aware fallback chain:
   *   1. Field for the requested language (heading_en on an English page)
   *   2. ONLY if requested language is Hebrew, fall back to heading_he
   *      (English / Arabic pages must NEVER show Hebrew copy as a fallback —
   *      see v0.8.0 Hebrew-leak fixes for benefits/info-bar sections)
   *   3. Hardcoded language-appropriate default
   */
  const lang = language;
  const headingDefault = lang === "en" ? "Ready to start?" : lang === "ar" ? "مستعد للبدء؟" : "מוכנים להתחיל?";
  const descriptionDefault = lang === "en" ? "Leave your details and an academic advisor will get back to you" : lang === "ar" ? "اترك تفاصيلك وسيعاود مستشار أكاديمي الاتصال بك" : "השאירו פרטים ויועץ לימודים יחזור אליכם";
  const buttonDefault = lang === "en" ? "Get info" : lang === "ar" ? "للمزيد من المعلومات" : "לפרטים נוספים";

  const heading =
    (content[`heading_${lang}`] as string) ||
    (content.heading_he as string) ||
    headingDefault;
  const description =
    (content[`description_${lang}`] as string) ||
    (content.description_he as string) ||
    descriptionDefault;
  const buttonText =
    (content[`button_text_${lang}`] as string) ||
    (content.button_text_he as string) ||
    buttonDefault;
  const phone = (content.phone as string) || "*2899";
  const ctaEnabled = content.cta_enabled !== false;
  const bgImage = (content.background_image_url as string) || "";
  const bgVideo = (content.background_video_url as string) || "";
  const overlayOpacity = ((content.background_overlay_opacity as number) ?? DEFAULT_OVERLAY_OPACITY) / 100;
  const youtubeId = extractYoutubeId(bgVideo);

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
      {/* Background — default warm mesh gradient, or custom image/video */}
      <div className="absolute inset-0 bg-mesh-warm overflow-hidden">
        {/* YouTube background video */}
        {youtubeId && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              width: "max(100%, calc(100vh * 16 / 9))",
              height: "max(100%, calc(100vw * 9 / 16))",
              transform: "translate(-50%, -50%)",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              tabIndex={-1}
              aria-hidden="true"
              title="Background video"
            />
          </div>
        )}
        {/* Background image (poster for video or standalone) */}
        {bgImage && (
          <Image src={bgImage} alt="" fill className={`object-cover ${youtubeId ? "-z-10" : ""}`} sizes="100vw" quality={80} />
        )}
        {/* Dynamic overlay when media is present */}
        {(bgImage || youtubeId) && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(42,38,40,${overlayOpacity})` }} />
        )}
      </div>

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          style={{
            backgroundImage: `radial-gradient(circle, rgba(184,217,0,0.4) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#B8D900]/5 blur-[100px]" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#B8D900]/5 blur-[100px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        {/* Badge pill */}
        <div
          className="inline-flex items-center gap-3 mb-5 opacity-0"
          style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) forwards" : "none" }}
        >
          <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold font-heebo ${bgImage || youtubeId ? "bg-white/10 text-white/90 border border-white/20" : "bg-[#B8D900]/10 text-[#2a2628] border border-[#B8D900]/20"}`}>
            {language === "ar" ? "ابدأ الآن" : language === "he" ? "הרשמה" : "Apply Now"}
          </span>
          <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
        </div>

        {/* Heading — white text when custom media is set, dark text on default */}
        <h2
          className={`font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 opacity-0 ${bgImage || youtubeId ? "text-white" : "text-[#2a2628]"}`}
          style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards" : "none" }}
        >
          {heading}
        </h2>

        {/* Description */}
        {description && (
          <div
            className={`prose prose-sm max-w-none font-heebo text-lg md:text-xl mb-10 max-w-xl mx-auto opacity-0 prose-headings:font-heading prose-a:underline ${bgImage || youtubeId ? "text-white/70 prose-headings:text-white prose-a:text-white" : "text-[#2a2628]/60 prose-headings:text-[#2a2628] prose-a:text-[#B8D900]"}`}
            style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) 0.2s forwards" : "none" }}
            dangerouslySetInnerHTML={richTextHtml(description)}
          />
        )}

        {/* Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0"
          style={{ animation: inView ? "slide-up-spring 0.6s var(--ease-out-expo) 0.3s forwards" : "none" }}
        >
          {/* Primary CTA - opens modal */}
          {ctaEnabled && buttonText && (
            <button
              onClick={() => open("section_cta")}
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[var(--shadow-green-lg)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {buttonText}
              <svg className={`w-5 h-5 transition-transform ${isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"} />
              </svg>
            </button>
          )}

          {/* Phone link */}
          {phone && (
            <a
              href={`tel:${phone}`}
              className={`inline-flex items-center justify-center gap-2.5 px-8 py-5 rounded-2xl backdrop-blur-md font-heading font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                bgImage || youtubeId
                  ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                  : "bg-white/80 border border-gray-100/80 text-[#2a2628] card-premium"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {isRtl ? `או התקשרו: ${phone}` : phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
