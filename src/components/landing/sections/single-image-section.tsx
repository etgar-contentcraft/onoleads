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

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

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

  /* Bail out cleanly when no image is configured — keeps the page from
     showing an empty white block while the editor sets up the section. */
  if (!imageUrl.trim()) return null;

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
          {/* The image itself.
              Uses next/image with `unoptimized` so admins can paste any URL
              (including non-whitelisted external hosts) without configuring
              next.config.js. The width/height defaults are large enough that
              the actual rendered size is controlled by the parent's max-width. */}
          <div
            className={`relative overflow-hidden ${rounded ? "rounded-2xl" : ""} ${
              shadow ? "shadow-[0_8px_30px_rgba(0,0,0,0.08)]" : ""
            }`}
          >
            <Image
              src={imageUrl}
              alt={altText}
              width={1600}
              height={900}
              className="w-full h-auto"
              unoptimized
              priority={false}
            />
          </div>

          {caption && (
            <figcaption className="mt-4 text-center text-sm text-[#716C70] font-heebo leading-relaxed">
              {caption}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
