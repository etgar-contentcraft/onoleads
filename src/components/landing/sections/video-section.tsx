"use client";

/**
 * Video Section - Supports YouTube playlists and single embeds.
 * Two layout modes:
 *   "featured" - large primary player on the right with a thumbnail playlist sidebar.
 *   "grid"     - equal-size video cards in a responsive grid.
 * Iframes are only rendered after the user clicks play (lazy loading).
 * All embeds use youtube-nocookie.com for privacy-enhanced mode.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Language } from "@/lib/types/database";

interface VideoItem {
  youtube_id: string;
  title_he: string;
  duration_he?: string;
  thumbnail_url?: string;
}

interface VideoSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Returns the YouTube thumbnail URL for a given video ID.
 * Uses hqdefault (always available) rather than maxresdefault (HD-only).
 * @param youtubeIdOrUrl - The 11-character YouTube video ID or any YouTube URL
 */
/**
 * Returns a thumbnail URL or null when no valid YouTube ID can be extracted.
 * Returning null prevents rendering a broken <img> element.
 */
function getThumbnailUrl(youtubeIdOrUrl: string, providedUrl?: string): string | null {
  if (providedUrl) return providedUrl;
  const id = extractYoutubeId(youtubeIdOrUrl);
  if (!id || id.length < 5) return null; // No valid ID — caller will skip the <img>
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Fallback chain: hqdefault → mqdefault → hide img (dark bg shows through) */
function handleThumbnailError(e: React.SyntheticEvent<HTMLImageElement>, youtubeIdOrUrl: string) {
  const img = e.currentTarget;
  const id = extractYoutubeId(youtubeIdOrUrl);
  const current = img.src;
  if (current.includes("hqdefault")) {
    img.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  } else {
    // All thumbnail URLs failed — hide the broken image, dark bg shows through
    img.style.display = "none";
  }
}

/**
 * Extracts an 11-character YouTube video ID from any of these formats:
 *   - Raw ID:                "dQw4w9WgXcQ"
 *   - youtube.com/watch?v=  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   - youtu.be short link:  "https://youtu.be/dQw4w9WgXcQ"
 *   - embed URL:            "https://www.youtube.com/embed/dQw4w9WgXcQ"
 * Returns the raw input unchanged when it doesn't look like a URL.
 */
function extractYoutubeId(input: string): string {
  if (!input) return "";
  // Already an 11-char ID (no slashes/dots)
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    // youtu.be/<id>
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    // /embed/<id> or /v/<id>
    const pathMatch = url.pathname.match(/\/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    // ?v=<id>
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch {
    // Not a URL — return as-is and let YouTube handle any error
  }
  return input;
}

/**
 * Builds the privacy-enhanced embed URL for a YouTube video ID or URL.
 * @param youtubeIdOrUrl - An 11-char ID or any YouTube URL format
 * @param autoplay - Whether to start the video automatically
 */
function buildEmbedUrl(youtubeIdOrUrl: string, autoplay = false): string {
  const id = extractYoutubeId(youtubeIdOrUrl);
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    ...(autoplay ? { autoplay: "1" } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/**
 * A play-button overlay shown on top of a thumbnail before the user clicks.
 * Pure CSS triangle — no SVG dependency.
 */
function PlayOverlay({ size = "lg" }: { size?: "sm" | "lg" }) {
  const outerSize = size === "lg" ? "w-20 h-20 md:w-24 md:h-24" : "w-12 h-12";
  const innerSize = size === "lg" ? "w-8 h-8 md:w-10 md:h-10" : "w-5 h-5";
  const glowClass =
    size === "lg"
      ? "shadow-[0_0_50px_rgba(184,217,0,0.4)] group-hover:shadow-[0_0_70px_rgba(184,217,0,0.6)]"
      : "shadow-[0_0_20px_rgba(184,217,0,0.3)] group-hover:shadow-[0_0_35px_rgba(184,217,0,0.5)]";

  return (
    <div
      className={`${outerSize} rounded-full bg-[#B8D900] flex items-center justify-center ${glowClass} group-hover:scale-110 transition-all duration-300`}
    >
      <svg
        className={`${innerSize} text-[#2a2628] ml-1`}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

/**
 * A standalone video card for the "grid" layout.
 * Clicking the thumbnail replaces it with the iframe embed.
 */
function VideoCard({
  video,
  index,
  inView,
}: {
  video: VideoItem;
  index: number;
  inView: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const thumbnailUrl = getThumbnailUrl(video.youtube_id, video.thumbnail_url);

  return (
    <div
      className="flex flex-col opacity-0"
      style={{
        animation: inView ? `fade-in-up 0.6s ease-out ${index * 0.1}s forwards` : "none",
      }}
    >
      {/* Video player area */}
      <div className="relative rounded-xl overflow-hidden bg-[#2a2628] aspect-video shadow-[0_4px_30px_rgba(0,0,0,0.15)]">
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 group cursor-pointer"
            aria-label={`הפעל: ${video.title_he}`}
          >
            {thumbnailUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => handleThumbnailError(e, video.youtube_id)}
              />
            )}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <PlayOverlay size="sm" />
            </div>
          </button>
        ) : (
          <iframe
            src={buildEmbedUrl(video.youtube_id, true)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title_he}
          />
        )}
      </div>

      {/* Card metadata */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="font-heading font-bold text-[#2a2628] text-sm md:text-base leading-snug line-clamp-2">
          {video.title_he}
        </h3>
        {video.duration_he && (
          <span className="shrink-0 font-heebo text-xs text-[#716C70] bg-gray-100 rounded-md px-2 py-1 mt-0.5">
            {video.duration_he}
          </span>
        )}
      </div>
    </div>
  );
}

export function VideoSection({ content, language }: VideoSectionProps) {
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    "";
  const description =
    (content[`description_${language}`] as string) ||
    (content.description_he as string) ||
    "";
  // Support both a `videos` array and a legacy single `video_url` / `youtube_id` field
  const rawVideos = (content.videos as VideoItem[]) || [];
  const singleId = (content.youtube_id as string) || (content.video_url as string) || "";
  const videos: VideoItem[] =
    rawVideos.length > 0
      ? rawVideos
      : singleId
        ? [{ youtube_id: singleId, title_he: (content.heading_he as string) || "" }]
        : [];
  const layout = (content.layout as "featured" | "grid") || "featured";

  /* Index of the currently active video in featured mode */
  const [activeIndex, setActiveIndex] = useState(0);
  /* Whether the active video's iframe is loaded */
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Reset player state when the active video changes */
  const selectVideo = useCallback((index: number) => {
    setActiveIndex(index);
    setPlaying(false);
  }, []);

  /* Trigger entrance animation once the section enters the viewport */
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

  if (videos.length === 0) return null;

  const activeVideo = videos[activeIndex];

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        {(heading || description) && (
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-3 mb-5 opacity-0"
              style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
            >
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
              <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
                {isRtl ? "סרטונים" : "Videos"}
              </span>
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            </div>
            {heading && (
              <h2
                className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
                style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
              >
                {heading}
              </h2>
            )}
            {description && (
              <p
                className="mt-4 font-heebo text-[#716C70] text-base md:text-lg leading-relaxed opacity-0"
                style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.2s forwards" : "none" }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {layout === "featured" && videos.length > 0 ? (
          /* ---- Featured layout: big player + sidebar playlist ---- */
          <div
            className="flex flex-col lg:flex-row gap-6 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.7s ease-out 0.25s forwards" : "none" }}
          >
            {/* Primary player — occupies ~65% on desktop */}
            <div className="flex-1 min-w-0">
              <div className="relative rounded-2xl overflow-hidden bg-[#2a2628] aspect-video shadow-[0_8px_60px_rgba(0,0,0,0.18)]">
                {!playing ? (
                  <button
                    onClick={() => setPlaying(true)}
                    className="absolute inset-0 group cursor-pointer"
                    aria-label={`הפעל: ${activeVideo.title_he}`}
                  >
                    {getThumbnailUrl(activeVideo.youtube_id, activeVideo.thumbnail_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getThumbnailUrl(activeVideo.youtube_id, activeVideo.thumbnail_url)!}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => handleThumbnailError(e, activeVideo.youtube_id)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center">
                      <PlayOverlay size="lg" />
                    </div>
                  </button>
                ) : (
                  <iframe
                    src={buildEmbedUrl(activeVideo.youtube_id, true)}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={activeVideo.title_he}
                  />
                )}
              </div>

              {/* Active video title + duration below player */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <h3 className="font-heading font-bold text-[#2a2628] text-lg md:text-xl leading-snug">
                  {activeVideo.title_he}
                </h3>
                {activeVideo.duration_he && (
                  <span className="shrink-0 font-heebo text-sm text-[#716C70] bg-gray-100 rounded-lg px-3 py-1 mt-0.5">
                    {activeVideo.duration_he}
                  </span>
                )}
              </div>
            </div>

            {/* Playlist sidebar — visible only when there are multiple videos */}
            {videos.length > 1 && (
              <div className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {videos.map((video, i) => (
                  <button
                    key={i}
                    onClick={() => selectVideo(i)}
                    className={`group flex items-start gap-3 p-3 rounded-xl text-start transition-all duration-200 ${
                      i === activeIndex
                        ? "bg-[#B8D900]/10 border border-[#B8D900]/30"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                    aria-label={`הפעל: ${video.title_he}`}
                    aria-pressed={i === activeIndex}
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-[#2a2628]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getThumbnailUrl(video.youtube_id, video.thumbnail_url)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => handleThumbnailError(e, video.youtube_id)}
                      />
                      {/* Play indicator overlay */}
                      <div
                        className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity ${
                          i === activeIndex ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
                          <svg className="w-3 h-3 text-[#2a2628] ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Video meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-heading font-bold text-sm leading-snug line-clamp-2 transition-colors ${
                          i === activeIndex ? "text-[#2a2628]" : "text-[#716C70] group-hover:text-[#2a2628]"
                        }`}
                      >
                        {video.title_he}
                      </p>
                      {video.duration_he && (
                        <span className="mt-1 inline-block font-heebo text-xs text-[#716C70]">
                          {video.duration_he}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---- Grid layout: equal-size cards ---- */
          <div
            className={`grid gap-6 ${
              videos.length === 1
                ? "max-w-2xl mx-auto"
                : videos.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {videos.map((video, i) => (
              <VideoCard key={i} video={video} index={i} inView={inView} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
