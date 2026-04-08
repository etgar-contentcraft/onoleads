"use client";

/**
 * Rich event sections — reusable presentation components that render the
 * structured content stored inside `EventMeta` (speakers, schedule, highlights,
 * FAQ, testimonials, gallery, featured programs, capacity counter, intro video,
 * registration info).
 *
 * These sections are consumed by:
 *   - The `open_day` thank-you layout (shown after form submission)
 *   - The landing-page event section (shown on the event landing page itself)
 *
 * Every section is a pure presentation component: it only renders when the
 * corresponding array/field is populated, and falls back to `null` otherwise.
 * This keeps sparse events clean and rich events spectacular.
 *
 * Styling notes:
 *   - Dark theme: `variant="dark"` uses white text on translucent bg,
 *     tuned for the thank-you page's dark hero.
 *   - Light theme: `variant="light"` uses dark text on white, tuned for
 *     embedding into a landing page section.
 *   - `accent` drives borders, icons, and primary colour. Pass the brand
 *     green (#B8D900), orange (#FF6B35), or any hex.
 */

import { useState } from "react";
import type {
  EventSpeaker,
  EventScheduleItem,
  EventHighlight,
  EventFaqItem,
  EventTestimonial,
  EventGalleryImage,
  EventBadge,
} from "@/lib/types/events";

/** Visual variant — dark (for thank-you hero) or light (for landing pages). */
export type RichSectionVariant = "dark" | "light";

/** Shared theme tokens derived from the variant. */
function theme(variant: RichSectionVariant) {
  if (variant === "dark") {
    return {
      card: "bg-white/5 border border-white/10",
      text: "text-white",
      mutedText: "text-white/70",
      dimText: "text-white/50",
      divider: "border-white/10",
      sectionTitle: "text-white",
      titleTint: "text-white/90",
    };
  }
  return {
    card: "bg-white border border-gray-200",
    text: "text-gray-900",
    mutedText: "text-gray-600",
    dimText: "text-gray-500",
    divider: "border-gray-200",
    sectionTitle: "text-gray-900",
    titleTint: "text-gray-800",
  };
}

/** A compact section heading with an accent underline. */
function SectionHeading({
  title,
  subtitle,
  accent,
  variant,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  variant: RichSectionVariant;
}) {
  const t = theme(variant);
  return (
    <div className="text-center mb-8">
      <div
        className="inline-block px-4 py-1 text-[10px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-3"
        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
      >
        {title}
      </div>
      {subtitle && (
        <h3 className={`text-xl md:text-2xl font-extrabold ${t.titleTint}`}>{subtitle}</h3>
      )}
    </div>
  );
}

// ─── Intro video ──────────────────────────────────────────────────────

/**
 * Hero intro video — embeds YouTube, Vimeo, or a raw MP4 file.
 * Returns null if the url isn't recognised.
 */
export function EventIntroVideo({
  url,
  variant,
  accent,
  title,
}: {
  url?: string;
  variant: RichSectionVariant;
  accent: string;
  title: string;
}) {
  if (!url) return null;
  const embed = toEmbedUrl(url);
  if (!embed) return null;

  return (
    <div className="mb-10">
      <SectionHeading title={title} accent={accent} variant={variant} />
      <div
        className={`rounded-2xl overflow-hidden aspect-video ${variant === "dark" ? "border border-white/10" : "border border-gray-200 shadow-xl"}`}
      >
        {embed.type === "iframe" ? (
          <iframe
            src={embed.src}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={embed.src} controls className="w-full h-full" />
        )}
      </div>
    </div>
  );
}

/** Map any common video URL to a YouTube/Vimeo embed or a raw video src. */
function toEmbedUrl(url: string): { type: "iframe" | "video"; src: string } | null {
  // YouTube (youtube.com/watch?v=ID and youtu.be/ID)
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  // Raw video (mp4/webm/mov)
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return { type: "video", src: url };
  return null;
}

