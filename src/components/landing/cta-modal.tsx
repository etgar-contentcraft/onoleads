/**
 * CTA Modal component with form for lead capture.
 * Includes CSRF protection, honeypot bot detection, and input validation.
 */
"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

// ============================================================================
// CTA Modal Context - allows any component to open/close the form modal
// ============================================================================

/** Supported language codes */
type Lang = "he" | "en" | "ar";

interface CtaModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  language: Lang;
}

const CtaModalContext = createContext<CtaModalContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  language: "he",
});

/**
 * Hook to access the CTA modal open/close controls from any child component.
 */
export function useCtaModal() {
  return useContext(CtaModalContext);
}

/**
 * Provider component that manages CTA modal state and language.
 */
export function CtaModalProvider({ children, language = "he" }: { children: React.ReactNode; language?: Lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CtaModalContext.Provider value={{ isOpen, open, close, language }}>
      {children}
    </CtaModalContext.Provider>
  );
}

// ============================================================================
// Localized UI strings for form
// ============================================================================

const FORM_STRINGS: Record<Lang, {
  title: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  privacyPrefix: string;
  termsLink: string;
  privacyLink: string;
  privacyAnd: string;
  submit: string;
  submitting: string;
  noCommitment: string;
  privacyGuaranteed: string;
  floatingCta: string;
  honeypotLabel: string;
}> = {
  he: {
    title: "קבלו מידע מלא",
    namePlaceholder: "שם מלא *",
    phonePlaceholder: "טלפון *",
    emailPlaceholder: "אימייל",
    privacyPrefix: "בלחיצה על \"שלחו לי מידע\" אני מסכים/ה ל",
    termsLink: "תנאי השימוש",
    privacyLink: "מדיניות הפרטיות",
    privacyAnd: "ול",
    submit: "שלחו לי מידע",
    submitting: "שולח...",
    noCommitment: "ללא התחייבות",
    privacyGuaranteed: "פרטיותכם מובטחת",
    floatingCta: "השאירו פרטים",
    honeypotLabel: "אל תמלאו שדה זה",
  },
  en: {
    title: "Get Full Info",
    namePlaceholder: "Full Name *",
    phonePlaceholder: "Phone *",
    emailPlaceholder: "Email",
    privacyPrefix: "By clicking \"Send\" I agree to the ",
    termsLink: "Terms of Service",
    privacyLink: "Privacy Policy",
    privacyAnd: " and the ",
    submit: "Send Me Info",
    submitting: "Sending...",
    noCommitment: "No commitment",
    privacyGuaranteed: "Your privacy is protected",
    floatingCta: "Get Info",
    honeypotLabel: "Do not fill this field",
  },
  ar: {
    title: "احصل على معلومات كاملة",
    namePlaceholder: "الاسم الكامل *",
    phonePlaceholder: "هاتف *",
    emailPlaceholder: "بريد إلكتروني",
    privacyPrefix: "بالنقر على \"أرسل\" أوافق على ",
    termsLink: "شروط الاستخدام",
    privacyLink: "سياسة الخصوصية",
    privacyAnd: " و",
    submit: "أرسل لي معلومات",
    submitting: "جاري الإرسال...",
    noCommitment: "بدون التزام",
    privacyGuaranteed: "خصوصيتك محمية",
    floatingCta: "اترك تفاصيل",
    honeypotLabel: "Do not fill this field",
  },
};

// ============================================================================
// CTA Modal Component
// ============================================================================

interface CtaModalProps {
  pageId?: string;
  programId?: string;
  programName?: string;
  /** Page slug — used to build the /ty redirect URL */
  pageSlug?: string;
  /** Override the CTA button text */
  ctaText?: string;
}

/**
 * Lead capture modal with form validation, CSRF protection, and honeypot field.
 * Displayed as a bottom sheet on mobile and centered modal on desktop.
 */
