"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProgramWithFaculty } from "@/lib/types/database";
import type { HomepageEventPage } from "@/app/page";

// ============================================================================
// Types
// ============================================================================

interface HomepageClientProps {
  programs: ProgramWithFaculty[];
  /** Upcoming published event pages to show in the events section */
  events: HomepageEventPage[];
}

interface QuizCategory {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  facultyMatch?: string;
  filterFn?: (p: ProgramWithFaculty) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ONO_LOGO = "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";
const CAMPUS_IMAGE = "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg";
const STUDENTS_IMAGE = "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_0528-min-scaled.jpg";
const STUDENTS2_IMAGE = "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_9689-min-scaled.jpg";
const STUDENTS3_IMAGE = "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_0456-min-scaled.jpg";

const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: "business",
    label: "עסקים וכלכלה",
    icon: "📊",
    gradient: "from-amber-500/20 to-orange-500/20",
    facultyMatch: "פקולטה למנהל עסקים",
  },
  {
    id: "law",
    label: "משפטים",
    icon: "⚖️",
    gradient: "from-blue-500/20 to-indigo-500/20",
    facultyMatch: "פקולטה למשפטים",
  },
  {
    id: "education",
    label: "חינוך וחברה",
    icon: "📚",
    gradient: "from-purple-500/20 to-pink-500/20",
    facultyMatch: "פקולטה למדעי הרוח והחברה",
  },
  {
    id: "health",
    label: "בריאות",
    icon: "🩺",
    gradient: "from-emerald-500/20 to-teal-500/20",
    facultyMatch: "פקולטה למקצועות הבריאות",
  },
  {
    id: "tech",
    label: "טכנולוגיה ומחשבים",
    icon: "💻",
    gradient: "from-cyan-500/20 to-blue-500/20",
    filterFn: (p) => {
      const name = (p.name_he + " " + (p.name_en || "") + " " + (p.degree_type || "")).toLowerCase();
      return (
        name.includes("b.sc") ||
        name.includes("computer") ||
        name.includes("info") ||
        name.includes("מחשב") ||
        name.includes("מידע") ||
        name.includes("סייבר") ||
        name.includes("cyber") ||
        name.includes("טכנולוג")
      );
    },
  },
  {
    id: "international",
    label: "לימודים בינלאומיים",
    icon: "🌍",
    gradient: "from-rose-500/20 to-red-500/20",
    facultyMatch: "בית הספר הבינלאומי",
  },
];

const PROGRAM_IMAGES: Record<string, string> = {
  law: "https://www.ono.ac.il/wp-content/uploads/2019/05/desk_1920x628_25.jpg",
  tech: "https://www.ono.ac.il/wp-content/uploads/2019/05/freestocks-I_pOqP6kCOI-unsplash-scaled.jpg",
  health: "https://www.ono.ac.il/wp-content/uploads/2019/06/desk_1920x628_2.jpg",
  business: "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_9689-min-scaled.jpg",
  education: "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_0456-min-scaled.jpg",
  international: "https://www.ono.ac.il/wp-content/uploads/2022/08/MG_0528-min-scaled.jpg",
};

const BENEFITS = [
  {
    icon: "🎓",
    title: "סגל אקדמי מוביל",
    text: "פרופסורים ומרצים מהשורה הראשונה בישראל, עם ניסיון אקדמי ומעשי עשיר.",
  },
  {
    icon: "🔬",
    title: "הכשרה מעשית",
    text: "שילוב ייחודי של תיאוריה ופרקטיקה, עם סדנאות, מעבדות והתנסויות בשטח.",
  },
  {
    icon: "📈",
    title: "שיעור השמה גבוה",
    text: "92% מבוגרי אונו משתלבים בעבודה בתחום הלימודים תוך שנה מסיום התואר.",
  },
  {
    icon: "🏛️",
    title: "קמפוסים ברחבי הארץ",
    text: "קמפוסים בקריית אונו, ירושלים וחיפה - הלימודים קרובים אליכם.",
  },
];

const STATS = [
  { value: 40000, suffix: "+", label: "בוגרים" },
  { value: 30, suffix: "+", label: "שנות מצוינות" },
  { value: 6, suffix: "", label: "פקולטות" },
  { value: 92, suffix: "%", label: "שיעור השמה" },
];

