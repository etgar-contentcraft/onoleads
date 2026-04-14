/**
 * Generalized popup overlay component for the OnoLeads landing page system.
 * Renders a centered modal dialog driven by a PopupCampaign's content.
 *
 * Features:
 *  - Inline lead form / WhatsApp CTA / standard CTA modal modes
 *  - Image (top, side, background) and YouTube/Vimeo video embedding
 *  - Countdown timer with live tick
 *  - Social proof text + star rating display
 *  - Confetti burst on successful form submission
 *  - Mobile-specific content override (merges on screens < 768px)
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PopupContent } from "@/lib/types/popup-campaigns";
import { useCtaModal, type LeadSource } from "@/components/landing/cta-modal";
import { getLeadClickIds } from "@/lib/analytics/click-ids";
import { generateEventId } from "@/lib/analytics/event-id";

// ============================================================================
// Props
// ============================================================================

/** Interest area option passed down from the page */
interface InterestAreaOption {
  id: string;
  name_he: string;
  name_en: string | null;
  slug: string;
}

interface PopupOverlayProps {
  content: PopupContent;
  language?: "he" | "en" | "ar";
  whatsappNumber?: string;
  pageId?: string;
  programId?: string;
  pageSlug?: string;
  /** Interest areas assigned to the page — when >1, shows a dropdown in the form */
  pageInterestAreas?: InterestAreaOption[];
  /** Optional "I don't know" option shown first in the interest dropdown */
  unknownOption?: { text: string; mapsToName: string };
  /** Campaign trigger type — used for lead source tracking */
  triggerType?: "exit_intent" | "timed" | "scroll_triggered" | "sticky_bar";
  onDismiss: () => void;
  onCtaClick: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_NAME_LENGTH = 2;
const PHONE_REGEX = /^[\d\-+() ]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_BASE_URL = "https://wa.me/";
const MOBILE_BREAKPOINT = 768;

// ============================================================================
// Helpers
// ============================================================================

/** Builds a YouTube embed URL from any youtube.com or youtu.be URL */
function buildYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1).split("?")[0];
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      if (!videoId) {
        // handle /embed/ URLs
        const match = u.pathname.match(/\/embed\/([^/?]+)/);
        if (match) videoId = match[1];
      }
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

/** Builds a Vimeo embed URL from any vimeo.com URL */
function buildVimeoEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return null;
    return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1&background=1`;
  } catch {
    return null;
  }
}

/** Returns an embeddable iframe src from a YouTube or Vimeo URL, or null */
function getVideoEmbedUrl(url: string): string | null {
  if (url.includes("youtube") || url.includes("youtu.be")) return buildYouTubeEmbedUrl(url);
  if (url.includes("vimeo")) return buildVimeoEmbedUrl(url);
  return null;
}

/** Computes remaining time from now to a target ISO date */
function getTimeRemaining(targetISO: string): { d: number; h: number; m: number; s: number; expired: boolean } {
  const diff = Math.max(0, new Date(targetISO).getTime() - Date.now());
  if (diff === 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3600000) % 24;
  const d = Math.floor(diff / 86400000);
  return { d, h, m, s, expired: false };
}

// ============================================================================
// Confetti Component
// ============================================================================

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
}

const CONFETTI_COLORS = ["#B8D900", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

/**
 * Simple CSS-only confetti burst — fires 40 particles from the center.
 * Auto-removes after the longest animation completes (2.5s).
 */
function Confetti({ onDone }: { onDone: () => void }) {
  const particles: ConfettiParticle[] = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 600,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.3,
    duration: 1.5 + Math.random() * 1,
    rotate: Math.random() * 720 - 360,
  }));

  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-sm"
          style={{
            backgroundColor: p.color,
            animation: `confettiFly ${p.duration}s ease-out ${p.delay}s forwards`,
            // We use CSS custom properties for per-particle trajectory
            ["--cx" as string]: `${p.x}px`,
            ["--rotate" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFly {
          0%   { transform: translate(-50%, -50%) rotate(0deg) translateY(0px) translateX(0px); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--rotate)) translateY(400px) translateX(var(--cx)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Countdown Display
// ============================================================================

/**
 * Live countdown clock showing days (if > 0), hours, minutes, seconds.
 * Ticks every second via setInterval.
 */
function CountdownTimer({ targetISO, accentColor }: { targetISO: string; accentColor: string }) {
  const [time, setTime] = useState(() => getTimeRemaining(targetISO));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeRemaining(targetISO)), 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  if (time.expired) return null;

  const units = [
    ...(time.d > 0 ? [{ label: "ימים", value: time.d }] : []),
    { label: "שעות", value: time.h },
    { label: "דקות", value: time.m },
    { label: "שניות", value: time.s },
  ];

  return (
    <div className="flex justify-center items-center gap-2 mb-4">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2">
          <div
            className="flex flex-col items-center min-w-[44px] py-1.5 px-2 rounded-lg"
            style={{ backgroundColor: accentColor + "22", border: `1px solid ${accentColor}44` }}
          >
            <span className="text-xl font-bold tabular-nums leading-tight" style={{ color: accentColor }}>
              {String(u.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] text-[#767276] leading-none mt-0.5">{u.label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-lg font-bold" style={{ color: accentColor }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Star Rating Display
// ============================================================================

/**
 * Visual star rating row: filled/partial/empty stars + review count.
 */
function StarRating({ score, count }: { score: number; count: number }) {
  return (
    <div className="flex justify-center items-center gap-1.5 mb-3">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.min(1, Math.max(0, score - i));
          return (
            <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id={`star-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
                  <stop offset={`${fill * 100}%`} stopColor="#E5E7EB" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={`url(#star-${i})`}
              />
            </svg>
          );
        })}
      </div>
      <span className="text-xs text-[#767276]">{score.toFixed(1)}</span>
      <span className="text-xs text-[#767276]">({count.toLocaleString("he-IL")} ביקורות)</span>
    </div>
  );
}

