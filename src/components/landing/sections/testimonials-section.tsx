"use client";

/**
 * Testimonials Section - Card carousel/slider with photo circles,
 * star ratings, quotation marks, and smooth horizontal scrolling.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";

interface Testimonial {
  name: string;
  role_he: string;
  role_en?: string;
  role_ar?: string;
  quote_he: string;
  quote_en?: string;
  quote_ar?: string;
  image_url?: string;
  image?: string;
  rating?: number;
}

interface TestimonialsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Number of stars per rating */
const MAX_STARS = 5;

/**
 * Renders 5 star icons (filled or empty)
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: MAX_STARS }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-[#B8D900]" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection({ content, language }: TestimonialsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "מה אומרים הסטודנטים שלנו" : "What our students say");
  const items: Testimonial[] = (content.items as Testimonial[]) || [];

  const [inView, setInView] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---- Intersection observer for entrance animation ---- */
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

  /* ---- Scroll to active card in carousel ---- */
  const scrollToCard = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("[data-card]");
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    setActiveIndex(index);
  }, []);

  /* ---- Track scroll position to update active dot ---- */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || items.length <= 1) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.scrollWidth / items.length;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, items.length - 1));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items.length]);

  if (items.length === 0) return null;

  const showCarousel = items.length > 2;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-[#fafafa]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "המלצות" : "Testimonials"}
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

        {showCarousel ? (
          /* ---- Horizontal scroll carousel ---- */
          <>
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-5 px-5 opacity-0"
              style={{
                animation: inView ? "fade-in-up 0.6s ease-out 0.2s forwards" : "none",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {items.map((item, index) => (
                <TestimonialCard
                  key={index}
                  item={item}
                  language={language}
                  isRtl={isRtl}
                  className="snap-center shrink-0 w-[85vw] sm:w-[400px] md:w-[420px]"
                />
              ))}
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToCard(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === activeIndex
                      ? "w-8 h-2.5 bg-[#B8D900]"
                      : "w-2.5 h-2.5 bg-gray-300 hover:bg-[#B8D900]/50"
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          /* ---- Static grid for 1-2 items ---- */
          <div className={`grid gap-6 md:gap-8 ${items.length === 1 ? "max-w-xl mx-auto" : "md:grid-cols-2"}`}>
            {items.map((item, index) => (
              <TestimonialCard
                key={index}
                item={item}
                language={language}
                isRtl={isRtl}
                className="opacity-0"
                style={{ animation: inView ? `fade-in-up 0.6s ease-out ${0.15 + index * 0.12}s forwards` : "none" }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---- Individual testimonial card ---- */
function TestimonialCard({
  item,
  language,
  isRtl,
  className = "",
  style,
}: {
  item: Testimonial;
  language: Language;
  isRtl: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const quote = (item[`quote_${language}` as keyof Testimonial] as string) || item.quote_he || "";
  const role = (item[`role_${language}` as keyof Testimonial] as string) || item.role_he || "";
  const imageUrl = item.image_url || item.image || "";
  const rating = item.rating || MAX_STARS;

  return (
    <div
      data-card
      className={`relative bg-white rounded-2xl p-7 md:p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_12px_50px_rgba(0,0,0,0.08)] hover:border-[#B8D900]/20 transition-all duration-300 ${className}`}
      style={style}
    >
      {/* Green quote mark */}
      <div className="mb-4">
        <svg className="w-10 h-10 text-[#B8D900] opacity-25" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>

      {/* Star rating */}
      <div className="mb-4">
        <StarRating rating={rating} />
      </div>

      {/* Quote text */}
      <p className="font-heebo text-[#2a2628] text-base md:text-lg leading-[1.8] mb-6">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Author info */}
      <div className="flex items-center gap-4 pt-5 border-t border-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#B8D900]/20 shadow-sm"
            sizes="56px"
            quality={75}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B8D900] to-[#9ab800] flex items-center justify-center text-[#2a2628] font-heading font-bold text-xl shadow-sm">
            {item.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-heading font-bold text-[#2a2628] text-base">{item.name}</p>
          <p className="font-heebo text-sm text-[#716C70]">{role}</p>
        </div>
      </div>
    </div>
  );
}