// ─── Capacity counter ─────────────────────────────────────────────────

/**
 * "42 / 100 registered" progress bar. Only renders when capacity is set.
 * registered_count may be undefined/0 — still shows "0 / 100".
 */
export function EventCapacityCounter({
  capacity,
  registered,
  variant,
  accent,
  labels,
}: {
  capacity?: number;
  registered?: number;
  variant: RichSectionVariant;
  accent: string;
  labels: {
    title: string;
    seats: string;
    almostFull: string;
  };
}) {
  if (!capacity || capacity <= 0) return null;
  const current = Math.max(0, registered || 0);
  const pct = Math.min(100, Math.round((current / capacity) * 100));
  const almostFull = pct >= 80;
  const t = theme(variant);

  return (
    <div
      className={`rounded-2xl p-5 mb-8 ${variant === "dark" ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs uppercase tracking-widest font-bold ${t.mutedText}`}>
          {labels.title}
        </span>
        <span className={`text-sm font-black ${t.text}`} style={{ color: accent }}>
          {current} / {capacity}
        </span>
      </div>
      <div
        className={`h-2 rounded-full overflow-hidden ${variant === "dark" ? "bg-white/10" : "bg-gray-100"}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
          }}
        />
      </div>
      <div className={`mt-2 text-xs ${t.mutedText} flex items-center justify-between`}>
        <span>
          {capacity - current} {labels.seats}
        </span>
        {almostFull && (
          <span className="font-bold" style={{ color: accent }}>
            ⚡ {labels.almostFull}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Highlights grid ──────────────────────────────────────────────────

/** Icon emoji lookup for EventHighlight icon keys. */
const HIGHLIGHT_ICONS: Record<string, string> = {
  sparkles: "✨",
  gift: "🎁",
  users: "👥",
  map: "🗺️",
  star: "⭐",
  award: "🏆",
  clock: "⏰",
  heart: "❤️",
};

export function EventHighlights({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventHighlight[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-5 ${t.card} transition-transform hover:-translate-y-1`}
            style={{ borderTop: `3px solid ${accent}` }}
          >
            <div className="text-3xl mb-2">{HIGHLIGHT_ICONS[item.icon || "sparkles"] || "✨"}</div>
            <h4 className={`font-extrabold text-base mb-1 ${t.text}`}>{item.title}</h4>
            {item.description && (
              <p className={`text-sm ${t.mutedText} leading-relaxed`}>{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Schedule timeline ────────────────────────────────────────────────

/** Emoji icon for timeline entries. */
const SCHEDULE_ICONS: Record<string, string> = {
  checkin: "📋",
  talk: "🎤",
  workshop: "🛠️",
  tour: "🚶",
  break: "☕",
  meal: "🍽️",
  network: "🤝",
};

export function EventSchedule({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventScheduleItem[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="relative mx-auto max-w-2xl">
        {/* Vertical spine */}
        <div
          className={`absolute top-4 bottom-4 w-0.5 ${variant === "dark" ? "bg-white/10" : "bg-gray-200"}`}
          style={{ insetInlineStart: "1.25rem" }}
        />
        <ol className="space-y-4">
          {items.map((item, idx) => (
            <li key={idx} className="relative ps-14">
              {/* Icon bubble */}
              <div
                className="absolute top-0 flex items-center justify-center w-10 h-10 rounded-full text-base font-bold"
                style={{
                  insetInlineStart: 0,
                  background: `${accent}22`,
                  color: accent,
                  border: `2px solid ${accent}55`,
                }}
              >
                {SCHEDULE_ICONS[item.icon || "talk"] || "🎤"}
              </div>
              <div className={`rounded-xl p-4 ${t.card}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h4 className={`font-bold ${t.text}`}>{item.title}</h4>
                  <span
                    className="text-xs font-black tabular-nums px-2 py-0.5 rounded"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {item.time}
                  </span>
                </div>
                {item.description && (
                  <p className={`text-sm ${t.mutedText}`}>{item.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Speakers carousel / grid ─────────────────────────────────────────

export function EventSpeakers({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventSpeaker[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((speaker, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-5 text-center ${t.card} transition-transform hover:-translate-y-1`}
          >
            {speaker.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.image_url}
                alt={speaker.name}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
                style={{ border: `3px solid ${accent}55` }}
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-black"
                style={{
                  background: `${accent}22`,
                  color: accent,
                  border: `3px solid ${accent}55`,
                }}
              >
                {speaker.name.charAt(0)}
              </div>
            )}
            <h4 className={`font-extrabold text-base ${t.text}`}>{speaker.name}</h4>
            {speaker.role && (
              <p className="text-xs font-semibold mt-0.5" style={{ color: accent }}>
                {speaker.role}
              </p>
            )}
            {speaker.bio && (
              <p className={`text-xs ${t.mutedText} mt-2 leading-relaxed`}>{speaker.bio}</p>
            )}
            {speaker.link_url && (
              <a
                href={speaker.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs underline"
                style={{ color: accent }}
              >
                🔗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────

export function EventFaq({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventFaqItem[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="max-w-2xl mx-auto space-y-2">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-xl overflow-hidden ${t.card}`}
              style={isOpen ? { borderColor: accent } : {}}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className={`w-full text-start px-4 py-3 flex items-center justify-between gap-3 ${t.text} font-bold text-sm`}
              >
                <span className="flex-1">{item.question}</span>
                <span
                  className="text-lg transition-transform"
                  style={{
                    color: accent,
                    transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                  }}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div
                  className={`px-4 pb-4 text-sm ${t.mutedText} leading-relaxed whitespace-pre-line`}
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────

export function EventTestimonials({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventTestimonial[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {items.map((item, idx) => (
          <div key={idx} className={`rounded-2xl p-5 ${t.card}`}>
            <div className="text-4xl mb-2" style={{ color: accent }}>
              &ldquo;
            </div>
            <p className={`text-sm ${t.text} italic leading-relaxed mb-4`}>{item.quote}</p>
            <div className="flex items-center gap-3">
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover"
                  style={{ border: `2px solid ${accent}55` }}
                />
              )}
              <div>
                <div className={`text-sm font-bold ${t.text}`}>{item.name}</div>
                {item.role && <div className={`text-xs ${t.dimText}`}>{item.role}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────

export function EventGallery({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventGalleryImage[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((img, idx) => (
          <figure
            key={idx}
            className={`group rounded-xl overflow-hidden ${t.card} aspect-[3/2] relative`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption || ""}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            {img.caption && (
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-2">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

// ─── Featured programs / partners ─────────────────────────────────────

export function EventFeaturedPrograms({
  items,
  variant,
  accent,
  title,
  subtitle,
}: {
  items?: EventBadge[];
  variant: RichSectionVariant;
  accent: string;
  title: string;
  subtitle: string;
}) {
  if (!items || items.length === 0) return null;
  const t = theme(variant);

  return (
    <div className="mb-10">
      <SectionHeading title={title} subtitle={subtitle} accent={accent} variant={variant} />
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((badge, idx) => {
          const Wrapper = badge.link_url ? "a" : "div";
          return (
            <Wrapper
              key={idx}
              {...(badge.link_url
                ? { href: badge.link_url, target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${t.card} ${badge.link_url ? "hover:scale-105 transition-transform" : ""}`}
            >
              {badge.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={badge.logo_url} alt={badge.label} className="h-6 w-auto object-contain" />
              )}
              <span className={`text-sm font-bold ${t.text}`}>{badge.label}</span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tags pills ───────────────────────────────────────────────────────

export function EventTags({
  items,
  variant,
  accent,
}: {
  items?: string[];
  variant: RichSectionVariant;
  accent: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      {items.map((tag, idx) => (
        <span
          key={idx}
          className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            background: `${accent}22`,
            color: accent,
            border: `1px solid ${accent}33`,
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