// ============================================================================
// Media Renderer
// ============================================================================

/**
 * Renders image or video based on media_type + media_url.
 * For video URLs, embeds YouTube/Vimeo as an iframe.
 */
function MediaRenderer({
  mediaType,
  mediaUrl,
  className = "",
}: {
  mediaType: string;
  mediaUrl: string;
  className?: string;
}) {
  if (mediaType === "image") {
    return (
      <img
        src={mediaUrl}
        alt=""
        aria-hidden="true"
        className={`object-cover w-full h-full ${className}`}
      />
    );
  }

  if (mediaType === "video") {
    const embedSrc = getVideoEmbedUrl(mediaUrl);
    if (embedSrc) {
      return (
        <iframe
          src={embedSrc}
          className={`w-full h-full border-0 ${className}`}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          title="popup video"
          aria-hidden="true"
        />
      );
    }
    // Fallback: native <video> for direct video file URLs
    return (
      <video
        src={mediaUrl}
        className={`object-cover w-full h-full ${className}`}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    );
  }

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Popup overlay supporting:
 *  - Layout: top media, side media, background media
 *  - Countdown timer, social proof, star ratings
 *  - Confetti on form submit
 *  - Mobile-specific content override
 */
/** Privacy policy URLs per language */
const PRIVACY_URLS: Record<string, { privacy: string; terms: string }> = {
  he: {
    privacy: "https://www.ono.ac.il/privacy-policy-2/",
    terms: "https://www.ono.ac.il/terms-for-using-the-site/",
  },
  en: {
    privacy: "https://www.ono.ac.il/eng/privacy-policy-4/",
    terms: "https://www.ono.ac.il/eng/privacy-policy-4/",
  },
  ar: {
    privacy: "https://www.ono.ac.il/privacy-policy-2/",
    terms: "https://www.ono.ac.il/terms-for-using-the-site/",
  },
};

export function PopupOverlay({
  content: basePropContent,
  language = "he",
  whatsappNumber,
  pageId,
  programId,
  pageSlug,
  pageInterestAreas,
  unknownOption,
  triggerType,
  onDismiss,
  onCtaClick,
}: PopupOverlayProps) {
  const { open: openCtaModal } = useCtaModal();
  const router = useRouter();
  const isRtl = language === "he" || language === "ar";

  // ---------------------------------------------------------------------------
  // Mobile override — merge base content with mobile_override on small screens
  // ---------------------------------------------------------------------------
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Merge mobile_override fields on top of base content when on mobile
  const content: PopupContent = isMobile && basePropContent.mobile_override
    ? { ...basePropContent, ...basePropContent.mobile_override }
    : basePropContent;

  // Resolve effective media type and URL (supports legacy image_url)
  const mediaType = content.media_type ?? (content.image_url ? "image" : "none");
  const mediaUrl = content.media_url ?? content.image_url ?? "";
  const mediaPosition = content.media_position ?? "top";
  const hasMedia = mediaType !== "none" && mediaUrl;

  // ---------------------------------------------------------------------------
  // Lead source
  // ---------------------------------------------------------------------------
  const popupLeadSource: LeadSource = triggerType === "exit_intent" ? "popup_exit_intent"
    : triggerType === "timed" ? "popup_timed"
    : triggerType === "scroll_triggered" ? "popup_scroll"
    : "unknown";

  // ---------------------------------------------------------------------------
  // Inline form state
  // ---------------------------------------------------------------------------
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "" });
  const [honeypot, setHoneypot] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [formToken, setFormToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedInterestArea, setSelectedInterestArea] = useState("");
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const hasMultipleAreas = (pageInterestAreas?.length ?? 0) > 1;
  /** Behavioral tracking refs for bot-detection scoring */
  const formMountTimeRef = useRef<number>(0);
  const hasKeystrokeRef = useRef(false);
  const hasInteractionRef = useRef(false);

  /** Computes a 0–100 behavioral score from dwell time, keystrokes, and interaction */
  const computeBehaviorScore = useCallback((): number => {
    const dwell = Date.now() - formMountTimeRef.current;
    const dwellScore = dwell < 2000 ? 0 : dwell < 5000 ? 40 : 60;
    const keystrokeScore = hasKeystrokeRef.current ? 30 : 0;
    const interactionScore = hasInteractionRef.current ? 10 : 0;
    return Math.min(dwellScore + keystrokeScore + interactionScore, 100);
  }, []);
  const singleAreaName = pageInterestAreas?.length === 1 ? pageInterestAreas[0].name_he : undefined;
  const privacyUrls = PRIVACY_URLS[language] || PRIVACY_URLS.he;

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  useEffect(() => {
    if (content.include_form) {
      // CSRF token from middleware cookie
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrf_token="))
        ?.split("=")[1] || "";
      setCsrfToken(token);

      // Form time-token: base64({t, n}) — server validates age 4s–15min
      const ft = { t: Date.now(), n: crypto.randomUUID() };
      setFormToken(btoa(JSON.stringify(ft)));

      // Start behavioral tracking
      formMountTimeRef.current = Date.now();
      hasKeystrokeRef.current = false;
      hasInteractionRef.current = false;

      const handleInteraction = () => { hasInteractionRef.current = true; };
      window.addEventListener("mousemove", handleInteraction, { once: true });
      window.addEventListener("touchstart", handleInteraction, { once: true });
      return () => {
        window.removeEventListener("mousemove", handleInteraction);
        window.removeEventListener("touchstart", handleInteraction);
      };
    }
  }, [content.include_form]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < MIN_NAME_LENGTH) {
      newErrors.full_name = isRtl ? "שדה חובה" : "Required";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = isRtl ? "שדה חובה" : "Required";
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = isRtl ? "טלפון לא תקין" : "Invalid phone";
    }
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      newErrors.email = isRtl ? "אימייל לא תקין" : "Invalid email";
    }
    if (hasMultipleAreas && !selectedInterestArea) {
      newErrors.interest_area = isRtl ? "יש לבחור תחום עניין" : "Please select an area";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isRtl, hasMultipleAreas, selectedInterestArea]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const resolvedInterestArea = hasMultipleAreas
        ? (selectedInterestArea === "__unknown__"
            ? (unknownOption?.mapsToName || null)
            : (selectedInterestArea || null))
        : (singleAreaName || null);

      const cookieId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("onoleads_id="))
        ?.split("=")[1] || "";

      /* UTM cookie persistence */
      const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
      const utmFromUrl: Record<string, string> = {};
      for (const k of UTM_KEYS) { const v = urlParams.get(k); if (v) utmFromUrl[k] = v; }
      let storedUtm: Record<string, string> = {};
      const storedUtmCookie = document.cookie.split("; ").find((c) => c.startsWith("ono_utm="))?.split("=").slice(1).join("=") || "";
      if (storedUtmCookie) { try { storedUtm = JSON.parse(decodeURIComponent(storedUtmCookie)); } catch { /* ignore */ } }
      if (Object.keys(utmFromUrl).length > 0) {
        document.cookie = `ono_utm=${encodeURIComponent(JSON.stringify(utmFromUrl))}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
        storedUtm = utmFromUrl;
      }

      const clickIds = getLeadClickIds();
      const eventId = generateEventId("lead_submit", pageId || "unknown", cookieId);

      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        page_id: pageId || null,
        page_slug: pageSlug || null,
        program_id: programId || null,
        interest_area: resolvedInterestArea,
        utm_source: utmFromUrl.utm_source || storedUtm.utm_source || null,
        utm_medium: utmFromUrl.utm_medium || storedUtm.utm_medium || null,
        utm_campaign: utmFromUrl.utm_campaign || storedUtm.utm_campaign || null,
        utm_content: utmFromUrl.utm_content || storedUtm.utm_content || null,
        utm_term: utmFromUrl.utm_term || storedUtm.utm_term || null,
        referrer: document.referrer || null,
        cookie_id: cookieId,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop" as "mobile" | "tablet" | "desktop",
        lead_source: popupLeadSource,
        /* Security fields */
        csrf_token: csrfToken,
        form_token: formToken,
        behavior_score: computeBehaviorScore(),
        website: honeypot,
        /* Attribution */
        event_id: eventId,
        marketing_consent: true,
        ...clickIds,
        fbp: (() => { const c = document.cookie.split("; ").find(x => x.startsWith("_fbp=")); return c ? c.split("=").slice(1).join("=") : null; })(),
        ga_client_id: (() => { const c = document.cookie.split("; ").find(x => x.startsWith("_ga=")); return c ? c.split("=").slice(1).join("=") : null; })(),
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onCtaClick();
        if (content.confetti_on_submit) setShowConfetti(true);

        const fullName = formData.full_name.trim();
        if (fullName) sessionStorage.setItem("ty_name", fullName);
        if (formData.email) sessionStorage.setItem("ty_email", formData.email);
        if (formData.phone) sessionStorage.setItem("ty_phone", formData.phone);
        sessionStorage.setItem("ty_event_id", generateEventId("lead_submit", pageId || "unknown", document.cookie.split("; ").find((c) => c.startsWith("onoleads_id="))?.split("=")[1] || ""));

        if (pageSlug) {
          onDismiss();
          router.push(`/lp/${encodeURIComponent(pageSlug)}/ty`);
        } else {
          setSubmitSuccess(true);
        }
      } else {
        const errorData = await res.json().catch(() => null);
        setSubmitError(errorData?.error || (isRtl ? "אירעה שגיאה. אנא נסו שוב." : "An error occurred."));
      }
    } catch {
      setSubmitError(isRtl ? "אירעה שגיאה בחיבור. אנא נסו שוב." : "Connection error.");
    }

    setSubmitting(false);
  };

  // ---------------------------------------------------------------------------
  // CTA handler
  // ---------------------------------------------------------------------------

  const handleCtaClick = () => {
    onCtaClick();
    if (content.whatsapp_action && whatsappNumber) {
      const cleanNumber = whatsappNumber.replace(/\D/g, "");
      window.open(`${WHATSAPP_BASE_URL}${cleanNumber}`, "_blank", "noopener,noreferrer");
      onDismiss();
    } else {
      onDismiss();
      openCtaModal(popupLeadSource);
    }
  };

  // ---------------------------------------------------------------------------
  // Layout helpers
  // ---------------------------------------------------------------------------

  /** Whether the card uses the side-by-side layout (image left, content right) */
  const isSideLayout = hasMedia && mediaPosition === "side";
  /** Whether the media fills the entire card background */
  const isBackgroundLayout = hasMedia && mediaPosition === "background";
  /** Max width increases for side layout to accommodate both panels */
  const maxWidth = isSideLayout ? "max-w-2xl" : "max-w-md";

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  /** The text content panel — shared across all layouts */
  const contentPanel = (
    <div className={`p-7 ${isSideLayout ? "flex-1" : ""} text-center relative`}>
      {/* Accent bar */}
      {!isBackgroundLayout && (
        <div className="w-12 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: content.accent_color }} />
      )}

      {/* Top media (non-background, non-side) */}
      {hasMedia && mediaPosition === "top" && (
        <div className="mb-4 rounded-xl overflow-hidden" style={{ height: mediaType === "video" ? 180 : "auto" }}>
          <MediaRenderer mediaType={mediaType} mediaUrl={mediaUrl} />
        </div>
      )}

      {/* Countdown timer */}
      {content.countdown_end && (
        <CountdownTimer targetISO={content.countdown_end} accentColor={content.accent_color} />
      )}

      {/* Star rating */}
      {content.rating && (
        <StarRating score={content.rating.score} count={content.rating.count} />
      )}

      {/* Title */}
      {content.title_he && (
        <h2
          className={`font-heading text-xl font-extrabold mb-2 ${isBackgroundLayout ? "text-white" : "text-[#2a2628]"}`}
        >
          {content.title_he}
        </h2>
      )}

      {/* Body */}
      {content.body_he && (
        <p
          className={`font-heebo text-sm mb-4 leading-relaxed ${isBackgroundLayout ? "text-white/80" : "text-[#5A5658]"}`}
        >
          {content.body_he}
        </p>
      )}

      {/* Social proof */}
      {content.social_proof_text && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className={`text-xs font-medium ${isBackgroundLayout ? "text-white/70" : "text-[#767276]"}`}>
            {content.social_proof_text}
          </span>
        </div>
      )}

      {/* ── Inline form ── */}
      {content.include_form && !submitSuccess && (
        <>
          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {submitError}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-3 text-right" dir="rtl" noValidate>
            {/* Honeypot */}
            <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
              <label htmlFor="popup_website">{isRtl ? "אל תמלאו שדה זה" : "Do not fill"}</label>
              <input id="popup_website" name="website" type="text" value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            {/* Full Name */}
            <div>
              <input id="popup_full_name" type="text" value={formData.full_name}
                onChange={(e) => { hasKeystrokeRef.current = true; setFormData({ ...formData, full_name: e.target.value }); }}
                placeholder={isRtl ? "שם מלא *" : "Full name *"} autoComplete="name"
                className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-4 text-[#2a2628] text-sm placeholder:text-gray-500 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 focus:shadow-[0_0_0_3px_rgba(184,217,0,0.12)] transition-all duration-200"
                aria-required="true" aria-invalid={!!errors.full_name} />
              {errors.full_name && <p role="alert" className="text-red-500 text-xs mt-1 font-medium">{errors.full_name}</p>}
            </div>

            {/* Phone */}
            <div>
              <input id="popup_phone" type="tel" value={formData.phone}
                onChange={(e) => { hasKeystrokeRef.current = true; setFormData({ ...formData, phone: e.target.value }); }}
                placeholder={isRtl ? "טלפון *" : "Phone *"} dir="ltr" autoComplete="tel"
                className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-4 text-[#2a2628] text-sm placeholder:text-gray-500 text-left focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 focus:shadow-[0_0_0_3px_rgba(184,217,0,0.12)] transition-all duration-200"
                aria-required="true" aria-invalid={!!errors.phone} />
              {errors.phone && <p role="alert" className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <input id="popup_email" type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={isRtl ? "אימייל" : "Email"} dir="ltr" autoComplete="email"
                className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 px-4 text-[#2a2628] text-sm placeholder:text-gray-500 text-left focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 focus:shadow-[0_0_0_3px_rgba(184,217,0,0.12)] transition-all duration-200"
                aria-invalid={!!errors.email} />
              {errors.email && <p role="alert" className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
            </div>

            {/* Interest area dropdown — shown only when page has multiple areas */}
            {hasMultipleAreas && (
              <div>
                <label htmlFor="popup_interest_area" className="sr-only">
                  {isRtl ? "תחום עניין" : "Area of interest"}
                </label>
                <select
                  id="popup_interest_area"
                  value={selectedInterestArea}
                  onChange={(e) => setSelectedInterestArea(e.target.value)}
                  className={`w-full h-11 rounded-xl bg-gray-50 border px-4 text-[#2a2628] text-sm focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 focus:shadow-[0_0_0_3px_rgba(184,217,0,0.12)] transition-all duration-200 appearance-none ${errors.interest_area ? "border-red-300" : "border-gray-200"}`}
                  aria-required="true"
                  aria-invalid={!!errors.interest_area}
                >
                  <option value="">{isRtl ? "בחרו תחום עניין *" : "Select area of interest *"}</option>
                  {unknownOption && (
                    <option value="__unknown__">{unknownOption.text}</option>
                  )}
                  {pageInterestAreas!.map((area) => (
                    <option key={area.id} value={area.name_he}>{area.name_he}</option>
                  ))}
                </select>
                {errors.interest_area && (
                  <p role="alert" className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errors.interest_area}
                  </p>
                )}
              </div>
            )}

            {/* Privacy disclaimer — collapsed by default */}
            <div className="text-[10px] leading-relaxed text-[#767276] pt-1">
              <p>
                {isRtl
                  ? "מילוי הפרטים מהווה הסכמה לשימוש במידע לפי "
                  : "Submitting constitutes consent per "}
                <a href={privacyUrls.privacy} target="_blank" rel="noopener noreferrer"
                  className="underline hover:text-[#5A5658] transition-colors">
                  {isRtl ? "מדיניות הפרטיות" : "our privacy policy"}
                </a>
                {isRtl ? " ולקבלת פניות בקשר ללימודים." : " and to receive study-related communications."}
              </p>
              <button
                type="button"
                onClick={() => setPrivacyExpanded(!privacyExpanded)}
                className="flex items-center gap-1 mt-1 text-[#B8D900]/70 hover:text-[#B8D900] transition-colors"
              >
                <span className="text-[9px]">{privacyExpanded ? "▲" : "▼"}</span>
                {isRtl ? "קרא עוד" : "Read more"}
              </button>
              {privacyExpanded && (
                <p className="mt-1 text-[9px] text-[#B0B0B0] leading-relaxed">
                  {isRtl
                    ? "ניתן להפסיק לקבל פניות בכל עת באמצעות פנייה אל marketing@ono.ac.il או בלחיצה על קישור \"הסר מרשימת התפוצה\" בכל הודעת דוא\"ל."
                    : "You can stop receiving messages at any time by contacting marketing@ono.ac.il or by clicking the unsubscribe link in any email."}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl font-heading font-bold text-base transition-all duration-300 hover:shadow-[var(--shadow-green)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: content.accent_color, color: "#2a2628" }}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isRtl ? "שולח..." : "Sending..."}
                </span>
              ) : content.cta_text_he}
            </button>
          </form>
        </>
      )}

      {/* ── Inline form success ── */}
      {content.include_form && submitSuccess && (
        <div className="py-4 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: content.accent_color }}>
            <svg className="w-6 h-6 text-[#2a2628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-heading text-lg font-bold text-[#2a2628]">
            {isRtl ? "הפרטים נשלחו בהצלחה!" : "Details sent successfully!"}
          </p>
          <p className="font-heebo text-[#5A5658] text-sm mt-1">
            {isRtl ? "ניצור איתכם קשר בהקדם" : "We will contact you soon"}
          </p>
        </div>
      )}

      {/* ── Standard / WhatsApp CTA button ── */}
      {!content.include_form && (
        <button onClick={handleCtaClick}
          className="w-full py-3 rounded-xl font-heading font-bold text-base transition-all duration-300 hover:shadow-[var(--shadow-green)] hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: content.accent_color, color: "#2a2628" }}>
          {content.cta_text_he}
        </button>
      )}

      {/* Dismiss */}
      <button onClick={onDismiss}
        className={`w-full py-2 mt-3 text-xs transition-colors ${isBackgroundLayout ? "text-white/50 hover:text-white/70" : "text-[#767276] hover:text-[#5A5658]"}`}>
        {content.dismiss_text_he}
      </button>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center p-4 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
      dir={isRtl ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={content.title_he}
    >
      {/* Backdrop — Premium Glass */}
      <div className="absolute inset-0 glass-backdrop" onClick={onDismiss} aria-hidden="true" />

      {/* Card — Premium Glass with slide-up-spring entrance */}
      <div
        className={`relative rounded-2xl shadow-[var(--shadow-modal)] ${maxWidth} w-full overflow-hidden ${mounted ? "animate-slide-up-spring" : "opacity-0 translate-y-6"}`}
        style={{ backgroundColor: isBackgroundLayout ? "transparent" : content.bg_color }}
      >
        {/* Background media layer */}
        {isBackgroundLayout && hasMedia && (
          <div className="absolute inset-0 z-0">
            <MediaRenderer mediaType={mediaType} mediaUrl={mediaUrl} />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/55" />
          </div>
        )}

        {/* Confetti */}
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

        {/* Close button */}
        <button
          onClick={onDismiss}
          className={`absolute top-3 end-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:rotate-90 ${isBackgroundLayout ? "bg-white/20 hover:bg-white/30 text-white" : "bg-black/5 hover:bg-black/10 text-gray-400 hover:text-gray-600"}`}
          aria-label={isRtl ? "סגור" : "Close"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Side layout — media panel left, content right */}
        {isSideLayout ? (
          <div className="flex" style={{ backgroundColor: content.bg_color }}>
            {/* Media panel */}
            <div className="w-52 shrink-0 relative overflow-hidden rounded-s-2xl">
              <MediaRenderer mediaType={mediaType} mediaUrl={mediaUrl} className="absolute inset-0 object-cover" />
            </div>
            {contentPanel}
          </div>
        ) : (
          /* Top / Background layouts */
          <div className="relative z-10">{contentPanel}</div>
        )}
      </div>
    </div>
  );
}
