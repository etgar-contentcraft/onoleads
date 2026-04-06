"use client";

/**
 * ThankYouPage — premium post-lead conversion page.
 *
 * Sections (all configurable):
 * 1. Animated success confirmation with personalized name
 * 2. "What happens next" 3-step timeline
 * 3. WhatsApp CTA — highest show-up driver
 * 4. Social media follows
 * 5. Referral / share with friend
 * 6. Calendar booking (optional)
 * 7. Video message (optional)
 */

import { useEffect, useState } from "react";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";

const ONO_LOGO = "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";

/** Extract first name from full name */
function firstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

/** Build a WhatsApp href */
function whatsappHref(phone: string, message = ""): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encoded}`;
}

// ── Social icon SVGs ──────────────────────────────────────────────────────────

const SocialIcons = {
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

// ── Translations ─────────────────────────────────────────────────────────────

const TY_TEXTS: Record<string, Record<string, string>> = {
  he: {
    thank_you: "תודה",
    default_heading: "תודה! קיבלנו את פרטיך",
    default_subheading: "יועץ לימודים ייצור איתך קשר בקרוב",
    what_now: "מה קורה עכשיו?",
    step_1: "קיבלנו את פרטיך בהצלחה",
    step_2: "יועץ לימודים יחזור אליך בקרוב",
    step_3: "נתחיל לתכנן את המסלול שלך",
    whatsapp_cta: "רוצים לדבר עכשיו?",
    whatsapp_msg: "היי, זה עתה השארתי פרטים ואשמח לקבל מידע נוסף",
    calendar_cta: "קבעו שיחה עכשיו",
    follow_us: "עקבו אחרינו ברשתות",
    share_cta: "שתפו עם חבר שמחפש תואר",
    shared: "שותף!",
    back_link: "← חזרה לעמוד התוכנית",
    share_text: "יש לי תוכנית לימודים שאולי תתאים לך בהקריה האקדמית אונו",
  },
  en: {
    thank_you: "Thank you",
    default_heading: "Thank you! We received your details",
    default_subheading: "An academic advisor will contact you shortly",
    what_now: "What happens next?",
    step_1: "We received your details successfully",
    step_2: "An academic advisor will contact you shortly",
    step_3: "We'll start planning your academic path",
    whatsapp_cta: "Want to talk now?",
    whatsapp_msg: "Hi, I just submitted my details and would love to get more information",
    calendar_cta: "Schedule a call now",
    follow_us: "Follow us on social media",
    share_cta: "Share with a friend looking for a degree",
    shared: "Shared!",
    back_link: "← Back to program page",
    share_text: "Check out this study program at Ono Academic College",
  },
  ar: {
    thank_you: "شكراً",
    default_heading: "!شكراً لك! استلمنا بياناتك",
    default_subheading: "مستشار أكاديمي سيتواصل معك قريبًا",
    what_now: "ماذا يحدث الآن؟",
    step_1: "استلمنا بياناتك بنجاح",
    step_2: "مستشار أكاديمي سيتواصل معك قريبًا",
    step_3: "سنبدأ بتخطيط مسارك الأكاديمي",
    whatsapp_cta: "تريد التحدث الآن؟",
    whatsapp_msg: "مرحباً، لقد أرسلت بياناتي وأود الحصول على مزيد من المعلومات",
    calendar_cta: "حدد موعد مكالمة الآن",
    follow_us: "تابعونا على الشبكات الاجتماعية",
    share_cta: "شاركوا مع صديق يبحث عن شهادة",
    shared: "!تمت المشاركة",
    back_link: "→ العودة إلى صفحة البرنامج",
    share_text: "ألق نظرة على برنامج الدراسة هذا في كلية أونو الأكاديمية",
  },
};

/** Get translation text for a given language, falling back to Hebrew */
function t(lang: string, key: string): string {
  return TY_TEXTS[lang]?.[key] || TY_TEXTS.he[key] || key;
}

// ── Step timeline icons (shared across languages) ────────────────────────────

const STEP_ICONS = [
  <svg key="1" className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>,
  <svg key="2" className="w-5 h-5 text-[#716C70]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>,
  <svg key="3" className="w-5 h-5 text-[#716C70]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>,
];

// ── Main component ────────────────────────────────────────────────────────────

interface ThankYouPageProps {
  programName?: string;
  settings: ThankYouPageSettings;
  pageSlug?: string;
  language?: string;
}

export function ThankYouPage({ programName, settings, pageSlug, language = "he" }: ThankYouPageProps) {
  const isRtl = language === "he" || language === "ar";
  const [visible, setVisible] = useState(false);
  const [shared, setShared] = useState(false);
  const [displayName, setDisplayName] = useState("");

  /* Read first name from sessionStorage (set by cta-modal before redirect) */
  useEffect(() => {
    const stored = sessionStorage.getItem("ty_name") || "";
    if (stored) {
      setDisplayName(firstName(stored));
      sessionStorage.removeItem("ty_name"); // consume once
    }
  }, []);

  const heading = (settings.heading_he || t(language, "default_heading"))
    .replace("[שם]", displayName || "")
    .replace(/^  +/, "")
    .trim();

  /* Trigger entrance animation */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* Native share or WhatsApp fallback */
  const handleShare = async () => {
    const shareText = programName
      ? `${t(language, "share_text")} - ${programName}`
      : t(language, "share_text");
    const shareUrl = pageSlug ? `${window.location.origin}/lp/${pageSlug}` : "https://www.ono.ac.il";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
        setShared(true);
      } catch { /* user cancelled */ }
    } else {
      const waLink = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
      window.open(waLink, "_blank", "noopener");
      setShared(true);
    }
    setTimeout(() => setShared(false), 3000);
  };

  const socialLinks = [
    settings.facebook_url && { key: "facebook", url: settings.facebook_url, label: "Facebook", icon: SocialIcons.facebook, color: "#1877F2" },
    settings.instagram_url && { key: "instagram", url: settings.instagram_url, label: "Instagram", icon: SocialIcons.instagram, color: "#E4405F" },
    settings.youtube_url && { key: "youtube", url: settings.youtube_url, label: "YouTube", icon: SocialIcons.youtube, color: "#FF0000" },
    settings.linkedin_url && { key: "linkedin", url: settings.linkedin_url, label: "LinkedIn", icon: SocialIcons.linkedin, color: "#0A66C2" },
    settings.tiktok_url && { key: "tiktok", url: settings.tiktok_url, label: "TikTok", icon: SocialIcons.tiktok, color: "#000000" },
  ].filter(Boolean) as Array<{ key: string; url: string; label: string; icon: React.ReactNode; color: string }>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#1a1618] via-[#2a2628] to-[#1a1618] flex flex-col items-center justify-start px-4 py-12 md:py-20"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ fontFamily: "'Rubik', 'Heebo', sans-serif" }}
    >
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#B8D900]/5 blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-[#B8D900]/3 blur-[120px]" />
      </div>

      {/* Green accent top bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-l from-[#B8D900] via-[#d4f000] to-[#B8D900] z-10" />

      {/* Logo */}
      <div
        className="mb-10 opacity-0"
        style={{ animation: visible ? "fade-in-down 0.6s ease-out 0.1s forwards" : "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ONO_LOGO} alt="הקריה האקדמית אונו" className="h-10 object-contain brightness-200" />
      </div>

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-lg opacity-0"
        style={{ animation: visible ? "fade-in-up 0.7s ease-out 0.2s forwards" : "none" }}
      >
        <div className="bg-[#2a2628]/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Success animation + heading */}
          <div className="px-8 pt-10 pb-6 text-center">
            {/* Animated checkmark */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[#B8D900]/15 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-20 h-20 rounded-full bg-[#B8D900]/20 border-2 border-[#B8D900]/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">
              {displayName ? (
                <>
                  {t(language, "thank_you")} <span className="text-[#B8D900]">{displayName}</span>!
                </>
              ) : (
                heading
              )}
            </h1>

            {displayName && (
              <p className="text-white/60 text-base font-medium mb-1">
                {settings.subheading_he || t(language, "default_subheading")}
              </p>
            )}

            {programName && (
              <p className="text-[#B8D900]/70 text-sm mt-2">
                {programName}
              </p>
            )}
          </div>

          {/* What happens next timeline */}
          <div className="mx-6 mb-6 rounded-2xl bg-white/5 border border-white/8 p-5">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">{t(language, "what_now")}</p>
            <div className="space-y-4">
              {[
                { icon: STEP_ICONS[0], text: t(language, "step_1"), done: true },
                { icon: STEP_ICONS[1], text: t(language, "step_2"), done: false },
                { icon: STEP_ICONS[2], text: t(language, "step_3"), done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-[#B8D900]/20" : "bg-white/8"}`}>
                    {step.icon}
                  </div>
                  <span className={`text-sm leading-relaxed pt-1.5 ${step.done ? "text-white/80 font-medium" : "text-white/40"}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          {settings.show_whatsapp !== false && settings.whatsapp_number && (
            <div className="px-6 mb-4">
              <a
                href={whatsappHref(
                  settings.whatsapp_number,
                  programName ? `${t(language, "whatsapp_msg")} - ${programName}` : t(language, "whatsapp_msg")
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-[#25D366] text-white font-bold text-base transition-all duration-300 hover:bg-[#20bc5a] hover:shadow-[0_0_30px_rgba(37,211,102,0.35)] hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {settings.whatsapp_cta_he || t(language, "whatsapp_cta")}
              </a>
            </div>
          )}

          {/* Calendar booking */}
          {settings.show_calendar && settings.calendar_url && (
            <div className="px-6 mb-4">
              <a
                href={settings.calendar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-medium text-sm transition-all hover:bg-white/15 hover:border-[#B8D900]/40"
              >
                <svg className="w-4 h-4 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {settings.calendar_cta_he || t(language, "calendar_cta")}
              </a>
            </div>
          )}

          {/* Video */}
          {settings.show_video && settings.video_url && (
            <div className="px-6 mb-4">
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                <iframe
                  src={settings.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="ברוכים הבאים לאונו"
                />
              </div>
            </div>
          )}

          {/* Divider */}
          {(settings.show_social !== false && socialLinks.length > 0) || settings.show_referral !== false ? (
            <div className="mx-6 mb-4 border-t border-white/8" />
          ) : null}

          {/* Social media follows */}
          {settings.show_social !== false && socialLinks.length > 0 && (
            <div className="px-6 mb-5">
              <p className="text-white/35 text-xs font-medium text-center mb-3">{t(language, "follow_us")}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="group w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60 transition-all duration-200 hover:scale-110 hover:bg-white/15 hover:text-white hover:border-white/25"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Referral / Share */}
          {settings.show_referral !== false && (
            <div className="px-6 mb-6">
              <button
                onClick={handleShare}
                className={`flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl border text-sm font-medium transition-all duration-300 ${
                  shared
                    ? "bg-[#B8D900]/20 border-[#B8D900]/40 text-[#B8D900]"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {shared ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t(language, "shared")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {settings.referral_cta_he || t(language, "share_cta")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href={pageSlug ? `/lp/${pageSlug}` : "https://www.ono.ac.il"}
            className="text-white/25 text-xs hover:text-white/50 transition-colors"
          >
            {t(language, "back_link")}
          </a>
          <p className="text-white/15 text-xs mt-2">© הקריה האקדמית אונו</p>
        </div>
      </div>
    </div>
  );
}
