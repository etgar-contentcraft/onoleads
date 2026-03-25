"use client";

/**
 * Countdown Timer Section
 * Two modes:
 *   "fixed"     — counts down to a specific ISO date/time (same for all visitors)
 *   "evergreen" — resets every N days for each visitor (stored in sessionStorage)
 * On expiry: can show an "expired" message or auto-redirect.
 */

import { useEffect, useState, useRef } from "react";
import type { Language } from "@/lib/types/database";

interface CountdownSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Returns the remaining time between now and `target`. */
function computeTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, expired: false };
}

/**
 * Returns the target Date for evergreen mode.
 * The timer restarts every `intervalDays` days from when the visitor first landed.
 * The seed is stored in sessionStorage so it survives page refreshes but resets per session.
 */
function getEvergreenTarget(intervalDays: number): Date {
  const key = "ono_countdown_seed";
  let seed = sessionStorage.getItem(key);
  if (!seed) {
    seed = Date.now().toString();
    sessionStorage.setItem(key, seed);
  }
  return new Date(parseInt(seed) + intervalDays * 24 * 60 * 60 * 1000);
}

/** A single unit cell (days / hours / minutes / seconds) */
function UnitCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#2a2628] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <span className="font-heading text-2xl md:text-3xl font-extrabold text-[#B8D900] tabular-nums leading-none">
            {String(value).padStart(2, "0")}
          </span>
        </div>
      </div>
      <span className="mt-2 font-heebo text-xs text-[#9A969A] uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function CountdownSection({ content, language }: CountdownSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const mode = (content.mode as "fixed" | "evergreen") || "fixed";
  const targetDateStr = content.target_date as string | undefined;
  const intervalDays = Math.max(1, parseInt((content.interval_days as string) || "7"));

  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || "";
  const expiredText = (content[`expired_text_${language}`] as string) || (content.expired_text_he as string) || "";
  const badge = (content[`badge_${language}`] as string) || (content.badge_he as string) || "";

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const targetRef = useRef<Date | null>(null);

  // Intersection observer for entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Determine target date
  useEffect(() => {
    if (mode === "evergreen") {
      targetRef.current = getEvergreenTarget(intervalDays);
    } else if (targetDateStr) {
      targetRef.current = new Date(targetDateStr);
    } else {
      return;
    }
    setTimeLeft(computeTimeLeft(targetRef.current));
  }, [mode, targetDateStr, intervalDays]);

  // Tick every second
  useEffect(() => {
    if (!targetRef.current) return;
    const id = setInterval(() => {
      if (targetRef.current) setTimeLeft(computeTimeLeft(targetRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft?.expired]);

  if (!timeLeft && !targetDateStr && mode !== "evergreen") return null;

  const labels = isRtl
    ? { d: "ימים", h: "שעות", m: "דקות", s: "שניות" }
    : { d: "Days", h: "Hours", m: "Minutes", s: "Seconds" };

  return (
    <section
      ref={sectionRef}
      className="py-14 md:py-20 bg-gradient-to-br from-[#2a2628] to-[#1a1618] overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-4xl mx-auto px-5 text-center">
        {/* Badge */}
        {badge && (
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-[#B8D900]/10 border border-[#B8D900]/20 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#B8D900] animate-pulse" />
            <span className="font-heebo text-[#B8D900] text-sm font-semibold">{badge}</span>
          </div>
        )}

        {/* Heading */}
        {heading && (
          <h2
            className="font-heading text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mb-3 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
          >
            {heading}
          </h2>
        )}
        {subheading && (
          <p
            className="font-heebo text-white/60 text-base md:text-lg mb-10 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.2s forwards" : "none" }}
          >
            {subheading}
          </p>
        )}

        {/* Timer or expired state */}
        {timeLeft?.expired ? (
          expiredText ? (
            <p className="font-heading text-xl text-[#B8D900] font-bold">{expiredText}</p>
          ) : null
        ) : timeLeft ? (
          <div
            className="flex items-end justify-center gap-3 md:gap-5 opacity-0"
            style={{ animation: inView ? "fade-in-up 0.7s ease-out 0.25s forwards" : "none" }}
          >
            <UnitCell value={timeLeft.days} label={labels.d} />
            <span className="font-heading text-3xl font-bold text-[#B8D900] mb-8 select-none">:</span>
            <UnitCell value={timeLeft.hours} label={labels.h} />
            <span className="font-heading text-3xl font-bold text-[#B8D900] mb-8 select-none">:</span>
            <UnitCell value={timeLeft.minutes} label={labels.m} />
            <span className="font-heading text-3xl font-bold text-[#B8D900] mb-8 select-none">:</span>
            <UnitCell value={timeLeft.seconds} label={labels.s} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
