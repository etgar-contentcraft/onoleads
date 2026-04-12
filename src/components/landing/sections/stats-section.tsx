"use client";

/**
 * Stats Section — Premium Glass design with animated counter numbers.
 *
 * bg-mesh-warm background, card-premium glass stat cards with
 * gradient-border-green, slide-up-spring staggered entrance animations,
 * and smooth count-up counter effect.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";
import { extractYoutubeId, DEFAULT_OVERLAY_OPACITY } from "@/lib/utils/youtube";

interface StatItem {
  value: string;
  label_he: string;
  label_en?: string;
  label_ar?: string;
  suffix?: string;
}

interface StatsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Counter animation duration in ms */
const COUNTER_DURATION = 1800;
/** Counter animation step count */
const COUNTER_STEPS = 50;

/**
 * Individual stat card with animated counter — Premium Glass variant
 */
function AnimatedStat({
  item,
  language,
  inView,
  index,
  isRtl,
}: {
  item: StatItem;
  language: Language;
  inView: boolean;
  index: number;
  isRtl: boolean;
}) {
  const label =
    (item[`label_${language}` as keyof StatItem] as string) ||
    item.label_he ||
    "";
  const [displayValue, setDisplayValue] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const numeric = parseInt(item.value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setDisplayValue(item.value);
      return;
    }

    const stepTime = COUNTER_DURATION / COUNTER_STEPS;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / COUNTER_STEPS;
      const eased = 1 - Math.pow(1 - progress, 4);
      const val = Math.round(eased * numeric);
      setDisplayValue(val.toLocaleString());

      if (current >= COUNTER_STEPS) {
        clearInterval(timer);
        setDisplayValue(item.value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, item.value]);

  return (
    <div
      className="relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl bg-white/80 backdrop-blur-sm card-premium gradient-border-green shadow-[var(--shadow-card)] opacity-0 group hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300"
      style={{
        animation: inView
          ? `slide-up-spring 0.6s var(--ease-out-expo) ${0.2 + index * 0.1}s forwards`
          : "none",
      }}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r from-transparent via-[#B8D900]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Animated counter value */}
      <span className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-[#B8D900] tabular-nums leading-none mb-3">
        {displayValue}
        {item.suffix && (
          <span className="text-2xl md:text-3xl">{item.suffix}</span>
        )}
      </span>

      {/* Divider line */}
      <div className="w-10 h-0.5 bg-[#B8D900]/30 rounded-full mb-3 transition-all duration-300 group-hover:w-14 group-hover:bg-[#B8D900]/50" />

      {/* Label */}
      <span className="font-heebo text-sm md:text-base text-[#5A5658] font-medium leading-snug group-hover:text-[#2a2628] transition-colors duration-300">
        {label}
      </span>
    </div>
  );
}

export function StatsSection({ content, language }: StatsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const items: StatItem[] = Array.isArray(content.stats)
    ? (content.stats as StatItem[])
    : Array.isArray(content.items)
      ? (content.items as StatItem[])
      : [];
  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    "";
  const bgImage =
    (content.background_image_url as string) ||
    (content.background_image as string) ||
    "";
  const bgVideo = (content.background_video_url as string) || "";
  const overlayOpacity =
    ((content.background_overlay_opacity as number) ?? DEFAULT_OVERLAY_OPACITY) /
    100;
  const youtubeId = extractYoutubeId(bgVideo);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const badgeText =
    (content[`badge_text_${language}`] as string) ||
    (content.badge_text_he as string) ||
    (isRtl ? "במספרים" : "By the Numbers");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  /* Determine if we have a custom background (image or video) */
  const hasCustomBg = !!(bgImage || youtubeId);

  return (
    <section
      ref={ref}
      className={`relative py-20 md:py-28 overflow-hidden ${hasCustomBg ? "" : "bg-mesh-warm"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background layer — only rendered when image/video is provided */}
      {hasCustomBg && (
        <div className="absolute inset-0 z-0 bg-[#2a2628] overflow-hidden">
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
          {/* Background image (also serves as poster for video) */}
          {bgImage && (
            <Image
              src={bgImage}
              alt=""
              fill
              className={`object-cover ${youtubeId ? "-z-10" : ""}`}
              sizes="100vw"
              quality={80}
            />
          )}
          {/* Dynamic overlay */}
          {(bgImage || youtubeId) && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: `rgba(42,38,40,${overlayOpacity})`,
              }}
            />
          )}
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{
              animation: inView
                ? "blur-in 0.6s var(--ease-out-expo) forwards"
                : "none",
            }}
          >
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-semibold font-heebo tracking-wide ${
                hasCustomBg
                  ? "bg-white/10 text-white/90"
                  : "bg-[#B8D900]/10 text-[#2a2628]"
              }`}
            >
              {badgeText}
            </span>
            <div className="w-10 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          {heading && (
            <h2
              className={`font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold opacity-0 ${
                hasCustomBg ? "text-white" : "text-[#2a2628]"
              }`}
              style={{
                animation: inView
                  ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards"
                  : "none",
              }}
            >
              {heading}
            </h2>
          )}
        </div>

        {/* Stats grid */}
        <div
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, index) => (
            <AnimatedStat
              key={index}
              item={item}
              language={language}
              inView={inView}
              index={index}
              isRtl={isRtl}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
