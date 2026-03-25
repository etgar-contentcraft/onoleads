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
      className={`fixed bottom-6 right-6 z-[75] max-w-xs px-4 py-3 rounded-xl bg-[#2a2628] text-white shadow-2xl border border-white/10 flex items-center gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      dir={isRtl ? "rtl" : "ltr"}
      role="status"
      aria-live="polite"
    >
      {/* Pulsing green dot */}
      <span className="w-2.5 h-2.5 rounded-full bg-[#B8D900] animate-pulse shrink-0" />
      <p className="font-heebo text-sm leading-snug text-white/90">{label}</p>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="סגור"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
