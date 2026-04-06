/**
 * Cookie consent banner component.
 * Complies with Israeli Privacy Protection Law 5741-1981 and GDPR.
 * Displays on every landing page until user makes a choice.
 */
"use client";

import { useState, useEffect } from "react";

/** Supported language codes */
type Lang = "he" | "en" | "ar";

/** Localized strings for the cookie consent banner */
const CONSENT_LABELS: Record<Lang, {
  ariaLabel: string;
  text: string;
  privacyLink: string;
  suffix: string;
  essentialOnly: string;
  essentialAriaLabel: string;
  acceptAll: string;
  acceptAllAriaLabel: string;
}> = {
  he: {
    ariaLabel: "הודעת עוגיות",
    text: "אתר זה משתמש בעוגיות (Cookies) לצורך שיפור חוויית הגלישה, ניתוח תנועה ושיפור השירות. השימוש בעוגיות נעשה בהתאם ל",
    privacyLink: "מדיניות הפרטיות",
    suffix: "שלנו ובהתאם לחוק הגנת הפרטיות, התשמ\"א-1981.",
    essentialOnly: "חיוניות בלבד",
    essentialAriaLabel: "קבל עוגיות חיוניות בלבד",
    acceptAll: "קבלת הכל",
    acceptAllAriaLabel: "קבל את כל העוגיות",
  },
  en: {
    ariaLabel: "Cookie notice",
    text: "This site uses cookies to improve your browsing experience, analyze traffic, and enhance our services. Cookie usage complies with our",
    privacyLink: "Privacy Policy",
    suffix: "and applicable privacy laws.",
    essentialOnly: "Essential only",
    essentialAriaLabel: "Accept essential cookies only",
    acceptAll: "Accept all",
    acceptAllAriaLabel: "Accept all cookies",
  },
  ar: {
    ariaLabel: "إشعار ملفات تعريف الارتباط",
    text: "يستخدم هذا الموقع ملفات تعريف الارتباط (Cookies) لتحسين تجربة التصفح وتحليل حركة المرور وتحسين خدماتنا. يتم استخدام ملفات تعريف الارتباط وفقًا لـ",
    privacyLink: "سياسة الخصوصية",
    suffix: "الخاصة بنا ووفقًا لقوانين الخصوصية المعمول بها.",
    essentialOnly: "الأساسية فقط",
    essentialAriaLabel: "قبول ملفات تعريف الارتباط الأساسية فقط",
    acceptAll: "قبول الكل",
    acceptAllAriaLabel: "قبول جميع ملفات تعريف الارتباط",
  },
};

/** localStorage key for storing cookie consent preference */
const CONSENT_KEY = "ono_cookie_consent";

/** Possible consent states */
type ConsentChoice = "all" | "essential" | null;

/**
 * Returns the stored cookie consent choice, or null if not set.
 */
function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "all" || value === "essential") return value;
  return null;
}

/**
 * Cookie consent banner displayed at the bottom of every landing page.
 * Offers two choices: essential cookies only, or all cookies.
 * Stores the user's preference in localStorage.
 */
export function CookieConsent({ language = "he" }: { language?: Lang }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* Show banner only if consent has not been given */
    const consent = getStoredConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  /**
   * Handles the user's consent choice.
   * @param choice - "all" or "essential"
   */
  function handleConsent(choice: "all" | "essential") {
    localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);

    /* Notify PixelTracker (and any other listeners) that marketing consent was
     * granted. Fired only when the user explicitly accepts all cookies so that
     * pixels initialize immediately without requiring a page reload. */
    if (choice === "all") {
      window.dispatchEvent(new CustomEvent("ono_consent_granted"));
    }
  }

  const l = CONSENT_LABELS[language] || CONSENT_LABELS.he;
  const isRtl = language === "he" || language === "ar";

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] animate-fade-in-up"
      dir={isRtl ? "rtl" : "ltr"}
      role="dialog"
      aria-label={l.ariaLabel}
      aria-describedby="cookie-consent-description"
    >
      <div className="bg-[#2a2628]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Icon */}
            <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-[#B8D900]/15 shrink-0">
              <svg className="w-5 h-5 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p id="cookie-consent-description" className="text-white/80 text-sm leading-relaxed">
                {l.text}
                <a
                  href="/privacy"
                  className="text-[#B8D900] hover:underline font-medium mx-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.privacyLink}
                </a>
                {l.suffix}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={() => handleConsent("essential")}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all duration-200"
                aria-label={l.essentialAriaLabel}
              >
                {l.essentialOnly}
              </button>
              <button
                onClick={() => handleConsent("all")}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-[#B8D900] text-[#2a2628] text-sm font-bold hover:bg-[#c8e920] transition-all duration-200"
                aria-label={l.acceptAllAriaLabel}
              >
                {l.acceptAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
