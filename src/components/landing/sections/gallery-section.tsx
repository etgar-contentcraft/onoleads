"use client";

/**
 * Gallery Section - Responsive photo grid with a full-screen lightbox.
 * Supports "grid", "masonry", and "scroll" layout hints (grid is default).
 * Lightbox handles keyboard navigation (ArrowLeft/Right/Escape) and
 * prev/next buttons. Images are lazy-loaded for performance.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { extractYoutubeId } from "@/lib/utils/youtube";

interface GalleryImage {
  url: string;
  alt_he?: string;
  caption_he?: string;
  video_url?: string;
}

interface GallerySectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Full-screen lightbox overlay.
 * @param images - All images in the gallery
 * @param index - Currently displayed image index
 * @param onClose - Callback to close the lightbox
 * @param onPrev - Callback to navigate to previous image
 * @param onNext - Callback to navigate to next image
 */
function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
  language = "he",
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  language?: Language;
}) {
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const isRtl = language === "he" || language === "ar";

  /* Keyboard navigation inside the lightbox
   * ArrowRight = "next" in LTR, "prev" in RTL (follow reading direction) */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { isRtl ? onPrev() : onNext(); }
      if (e.key === "ArrowLeft") { isRtl ? onNext() : onPrev(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext, isRtl]);

  /* Lock body scroll while lightbox is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={language === "he" || language === "ar" ? "תמונה מוגדלת" : "Enlarged image"}
    >
      {/* Close button — end-4 respects dir so it sits top-right in LTR, top-left in RTL */}
      <button
        onClick={onClose}
        className="absolute top-4 end-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label={isRtl ? "סגור" : "Close"}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-heebo">
        {index + 1} / {images.length}
      </div>

      {/* Prev arrow — start-4 places it at the "start" side of reading direction */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute start-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          aria-label={isRtl ? "תמונה קודמת" : "Previous image"}
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      )}

      {/* Next arrow — end-4 places it at the "end" side of reading direction */}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute end-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          aria-label={isRtl ? "תמונה הבאה" : "Next image"}
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
          </svg>
        </button>
      )}

      {/* Main image or YouTube video */}
      <div className="relative w-full h-full flex flex-col items-center justify-center px-20 py-16 animate-scale-in">
        {(() => {
          const videoId = current.video_url ? extractYoutubeId(current.video_url) : "";
          if (videoId) {
            return (
              <div className="relative w-full max-w-5xl" style={{ height: "80vh" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title={current.alt_he || "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full rounded-lg shadow-2xl"
                />
              </div>
            );
          }
          return (
            <div className="relative w-full max-w-5xl" style={{ height: "80vh" }}>
              <Image
                src={current.url}
                alt={current.alt_he || ""}
                fill
                className="object-contain rounded-lg shadow-2xl"
                sizes="90vw"
                quality={85}
              />
            </div>
          );
        })()}
        {/* Caption */}
        {current.caption_he && (
          <p className="mt-5 text-white/70 text-sm font-heebo text-center max-w-xl">
            {current.caption_he}
          </p>
        )}
      </div>

      {/* Thumbnail strip at the bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
        {images.map((img, i) => {
          const thumbVideoId = img.video_url ? extractYoutubeId(img.video_url) : "";
          const thumbSrc = thumbVideoId
            ? `https://img.youtube.com/vi/${thumbVideoId}/hqdefault.jpg`
            : img.url;
          return (
            <button
              key={i}
              onClick={() => {
                if (i < index) for (let j = 0; j < index - i; j++) onPrev();
                else for (let j = 0; j < i - index; j++) onNext();
              }}
              className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === index ? "border-[#B8D900] opacity-100 scale-110" : "border-transparent opacity-50 hover:opacity-80"
              }`}
              aria-label={`תמונה ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * An individual gallery tile with hover overlay and zoom icon.
 * @param image - The image data object
 * @param onClick - Called when the tile is clicked to open the lightbox
 * @param animationDelay - Stagger delay in seconds for entrance animation
 * @param inView - Whether the parent section is in the viewport
 */
function GalleryTile({
  image,
  onClick,
  animationDelay,
  inView,
}: {
  image: GalleryImage;
  onClick: () => void;
  animationDelay: number;
  inView: boolean;
}) {
  const videoId = image.video_url ? extractYoutubeId(image.video_url) : "";
  const isVideo = !!videoId;
  /* For video items, use YouTube thumbnail; otherwise fall back to image URL */
  const thumbnailSrc = isVideo
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : image.url;

  /* Skip items that have neither an image nor a valid video */
  if (!thumbnailSrc) return null;

  return (
    <button
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-2xl bg-white/80 aspect-[4/3] opacity-0 border border-gray-100/80 card-premium gradient-border-green focus-visible:ring-2 focus-visible:ring-[#B8D900] focus-visible:ring-offset-2"
      style={{
        animation: inView
          ? `slide-up-spring 0.55s var(--ease-out-expo) ${animationDelay}s forwards`
          : "none",
      }}
      aria-label={image.alt_he || (isVideo ? "הפעל סרטון" : "פתח תמונה")}
    >
      {isVideo ? (
        /* YouTube thumbnail via plain img to avoid Next.js Image domain config */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumbnailSrc}
          alt={image.alt_he || ""}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <Image
          src={thumbnailSrc}
          alt={image.alt_he || ""}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={80}
        />
      )}

      {/* Play button overlay for video items */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        {!isVideo && (
          /* Zoom icon — only for image tiles, video tiles already have the play button */
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6" />
            </svg>
          </div>
        )}
      </div>

      {/* Caption strip */}
      {image.caption_he && (
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="font-heebo text-white text-xs leading-snug line-clamp-2 drop-shadow">
            {image.caption_he}
          </p>
        </div>
      )}
    </button>
  );
}

export function GallerySection({ content, language }: GallerySectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    "";
  /* Filter out items that have neither an image URL nor a valid video URL */
  const images = ((content.images as GalleryImage[]) || []).filter(
    (img) => img.url || (img.video_url && extractYoutubeId(img.video_url))
  );
  const layout = (content.layout as string) || "grid";

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Open the lightbox at the given index */
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  /* Navigate the lightbox without allowing out-of-bounds */
  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null && prev < images.length - 1 ? prev + 1 : prev
    );
  }, [images.length]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  /* Trigger entrance animations when section comes into view */
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

  if (images.length === 0) return null;

  /* Grid class varies by layout hint */
  const gridClass =
    layout === "scroll"
      ? "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-mesh-warm" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        {heading && (
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-3 mb-5 opacity-0"
              style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) forwards" : "none" }}
            >
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
              <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo border border-[#B8D900]/20">
                {isRtl ? "גלריית תמונות" : "Gallery"}
              </span>
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            </div>
            <h2
              className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
              style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards" : "none" }}
            >
              {heading}
            </h2>
          </div>
        )}

        {/* Image grid / scroll strip */}
        <div className={gridClass}>
          {images.map((img, i) => (
            <div
              key={i}
              className={layout === "scroll" ? "snap-start shrink-0 w-72 sm:w-80" : ""}
            >
              <GalleryTile
                image={img}
                onClick={() => openLightbox(i)}
                animationDelay={0.05 * i}
                inView={inView}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox overlay rendered outside the grid container */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
          language={language}
        />
      )}
    </section>
  );
}