export function CtaModal({ pageId, programId, programName, pageSlug, ctaText }: CtaModalProps) {
  const { isOpen, close, language } = useCtaModal();
  const t = FORM_STRINGS[language] || FORM_STRINGS.he;
  const isRtl = language === "he" || language === "ar";
  const router = useRouter();
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "" });
  const [honeypot, setHoneypot] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Lock body scroll when modal is open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* Close on ESC key */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  /* Set up cookie ID for tracking */
  useEffect(() => {
    if (!document.cookie.includes("onoleads_id=")) {
      const cookieId = crypto.randomUUID();
      document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);

  /* Fetch CSRF token from cookie (set by middleware) */
  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf_token="))
      ?.split("=")[1] || "";
    setCsrfToken(token);
  }, [isOpen]);

  /**
   * Validates form fields before submission.
   * @returns true if all required fields are valid
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
   * Handles form submission with all security measures.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const cookieId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("onoleads_id="))
        ?.split("=")[1] || "";

      const urlParams = new URLSearchParams(window.location.search);

      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        page_id: pageId || null,
        program_id: programId || null,
        program_interest: programName || null,
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_content: urlParams.get("utm_content"),
        utm_term: urlParams.get("utm_term"),
        referrer: document.referrer || null,
        cookie_id: cookieId,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        csrf_token: csrfToken,
        /* Honeypot field - bots will fill this, real users won't see it */
        website: honeypot,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Store first name in sessionStorage — never in the URL (PII)
        const firstName = formData.full_name.trim().split(" ")[0] || "";
        if (firstName) sessionStorage.setItem("ty_name", firstName);

        const tyUrl = pageSlug ? `/ty?slug=${encodeURIComponent(pageSlug)}` : "/ty";
        close();
        router.push(tyUrl);
      } else {
        const errorData = await res.json().catch(() => null);
        setSubmitError(
          errorData?.error || "אירעה שגיאה. אנא נסו שוב."
        );
      }
    } catch (err) {
      console.error("Form submission failed:", err);
      setSubmitError("אירעה שגיאה בחיבור. אנא נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handles modal close with state cleanup.
   */
  const handleClose = () => {
    close();
    setTimeout(() => {
      setFormData({ full_name: "", phone: "", email: "" });
      setHoneypot("");
      setErrors({});
      setSubmitError(null);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="טופס השארת פרטים"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 mb-0 md:mb-0 animate-fade-in-up">
        <div className="bg-[#2a2628] rounded-t-3xl md:rounded-3xl border border-white/10 shadow-[0_-8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="סגור"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Green accent top */}
          <div className="h-1 bg-gradient-to-l from-[#B8D900] via-[#c8e920] to-[#B8D900]" />

          <div className="p-6 md:p-8">
            {(
              /* Form state */
              <>
                <div className="text-center mb-6">
                  <h3 className="font-heading text-2xl font-extrabold text-white mb-1">
                    {t.title}
                  </h3>
                  {programName && (
                    <p className="text-[#B8D900] font-medium text-sm">
                      {programName}
                    </p>
                  )}
                </div>

                {/* Server-side error message */}
                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" dir={isRtl ? "rtl" : "ltr"} noValidate>
                  {/* Honeypot field - hidden from real users, bots will fill it */}
                  <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
                    <label htmlFor="website">{t.honeypotLabel}</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="full_name" className="sr-only">{t.namePlaceholder}</label>
                    <input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder={t.namePlaceholder}
                      autoComplete="name"
                      className={`w-full h-13 rounded-xl bg-white/8 border px-4 text-white text-base placeholder:text-white/35 focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all ${errors.full_name ? "border-red-400/60" : "border-white/15"}`}
                      aria-required="true"
                      aria-invalid={!!errors.full_name}
                      aria-describedby={errors.full_name ? "full_name_error" : undefined}
                    />
                    {errors.full_name && (
                      <p id="full_name_error" role="alert" className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.full_name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="sr-only">{t.phonePlaceholder}</label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t.phonePlaceholder}
                      dir="ltr"
                      autoComplete="tel"
                      className={`w-full h-13 rounded-xl bg-white/8 border px-4 text-white text-base placeholder:text-white/35 text-left focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all ${errors.phone ? "border-red-400/60" : "border-white/15"}`}
                      aria-required="true"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "phone_error" : undefined}
                    />
                    {errors.phone && (
                      <p id="phone_error" role="alert" className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="sr-only">{t.emailPlaceholder}</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t.emailPlaceholder}
                      dir="ltr"
                      autoComplete="email"
                      className={`w-full h-13 rounded-xl bg-white/8 border px-4 text-white text-base placeholder:text-white/35 text-left focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all ${errors.email ? "border-red-400/60" : "border-white/15"}`}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email_error" : undefined}
                    />
                    {errors.email && (
                      <p id="email_error" role="alert" className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.email}</p>
                    )}
                  </div>

                  {/* Privacy consent notice */}
                  <p className="text-white/30 text-xs leading-relaxed">
                    {t.privacyPrefix}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#B8D900]/70 hover:text-[#B8D900] underline mx-1">
                      {t.termsLink}
                    </a>
                    {t.privacyAnd}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B8D900]/70 hover:text-[#B8D900] underline mx-1">
                      {t.privacyLink}
                    </a>
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
                        {t.submitting}
                      </span>
                    ) : (
                      ctaText || t.submit
                    )}
                  </button>
                </form>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 mt-5 text-white/30 text-xs">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t.noCommitment}
                  </span>
                  <span className="w-px h-3 bg-white/15" aria-hidden="true" />
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t.privacyGuaranteed}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Floating CTA Button
// ============================================================================

/**
 * Floating "leave details" button that appears after scrolling.
 * @param ctaText - Optional override for the button label
 */
export function FloatingCtaButton({ ctaText }: { ctaText?: string }) {
  const { open, language } = useCtaModal();
  const t = FORM_STRINGS[language] || FORM_STRINGS.he;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      onClick={open}
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-4 py-3 md:px-6 md:py-3.5 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm shadow-[0_4px_25px_rgba(184,217,0,0.4)] hover:shadow-[0_4px_35px_rgba(184,217,0,0.6)] hover:scale-105 transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-20 opacity-0 pointer-events-none"
      }`}
      aria-label={ctaText || t.floatingCta}
    >
      <span>{ctaText || t.floatingCta}</span>
      <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
      </svg>
    </button>
  );
}
