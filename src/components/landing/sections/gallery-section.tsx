"use client";

/**
 * Gallery Section - Responsive photo grid with a full-screen lightbox.
 * Supports "grid", "masonry", and "scroll" layout hints (grid is default).
 * Lightbox handles keyboard navigation (ArrowLeft/Right/Escape) and
 * prev/next buttons. Images are lazy-loaded for performance.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Language } from "@/lib/types/database";

interface GalleryImage {
  url: string;
  alt_he?: string;
  caption_he?: string;
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
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  /* Keyboard navigation inside the lightbox */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  /* Lock body scroll while lightbox is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="תמונה מוגדלת"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="סגור"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-heebo">
        {index + 1} / {images.length}
      </div>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          aria-label="תמונה קודמת"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          aria-label="תמונה הבאה"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <div className="w-full h-full flex flex-col items-center justify-center px-20 py-16 animate-scale-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt_he || ""}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {/* Caption */}
        {current.caption_he && (
          <p className="mt-5 text-white/70 text-sm font-heebo text-center max-w-xl">
            {current.caption_he}
          </p>
        )}
      </div>

      {/* Thumbnail strip at the bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => {
              /* Navigate to clicked thumbnail — we use a custom event pattern
                 to avoid prop-drilling a generic "setIndex" into this component */
              if (i < index) for (let j = 0; j < index - i; j++) onPrev();
              else for (let j = 0; j < i - index; j++) onNext();
            }}
            className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
              i === index ? "border-[#B8D900] opacity-100 scale-110" : "border-transparent opacity-50 hover:opacity-80"
            }`}
            aria-label={`תמונה ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
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
  return (
    <button
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] opacity-0 focus-visible:ring-2 focus-visible:ring-[#B8D900] focus-visible:ring-offset-2"
      style={{
        animation: inView
          ? `fade-in-up 0.55s ease-out ${animationDelay}s forwards`
          : "none",
      }}
      aria-label={image.alt_he || "פתח תמונה"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt_he || ""}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        {/* Zoom icon */}
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6" />
          </svg>
        </div>
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
  const images = (content.images as GalleryImage[]) || [];
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
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        {heading && (
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-3 mb-5 opacity-0"
              style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
            >
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
              <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
                {isRtl ? "גלריית תמונות" : "Gallery"}
              </span>
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            </div>
            <h2
              className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
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
        />
      )}
    </section>
  );
}
