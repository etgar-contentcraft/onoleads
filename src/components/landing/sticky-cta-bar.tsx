"use client";

/**
 * Sticky CTA bar component for landing pages.
 * Renders a fixed bar at the top or bottom of the viewport with a text label,
 * optional phone link, CTA button, social proof text, and countdown timer.
 * Supports RTL languages and mobile responsiveness.
 */

import { useEffect, useRef, useState } from "react";
import type { StickyBarContent } from "@/lib/types/popup-campaigns";
import { useCtaModal } from "@/components/landing/cta-modal";

interface StickyCtaBarProps {
  content: StickyBarContent;
  language?: "he" | "en" | "ar";
  onCtaClick: () => void;
  onShow: () => void;
}

const HEADER_OFFSET_CLASS = "top-[48px]";

/** Computes {h, m, s} remaining from now to a target ISO date */
function getRemainingTime(targetISO: string) {
  const diff = Math.max(0, new Date(targetISO).getTime() - Date.now());
  if (diff === 0) return null;
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3600000);
  return { h, m, s };
}

/**
 * Compact countdown clock for the sticky bar (HH:MM:SS format).
 * Ticks every second. Returns null when countdown expires.
 */
function BarCountdown({ targetISO, textColor }: { targetISO: string; textColor: string }) {
  const [time, setTime] = useState(() => getRemainingTime(targetISO));

  useEffect(() => {
    const id = setInterval(() => {
      const t = getRemainingTime(targetISO);
      setTime(t);
      if (!t) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  if (!time) return null;

  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono font-bold tabular-nums text-sm" style={{ color: textColor }}>
      {time.h > 0 && `${fmt(time.h)}:`}{fmt(time.m)}:{fmt(time.s)}
    </span>
  );
}

/**
 * Renders a sticky CTA bar fixed to the top or bottom of the viewport.
 * Features: promotional text, optional phone link, CTA button, social proof, countdown.
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

  useEffect(() => {
    if (!hasCalledOnShow.current) {
      hasCalledOnShow.current = true;
      onShow();
    }
  }, [onShow]);

  const handleCtaClick = () => {
    onCtaClick();
    open("sticky_bar");
  };

  const phoneHref = content.phone_number
    ? `tel:${content.phone_number.replace(/[\s-]/g, "")}`
    : undefined;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`
        fixed left-0 right-0 z-[48]
        ${isTop ? HEADER_OFFSET_CLASS : "bottom-0 pb-[env(safe-area-inset-bottom)]"}
        animate-slide-in-bar
        flex items-center justify-between
        px-4 py-2.5 shadow-lg
        transition-transform duration-500 ease-out
      `}
      style={{ backgroundColor: content.bg_color }}
    >
      {/* Left/start side: promotional text + social proof */}
      <div className="hidden md:flex flex-col gap-0">
        <span className="text-sm font-medium text-white truncate max-w-[40vw]">
          {content[`text_${language}` as keyof typeof content] as string || content.text_he}
        </span>
        {content.social_proof_text && (
          <span className="text-xs text-white/60">{content.social_proof_text}</span>
        )}
      </div>

      {/* Center: countdown (desktop only) */}
      {content.countdown_end && (
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-xs text-white/60">{language === "ar" ? "المتبقي:" : language === "he" ? "נותר:" : "Remaining:"}</span>
          <BarCountdown targetISO={content.countdown_end} textColor="white" />
        </div>
      )}

      {/* Right/end side: phone + CTA */}
      <div className="flex items-center gap-3 ms-auto">
        {/* Countdown on mobile */}
        {content.countdown_end && (
          <div className="flex md:hidden items-center gap-1">
            <BarCountdown targetISO={content.countdown_end} textColor="white" />
          </div>
        )}

        {/* Phone link */}
        {content.show_phone && phoneHref && (
          <a
            href={phoneHref}
            className="flex items-center gap-1.5 text-white text-sm font-medium hover:opacity-80 transition-opacity"
            aria-label={content.phone_number}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
            </svg>
            <span className="hidden sm:inline">{content.phone_number}</span>
          </a>
        )}

        {/* CTA button */}
        <button
          type="button"
          onClick={handleCtaClick}
          className="font-heading rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 transition-all duration-200 cursor-pointer"
          style={{ backgroundColor: content.accent_color }}
        >
          {content[`cta_text_${language}` as keyof typeof content] as string || content.cta_text_he}
        </button>
      </div>
    </div>
  );
}
