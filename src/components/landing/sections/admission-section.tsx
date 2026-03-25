"use client";

/**
 * Admission Section - Displays admission requirements in two modes:
 * 1. Multi-track: cards side-by-side with icons, badges, and checkmark lists.
 * 2. Single-track: elegant decorated list with a styled left/right border.
 * Includes a CTA button wired to the shared CTA modal context.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

// ---- Icon identifiers supported per track ----
type TrackIcon = "star" | "check" | "award" | "shield";

interface AdmissionTrack {
  title_he: string;
  icon?: TrackIcon;
  badge_he?: string;
  requirements: string[];
  note_he?: string;
}

interface AdmissionSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/** Delay (seconds) added per card to stagger entrance animations */
const CARD_STAGGER_DELAY = 0.12;

/**
 * Returns an SVG icon element for the given track icon identifier.
 * @param icon - The icon key from the track definition
 */
function TrackIconSvg({ icon }: { icon?: TrackIcon }) {
  const cls = "w-6 h-6 text-[#B8D900]";
  switch (icon) {
    case "star":
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case "award":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 4H8a4 4 0 00-4 4v1a7 7 0 0012 4.9A7 7 0 0020 9V8a4 4 0 00-4-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m-4 0h8" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
  }
}

/**
 * A single track card shown in multi-track mode.
 * Highlighted with a green border when it carries a badge.
 */
function TrackCard({
  track,
  index,
  inView,
}: {
  track: AdmissionTrack;
  index: number;
  inView: boolean;
}) {
  const isRecommended = Boolean(track.badge_he);

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:shadow-[0_12px_50px_rgba(0,0,0,0.10)] opacity-0 ${
        isRecommended
          ? "bg-white border-2 border-[#B8D900] shadow-[0_4px_30px_rgba(184,217,0,0.12)]"
          : "bg-white border border-gray-200 shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:border-[#B8D900]/30"
      }`}
      style={{
        animation: inView
          ? `fade-in-up 0.6s ease-out ${index * CARD_STAGGER_DELAY}s forwards`
          : "none",
      }}
    >
      {/* Recommended badge */}
      {track.badge_he && (
        <div className="absolute -top-3.5 right-6">
          <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-xs shadow-sm">
            {track.badge_he}
          </span>
        </div>
      )}

      {/* Icon + title row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-[#B8D900]/12 flex items-center justify-center shrink-0">
          <TrackIconSvg icon={track.icon} />
        </div>
        <h3 className="font-heading font-bold text-[#2a2628] text-lg leading-snug">
          {track.title_he}
        </h3>
      </div>

      {/* Requirements list */}
      <ul className="space-y-3 flex-1">
        {track.requirements.map((req, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#B8D900]/15 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-[#B8D900]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="font-heebo text-[#2a2628] text-sm leading-relaxed">{req}</span>
          </li>
        ))}
      </ul>

      {/* Optional bottom note */}
      {track.note_he && (
        <p className="mt-5 pt-4 border-t border-gray-100 font-heebo text-xs text-[#716C70] leading-relaxed">
          {track.note_he}
        </p>
      )}
    </div>
  );
}

export function AdmissionSection({ content, language }: AdmissionSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "תנאי קבלה" : "Admission Requirements");

  const tracks = (content.tracks as AdmissionTrack[]) || null;
  const singleRequirements = (content.requirements as string[]) || [];
  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "קבלו מידע על תנאי הקבלה" : "Get Admission Info");

  const isMultiTrack = tracks && tracks.length > 0;

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Trigger entrance animation once section scrolls into view */
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
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!isMultiTrack && singleRequirements.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-[#f8f8f8]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "קבלה ללימודים" : "Admissions"}
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

        {isMultiTrack ? (
          /* ---- Multi-track: responsive card grid ---- */
          <div
            className={`grid gap-6 ${
              tracks.length === 2
                ? "md:grid-cols-2"
                : tracks.length >= 3
                ? "md:grid-cols-2 lg:grid-cols-3"
                : ""
            }`}
          >
            {tracks.map((track, i) => (
              <TrackCard key={i} track={track} index={i} inView={inView} />
            ))}
          </div>
        ) : (
          /* ---- Single-track: elegant decorated list ---- */
          <div
            className="max-w-2xl mx-auto opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.15s forwards" : "none" }}
          >
            <div
              className={`bg-white rounded-2xl p-8 md:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100 ${
                isRtl ? "border-r-4 border-r-[#B8D900]" : "border-l-4 border-l-[#B8D900]"
              }`}
            >
              <ul className="space-y-5">
                {singleRequirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-4">
                    {/* Numbered step circle */}
                    <span className="shrink-0 w-8 h-8 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm flex items-center justify-center shadow-sm">
                      {i + 1}
                    </span>
                    <span className="font-heebo text-[#2a2628] text-base leading-relaxed pt-0.5">
                      {req}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA button */}
        {ctaText && (
          <div
            className="mt-12 text-center opacity-0"
            style={{
              animation: inView
                ? `fade-in-up 0.6s ease-out ${isMultiTrack ? tracks!.length * CARD_STAGGER_DELAY + 0.1 : 0.3}s forwards`
                : "none",
            }}
          >
            <button
              onClick={open}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#2a2628] text-white font-heading font-bold text-lg transition-all duration-300 hover:bg-[#B8D900] hover:text-[#2a2628] hover:shadow-[0_0_40px_rgba(184,217,0,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {ctaText}
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