const TESTIMONIALS = [
  {
    name: "נועה לוי",
    program: "תואר ראשון במשפטים (LL.B)",
    quote: "הלימודים באונו שינו לי את החיים. הסגל האקדמי מדהים, הגישה האישית שקיבלתי והקשרים שבניתי - הכל הוביל אותי לקריירה מצוינת.",
    avatar: "נ",
  },
  {
    name: "אורי כהן",
    program: "תואר ראשון במדעי המחשב (B.Sc)",
    quote: "באונו למדתי לא רק תיאוריה אלא גם כלים מעשיים. ההכשרה המעשית והפרויקטים שעשיתי הכינו אותי מצוין לשוק העבודה.",
    avatar: "א",
  },
  {
    name: "מיכל אברהם",
    program: "MBA - מנהל עסקים",
    quote: "תוכנית ה-MBA באונו היא ברמה אחרת. פגשתי אנשים מדהימים, למדתי מהמרצים הכי טובים, וקיבלתי כלים שמשרתים אותי כל יום בעבודה.",
    avatar: "מ",
  },
];

/** Hebrew month names for date formatting */
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats a date string into Hebrew short format (e.g. "15 אפריל")
 * @param dateStr - ISO date string or null
 * @returns Formatted Hebrew date string, or empty string if invalid
 */
function formatHebrewDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]}`;
}

/**
 * Extracts the event time string (HH:MM) from the event's custom_styles config.
 * @param customStyles - custom_styles JSON field from the pages table
 * @returns Formatted time string e.g. "17:00", or empty string if unavailable
 */
function getEventTime(customStyles: Record<string, unknown> | null): string {
  if (!customStyles) return "";
  const dateStr = customStyles.event_date;
  if (typeof dateStr !== "string") return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

/**
 * Determines whether an event is a Zoom (online) event based on its event_type in custom_styles.
 * @param title - Page title in Hebrew (fallback for legacy pages)
 * @param customStyles - custom_styles JSON field from the pages table
 * @returns true if the event type is "event_zoom" or the title suggests online
 */
function isZoomEvent(title: string | null, customStyles: Record<string, unknown> | null): boolean {
  if (customStyles?.event_type === "event_zoom") return true;
  const titleLower = (title ?? "").toLowerCase();
  return titleLower.includes("זום") || titleLower.includes("zoom") || titleLower.includes("אונליין");
}

/**
 * Builds the correct URL for an event landing page under /lp/events/[slug].
 * @param slug - Page slug
 * @returns URL path string
 */
function getEventUrl(slug: string): string {
  return `/lp/events/${slug}`;
}

/**
 * Returns the featured landing page URL for a program.
 * Uses featured_page_slug if available, otherwise falls back to the program slug.
 * @param program - Program with optional featured_page_slug
 * @returns URL path string
 */
function getProgramUrl(program: ProgramWithFaculty & { featured_page_slug?: string | null }): string {
  const slug = program.featured_page_slug ?? program.slug;
  return `/lp/${slug}`;
}

// ============================================================================
// Hooks
// ============================================================================

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/**
 * Animates a counter from 0 to a target value when triggered
 * @param target - Final number to animate to
 * @param inView - Whether the element is in the viewport
 * @param duration - Animation duration in ms
 * @returns Current animated value
 */
function useAnimatedCounter(target: number, inView: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (!inView || animated.current) return;
    animated.current = true;
    const steps = 50;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (step >= steps) { clearInterval(timer); setValue(target); }
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return value;
}

// ============================================================================
// Sub-Components
// ============================================================================

function AnimatedStatCard({ stat, inView, index }: { stat: typeof STATS[0]; inView: boolean; index: number }) {
  const value = useAnimatedCounter(stat.value, inView);
  return (
    <div
      className="flex flex-col items-center text-center p-6 md:p-8 opacity-0"
      style={{
        animation: inView ? `fade-in-up 0.6s ease-out ${index * 0.15}s forwards` : "none",
      }}
    >
      <span className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-[#B8D900] tabular-nums leading-none">
        {value.toLocaleString()}{stat.suffix}
      </span>
      <span className="text-base md:text-lg text-white/80 mt-3 font-medium">{stat.label}</span>
    </div>
  );
}

/**
 * Renders a single event card for the upcoming events section.
 * Reads event date/time from custom_styles.event_date (ISO string).
 */
function EventCard({ event, index }: { event: HomepageEventPage; index: number }) {
  const dateStr = typeof event.custom_styles?.event_date === "string"
    ? event.custom_styles.event_date as string
    : null;

  const formattedDate = formatHebrewDate(dateStr);
  const eventTime = getEventTime(event.custom_styles);
  const isOnline = isZoomEvent(event.title_he, event.custom_styles);
  const url = getEventUrl(event.slug);

  return (
    <a
      href={url}
      className="group flex-shrink-0 w-72 md:w-auto bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 flex flex-col"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Green date header strip */}
      <div className="bg-[#B8D900] px-5 py-4 flex items-center justify-between">
        {formattedDate ? (
          <span className="font-heading font-extrabold text-[#2a2628] text-xl leading-none">
            {formattedDate}
          </span>
        ) : (
          <span className="font-heading font-bold text-[#2a2628] text-sm">בקרוב</span>
        )}
        {eventTime && (
          <span className="font-heading font-bold text-[#2a2628] text-sm bg-[#2a2628]/10 px-3 py-1 rounded-full">
            {eventTime}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col flex-1">
        {/* Online / Physical badge */}
        <div className="mb-3">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              💻 זום
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
              📍 פיזי
            </span>
          )}
        </div>

        {/* Event title */}
        <h3 className="font-heading font-bold text-[#2a2628] text-base leading-snug mb-4 group-hover:text-[#716C70] transition-colors flex-1">
          {event.title_he ?? event.slug}
        </h3>

        {/* CTA */}
        <button className="w-full mt-auto py-3 rounded-xl bg-[#2a2628] text-white font-heading font-bold text-sm transition-all duration-300 group-hover:bg-[#B8D900] group-hover:text-[#2a2628]">
          הרשמה לאירוע
        </button>
      </div>
    </a>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HomepageClient - Main homepage component.
 * Renders hero, program finder, stats, benefits, testimonials, events, and lead form.
 * @param programs - Active programs with faculty data
 * @param events - Published event pages to show in the upcoming events section
 */
export function HomepageClient({ programs, events }: HomepageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "", program_interest: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  const finderRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const statsRef = useInView(0.2);
  const benefitsRef = useInView(0.1);
  const testimonialsRef = useInView(0.1);
  const eventsRef = useInView(0.1);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

  // Filter programs based on selected category and level
  const filteredPrograms = programs.filter((p) => {
    if (!selectedCategory) return false;
    const cat = QUIZ_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!cat) return false;
    if (cat.filterFn) {
      if (!cat.filterFn(p)) return false;
    } else if (cat.facultyMatch && p.faculty?.name_he !== cat.facultyMatch) {
      return false;
    }
    if (selectedLevel && p.level !== selectedLevel) return false;
    return true;
  });

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) return;
    setFormSubmitting(true);

    try {
      if (!document.cookie.includes("onoleads_id=")) {
        const cookieId = crypto.randomUUID();
        document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      }
      const cookieId = document.cookie.split("; ").find((c) => c.startsWith("onoleads_id="))?.split("=")[1] || "";
      const urlParams = new URLSearchParams(window.location.search);

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || null,
          program_interest: formData.program_interest || null,
          utm_source: urlParams.get("utm_source"),
          utm_medium: urlParams.get("utm_medium"),
          utm_campaign: urlParams.get("utm_campaign"),
          utm_content: urlParams.get("utm_content"),
          utm_term: urlParams.get("utm_term"),
          referrer: document.referrer || null,
          cookie_id: cookieId,
          device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        }),
      });

      setFormSubmitted(true);
    } catch (err) {
      console.error("Form submission failed:", err);
    }
    setFormSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CAMPUS_IMAGE}
            alt="קמפוס הקריה האקדמית אונו"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-20 text-center">
          {/* Logo */}
          <div
            className="mb-8 opacity-0"
            style={{ animation: heroVisible ? "fade-in-down 0.8s ease-out 0.1s forwards" : "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ONO_LOGO}
              alt="הקריה האקדמית אונו"
              className="h-16 md:h-20 mx-auto object-contain brightness-0 invert"
              loading="eager"
            />
          </div>

          {/* Main Headline */}
          <h1
            className="font-heading text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.1] mb-4 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.2s forwards" : "none" }}
          >
            הקריה האקדמית אונו
          </h1>

          {/* Sub headline */}
          <p
            className="text-xl md:text-2xl lg:text-3xl text-[#B8D900] font-heading font-bold mb-6 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.35s forwards" : "none" }}
          >
            המכללה המומלצת בישראל
          </p>

          {/* Animated tagline */}
          <p
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.5s forwards" : "none" }}
          >
            מצאו את התואר שישנה לכם את החיים
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0"
            style={{ animation: heroVisible ? "fade-in-up 0.8s ease-out 0.65s forwards" : "none" }}
          >
            <button
              onClick={() => scrollTo("finder")}
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_40px_rgba(184,217,0,0.4)] hover:scale-[1.03] active:scale-[0.98]"
            >
              מצאו את התואר שלכם
              <svg className="w-5 h-5 mr-2 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <button
              onClick={() => scrollTo("lead-form")}
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-heading font-bold text-lg transition-all duration-300 hover:bg-white/20 hover:border-white/50 hover:scale-[1.03] active:scale-[0.98]"
            >
              השאירו פרטים
            </button>
          </div>

          {/* Trust badge */}
          <div
            className="mt-12 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 opacity-0"
            style={{ animation: heroVisible ? "fade-in 1s ease-out 1s forwards" : "none" }}
          >
            <span className="text-white/70 text-sm">משנים את פני החברה בישראל</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8D900]" />
            <span className="text-white/70 text-sm">מעל 40,000 בוגרים</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-scroll-hint">
          <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </section>

      {/* ================================================================
          SMART PROGRAM FINDER
          ================================================================ */}
      <section id="finder" ref={finderRef} className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          {/* Section header */}
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              מנוע חיפוש תוכניות
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] mb-4">
              מצאו את התואר <span className="text-gradient-green">שמתאים לכם</span>
            </h2>
            <p className="text-lg text-[#716C70] max-w-xl mx-auto">
              בחרו את תחום העניין שלכם ואנחנו נמצא את התוכנית המושלמת
            </p>
          </div>

          {/* Step 1: Category Selection */}
          <div className="mb-10">
            <h3 className="font-heading text-lg font-bold text-[#2a2628] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#B8D900] text-[#2a2628] flex items-center justify-center text-sm font-bold">1</span>
              מה מעניין אותך?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {QUIZ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedLevel(null); }}
                  className={`group relative p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 text-center hover-lift ${
                    selectedCategory === cat.id
                      ? "border-[#B8D900] bg-[#B8D900]/5 shadow-[0_0_20px_rgba(184,217,0,0.15)]"
                      : "border-gray-200 bg-white hover:border-[#B8D900]/50"
                  }`}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <span className="text-3xl md:text-4xl block mb-3">{cat.icon}</span>
                    <span className="font-heading font-bold text-sm md:text-base text-[#2a2628]">{cat.label}</span>
                  </div>
                  {selectedCategory === cat.id && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#B8D900] flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#2a2628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Level Selection */}
          {selectedCategory && (
            <div className="mb-10 animate-fade-in-up">
              <h3 className="font-heading text-lg font-bold text-[#2a2628] mb-5 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#B8D900] text-[#2a2628] flex items-center justify-center text-sm font-bold">2</span>
                באיזו רמה?
              </h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: null, label: "הכל" },
                  { id: "bachelor", label: "תואר ראשון" },
                  { id: "master", label: "תואר שני" },
                ].map((level) => (
                  <button
                    key={level.id ?? "all"}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`px-6 py-3 rounded-full font-heading font-bold text-sm transition-all duration-300 ${
                      selectedLevel === level.id
                        ? "bg-[#B8D900] text-[#2a2628] shadow-[0_4px_15px_rgba(184,217,0,0.3)]"
                        : "bg-gray-100 text-[#716C70] hover:bg-gray-200"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {selectedCategory && (
            <div className="animate-fade-in-up">
              {filteredPrograms.length > 0 ? (
                <>
                  <p className="text-[#716C70] mb-6 font-medium">
                    נמצאו <span className="text-[#B8D900] font-bold">{filteredPrograms.length}</span> תוכניות
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPrograms.map((program, index) => {
                      // Use featured_page_slug if available, otherwise fall back to program slug
                      const programWithFeatured = program as ProgramWithFaculty & { featured_page_slug?: string | null };
                      const programUrl = getProgramUrl(programWithFeatured);

                      return (
                        <a
                          key={program.id}
                          href={programUrl}
                          className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          {/* Image */}
                          <div className="relative h-40 overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={program.hero_image_url || PROGRAM_IMAGES[selectedCategory] || STUDENTS_IMAGE}
                              alt={program.name_he}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            {/* Degree badge */}
                            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#B8D900] text-[#2a2628] text-xs font-bold">
                              {program.degree_type}
                            </div>
                          </div>
                          {/* Content */}
                          <div className="p-5">
                            {program.faculty && (
                              <span className="text-xs text-[#716C70] font-medium">{program.faculty.name_he}</span>
                            )}
                            <h3 className="font-heading font-bold text-lg text-[#2a2628] mt-1 mb-2 group-hover:text-[#B8D900] transition-colors">
                              {program.name_he}
                            </h3>
                            {program.description_he && (
                              <p className="text-sm text-[#716C70] line-clamp-2 mb-4">
                                {program.description_he}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[#B8D900] font-heading font-bold text-sm">
                              <span>למידע נוסף</span>
                              <svg className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-[#716C70] text-lg">לא נמצאו תוכניות בקטגוריה זו</p>
                  <p className="text-[#716C70] text-sm mt-2">נסו לשנות את הסינון או <button onClick={() => scrollTo("lead-form")} className="text-[#B8D900] font-bold hover:underline">השאירו פרטים</button> ויועץ יעזור לכם</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          WHY ONO SECTION
          ================================================================ */}
      <section className="py-20 md:py-28 bg-white" ref={benefitsRef.ref}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              למה אונו?
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628]">
              למה לבחור ב<span className="text-gradient-green">קריה האקדמית אונו</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {BENEFITS.map((benefit, index) => (
              <div
                key={index}
                className="group p-7 md:p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:border-[#B8D900]/30 transition-all duration-300 opacity-0"
                style={{
                  animation: benefitsRef.inView ? `fade-in-up 0.6s ease-out ${index * 0.15}s forwards` : "none",
                }}
              >
                <div className="text-4xl mb-5">{benefit.icon}</div>
                <h3 className="font-heading font-bold text-xl text-[#2a2628] mb-3 group-hover:text-[#B8D900] transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-[#716C70] leading-relaxed text-sm">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          STATS SECTION
          ================================================================ */}
      <section className="relative py-20 md:py-24 overflow-hidden" ref={statsRef.ref}>
        {/* Background */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={STUDENTS2_IMAGE}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#2a2628]/90" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, index) => (
              <AnimatedStatCard key={index} stat={stat} inView={statsRef.inView} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          TESTIMONIALS SECTION
          ================================================================ */}
      <section className="py-20 md:py-28 bg-gray-50" ref={testimonialsRef.ref}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              המלצות
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628]">
              מה אומרים <span className="text-gradient-green">הסטודנטים שלנו</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                className="relative bg-white rounded-2xl p-7 md:p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 opacity-0"
                style={{
                  animation: testimonialsRef.inView ? `fade-in-up 0.6s ease-out ${index * 0.15}s forwards` : "none",
                }}
              >
                {/* Green quote decoration */}
                <div className="absolute -top-3 right-6 text-[#B8D900]">
                  <svg className="w-10 h-10 opacity-30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <p className="text-[#2a2628] text-base leading-relaxed mb-6 mt-3">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B8D900] to-[#9ab800] flex items-center justify-center text-[#2a2628] font-heading font-bold text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-[#2a2628] text-sm">{testimonial.name}</p>
                    <p className="text-xs text-[#716C70]">{testimonial.program}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          UPCOMING EVENTS SECTION
          Only rendered when there are published event pages
          ================================================================ */}
      <section
        id="events"
        className="py-20 md:py-28 bg-white"
        ref={eventsRef.ref}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              הצטרפו אלינו
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628]">
              <span className="text-gradient-green">אירועים קרובים</span> - ימי פתוח
            </h2>
            <p className="text-lg text-[#716C70] max-w-xl mx-auto mt-4">
              הכירו את הקמפוס, פגשו את הסגל, ומצאו את התוכנית המתאימה לכם
            </p>
          </div>

          {events.length > 0 ? (
            <>
              {/* Cards: horizontal scroll on mobile, grid on desktop */}
              <div className="flex gap-5 overflow-x-auto pb-4 md:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 snap-x snap-mandatory md:snap-none scrollbar-hide">
                {events.map((event, index) => (
                  <div key={event.id} className="snap-start opacity-0"
                    style={{
                      animation: eventsRef.inView ? `fade-in-up 0.6s ease-out ${index * 0.12}s forwards` : "none",
                      minWidth: "288px",
                    }}
                  >
                    <EventCard event={event} index={index} />
                  </div>
                ))}
              </div>

              {/* CTA under events */}
              <div className="text-center mt-10">
                <button
                  onClick={() => scrollTo("lead-form")}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#B8D900] hover:shadow-[0_0_30px_rgba(184,217,0,0.3)]"
                >
                  לא מצאתם? השאירו פרטים ויועץ יחזור אליכם
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-14 rounded-3xl border border-dashed border-gray-200 bg-gray-50">
              <div className="text-4xl mb-4">📅</div>
              <p className="font-heading font-bold text-[#2a2628] text-xl mb-2">אין אירועים קרובים כרגע</p>
              <p className="text-[#716C70] text-base mb-6">
                השאירו פרטים ונעדכן אתכם על האירוע הבא
              </p>
              <button
                onClick={() => scrollTo("lead-form")}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all hover:bg-[#c8e920]"
              >
                עדכנו אותי על האירוע הבא
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          LEAD FORM SECTION
          ================================================================ */}
      <section id="lead-form" ref={formRef} className="relative py-20 md:py-28 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2628] via-[#3a3638] to-[#2a2628]" />
        <div className="absolute inset-0 opacity-5">
          <div
            style={{
              backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              מוכנים ל<span className="text-[#B8D900]">צעד הבא</span>?
            </h2>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              השאירו פרטים ויועץ לימודים אישי יחזור אליכם בקרוב
            </p>
          </div>

          {formSubmitted ? (
            <div className="max-w-lg mx-auto text-center animate-scale-in">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check-draw" />
                </svg>
              </div>
              <h3 className="font-heading text-2xl font-bold text-white mb-3">תודה רבה!</h3>
              <p className="text-white/70">נציג יחזור אליכם בהקדם</p>
              <p className="text-white/50 text-sm mt-2">הקריה האקדמית אונו - המכללה המומלצת בישראל</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-10">
                <div className="grid md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">שם מלא *</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full h-14 rounded-xl bg-white/10 border border-white/20 px-5 text-white text-base placeholder:text-white/40 focus:border-[#B8D900] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                      placeholder="הכניסו את שמכם המלא"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">טלפון *</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-14 rounded-xl bg-white/10 border border-white/20 px-5 text-white text-base placeholder:text-white/40 focus:border-[#B8D900] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all text-right"
                      placeholder="050-000-0000"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5 mb-8">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">אימייל</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-14 rounded-xl bg-white/10 border border-white/20 px-5 text-white text-base placeholder:text-white/40 focus:border-[#B8D900] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all text-right"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">תוכנית מבוקשת</label>
                    <select
                      value={formData.program_interest}
                      onChange={(e) => setFormData({ ...formData, program_interest: e.target.value })}
                      className="w-full h-14 rounded-xl bg-white/10 border border-white/20 px-5 text-white text-base focus:border-[#B8D900] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all appearance-none"
                    >
                      <option value="" className="bg-[#2a2628]">בחרו תוכנית...</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.name_he} className="bg-[#2a2628]">
                          {p.name_he} ({p.degree_type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full h-16 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-xl transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_40px_rgba(184,217,0,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      שולח...
                    </span>
                  ) : (
                    "קבלו מידע מלא - ללא התחייבות"
                  )}
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>100% פרטיות</span>
                </div>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ללא התחייבות</span>
                </div>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>יועץ יחזור בקרוב</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ================================================================
          CAMPUS IMAGES
          ================================================================ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628]">
              קמפוסים <span className="text-gradient-green">ברחבי הארץ</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { img: "https://www.ono.ac.il/wp-content/uploads/2019/02/V2_OP2-e1677752521329.jpg", name: "קריית אונו" },
              { img: "https://www.ono.ac.il/wp-content/uploads/2019/02/-e1658759337760.jpg", name: "ירושלים" },
              { img: "https://www.ono.ac.il/wp-content/uploads/2019/02/haifa-min-1-e1671529340246.jpg", name: "חיפה" },
            ].map((campus, i) => (
              <div key={i} className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={campus.img}
                  alt={`קמפוס ${campus.name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 right-4">
                  <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white font-heading font-bold text-sm border border-white/20">
                    {campus.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="bg-[#2a2628] text-white/70 py-12">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ONO_LOGO}
                alt="הקריה האקדמית אונו"
                className="h-10 object-contain brightness-0 invert opacity-70"
                loading="lazy"
              />
              <div>
                <p className="text-white/90 font-heading font-bold text-sm">הקריה האקדמית אונו</p>
                <p className="text-xs text-white/50">המכללה המומלצת בישראל</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <a href="tel:*2899" className="hover:text-[#B8D900] transition-colors">*2899</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">ono.ac.il</a>
            </div>

            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} הקריה האקדמית אונו. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
