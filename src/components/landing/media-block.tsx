/**
 * Shared media block — renders either an image or a responsive 16:9 YouTube
 * embed depending on which prop is provided. video_url takes priority.
 */

import Image from "next/image";
import { extractYoutubeId } from "@/lib/utils/youtube";

interface MediaBlockProps {
  /** YouTube URL or video ID — takes priority over image_url */
  video_url?: string;
  /** Static image URL fallback */
  image_url?: string;
  /** Alt text for the image */
  alt?: string;
  /** Extra Tailwind classes on the outer wrapper */
  className?: string;
  /** Image object-fit mode (default: "cover") */
  objectFit?: "cover" | "contain";
  /** Rounded corners (default: "xl") */
  rounded?: string;
}

/**
 * Renders a YouTube 16:9 iframe when video_url is valid,
 * otherwise renders a Next/Image with the given image_url.
 * Returns null if neither is provided.
 */
export function MediaBlock({
  video_url,
  image_url,
  alt = "",
  className = "",
  objectFit = "cover",
  rounded = "xl",
}: MediaBlockProps) {
  const youtubeId = extractYoutubeId(video_url || "");

  /* ── YouTube embed (16:9 responsive) ─────────────────────────── */
  if (youtubeId) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-${rounded} shadow-lg ${className}`}
        style={{ aspectRatio: "16 / 9" }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          title={alt || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  /* ── Static image ────────────────────────────────────────────── */
  if (image_url) {
    return (
      <div className={`relative overflow-hidden rounded-${rounded} shadow-lg ${className}`}>
        <Image
          src={image_url}
          alt={alt}
          width={800}
          height={objectFit === "contain" ? 450 : 600}
          className={`w-full h-auto object-${objectFit}`}
          unoptimized
        />
      </div>
    );
  }

  return null;
}
