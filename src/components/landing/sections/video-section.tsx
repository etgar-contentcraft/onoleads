"use client";

import { useState, useEffect, useRef } from "react";
import type { Language } from "@/lib/types/database";

interface VideoSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

export function VideoSection({ content, language }: VideoSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const videoUrl = (content.video_url as string) || "";
  const posterUrl = (content.poster_url as string) || "";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const embedUrl = getEmbedUrl(videoUrl);

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

  if (!embedUrl) return null;

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        {heading && (
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              {isRtl ? "צפו בסרטון" : "Watch Video"}
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              {heading}
            </h2>
          </div>
        )}

        <div
          className="relative rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(0,0,0,0.12)] bg-[#2a2628] aspect-video opacity-0"
          style={{ animation: inView ? "scale-in 0.6s ease-out forwards" : "none" }}
        >
          {!loaded && posterUrl && (
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 z-10 group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#B8D900] flex items-center justify-center shadow-[0_0_40px_rgba(184,217,0,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(184,217,0,0.5)] transition-all duration-300">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-[#2a2628] mr-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          )}

          {(loaded || !posterUrl) && (
            <iframe
              src={embedUrl + (content.autoplay ? "&autoplay=1" : "")}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title="Video"
            />
          )}
        </div>
      </div>
    </section>
  );
}
