"use client";

/**
 * Single Image Section — one full-width image with an optional caption.
 *
 * Deliberately minimal: no heading, no CTA, no arrow/lightbox. Editors who
 * want a richer image presentation should use the Gallery section instead.
 *
 * Multiple Single Image sections can coexist on the same page — each one is
 * a separate `page_sections` row, so editors can drop one in between any
 * two other sections to break up long copy with a visual.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { MediaBlock } from "@/components/landing/media-block";

interface SingleImageSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function SingleImageSection({ content, language }: SingleImageSectionProps) {
  const isRtl = language === "he" || language === "ar";

  /* Image URL — required. We render nothing if missing so the editor can save
     a half-finished section without breaking the page. */
  const imageUrl = (content.image_url as string) || "";

  /* Per-language caption with Hebrew fallback (matches every other section) */
  const caption =
    (content[`caption_${language}`] as string) ||
    (content.caption_he as string) ||
    "";

  /* Alt text for accessibility — defaults to caption when not set explicitly */
  const altText = (content.alt_text as string) || caption || "";

  /* Layout knobs (all optional with sensible defaults) */
  const maxWidth = (content.max_width as number) || 1100; // px — caps very wide images
  const rounded = content.rounded !== false; // default: true
  const shadow = content.shadow !== false;   // default: true
  const paddingY = (content.padding_y as number) || 48; // px — vertical breathing room

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* YouTube video URL — optional. When set, MediaBlock renders a 16:9
     responsive iframe instead of the static image. */
  const videoUrl = (content.video_url as string) || "";

  /* Bail out cleanly when no media is configured — keeps the page from
     showing an empty white block while the editor sets up the section. */
  if (!imageUrl.trim() && !videoUrl.trim()) return null;

  return (
    <section
      ref={sectionRef}
      className="bg-white"
      style={{ paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto px-5" style={{ maxWidth: `${maxWidth}px` }}>
        <figure
          className="opacity-0"
          style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
        >
          {/* Renders a YouTube 16:9 iframe when video_url is set,
              otherwise a static next/image. MediaBlock handles both cases. */}
          <MediaBlock
            video_url={videoUrl}
            image_url={imageUrl}
            alt={altText}
            className={`${shadow ? "shadow-[0_8px_30px_rgba(0,0,0,0.08)]" : ""}`}
            rounded={rounded ? "2xl" : "none"}
          />

          {caption && (
            <figcaption className="mt-4 text-center text-sm text-[#5A5658] font-heebo leading-relaxed">
              {caption}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
