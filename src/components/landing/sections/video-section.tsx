"use client";

import { useState } from "react";
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

  const embedUrl = getEmbedUrl(videoUrl);

  if (!embedUrl) return null;

  return (
    <section className="py-16 md:py-20 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-10">
            {heading}
          </h2>
        )}

        <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.1)] bg-black aspect-video">
          {!loaded && posterUrl && (
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 z-10 group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#B8D900] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-[#2a2628] ml-1" fill="currentColor" viewBox="0 0 24 24">
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
