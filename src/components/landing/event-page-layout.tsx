/**
 * EventPageLayout - Self-contained layout for open day event landing pages.
 * Renders two variants based on event_type:
 *   - "event_physical": physical campus open day
 *   - "event_zoom": zoom-based online open day
 * Does NOT use the section system. All sections are hardcoded and data-driven.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Page } from "@/lib/types/database";
import { CookieConsent } from "../compliance/cookie-consent";
import { AccessibilityWidget } from "../compliance/accessibility-widget";

// ============================================================================
// EventMeta Type (exported so route page and seed script can import it)
// ============================================================================

/** Event configuration stored in the page's custom_styles JSON field */
export interface EventMeta {
  /** Physical campus day or online Zoom session */
  event_type: "event_physical" | "event_zoom";
  /** ISO 8601 date-time string e.g. "2026-04-15T17:00:00" */
  event_date: string;
  /** Duration of the event in hours */
  duration_hours: number;
  /** Venue address for physical events */
  venue?: string;
  /** Google Maps deep-link for the venue */
  google_maps_url?: string;
  /** Parking instructions for physical events */
  parking_info?: string;
  /** Zoom join URL for online events */
  zoom_link?: string;
  /** Names/titles of programs being showcased */
  programs_featured: string[];
  /** Ordered session agenda */
  schedule: { time: string; title: string }[];
  /** Guest speakers or faculty appearing at the event */
  speakers?: { name: string; role: string; image_url?: string }[];
  /** Optional custom FAQ items; defaults are provided if omitted */
  faq?: { question: string; answer: string }[];
}

// ============================================================================
// Constants
// ============================================================================

const ONO_LOGO = "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";
const CAMPUS_IMAGE = "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg";

// Countdown refresh interval in ms
const COUNTDOWN_INTERVAL_MS = 1000;

// ============================================================================
// Types
// ============================================================================

