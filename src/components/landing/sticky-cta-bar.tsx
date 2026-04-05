"use client";

/**
 * Sticky CTA bar component for landing pages.
 * Renders a fixed bar at the top or bottom of the viewport with a text label,
 * phone link, and CTA button. Supports RTL languages and mobile responsiveness.
 */

import { useEffect, useRef } from "react";
import type { StickyBarContent } from "@/lib/types/popup-campaigns";
import { useCtaModal } from "@/components/landing/cta-modal";

/** Props for the StickyCtaBar component */
interface StickyCtaBarProps {
  /** Content configuration for the sticky bar (text, colors, position, phone) */
  content: StickyBarContent;
  /** Display language — determines RTL direction and text field suffix */
  language?: "he" | "en" | "ar";
  /** Callback fired when the user clicks the CTA button (for analytics) */
  onCtaClick: () => void;
  /** Callback fired once when the bar first becomes visible (for analytics) */
  onShow: () => void;
}

/** Offset in pixels to clear the sticky site header when position is "top" */
const HEADER_OFFSET_CLASS = "top-[48px]";

/**
 * Renders a sticky CTA bar fixed to the top or bottom of the viewport.
 * The bar includes promotional text (hidden on mobile), an optional phone link,
 * and a CTA button that opens the lead-capture modal.
 *
 * @param content - Bar content and styling from the campaign configuration
 * @param language - Active language for RTL and text selection (defaults to "he")
 * @param onCtaClick - Analytics callback for CTA button clicks
 * @param onShow - Analytics callback fired once on mount
 */
export function StickyCtaBar({
  content,
  language = "he",
  onCtaClick,
  onShow,
}: StickyCtaBarProps) {
  const { open } = useCtaModal();
  const hasCalledOnShow = useRef(false);
  const isRtl = language === "he" || language === "ar";
  const isTop = content.position === "top";

  /* Fire the onShow callback exactly once when the component mounts */
  useEffect(() => {
    if (!hasCalledOnShow.current) {
      hasCalledOnShow.current = true;
      onShow();
    }
  }, [onShow]);

  /**
   * Handles the CTA button click — fires the analytics callback
   * and opens the lead-capture modal.
   */
  const handleCtaClick = () => {
    onCtaClick();
    open("sticky_bar");
  };

  /** Format phone number for the tel: href (strip spaces and dashes) */
  const phoneHref = content.phone_number
    ? `tel:${content.phone_number.replace(/[\s-]/g, "")}`
    : undefined;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`
        fixed left-0 right-0 z-[45]
        ${isTop ? HEADER_OFFSET_CLASS : "bottom-0"}
        animate-slide-in-bar
        flex items-center justify-between
        px-4 py-2 shadow-lg
        transition-transform duration-500 ease-out
      `}
      style={{ backgroundColor: content.bg_color }}
    >
      {/* Promotional text — hidden on mobile to save space */}
      <span className="hidden md:block text-sm font-medium text-white truncate max-w-[50%]">
        {content.text_he}
      </span>

      {/* Phone link + CTA button group */}
      <div className="flex items-center gap-3 ms-auto">
        {/* Phone link — shown only when show_phone is true and a number exists */}
        {content.show_phone && phoneHref && (
          <a
            href={phoneHref}
            className="flex items-center gap-1.5 text-white text-sm font-medium
                       hover:opacity-80 transition-opacity"
            aria-label={content.phone_number}
          >
            {/* Phone icon (SVG) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586
                   1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694
                   1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285
                   11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875
                   1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959
                   1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5
                   15.448 1.5 6.75V4.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">{content.phone_number}</span>
          </a>
        )}

        {/* CTA button */}
        <button
          type="button"
          onClick={handleCtaClick}
          className="font-heading rounded-full px-5 py-1.5 text-sm font-bold
                     text-white shadow-md hover:brightness-110
                     transition-all duration-200 cursor-pointer"
          style={{ backgroundColor: content.accent_color }}
        >
          {content.cta_text_he}
        </button>
      </div>
    </div>
  );
}
