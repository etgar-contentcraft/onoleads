"use client";

/**
 * Map Section - Location and venue display for open day events and campus pages.
 * Shows a Google Maps embed iframe when embed_url is provided, or a styled
 * address card as a fallback. Includes a directions button, parking, and
 * transport info as pill badges. Supports an optional venue photo.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Language } from "@/lib/types/database";

interface MapSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Small icon for the location pin in the address card fallback.
 */
function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/**
 * Parking icon for the transport/parking badges.
 */
function ParkingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

/**
 * Bus icon for transport badge.
 */
function BusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M8 19v2M16 19v2M8 5V3M16 5V3" />
    </svg>
  );
}

/**
 * Car icon for parking badge.
 */
function CarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-5l2-5h14l2 5v5h-2M5 17a2 2 0 104 0m6 0a2 2 0 104 0" />
    </svg>
  );
}

export function MapSection({ content, language }: MapSectionProps) {
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "מיקום האירוע" : "Event Location");
  // Editor saves to `address` (plain key); legacy/event sections may use `address_he`.
  const address = (content.address_he as string) || (content.address as string) || "";
  const venueName = (content.venue_name_he as string) || "";
  // Editor saves to `map_url`; legacy sections may use `google_maps_url`.
  const googleMapsUrl = (content.google_maps_url as string) || (content.map_url as string) || "";
  const embedUrl = (content.embed_url as string) || "";
  const parkingInfo = (content.parking_he as string) || "";
  const transportInfo = (content.transport_he as string) || "";
  const imageUrl = (content.image_url as string) || "";

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Trigger entrance animations when section enters the viewport */
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

  if (!address && !embedUrl) return null;

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-[#f8f8f8]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "מיקום ונסיעה" : "Location & Travel"}
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

        {/* Main content block — map/card + optional venue photo */}
        <div
          className={`flex flex-col ${imageUrl ? "lg:flex-row" : ""} gap-6 lg:gap-8 opacity-0`}
          style={{ animation: inView ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
        >
          {/* Map embed OR styled address card */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {embedUrl ? (
              /* ---- Google Maps embed iframe ---- */
              <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-gray-200 bg-gray-100 aspect-[16/9] lg:aspect-auto lg:h-[420px]">
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title={heading}
                />
              </div>
            ) : (
              /* ---- Styled address card fallback ---- */
              <div className="rounded-2xl bg-white border border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8 md:p-10 flex items-start gap-5">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#B8D900]/12 flex items-center justify-center mt-0.5">
                  <LocationPinIcon className="w-7 h-7 text-[#B8D900]" />
                </div>
                <div>
                  {venueName && (
                    <p className="font-heading font-extrabold text-[#2a2628] text-xl md:text-2xl leading-snug mb-2">
                      {venueName}
                    </p>
                  )}
                  {address && (
                    <p className="font-heebo text-[#716C70] text-base leading-relaxed">
                      {address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Info card below map/card — venue name + address + directions */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#B8D900]/12 flex items-center justify-center mt-0.5">
                  <LocationPinIcon className="w-5 h-5 text-[#B8D900]" />
                </div>
                <div>
                  {venueName && (
                    <p className="font-heading font-bold text-[#2a2628] text-base leading-snug">
                      {venueName}
                    </p>
                  )}
                  {address && (
                    <p className="font-heebo text-[#716C70] text-sm mt-0.5 leading-relaxed">
                      {address}
                    </p>
                  )}
                </div>
              </div>

              {/* Directions CTA button */}
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 shrink-0 px-6 py-3 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-sm transition-all duration-300 hover:bg-[#B8D900] hover:text-[#2a2628] hover:shadow-[0_0_30px_rgba(184,217,0,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  {isRtl ? "קבל הוראות הגעה" : "Get Directions"}
                  <svg
                    className="w-3.5 h-3.5 opacity-60 -rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>

            {/* Parking and transport badges */}
            {(parkingInfo || transportInfo) && (
              <div className="flex flex-wrap gap-3">
                {parkingInfo && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-[#B8D900]/12 flex items-center justify-center">
                      <CarIcon className="w-4 h-4 text-[#B8D900]" />
                    </span>
                    <span className="font-heebo text-[#2a2628] text-sm leading-snug">{parkingInfo}</span>
                  </div>
                )}
                {transportInfo && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-[#B8D900]/12 flex items-center justify-center">
                      <BusIcon className="w-4 h-4 text-[#B8D900]" />
                    </span>
                    <span className="font-heebo text-[#2a2628] text-sm leading-snug">{transportInfo}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional venue photo — shown beside the map on large screens */}
          {imageUrl && (
            <div className="lg:w-72 xl:w-80 shrink-0">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.10)] border border-gray-200 h-64 lg:h-full min-h-[280px]">
                <Image
                  src={imageUrl}
                  alt={venueName || heading}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 320px"
                  quality={80}
                />
              </div>
              {/* Venue name caption below photo */}
              {venueName && (
                <p className="mt-3 font-heebo text-[#716C70] text-xs text-center">
                  {venueName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom decorative line */}
        <div
          className="mt-10 flex items-center justify-center gap-4 opacity-0"
          style={{ animation: inView ? "fade-in-up 0.5s ease-out 0.4s forwards" : "none" }}
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#B8D900]/30 to-transparent max-w-xs" />
          <div className="w-2 h-2 rounded-full bg-[#B8D900]/40" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#B8D900]/30 to-transparent max-w-xs" />
        </div>
      </div>
    </section>
  );
}