interface EventPageLayoutProps {
  page: Page;
  eventMeta: EventMeta;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculates the remaining time until a target ISO date string.
 * @param targetDate - ISO date string for the event
 * @returns days/hours/minutes/seconds remaining, all zeroed if past
 */
function getTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/**
 * Formats a Hebrew date display string from an ISO date string.
 * @param isoDate - ISO date string
 * @returns formatted Hebrew date string
 */
function formatHebrewDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formats a time string from an ISO date string.
 * @param isoDate - ISO date string
 * @returns formatted time string e.g. "17:00"
 */
function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

// ============================================================================
// Countdown Timer Component
// ============================================================================

/**
 * Animated countdown timer that updates every second.
 * @param targetDate - ISO date string to count down to
 */
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: "ימים", value: timeLeft.days },
    { label: "שעות", value: timeLeft.hours },
    { label: "דקות", value: timeLeft.minutes },
    { label: "שניות", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-3 md:gap-4" dir="rtl">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-3 md:gap-4">
          <div className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <span className="font-heading font-extrabold text-2xl md:text-3xl text-white tabular-nums leading-none">
                {String(unit.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-white/50 text-xs mt-2 font-heebo">{unit.label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-[#B8D900] font-bold text-2xl mb-5 opacity-60">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Inline Registration Form
// ============================================================================

interface RegistrationFormProps {
  pageId: string;
  eventTitle: string;
  isZoom?: boolean;
}

/**
 * Inline lead capture form for event registration.
 * Includes honeypot bot detection and client-side validation.
 * @param pageId - Supabase page ID for lead attribution
 * @param eventTitle - Event name shown in form header
 * @param isZoom - Whether to show Zoom-specific button text
 */
function RegistrationForm({ pageId, eventTitle, isZoom = false }: RegistrationFormProps) {
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "", program_interest: "" });
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Validates form fields.
   * @returns true if all required fields pass validation
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      newErrors.full_name = "שדה חובה";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "שדה חובה";
    } else if (!/^[\d\-+() ]{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = "טלפון לא תקין";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "אימייל לא תקין";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submits lead data to the /api/leads endpoint.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (honeypot) return; // Bot detected
    if (!validate()) return;
    setSubmitting(true);

    try {
      if (!document.cookie.includes("onoleads_id=")) {
        const cookieId = crypto.randomUUID();
        document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      }
      const cookieId = document.cookie.split("; ").find((c) => c.startsWith("onoleads_id="))?.split("=")[1] || "";
      const urlParams = new URLSearchParams(window.location.search);

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          program_interest: formData.program_interest || eventTitle,
          page_id: pageId,
          utm_source: urlParams.get("utm_source"),
          utm_medium: urlParams.get("utm_medium"),
          utm_campaign: urlParams.get("utm_campaign"),
          utm_content: urlParams.get("utm_content"),
          utm_term: urlParams.get("utm_term"),
          referrer: document.referrer || null,
          cookie_id: cookieId,
          device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
          website: honeypot,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errorData = await res.json().catch(() => null);
        setSubmitError(errorData?.error || "אירעה שגיאה. אנא נסו שוב.");
      }
    } catch {
      setSubmitError("אירעה שגיאה בחיבור. אנא נסו שוב.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-heading text-2xl font-extrabold text-[#2a2628] mb-2">
          {isZoom ? "נרשמתם בהצלחה!" : "הרשמתם אושרה!"}
        </h3>
        <p className="text-[#716C70] text-base mb-1">
          {isZoom
            ? "קישור הזום יישלח אליכם לפני האירוע"
            : "יועץ לימודים יחזור אליכם לאישור ההגעה"}
        </p>
        <p className="text-[#716C70]/60 text-sm">הקריה האקדמית אונו</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl" noValidate>
      {/* Honeypot - hidden from real users */}
      <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
          {submitError}
        </div>
      )}

      {/* Full Name */}
      <div>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="שם מלא *"
          autoComplete="name"
          className="w-full h-13 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-[#2a2628] text-base placeholder:text-[#716C70]/50 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 transition-all"
          aria-required="true"
          aria-invalid={!!errors.full_name}
        />
        {errors.full_name && <p className="text-red-500 text-xs mt-1.5">{errors.full_name}</p>}
      </div>

      {/* Phone */}
      <div>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="טלפון *"
          dir="ltr"
          autoComplete="tel"
          className="w-full h-13 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-[#2a2628] text-base placeholder:text-[#716C70]/50 text-left focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 transition-all"
          aria-required="true"
          aria-invalid={!!errors.phone}
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>}
      </div>

      {/* Email */}
      <div>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="אימייל"
          dir="ltr"
          autoComplete="email"
          className="w-full h-13 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-[#2a2628] text-base placeholder:text-[#716C70]/50 text-left focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 transition-all"
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
      </div>

      {/* Privacy notice */}
      <p className="text-[#716C70]/60 text-xs leading-relaxed">
        בלחיצה על הכפתור אני מסכים/ה ל
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#B8D900] hover:underline mx-1">תנאי השימוש</a>
        ול
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B8D900] hover:underline mx-1">מדיניות הפרטיות</a>
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-14 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_30px_rgba(184,217,0,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            שולח...
          </span>
        ) : isZoom ? (
          "קבל לינק לזום"
        ) : (
          "הירשמו ליום הפתוח"
        )}
      </button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-5 text-[#716C70]/50 text-xs">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          ללא התחייבות
        </span>
        <span className="w-px h-3 bg-gray-200" aria-hidden="true" />
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          פרטיותכם מובטחת
        </span>
      </div>
    </form>
  );
}

// ============================================================================
// FAQ Accordion Component
// ============================================================================

/**
 * Inline FAQ accordion for event pages.
 * @param items - Array of question/answer pairs
 */
function EventFaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
              isOpen
                ? "border-[#B8D900]/40 bg-white shadow-[0_4px_24px_rgba(184,217,0,0.08)]"
                : "border-gray-200 bg-white hover:border-[#B8D900]/20"
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between p-5 md:p-6 text-start group"
              aria-expanded={isOpen}
            >
              <div className="flex items-start gap-4">
                <div className={`w-1 self-stretch rounded-full transition-all duration-300 shrink-0 ${isOpen ? "bg-[#B8D900]" : "bg-gray-200 group-hover:bg-[#B8D900]/50"}`} />
                <span className="font-heading text-base md:text-lg font-bold text-[#2a2628] leading-snug">
                  {item.question}
                </span>
              </div>
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ml-4 ${isOpen ? "bg-[#B8D900] rotate-180" : "bg-gray-100 group-hover:bg-[#B8D900]/15"}`}>
                <svg className={`w-4 h-4 ${isOpen ? "text-[#2a2628]" : "text-[#716C70]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className="px-5 md:px-6 pb-6 pr-10">
                  <p className="font-heebo text-[#716C70] text-base leading-[1.8]">{item.answer}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Sticky Header
// ============================================================================

/**
 * Sticky header that appears after scrolling 400px.
 * Includes Ono logo, event title (truncated), and scroll-to-form CTA.
 */
function EventStickyHeader({ title, onRegisterClick }: { title: string; onRegisterClick: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
      dir="rtl"
    >
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ONO_LOGO} alt="אונו" className="h-8 object-contain" loading="lazy" />
            <span className="hidden md:block text-[#2a2628] font-heading font-bold text-sm truncate max-w-[280px]">
              {title}
            </span>
          </div>
          <button
            onClick={onRegisterClick}
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm hover:bg-[#c8e920] transition-all duration-300"
          >
            הרשמה לאירוע
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Physical Open Day Layout
// ============================================================================

/**
 * Renders the full physical open day landing page.
 * Sections: hero + countdown, what to expect, schedule, map, programs, speakers, form, FAQ.
 */
function PhysicalOpenDayPage({ page, eventMeta }: EventPageLayoutProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const eventDate = formatHebrewDate(eventMeta.event_date);
  const eventTime = formatTime(eventMeta.event_date);

  const whatToExpect = [
    { icon: "🏛️", title: "סיור קמפוס", desc: "היכרות עם מתקני הקמפוס, הספריה, הכיתות והמעבדות" },
    { icon: "👨‍🏫", title: "פגישה עם הסגל", desc: "הכירו את ראשי החוגים והמרצים שילוו אתכם לאורך הלימודים" },
    { icon: "❓", title: "מענה לשאלות", desc: "קבלו תשובות לכל השאלות על תוכניות הלימוד, שכר לימוד ומלגות" },
    { icon: "📋", title: "הכרת התוכניות", desc: "מצגות מפורטות על כל תוכניות הלימוד והתמחויות האפשריות" },
  ];

  const defaultFaq = [
    { question: "האם צריך להירשם מראש?", answer: "כן, ההרשמה מראש מאפשרת לנו להכין חומרים ולהתאים את האירוע לתחומי העניין שלכם." },
    { question: "האם האירוע מתאים גם להורים?", answer: "בהחלט! אנחנו ממליצים להגיע יחד עם בני משפחה. ישנם גם פעילויות ייעודיות להורים." },
    { question: "כמה זמן נמשך האירוע?", answer: `האירוע נמשך כ-${eventMeta.duration_hours} שעות. אתם יכולים להגיע ולעזוב בכל שלב.` },
    { question: "האם יש חניה?", answer: eventMeta.parking_info || "ישנה חניה פנויה בקמפוס. ניתן להגיע גם בתחבורה ציבורית." },
    { question: "האם הכניסה בחינם?", answer: "כן, הכניסה לאירוע חינמית לחלוטין ללא כל התחייבות." },
  ];

  const faqItems = (eventMeta.faq && eventMeta.faq.length > 0) ? eventMeta.faq : defaultFaq;

  return (
    <div className="min-h-screen bg-white font-heebo" dir="rtl">
      <EventStickyHeader title={page.title_he} onRegisterClick={scrollToForm} />

      {/* ====== HERO ====== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CAMPUS_IMAGE}
            alt="קמפוס הקריה האקדמית אונו"
            className="w-full h-[120%] object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/85" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-32 md:py-40">
          {/* Ono logo */}
          <div
            className="mb-8 opacity-0"
            style={{ animation: heroVisible ? "fade-in-down 0.7s ease-out 0.1s forwards" : "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ONO_LOGO} alt="הקריה האקדמית אונו" className="h-12 object-contain" loading="eager" />
          </div>

          {/* Event type badge */}
          <div
            className="mb-5 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              יום פתוח פיזי
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-4 max-w-3xl opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.3s forwards" : "none" }}
          >
            {page.title_he}
          </h1>

          {/* Date + venue */}
          <div
            className="flex flex-wrap items-center gap-4 mb-10 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.45s forwards" : "none" }}
          >
            <div className="flex items-center gap-2 text-white/80 font-heebo text-lg">
              <svg className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{eventDate}</span>
              <span className="text-[#B8D900] font-bold">| שעה {eventTime}</span>
            </div>
            {eventMeta.venue && (
              <div className="flex items-center gap-2 text-white/60 font-heebo">
                <svg className="w-4 h-4 text-[#B8D900]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{eventMeta.venue}</span>
              </div>
            )}
          </div>

          {/* Countdown + CTA */}
          <div
            className="flex flex-col lg:flex-row items-start lg:items-center gap-8 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.6s forwards" : "none" }}
          >
            <CountdownTimer targetDate={eventMeta.event_date} />
            <button
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_50px_rgba(184,217,0,0.5)] hover:scale-[1.03] active:scale-[0.98]"
            >
              הירשמו עכשיו - חינם
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1V3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15a7 7 0 0114 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent z-10" />
      </section>

      {/* ====== WHAT TO EXPECT ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              מה תגלו
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628]">
              מה קורה <span className="text-[#B8D900]">ביום הפתוח?</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whatToExpect.map((item, i) => (
              <div key={i} className="group p-7 rounded-2xl border border-gray-100 hover:border-[#B8D900]/30 hover:shadow-[0_4px_30px_rgba(184,217,0,0.1)] transition-all duration-300 bg-white">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-heading font-bold text-[#2a2628] text-lg mb-2">{item.title}</h3>
                <p className="text-[#716C70] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SCHEDULE ====== */}
      {eventMeta.schedule && eventMeta.schedule.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-3xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                לוח זמנים
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                תוכנית האירוע
              </h2>
            </div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-[3.25rem] top-0 bottom-0 w-px bg-[#B8D900]/30" aria-hidden="true" />
              <div className="space-y-6">
                {eventMeta.schedule.map((item, i) => (
                  <div key={i} className="flex items-start gap-6">
                    {/* Time badge */}
                    <div className="flex-shrink-0 w-24 text-left">
                      <span className="inline-block px-3 py-1.5 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm">
                        {item.time}
                      </span>
                    </div>
                    {/* Dot */}
                    <div className="flex-shrink-0 w-4 h-4 mt-1.5 rounded-full bg-[#B8D900] border-2 border-white shadow-[0_0_0_3px_rgba(184,217,0,0.3)] z-10" aria-hidden="true" />
                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <p className="font-heading font-bold text-[#2a2628] text-base md:text-lg">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====== MAP ====== */}
      {eventMeta.venue && (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                מיקום
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                איך מגיעים?
              </h2>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Address info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#B8D900]/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-heading font-bold text-[#2a2628] text-lg mb-1">כתובת הקמפוס</p>
                      <p className="text-[#716C70] text-base">{eventMeta.venue}</p>
                    </div>
                  </div>

                  {eventMeta.parking_info && (
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#B8D900]/15 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 16l2 2V9a1 1 0 00-.293-.707l-3-3A1 1 0 0014 5h-1" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-heading font-bold text-[#2a2628] text-base mb-1">חניה</p>
                        <p className="text-[#716C70] text-sm">{eventMeta.parking_info}</p>
                      </div>
                    </div>
                  )}

                  {eventMeta.google_maps_url && (
                    <a
                      href={eventMeta.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-sm hover:bg-[#3a3638] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      פתחו ב-Google Maps
                    </a>
                  )}
                </div>

                {/* Visual decoration */}
                <div className="hidden md:flex flex-col items-center justify-center w-48 h-48 rounded-2xl bg-gradient-to-br from-[#B8D900]/20 to-[#B8D900]/5 border border-[#B8D900]/20">
                  <svg className="w-16 h-16 text-[#B8D900]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[#2a2628]/60 text-sm font-heading font-bold mt-2 text-center px-4">
                    {eventMeta.venue.split(",")[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====== FEATURED PROGRAMS ====== */}
      {eventMeta.programs_featured && eventMeta.programs_featured.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                תוכניות לימוד
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                התוכניות שיוצגו <span className="text-[#B8D900]">ביום הפתוח</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {eventMeta.programs_featured.map((program, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-[#B8D900]/30 hover:shadow-[0_4px_20px_rgba(184,217,0,0.08)] transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="font-heading font-bold text-[#2a2628] text-base">{program}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====== SPEAKERS ====== */}
      {eventMeta.speakers && eventMeta.speakers.length > 0 && (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                סגל אקדמי
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                תפגשו את המרצים
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {eventMeta.speakers.map((speaker, i) => (
                <div key={i} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
                  {speaker.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={speaker.image_url}
                      alt={speaker.name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-[#B8D900] to-[#9ab800] flex items-center justify-center text-[#2a2628] font-heading font-bold text-2xl border-4 border-white shadow-md">
                      {speaker.name.charAt(0)}
                    </div>
                  )}
                  <p className="font-heading font-bold text-[#2a2628] text-base">{speaker.name}</p>
                  <p className="text-[#716C70] text-sm mt-1">{speaker.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====== REGISTRATION FORM ====== */}
      <section id="registration-form" ref={formRef} className="py-20 md:py-28 bg-gradient-to-br from-[#2a2628] via-[#3a3638] to-[#2a2628] relative overflow-hidden">
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`, backgroundSize: "40px 40px" }}
          aria-hidden="true"
        />
        {/* Green glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#B8D900]/5 blur-[120px]" aria-hidden="true" />

        <div className="relative z-10 max-w-lg mx-auto px-5">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/15 text-[#B8D900] text-sm font-semibold mb-4">
              הרשמה חינמית
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-3">
              הירשמו ליום הפתוח
            </h2>
            <p className="text-white/60 text-base font-heebo">
              {eventDate} | שעה {eventTime}
              {eventMeta.venue && ` | ${eventMeta.venue.split(",")[0]}`}
            </p>
          </div>
          <div className="bg-white rounded-3xl p-7 md:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.3)]">
            <RegistrationForm
              pageId={page.id}
              eventTitle={page.title_he}
              isZoom={false}
            />
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              שאלות ותשובות
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              שאלות נפוצות
            </h2>
          </div>
          <EventFaqAccordion items={faqItems} />
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="py-12 bg-[#2a2628]" dir="rtl">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ONO_LOGO} alt="הקריה האקדמית אונו" className="h-10 object-contain brightness-0 invert opacity-70" loading="lazy" />
              <div>
                <p className="text-white/90 font-heading font-bold text-sm">הקריה האקדמית אונו</p>
                <p className="text-xs text-white/50">המכללה המומלצת בישראל</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/50 text-sm">
              <a href="tel:*2899" className="hover:text-[#B8D900] transition-colors">*2899</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">ono.ac.il</a>
            </div>
            <div className="flex items-center gap-4 text-white/40 text-xs">
              <a href="/privacy" className="hover:text-[#B8D900] transition-colors">מדיניות פרטיות</a>
              <span className="w-px h-3 bg-white/20" />
              <a href="/terms" className="hover:text-[#B8D900] transition-colors">תנאי שימוש</a>
              <span className="w-px h-3 bg-white/20" />
              <p>&copy; {new Date().getFullYear()} הקריה האקדמית אונו</p>
            </div>
          </div>
        </div>
      </footer>

      <CookieConsent language="he" />
      <AccessibilityWidget language="he" />
    </div>
  );
}

// ============================================================================
// Zoom Open Day Layout
// ============================================================================

/**
 * Renders the full Zoom open day landing page.
 * Sections: hero + countdown, what to expect, schedule, tech requirements,
 *           programs, registration form, calendar buttons, FAQ.
 */
function ZoomOpenDayPage({ page, eventMeta }: EventPageLayoutProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const eventDate = formatHebrewDate(eventMeta.event_date);
  const eventTime = formatTime(eventMeta.event_date);

  const whatToExpect = [
    { icon: "🌍", title: "הצטרפו מכל מקום", desc: "אין צורך להגיע פיזית לקמפוס. הצטרפו מהבית, מהעבודה או מכל מקום נוח לכם" },
    { icon: "💬", title: "שאלות בזמן אמת", desc: "שאלו את המרצים וצוות המכללה שאלות ישירות דרך הצ'אט של זום" },
    { icon: "🎥", title: "הצגות ומצגות", desc: "צפו במצגות מפורטות על תוכניות הלימוד, חיי הסטודנטים וההזדמנויות" },
    { icon: "⏱️", title: "חוסכים זמן", desc: `האירוע נמשך רק ${eventMeta.duration_hours} שעות - כל המידע בלי לצאת מהבית` },
  ];

  const techRequirements = [
    { icon: "💻", text: "מחשב, טאבלט או סמארטפון" },
    { icon: "🎧", text: "רמקולים או אוזניות" },
    { icon: "🌐", text: "חיבור אינטרנט יציב" },
    { icon: "📱", text: "אפליקציית Zoom (הורדה חינמית)" },
  ];

  const defaultFaq = [
    { question: "האם צריך חשבון זום?", answer: "לא חייבים. ניתן להצטרף גם ללא חשבון דרך הדפדפן, אך מומלץ להתקין את האפליקציה לחוויה טובה יותר." },
    { question: "מתי יישלח קישור הזום?", answer: "הקישור יישלח לכתובת האימייל שסיפקתם בהרשמה, שעה לפני תחילת האירוע." },
    { question: "האם ניתן להצטרף מאוחר?", answer: "כן, ניתן להצטרף בכל שלב במהלך האירוע. קישור הכניסה יישאר פעיל." },
    { question: "האם האירוע יוקלט?", answer: "ייתכן שחלקים מהאירוע יוקלטו. ניתן לפנות אלינו לאחר האירוע לקבלת הקלטה." },
    { question: "האם הכניסה בחינם?", answer: "כן, ההצטרפות לאירוע חינמית לחלוטין ללא כל התחייבות." },
  ];

  const faqItems = (eventMeta.faq && eventMeta.faq.length > 0) ? eventMeta.faq : defaultFaq;

  /**
   * Builds a Google Calendar URL for the event.
   * @returns Google Calendar add-event URL
   */
  const buildGoogleCalendarUrl = (): string => {
    const start = new Date(eventMeta.event_date);
    const end = new Date(start.getTime() + eventMeta.duration_hours * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title = encodeURIComponent(page.title_he);
    const details = encodeURIComponent(`יום פתוח בזום - הקריה האקדמית אונו\n${eventMeta.zoom_link || ""}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  };

  /**
   * Builds an Outlook calendar URL for the event.
   * @returns Outlook add-event URL
   */
  const buildOutlookCalendarUrl = (): string => {
    const start = encodeURIComponent(new Date(eventMeta.event_date).toISOString());
    const end = encodeURIComponent(new Date(new Date(eventMeta.event_date).getTime() + eventMeta.duration_hours * 60 * 60 * 1000).toISOString());
    const title = encodeURIComponent(page.title_he);
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&body=${encodeURIComponent(eventMeta.zoom_link || "")}`;
  };

  return (
    <div className="min-h-screen bg-white font-heebo" dir="rtl">
      <EventStickyHeader title={page.title_he} onRegisterClick={scrollToForm} />

      {/* ====== HERO ====== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Gradient background - zoom gets a techy dark gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0d1117] via-[#1a1f2e] to-[#0d1117]">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`, backgroundSize: "50px 50px" }} />
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[#B8D900]/6 blur-[180px]" />
          <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[150px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-32 md:py-40">
          {/* Zoom + Ono logos */}
          <div
            className="flex items-center gap-5 mb-10 opacity-0"
            style={{ animation: heroVisible ? "fade-in-down 0.7s ease-out 0.1s forwards" : "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ONO_LOGO} alt="הקריה האקדמית אונו" className="h-10 object-contain brightness-0 invert opacity-80" loading="eager" />
            <span className="text-white/30 text-2xl font-light">×</span>
            {/* Zoom logo SVG */}
            <div className="flex items-center gap-2 bg-[#2D8CFF]/20 backdrop-blur-md border border-[#2D8CFF]/30 rounded-xl px-4 py-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#2D8CFF]" aria-hidden="true">
                <path d="M16.8 11.4L21 8v8l-4.2-3.4v2.1a3.5 3.5 0 01-3.5 3.5H5.5A3.5 3.5 0 012 13.7V10a3.5 3.5 0 013.5-3.5h7.8a3.5 3.5 0 013.5 3.5v1.4z"/>
              </svg>
              <span className="text-white/80 font-heading font-bold text-sm">Zoom</span>
            </div>
          </div>

          {/* Event type badge */}
          <div
            className="mb-5 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#2D8CFF]/20 text-[#2D8CFF] border border-[#2D8CFF]/30 font-heading font-bold text-sm">
              יום פתוח בזום
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-4 max-w-3xl opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.3s forwards" : "none" }}
          >
            {page.title_he}
          </h1>

          {/* Date + online badge */}
          <div
            className="flex flex-wrap items-center gap-4 mb-10 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.45s forwards" : "none" }}
          >
            <div className="flex items-center gap-2 text-white/80 font-heebo text-lg">
              <svg className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{eventDate}</span>
              <span className="text-[#B8D900] font-bold">| שעה {eventTime}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              אונליין - מכל מקום
            </span>
          </div>

          {/* Countdown + CTA */}
          <div
            className="flex flex-col lg:flex-row items-start lg:items-center gap-8 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.6s forwards" : "none" }}
          >
            <CountdownTimer targetDate={eventMeta.event_date} />
            <button
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_50px_rgba(184,217,0,0.5)] hover:scale-[1.03] active:scale-[0.98]"
            >
              קבל קישור לזום - חינם
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent z-10" />
      </section>

      {/* ====== WHAT TO EXPECT ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              יתרונות
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628]">
              למה להצטרף <span className="text-[#B8D900]">לזום?</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whatToExpect.map((item, i) => (
              <div key={i} className="group p-7 rounded-2xl border border-gray-100 hover:border-[#B8D900]/30 hover:shadow-[0_4px_30px_rgba(184,217,0,0.1)] transition-all duration-300 bg-white">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-heading font-bold text-[#2a2628] text-lg mb-2">{item.title}</h3>
                <p className="text-[#716C70] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== ZOOM SCHEDULE ====== */}
      {eventMeta.schedule && eventMeta.schedule.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-3xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                לוח זמנים
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                אג&apos;נדת הזום
              </h2>
            </div>
            <div className="relative">
              <div className="absolute right-[3.25rem] top-0 bottom-0 w-px bg-[#2D8CFF]/30" aria-hidden="true" />
              <div className="space-y-6">
                {eventMeta.schedule.map((item, i) => (
                  <div key={i} className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-24 text-left">
                      <span className="inline-block px-3 py-1.5 rounded-full bg-[#2D8CFF]/15 text-[#2D8CFF] border border-[#2D8CFF]/30 font-heading font-bold text-sm">
                        {item.time}
                      </span>
                    </div>
                    <div className="flex-shrink-0 w-4 h-4 mt-1.5 rounded-full bg-[#2D8CFF] border-2 border-white shadow-[0_0_0_3px_rgba(45,140,255,0.2)] z-10" aria-hidden="true" />
                    <div className="flex-1 pb-2">
                      <p className="font-heading font-bold text-[#2a2628] text-base md:text-lg">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====== TECH REQUIREMENTS ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              הצטרפות לזום
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              מה צריך כדי להצטרף?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              {techRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-2xl">{req.icon}</span>
                  <span className="font-heebo text-[#2a2628] text-base">{req.text}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-[#2D8CFF]/10 to-[#2D8CFF]/5 rounded-3xl border border-[#2D8CFF]/20 p-8 text-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 fill-[#2D8CFF]/60 mx-auto mb-4" aria-hidden="true">
                <path d="M16.8 11.4L21 8v8l-4.2-3.4v2.1a3.5 3.5 0 01-3.5 3.5H5.5A3.5 3.5 0 012 13.7V10a3.5 3.5 0 013.5-3.5h7.8a3.5 3.5 0 013.5 3.5v1.4z"/>
              </svg>
              <h3 className="font-heading font-bold text-[#2a2628] text-xl mb-2">Zoom</h3>
              <p className="text-[#716C70] text-sm mb-5">האפליקציה הורדה חינמית וקלה לשימוש</p>
              <a
                href="https://zoom.us/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D8CFF] text-white font-heading font-bold text-sm hover:bg-[#1a7ae0] transition-colors"
              >
                הורידו Zoom חינם
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURED PROGRAMS ====== */}
      {eventMeta.programs_featured && eventMeta.programs_featured.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
                תוכניות לימוד
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
                התוכניות שיוצגו <span className="text-[#B8D900]">בזום</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {eventMeta.programs_featured.map((program, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-[#B8D900]/30 hover:shadow-[0_4px_20px_rgba(184,217,0,0.08)] transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="font-heading font-bold text-[#2a2628] text-base">{program}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====== REGISTRATION FORM ====== */}
      <section id="registration-form" ref={formRef} className="py-20 md:py-28 bg-gradient-to-br from-[#0d1117] via-[#1a1f2e] to-[#0d1117] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`, backgroundSize: "40px 40px" }}
          aria-hidden="true"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-[#2D8CFF]/8 blur-[120px]" aria-hidden="true" />

        <div className="relative z-10 max-w-lg mx-auto px-5">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 mb-4 px-5 py-2 rounded-full bg-[#2D8CFF]/15 border border-[#2D8CFF]/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#2D8CFF]" aria-hidden="true">
                <path d="M16.8 11.4L21 8v8l-4.2-3.4v2.1a3.5 3.5 0 01-3.5 3.5H5.5A3.5 3.5 0 012 13.7V10a3.5 3.5 0 013.5-3.5h7.8a3.5 3.5 0 013.5 3.5v1.4z"/>
              </svg>
              <span className="text-[#2D8CFF] font-semibold text-sm">הצטרפו בזום</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-3">
              קבלו קישור לזום
            </h2>
            <p className="text-white/60 text-base font-heebo">
              {eventDate} | שעה {eventTime} | אונליין
            </p>
          </div>
          <div className="bg-white rounded-3xl p-7 md:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.3)]">
            <RegistrationForm
              pageId={page.id}
              eventTitle={page.title_he}
              isZoom={true}
            />
          </div>

          {/* Calendar add buttons */}
          <div className="mt-8 text-center">
            <p className="text-white/40 text-sm mb-4 font-heebo">שמרו את האירוע ביומן</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={buildGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/15 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Google Calendar
              </a>
              <a
                href={buildOutlookCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/15 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Outlook
              </a>
              <a
                href={`webcal://calendar.google.com/calendar/ical/event?${new URLSearchParams({ action: "TEMPLATE", text: page.title_he, dates: (() => { const s = new Date(eventMeta.event_date); const e2 = new Date(s.getTime() + eventMeta.duration_hours * 60 * 60 * 1000); const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"; return `${fmt(s)}/${fmt(e2)}`; })() }).toString()}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/15 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Apple Calendar
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              שאלות ותשובות
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              שאלות נפוצות
            </h2>
          </div>
          <EventFaqAccordion items={faqItems} />
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="py-12 bg-[#2a2628]" dir="rtl">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ONO_LOGO} alt="הקריה האקדמית אונו" className="h-10 object-contain brightness-0 invert opacity-70" loading="lazy" />
              <div>
                <p className="text-white/90 font-heading font-bold text-sm">הקריה האקדמית אונו</p>
                <p className="text-xs text-white/50">המכללה המומלצת בישראל</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/50 text-sm">
              <a href="tel:*2899" className="hover:text-[#B8D900] transition-colors">*2899</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">ono.ac.il</a>
            </div>
            <div className="flex items-center gap-4 text-white/40 text-xs">
              <a href="/privacy" className="hover:text-[#B8D900] transition-colors">מדיניות פרטיות</a>
              <span className="w-px h-3 bg-white/20" />
              <a href="/terms" className="hover:text-[#B8D900] transition-colors">תנאי שימוש</a>
              <span className="w-px h-3 bg-white/20" />
              <p>&copy; {new Date().getFullYear()} הקריה האקדמית אונו</p>
            </div>
          </div>
        </div>
      </footer>

      <CookieConsent language="he" />
      <AccessibilityWidget language="he" />
    </div>
  );
}

// ============================================================================
// Main Export - routes to the correct layout based on event_type
// ============================================================================

/**
 * EventPageLayout - Entry point that dispatches to the correct event type layout.
 * @param page - Supabase page record
 * @param eventMeta - Event configuration extracted from custom_styles
 */
export function EventPageLayout({ page, eventMeta }: EventPageLayoutProps) {
  if (eventMeta.event_type === "event_zoom") {
    return <ZoomOpenDayPage page={page} eventMeta={eventMeta} />;
  }
  // Default to physical layout for "event_physical" or any other value
  return <PhysicalOpenDayPage page={page} eventMeta={eventMeta} />;
}
