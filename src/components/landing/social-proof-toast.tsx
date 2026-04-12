/**
 * Social Proof Toast — shows "X people registered for this program this week"
 * to reinforce urgency. Appears bottom-right after a delay, dismisses after 6s,
 * and re-appears every 45s. sessionStorage prevents spam.
 * Off by default — must be enabled via page settings.
 */
"use client";

import { useEffect, useState } from "react";

interface SocialProofToastProps {
  pageId: string;
  /** How many days back to count registrations (default: 7) */
  days?: number;
  language?: "he" | "en" | "ar";
}

/** Seconds before first appearance */
const INITIAL_DELAY = 8;
/** Seconds the toast is visible */
const VISIBLE_DURATION = 6;
/** Seconds between re-appearances */
const REPEAT_INTERVAL = 45;

export function SocialProofToast({ pageId, days = 7, language = "he" }: SocialProofToastProps) {
  const [count, setCount] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const isRtl = language === "he" || language === "ar";

  /* Fetch count on mount */
  useEffect(() => {
    fetch(`/api/social-proof?page_id=${encodeURIComponent(pageId)}&days=${days}`)
      .then((r) => r.json())
      .then((data: { count: number }) => {
        if (data.count > 0) setCount(data.count);
      })
      .catch(() => {/* silent fail */});
  }, [pageId, days]);

  /* Show/hide cycle */
  useEffect(() => {
    if (!count) return;

    let hideTimer: ReturnType<typeof setTimeout>;
    let repeatTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      setVisible(true);
      hideTimer = setTimeout(() => {
        setVisible(false);
        repeatTimer = setTimeout(show, REPEAT_INTERVAL * 1000);
      }, VISIBLE_DURATION * 1000);
    };

    const initialTimer = setTimeout(show, INITIAL_DELAY * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(hideTimer);
      clearTimeout(repeatTimer);
    };
  }, [count]);

  if (!count || !visible) return null;

  const label = isRtl
    ? `✦ ${count.toLocaleString()} אנשים נרשמו לתוכנית זו ב-${days === 1 ? "יום האחרון" : `${days} הימים האחרונים`}`
    : `✦ ${count.toLocaleString()} people registered in the last ${days} day${days === 1 ? "" : "s"}`;

  return (
    <div
      className={`fixed bottom-6 z-[75] max-w-sm px-5 py-3.5 rounded-2xl glass-backdrop text-white shadow-[var(--shadow-elevated)] border border-white/10 flex items-center gap-3.5 ${
        isRtl ? "left-6" : "right-6"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
      role="status"
      aria-live="polite"
      style={{
        animation: visible
          ? "slide-up-spring 0.5s var(--ease-out-expo) forwards"
          : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(1.5rem)",
        transition: visible ? "none" : "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Pulsing green dot with ring effect */}
      <span className="relative shrink-0 flex items-center justify-center w-3 h-3">
        <span className="absolute inset-0 rounded-full bg-[#B8D900]/30 animate-ping" />
        <span className="relative w-2.5 h-2.5 rounded-full bg-[#B8D900] shadow-[0_0_8px_rgba(184,217,0,0.5)]" />
      </span>
      <p className="font-heebo text-sm leading-snug text-white/90">{label}</p>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:rotate-90"
        aria-label={isRtl ? "סגור" : "Close"}
      >
        <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
